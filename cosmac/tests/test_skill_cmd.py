"""「技能」聊天命令的单元测试（内存 SQLite，纯逻辑、不连 Matrix）。

运行：.venv/bin/python -m unittest cosmac.tests.test_skill_cmd
"""

from __future__ import annotations

import unittest

from cosmac.db import init_engine, session_scope
from cosmac.db import repo
from cosmac.db.models import SCOPE_ROOM, SCOPE_USER
from cosmac.db.skill_cmd import handle_skill_command, looks_like_skill_command

ROOM = "!ops:cosmac.cc"
USER = "@alice:cosmac.cc"


def run(text: str, *, is_dm: bool = False) -> str:
    with session_scope() as s:
        return handle_skill_command(
            s, is_dm=is_dm, room_id=ROOM, user_id=USER, text=text
        )


class TestSkillCommandDetect(unittest.TestCase):
    def test_looks_like(self) -> None:
        self.assertTrue(looks_like_skill_command("技能 列表"))
        self.assertTrue(looks_like_skill_command("技能列表"))  # 中文无空格
        self.assertTrue(looks_like_skill_command("/技能 添加 x"))
        self.assertTrue(looks_like_skill_command("skill list"))
        self.assertFalse(looks_like_skill_command("skillful 写法"))  # 词边界，不误伤
        self.assertFalse(looks_like_skill_command("帮我建个群"))


class TestSkillCommand(unittest.TestCase):
    def setUp(self) -> None:
        init_engine("sqlite://", create_all=True)

    def test_help_when_bare(self) -> None:
        self.assertIn("技能命令", run("技能"))
        self.assertIn("技能命令", run("技能 帮助"))

    def test_add_then_listed_and_persisted(self) -> None:
        out = run("技能 添加 weekly-report ｜ 周报 ｜ 按三步生成本周数据周报")
        self.assertIn("已新建", out)
        # 群里建 → room 作用域、room_id = ROOM
        with session_scope() as s:
            sk = repo.get_skill(s, SCOPE_ROOM, ROOM, "weekly-report")
            self.assertIsNotNone(sk)
            assert sk is not None
            self.assertEqual(sk.name, "周报")
            self.assertIn("三步", sk.instructions)
        self.assertIn("weekly-report", run("技能 列表"))

    def test_add_update_does_not_wipe_unset_fields(self) -> None:
        run("技能 添加 kb ｜ 检索 ｜ 原正文")
        # 二次只改名称，不传正文 → 正文应保留
        out = run("技能 添加 kb ｜ 新名")
        self.assertIn("已更新", out)
        with session_scope() as s:
            sk = repo.get_skill(s, SCOPE_ROOM, ROOM, "kb")
            assert sk is not None
            self.assertEqual(sk.name, "新名")
            self.assertEqual(sk.instructions, "原正文")  # 未传 → 不被清空

    def test_disable_enable_delete(self) -> None:
        run("技能 添加 s1 ｜ 技能一")
        self.assertIn("已停用", run("技能 停用 s1"))
        with session_scope() as s:
            sk = repo.get_skill(s, SCOPE_ROOM, ROOM, "s1")
            assert sk is not None
            self.assertFalse(sk.enabled)
        self.assertIn("已启用", run("技能 启用 s1"))
        self.assertIn("已删除", run("技能 删除 s1"))
        self.assertIn("没找到", run("技能 删除 s1"))  # 再删

    def test_dm_scope_is_user(self) -> None:
        # 私聊里建 → 个人技能（user 作用域，scope_id = 发起人）
        run("技能 添加 mine ｜ 我的", is_dm=True)
        with session_scope() as s:
            self.assertIsNotNone(repo.get_skill(s, SCOPE_USER, USER, "mine"))
            # 不会落到 room 作用域
            self.assertIsNone(repo.get_skill(s, SCOPE_ROOM, ROOM, "mine"))

    def test_add_requires_slug(self) -> None:
        self.assertIn("不能为空", run("技能 添加 ｜ 只有名称"))

    def test_unknown_subcommand(self) -> None:
        self.assertIn("没听懂", run("技能 乱七八糟"))


if __name__ == "__main__":
    unittest.main()
