"""任务看板的数据访问（AI 任务编排 · P1）。

主 AI 拆解目标 → create_tasks 批量落库；任务看板读 list_tasks；手动/自动改状态走 update_task。
P1 只做"拆解 + 看板 + 改状态"，派发执行与结果回填(P2)以后在此扩展。
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from cosmac.db.models import Task

_VALID_STATUS = ("todo", "doing", "done")
_MAX_TITLE = 2000
_MAX_TASKS = 30  # 一次拆解最多落这么多子任务，防失控


def create_tasks(
    session: Session,
    *,
    goal: str,
    items: List[Dict[str, Any]],
    room_id: str = "",
    sender: str = "",
) -> List[Task]:
    """把一批子任务落库。items: [{"title","assignee"}]。返回创建的 Task 列表。

    脏数据兜底：title 空的丢弃；超量截断到 _MAX_TASKS。
    """
    out: List[Task] = []
    for it in (items or [])[:_MAX_TASKS]:
        if not isinstance(it, dict):
            continue
        title = str(it.get("title") or "").strip()[:_MAX_TITLE]
        if not title:
            continue
        t = Task(
            goal=str(goal or "")[:_MAX_TITLE],
            title=title,
            assignee=str(it.get("assignee") or "").strip()[:255],
            status="todo",
            progress=0,
            room_id=room_id or "",
            sender=sender or "",
        )
        session.add(t)
        out.append(t)
    session.flush()
    return out


def list_tasks(session: Session, *, limit: int = 200) -> List[Task]:
    """列出任务（按 id 倒序，新建在前）。单实例小规模，全列即可。"""
    return list(
        session.execute(
            select(Task).order_by(Task.id.desc()).limit(limit)
        ).scalars().all()
    )


def update_task(
    session: Session,
    task_id: int,
    *,
    status: Optional[str] = None,
    progress: Optional[int] = None,
    result: Optional[str] = None,
) -> bool:
    """改任务状态/进度/结果（手动拖卡 或 P2 的 AI/工作流自动回填）。

    status 改成 done 时进度补满 100；改成非 done 但没给进度则不动进度。返回是否命中。
    """
    values: Dict[str, Any] = {}
    if status is not None and status in _VALID_STATUS:
        values["status"] = status
        if status == "done" and progress is None:
            values["progress"] = 100
    if progress is not None:
        try:
            values["progress"] = max(0, min(100, int(progress)))
        except (TypeError, ValueError):
            pass
    if result is not None:
        values["result"] = str(result)[:_MAX_TITLE]
    if not values:
        return False
    res = session.execute(
        update(Task).where(Task.id == task_id).values(**values)
    )
    session.flush()
    return (res.rowcount or 0) == 1
