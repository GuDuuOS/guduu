"""「邮箱 ↔ 用户名」映射的数据访问（给找回密码按邮箱定位账号用）。

注册成功时 upsert 一条；找回密码时按邮箱反查用户名。一个邮箱唯一对一个账号。
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from cosmac.db.models import RegisteredEmail


def set_email(session: Session, *, email: str, username: str) -> None:
    """登记/更新「邮箱→用户名」。邮箱小写存；已存在则覆盖用户名。

    email 列有唯一约束。「查后写」在并发下可能两个请求都没查到、都去 insert，第二个会撞唯一
    约束抛 IntegrityError——这里 catch 后回退成 update，避免并发注册同邮箱时崩在写库这步。
    """
    email = (email or "").strip().lower()
    username = (username or "").strip().lower()
    if not email or not username:
        return
    row = session.execute(
        select(RegisteredEmail).where(RegisteredEmail.email == email)
    ).scalar_one_or_none()
    if row:
        row.username = username
        return
    try:
        with session.begin_nested():   # SAVEPOINT：insert 撞唯一约束只回滚这一步，不毁整事务
            session.add(RegisteredEmail(email=email, username=username))
    except IntegrityError:
        # 并发下别人已抢先插入 → 改成 update（以本次 username 为准）
        row = session.execute(
            select(RegisteredEmail).where(RegisteredEmail.email == email)
        ).scalar_one_or_none()
        if row:
            row.username = username


def get_username_by_email(session: Session, email: str) -> Optional[str]:
    """按邮箱反查用户名 localpart；没有返回 None。"""
    email = (email or "").strip().lower()
    if not email:
        return None
    row = session.execute(
        select(RegisteredEmail).where(RegisteredEmail.email == email)
    ).scalar_one_or_none()
    return row.username if row else None
