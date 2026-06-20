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
