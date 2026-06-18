"""「技能」聊天命令的解析与执行（纯逻辑，吃一个 Session、返回要回的文本）。

放在 cosmac.db 里、不连 Matrix，方便单测。bot 只负责：识别前缀、判断作用域
（DM→个人 / 群→本群）、开 session、把异常兜成"功能不可用"。

支持的命令（不强制 / 开头，避免被 Element 当客户端命令拦截；也兼容 /技能）：
    技能 / 技能 帮助            → 用法说明
    技能 列表                   → 列出当前作用域 + 全局的技能
    技能 添加 <slug> ｜ <名称> ｜ <正文>   → 新建/更新（名称、正文可省略；分隔符 | 或 ｜）
    技能 删除 <slug>            → 删除
    技能 停用 <slug> / 启用 <slug>
"""

from __future__ import annotations

import re

from sqlalchemy.orm import Session

from cosmac.db import repo
from cosmac.db.models import SCOPE_GLOBAL, SCOPE_ROOM, SCOPE_USER

# 触发前缀（小写比较）。bot 也用同一份判断"这条是不是技能命令"。
PREFIXES = ("技能", "/技能", "skill", "/skill")


def looks_like_skill_command(text: str) -> bool:
    """快速判断（不连 DB）：这条消息是不是技能命令。bot 用它做前缀闸。"""
    t = text.strip()
    # 中文前缀：直接前缀匹配（中文不用空格分词，"技能列表" 也算）
    if t.startswith("技能") or t.startswith("/技能"):
        return True
    # 英文前缀：要词边界，避免误伤 "skillful" 之类
    low = t.lower()
    return any(low == p or low.startswith(p + " ") for p in ("skill", "/skill"))


def handle_skill_command(
    session: Session, *, is_dm: bool, room_id: str, user_id: str, text: str
) -> str:
    """执行一条技能命令，返回要发回聊天的文本。

    作用域：私聊（is_dm）→ 个人技能（user）；群里 → 本群技能（room）。
    """
    scope = SCOPE_USER if is_dm else SCOPE_ROOM
    scope_id = user_id if is_dm else room_id
    where = "你的个人技能" if is_dm else "本群技能"

    rest = _strip_prefix(text).strip()
    if not rest or rest in ("帮助", "help", "?", "？"):
        return _help()

    # 拆出子命令 + 参数
    parts = rest.split(maxsplit=1)
    sub = parts[0]
    arg = parts[1].strip() if len(parts) > 1 else ""

    if sub in ("列表", "list", "ls"):
        return _list(session, scope, scope_id, where)
    if sub in ("添加", "新增", "add", "set"):
        return _add(session, scope, scope_id, where, arg)
    if sub in ("删除", "删", "del", "rm", "remove"):
        return _delete(session, scope, scope_id, arg)
    if sub in ("停用", "disable", "off"):
        return _toggle(session, scope, scope_id, arg, enabled=False)
    if sub in ("启用", "enable", "on"):
        return _toggle(session, scope, scope_id, arg, enabled=True)
    return f"没听懂「{sub}」。\n{_help()}"


# ───────────────────────── 各子命令 ─────────────────────────

def _list(session: Session, scope: str, scope_id: str, where: str) -> str:
    rows = repo.list_skills(session, scope=scope, scope_id=scope_id)
    glob = repo.list_skills(session, scope=SCOPE_GLOBAL, scope_id="")
    if not rows and not glob:
        return f"{where}还没有技能。用「技能 添加 <标识> ｜ <名称> ｜ <正文>」新建一个。"
    lines = [f"📋 {where}（共 {len(rows)} 个）："]
    lines += [_fmt(s) for s in rows] or ["（无）"]
    if glob:
        lines.append(f"🌐 全局技能（{len(glob)} 个，所有群通用）：")
        lines += [_fmt(s) for s in glob]
    return "\n".join(lines)


def _add(session: Session, scope: str, scope_id: str, where: str, arg: str) -> str:
    if not arg:
        return "用法：技能 添加 <标识> ｜ <名称> ｜ <正文>（名称/正文可省略）"
    # 分隔符兼容半角 | 与全角 ｜
    segs = [seg.strip() for seg in re.split(r"[|｜]", arg)]
    slug = segs[0].split()[0] if segs[0] else ""
    if not slug:
        return "技能标识（slug）不能为空。例：技能 添加 weekly-report ｜ 周报 ｜ 按…步骤"
    name = segs[1] if len(segs) > 1 else ""
    instructions = segs[2] if len(segs) > 2 else ""
    existed = repo.get_skill(session, scope, scope_id, slug) is not None
    fields = {"name": name, "instructions": instructions, "enabled": True}
    # 更新时不要用空串覆盖已有的名称/正文：只传用户这次给了的字段
    if not name:
        fields.pop("name")
    if not instructions:
        fields.pop("instructions")
    repo.upsert_skill(session, scope, scope_id, slug, **fields)
    verb = "更新" if existed else "新建"
    return f"✅ 已{verb}{where}「{slug}」{('· ' + name) if name else ''}。主 AI 下次回话即会用上。"


def _delete(session: Session, scope: str, scope_id: str, slug: str) -> str:
    slug = slug.split()[0] if slug.split() else ""
    if not slug:
        return "用法：技能 删除 <标识>"
    ok = repo.delete_skill(session, scope, scope_id, slug)
    return f"🗑 已删除「{slug}」。" if ok else f"没找到「{slug}」。"


def _toggle(session: Session, scope: str, scope_id: str, slug: str, *, enabled: bool) -> str:
    slug = slug.split()[0] if slug.split() else ""
    if not slug:
        return f"用法：技能 {'启用' if enabled else '停用'} <标识>"
    if repo.get_skill(session, scope, scope_id, slug) is None:
        return f"没找到「{slug}」。"
    repo.upsert_skill(session, scope, scope_id, slug, enabled=enabled)
    return f"{'✅ 已启用' if enabled else '⏸ 已停用'}「{slug}」。"


# ───────────────────────── 小工具 ─────────────────────────

def _fmt(s) -> str:
    flag = "" if s.enabled else "（已停用）"
    name = f" · {s.name}" if s.name else ""
    desc = f" — {s.description}" if s.description else ""
    return f"  • {s.slug}{name}{flag}{desc}"


def _help() -> str:
    return (
        "🛠 技能命令：\n"
        "  技能 列表\n"
        "  技能 添加 <标识> ｜ <名称> ｜ <正文>\n"
        "  技能 删除 <标识>\n"
        "  技能 停用/启用 <标识>\n"
        "（在群里建的是本群技能，私聊我建的是你的个人技能。）"
    )


def _strip_prefix(text: str) -> str:
    """去掉开头的「技能」/「skill」等触发词，留下子命令部分。"""
    t = text.strip()
    low = t.lower()
    for p in PREFIXES:
        if low.startswith(p):
            return t[len(p):]
    return t


__all__ = ["handle_skill_command", "looks_like_skill_command"]
