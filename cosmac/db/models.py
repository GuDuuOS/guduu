"""数据层 ORM 模型（SQLAlchemy 2.0 typed declarative）。

第一批表：**Skill**（技能定义）与 **Agent**（智能体定义）——模块2「群级 记忆/知识库/
Rule/Skill」最先要的两类结构化数据。知识库（pgvector）、群级记忆、Rule 是后续切片。

**作用域（scope）模型**：每条 Skill/Agent 都挂在一个作用域上，覆盖你提到的
「每账号配置 + 群级智能」两种需求：
    - ``user``   ：属于某个账号，scope_id = 用户 id（如 ``@alice:cosmac.cc``）
    - ``room``   ：属于某个群/频道，scope_id = room_id（群级技能/智能体）
    - ``global`` ：全平台共享，scope_id = ``""``
(scope, scope_id, slug) 三元组唯一——同一作用域内 slug 不重复，不同作用域可重名。
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# —— 作用域取值（别散落字符串字面量，统一引用这几个常量）——
SCOPE_USER = "user"
SCOPE_ROOM = "room"
SCOPE_GLOBAL = "global"


class Base(DeclarativeBase):
    """所有 cosmac 数据表的声明基类。"""


class TimestampMixin:
    """统一的「创建时间 / 更新时间」两列，给所有业务表复用。"""

    # 用 Python 端 default/onupdate（跨 SQLite/PG 行为一致），存 UTC。
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class Skill(Base, TimestampMixin):
    """技能定义：一段可复用的能力/提示，挂在某账号或某群下，供主 AID 调度时启用。

    字段：
        scope/scope_id: 作用域（见模块 docstring）。
        slug:           作用域内唯一的短标识（如 ``weekly-report``），程序按它引用。
        name:           展示名（给人看）。
        description:    一句话说明这个技能干嘛。
        instructions:   技能正文——喂给大模型的提示/步骤说明，可以较长。
        enabled:        是否启用（停用而不删除，保留历史）。
    """

    __tablename__ = "cosmac_skill"
    __table_args__ = (
        UniqueConstraint("scope", "scope_id", "slug", name="uq_skill_scope_slug"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scope: Mapped[str] = mapped_column(String(16), nullable=False, default=SCOPE_GLOBAL)
    scope_id: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    slug: Mapped[str] = mapped_column(String(128), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    instructions: Mapped[str] = mapped_column(Text, nullable=False, default="")
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:  # 方便日志/调试
        return f"<Skill {self.scope}:{self.scope_id or '*'}/{self.slug}>"


class Agent(Base, TimestampMixin):
    """智能体定义：一个带人设的 AI 角色，可绑定若干技能，挂在某账号或某群下。

    字段：
        scope/scope_id: 作用域（见模块 docstring）。
        slug:           作用域内唯一短标识。
        name:           展示名。
        description:    一句话说明。
        system_prompt:  人设/系统提示。
        model:          模型覆盖（空 = 跟随全局 AI 配置；非空 = 这个 Agent 单独用某模型）。
        skill_slugs:    绑定的技能 slug 列表（JSON）。先用列表简化，避免一上来就建多对多
                        关联表；以后真有「跨作用域共享技能」需求再升级成关联表。
        enabled:        是否启用。
    """

    __tablename__ = "cosmac_agent"
    __table_args__ = (
        UniqueConstraint("scope", "scope_id", "slug", name="uq_agent_scope_slug"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scope: Mapped[str] = mapped_column(String(16), nullable=False, default=SCOPE_GLOBAL)
    scope_id: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    slug: Mapped[str] = mapped_column(String(128), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False, default="")
    model: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    skill_slugs: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:
        return f"<Agent {self.scope}:{self.scope_id or '*'}/{self.slug}>"
