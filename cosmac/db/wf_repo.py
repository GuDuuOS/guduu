"""工作流运行记录的数据访问（模块3）。

只负责把每次连接器运行落库 + 查最近记录；连接器**定义**不在 DB（走 state event）。
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Tuple

from datetime import datetime, timedelta

from sqlalchemy import and_, or_, select, update
from sqlalchemy.orm import Session

from cosmac.db.models import WorkflowRun

# processing 超过这个时长仍没结清 → 视为上次处理半途崩了，允许后续回调重抢（崩溃恢复，#2）
_STALE_PROCESSING_SECONDS = 300

_MAX_STORE = 4000  # 入库的输入/输出截断，避免超长


def record_run(
    session: Session,
    *,
    slug: str,
    platform: str,
    room_id: str,
    sender: str,
    user_input: str,
    result: Dict[str, Any],
) -> WorkflowRun:
    """把一次运行结果落库，返回记录对象。"""
    run = WorkflowRun(
        slug=slug,
        platform=platform or "webhook",
        room_id=room_id,
        sender=sender,
        input=(user_input or "")[:_MAX_STORE],
        status="ok" if result.get("ok") else "error",
        output=str(result.get("output") or "")[:_MAX_STORE],
        error=str(result.get("error") or "")[:_MAX_STORE],
    )
    session.add(run)
    session.flush()
    return run


def recent_runs(session: Session, *, slug: str = "", limit: int = 10) -> List[WorkflowRun]:
    """查最近的运行记录（可按 slug 过滤），按时间倒序。"""
    stmt = select(WorkflowRun)
    if slug:
        stmt = stmt.where(WorkflowRun.slug == slug)
    stmt = stmt.order_by(WorkflowRun.id.desc()).limit(limit)
    return list(session.scalars(stmt).all())


# —— 异步回调（长任务）——

def create_pending(
    session: Session, *, slug: str, platform: str, room_id: str,
    sender: str, user_input: str, token: str,
) -> WorkflowRun:
    """登记一次等待本机 worker 执行的运行（status=queued + 一次性 token）。

    worker 真正开始外呼前由 :func:`mark_submission_started` 改成 pending。只有 queued 能
    确定尚未开始外呼，因此重启后可安全回收；pending 则保留 token 接受可能已成功的回调。
    """
    run = WorkflowRun(
        slug=slug, platform=platform or "webhook", room_id=room_id, sender=sender,
        input=(user_input or "")[:_MAX_STORE], status="queued", token=token,
    )
    session.add(run)
    session.flush()
    return run


# queued 是尚未开始外呼的本地队列项；超过宽限期说明 worker 已随进程丢失，可安全回收。
_ORPHAN_GRACE_SECONDS = 3600


def _callback_timeout_seconds() -> int:
    """读取异步回调最长等待时间，默认 7 天，最低 1 小时。

    生产可用 ``COSMAC_WF_CALLBACK_TIMEOUT`` 调整。非法值回退默认，避免错误环境变量让
    bot 启动失败；设置较长默认值是为了容纳慢工作流，同时终结永久 pending。
    """
    try:
        return max(3600, int(os.environ.get("COSMAC_WF_CALLBACK_TIMEOUT", "604800")))
    except (TypeError, ValueError):
        return 604800


def reclaim_orphans(session: Session) -> List[Tuple[int, str, str, str]]:
    """周期回收丢失的本地队列项和超过配置期限的外部回调。

    queued 超过一小时表示本机 worker 已丢；pending 超过回调期限表示平台长期未回调。
    processing 仍由 :func:`claim_pending` 的过期重抢处理。返回值包含面向用户的原因。
    """
    queued_cutoff = datetime.utcnow() - timedelta(seconds=_ORPHAN_GRACE_SECONDS)
    callback_cutoff = datetime.utcnow() - timedelta(
        seconds=_callback_timeout_seconds()
    )
    rows = (
        session.execute(
            select(WorkflowRun).where(
                or_(
                    and_(
                        WorkflowRun.status == "queued",
                        WorkflowRun.updated_at < queued_cutoff,
                    ),
                    and_(
                        WorkflowRun.status == "pending",
                        WorkflowRun.updated_at < callback_cutoff,
                    ),
                )
            )
        )
        .scalars()
        .all()
    )
    out: List[Tuple[int, str, str, str]] = []
    for r in rows:
        was_queued = r.status == "queued"
        reason = "提交队列中断" if was_queued else "等待外部平台回调超时"
        r.status = "error"
        r.error = reason
        r.token = ""  # 一次性 token 作废
        out.append((r.id, r.slug, r.room_id, reason))
    session.flush()
    return out


def get_run(session: Session, run_id: int) -> "WorkflowRun | None":
    """按 id 取运行记录。"""
    return session.get(WorkflowRun, run_id)


def mark_submission_started(session: Session, run_id: int) -> bool:
    """worker 开始外呼前，原子地把 queued 改成 pending。

    状态必须在 HTTP 请求**之前**持久化：之后无论请求成功、超时还是进程崩溃，都可能已经
    被外部平台接收，必须保留 token 等回调，不能再按本地遗孤直接作废。
    """
    res = session.execute(
        update(WorkflowRun)
        .where(WorkflowRun.id == run_id, WorkflowRun.status == "queued")
        .values(status="pending", updated_at=datetime.utcnow())
    )
    session.flush()
    return (res.rowcount or 0) == 1


def claim_pending(session: Session, run_id: int) -> bool:
    """**原子地**把一条运行抢占成 processing。抢到返回 True。

    两类可抢（都靠 ``UPDATE...WHERE`` 由 DB 原子保证只有一个成功）：
      - status='pending'：正常并发回调，只有一个能抢到（#3 防重复发）。
      - status='processing' 且 ``updated_at`` 已超 5 分钟：上次处理半途崩了（send 抛异常/
        DB 失败/进程重启），允许重抢（#2 防永久卡在 processing、结果丢失）。
    显式刷新 ``updated_at``（Core update 不触发 ORM 的 onupdate），让刚抢到的不会立刻被重抢。
    """
    cutoff = datetime.utcnow() - timedelta(seconds=_STALE_PROCESSING_SECONDS)
    res = session.execute(
        update(WorkflowRun)
        .where(
            WorkflowRun.id == run_id,
            or_(
                WorkflowRun.status == "pending",
                and_(
                    WorkflowRun.status == "processing",
                    WorkflowRun.updated_at < cutoff,
                ),
            ),
        )
        .values(status="processing", updated_at=datetime.utcnow())
    )
    session.flush()
    return (res.rowcount or 0) == 1


def revert_to_pending(session: Session, run_id: int) -> None:
    """processing → pending（回调发消息失败时回滚，留给平台重试，#6）。"""
    session.execute(
        update(WorkflowRun)
        .where(WorkflowRun.id == run_id, WorkflowRun.status == "processing")
        .values(status="pending")
    )
    session.flush()


def complete_run(
    session: Session, run_id: int, *, output: str = "", error: str = ""
) -> bool:
    """把进行中的运行标记完成（成功填 output，失败填 error），并清空 token。

    对 pending/processing 的记录生效（防回调被重放/重复结算）。完成返回 True。
    """
    run = session.get(WorkflowRun, run_id)
    if run is None or run.status not in ("queued", "pending", "processing"):
        return False
    run.status = "error" if error else "ok"
    run.output = (output or "")[:_MAX_STORE]
    run.error = (error or "")[:_MAX_STORE]
    run.token = ""  # 一次性，用过即废
    session.flush()
    return True
