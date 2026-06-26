"""个人「协作人能力名册」数据访问（模块3.5：普通用户在前台维护）。

按 ``owner``（下达目标的用户）隔离；主AI 拆任务时与 admin 全局名册合并。
"""

from __future__ import annotations

from typing import Any, Dict, List

from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.orm import Session

from cosmac.db.models import PersonProfile

_MAX = 200  # 单用户名册上限，防失控


def list_people(session: Session, owner: str) -> List[PersonProfile]:
    """列某用户维护的协作人（按 id 倒序）。owner 空返回空。"""
    o = (owner or "").strip()
    if not o:
        return []
    return list(
        session.scalars(
            select(PersonProfile)
            .where(PersonProfile.owner == o)
            .order_by(PersonProfile.id.desc())
            .limit(_MAX)
        ).all()
    )


def upsert_person(
    session: Session, *, owner: str, person_id: str,
    name: str = "", role: str = "", expertise: str = "",
    note: str = "", enabled: bool = True,
) -> PersonProfile:
    """新增/更新 (owner, person_id) 的能力画像。person_id 必填。"""
    o = (owner or "").strip()
    pid = (person_id or "").strip()
    if not o or not pid:
        raise ValueError("owner / person_id 不能为空")
    row = session.scalars(
        select(PersonProfile).where(
            PersonProfile.owner == o, PersonProfile.person_id == pid
        ).limit(1)
    ).first()
    if row is None:
        # 数量上限保护
        if len(list_people(session, o)) >= _MAX:
            raise ValueError("协作人名册已达上限")
        row = PersonProfile(owner=o, person_id=pid)
        session.add(row)
    row.name = (name or "").strip()[:255]
    row.role = (role or "").strip()[:64]
    row.expertise = (expertise or "").strip()
    row.note = (note or "").strip()
    row.enabled = bool(enabled)
    session.flush()
    return row


def delete_person(session: Session, owner: str, person_id: str) -> bool:
    """删除 (owner, person_id)。删到返回 True。"""
    o = (owner or "").strip()
    pid = (person_id or "").strip()
    if not o or not pid:
        return False
    res = session.execute(
        sa_delete(PersonProfile).where(
            PersonProfile.owner == o, PersonProfile.person_id == pid
        )
    )
    session.flush()
    return (res.rowcount or 0) > 0


def to_dict(p: PersonProfile) -> Dict[str, Any]:
    """转成给前端/合并用的字典（字段与 admin 全局名册对齐）。"""
    return {
        "user_id": p.person_id, "name": p.name, "role": p.role,
        "expertise": p.expertise, "note": p.note, "enabled": p.enabled,
    }
