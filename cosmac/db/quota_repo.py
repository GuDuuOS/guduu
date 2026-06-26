"""用量计数数据访问（模块4 变现第二步，rate 类指标）。

period_key 把"按天/按月"的额度切片：每天一个键、每月一个键，到期自然归零。
total 类（存量）不走这里——直接数现有实体行。
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from cosmac.db.models import UsageCounter


def period_key(period: str, now: Optional[datetime] = None) -> str:
    """按周期算出计数键。day=YYYY-MM-DD（UTC）/ month=YYYY-MM / 其它=""（不分周期）。"""
    d = now or datetime.utcnow()
    if period == "day":
        return d.strftime("%Y-%m-%d")
    if period == "month":
        return d.strftime("%Y-%m")
    return ""


def get_count(session: Session, user_id: str, metric: str, pkey: str) -> int:
    """读某用户某计量项在某周期的已用量；无记录=0。"""
    row = session.scalars(
        select(UsageCounter).where(
            UsageCounter.user_id == user_id,
            UsageCounter.metric == metric,
            UsageCounter.period_key == pkey,
        ).limit(1)
    ).first()
    return int(row.count) if row else 0


def incr(session: Session, user_id: str, metric: str, pkey: str, by: int = 1) -> int:
    """给某用户某计量项某周期的用量 +by，返回新值（无则建行）。单 bot 小规模，读改写够用。"""
    row = session.scalars(
        select(UsageCounter).where(
            UsageCounter.user_id == user_id,
            UsageCounter.metric == metric,
            UsageCounter.period_key == pkey,
        ).limit(1)
    ).first()
    if row is None:
        row = UsageCounter(user_id=user_id, metric=metric, period_key=pkey, count=0)
        session.add(row)
        session.flush()
    row.count = int(row.count) + by
    session.flush()
    return int(row.count)
