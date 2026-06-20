"""工作流运行记录的数据访问（模块3）。

只负责把每次连接器运行落库 + 查最近记录；连接器**定义**不在 DB（走 state event）。
"""

from __future__ import annotations

from typing import Any, Dict, List

from sqlalchemy import select
from sqlalchemy.orm import Session

from cosmac.db.models import WorkflowRun

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
    """登记一次"已提交、等平台回调"的运行（status=pending + 一次性 token）。"""
    run = WorkflowRun(
        slug=slug, platform=platform or "webhook", room_id=room_id, sender=sender,
        input=(user_input or "")[:_MAX_STORE], status="pending", token=token,
    )
    session.add(run)
    session.flush()
    return run


def get_run(session: Session, run_id: int) -> "WorkflowRun | None":
    """按 id 取运行记录。"""
    return session.get(WorkflowRun, run_id)


def complete_run(
    session: Session, run_id: int, *, output: str = "", error: str = ""
) -> bool:
    """把 pending 运行标记完成（成功填 output，失败填 error），并清空 token。

    只对 status==pending 的记录生效（防回调被重放/重复结算）。完成返回 True。
    """
    run = session.get(WorkflowRun, run_id)
    if run is None or run.status != "pending":
        return False
    run.status = "error" if error else "ok"
    run.output = (output or "")[:_MAX_STORE]
    run.error = (error or "")[:_MAX_STORE]
    run.token = ""  # 一次性，用过即废
    session.flush()
    return True
