"""控制室成员对齐（_reconcile_control_members）的回归测试。

守住安全红线：
  - 撤销的管理员（power 50、不在期望集）被降权 + 踢出；
  - 所有者(100) 和 bot 自己**永不**被动；
  - 事件来自非控制室时**完全不动手**（防止有人借 bot 之手踢人）。
"""

from __future__ import annotations

import unittest
from typing import Any, Dict, List, Optional, Tuple

from cosmac.bots.appservice_bot import CosmacBot
from cosmac.config import CosmacConfig

CTRL = "!ctrl:guduu.local"
BOT = "@guduu:guduu.local"
OWNER = "@admin:guduu.local"
A = "@a:guduu.local"
B = "@b:guduu.local"


class FakeClient:
    """假 client：记录 set_power_levels / kick 调用，便于断言。"""

    def __init__(self, alias_room: Optional[str], power_users: Dict[str, int]):
        self._alias_room = alias_room
        self._power_users = power_users
        self.set_pl_calls: List[Dict[str, Any]] = []
        self.kicks: List[Tuple[str, str]] = []

    def set_displayname(self, *_a, **_k): pass

    def resolve_alias(self, _alias: str) -> Optional[str]:
        return self._alias_room

    def get_state_event(self, _room_id, event_type, _state_key=""):
        if event_type == "m.room.power_levels":
            # 带上一些其它字段，验证对齐时不会被抹掉
            return {"state_default": 50, "users": dict(self._power_users)}
        return None

    def set_power_levels(self, _room_id: str, content: Dict[str, Any]) -> bool:
        self.set_pl_calls.append(content)
        return True

    def kick(self, _room_id: str, user_id: str, reason: str = "") -> bool:
        self.kicks.append((user_id, reason))
        return True


def _bot(alias_room, power_users) -> CosmacBot:
    bot = CosmacBot(CosmacConfig(llm_provider="echo"))
    bot.client = FakeClient(alias_room, power_users)
    return bot


class TestControlMembers(unittest.TestCase):
    def test_revoked_admin_removed(self) -> None:
        # B 不在期望集 → 被降权(从 users 删掉) + 踢出；A 保留；owner/bot 不动
        bot = _bot(CTRL, {OWNER: 100, BOT: 100, A: 50, B: 50})
        bot._reconcile_control_members(CTRL, {"admins": [A]})
        self.assertEqual(bot.client.kicks, [(B, "已撤销服务器管理员，移出控制室")])
        # 写回的 power_levels：B 没了，A/owner/bot 还在，其它字段保留
        self.assertEqual(len(bot.client.set_pl_calls), 1)
        new_users = bot.client.set_pl_calls[0]["users"]
        self.assertNotIn(B, new_users)
        self.assertIn(A, new_users)
        self.assertIn(OWNER, new_users)
        self.assertEqual(bot.client.set_pl_calls[0]["state_default"], 50)

    def test_owner_and_bot_never_touched(self) -> None:
        # 期望集为空也不能动 owner(100) 和 bot 自己
        bot = _bot(CTRL, {OWNER: 100, BOT: 100})
        bot._reconcile_control_members(CTRL, {"admins": []})
        self.assertEqual(bot.client.kicks, [])
        self.assertEqual(bot.client.set_pl_calls, [])

    def test_non_control_room_ignored(self) -> None:
        # 事件来自别的房间（resolve 出来的控制室 != 事件 room_id）→ 一律不动手
        bot = _bot(CTRL, {OWNER: 100, A: 50})
        bot._reconcile_control_members("!evil:guduu.local", {"admins": []})
        self.assertEqual(bot.client.kicks, [])
        self.assertEqual(bot.client.set_pl_calls, [])

    def test_nothing_to_remove_no_write(self) -> None:
        # 所有有权限的人都在期望集 → 不写 power_levels、不踢人
        bot = _bot(CTRL, {OWNER: 100, BOT: 100, A: 50})
        bot._reconcile_control_members(CTRL, {"admins": [A]})
        self.assertEqual(bot.client.kicks, [])
        self.assertEqual(bot.client.set_pl_calls, [])


if __name__ == "__main__":
    unittest.main()
