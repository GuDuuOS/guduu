"""工作流聊天命令 + 运行记录入库的单元测试（mock 连接器执行，不联网）。

运行：.venv/bin/python -m unittest cosmac.tests.test_wf_cmd
"""

from __future__ import annotations

import unittest
from typing import Any
from unittest import mock

from cosmac.bots.appservice_bot import CosmacBot
from cosmac.config import WORKFLOWS_EVENT_TYPE, CosmacConfig
from cosmac.db import init_engine, session_scope
from cosmac.db.wf_repo import recent_runs

CTRL = "!ctrl:host"
ROOM = "!grp:host"
WF = {"slug": "cover", "name": "封面生成", "platform": "webhook",
      "url": "https://n8n/x", "input_hint": "描述封面", "enabled": True}


class FakeClient:
    def __init__(self, workflows):
        self._wf = workflows

    def set_displayname(self, *_a, **_k): pass
    def send_text(self, *_a, **_k): return "$e"
    def resolve_alias(self, _a): return CTRL
    def joined_member_count(self, _r): return 5
    def get_state_event(self, _room, etype, _sk="") -> Any:
        return {"workflows": self._wf} if etype == WORKFLOWS_EVENT_TYPE else None


def _bot(workflows=None) -> CosmacBot:
    bot = CosmacBot(CosmacConfig(llm_provider="echo"))
    bot.client = FakeClient(workflows if workflows is not None else [WF])
    return bot


class TestWfCommand(unittest.TestCase):
    def setUp(self) -> None:
        init_engine("sqlite://", create_all=True)

    def test_detect(self) -> None:
        b = _bot()
        self.assertTrue(b._is_wf_command("工作流 列表"))
        self.assertTrue(b._is_wf_command("/wf run x"))
        self.assertFalse(b._is_wf_command("工作 安排"))

    def test_list(self) -> None:
        out = _bot()._run_wf_command(ROOM, "@u:host", "工作流 列表")
        self.assertIn("cover", out)
        self.assertIn("封面生成", out)

    def test_run_success_and_records(self) -> None:
        bot = _bot()
        with mock.patch("cosmac.wf.run_connector",
                        return_value={"ok": True, "output": "封面已生成: http://img"}):
            out = bot._run_wf_command(ROOM, "@u:host", "工作流 跑 cover 科技感蓝色")
        self.assertIn("已执行", out)
        self.assertIn("封面已生成", out)
        # 运行记录入库
        with session_scope() as s:
            runs = recent_runs(s, slug="cover")
            self.assertEqual(len(runs), 1)
            self.assertEqual(runs[0].status, "ok")
            self.assertIn("科技感蓝色", runs[0].input)

    def test_run_failure_records_error(self) -> None:
        bot = _bot()
        with mock.patch("cosmac.wf.run_connector",
                        return_value={"ok": False, "error": "平台返回 500", "output": ""}):
            out = bot._run_wf_command(ROOM, "@u:host", "工作流 跑 cover x")
        self.assertIn("执行失败", out)
        with session_scope() as s:
            self.assertEqual(recent_runs(s, slug="cover")[0].status, "error")

    def test_run_unknown_slug(self) -> None:
        out = _bot()._run_wf_command(ROOM, "@u:host", "工作流 跑 nope hi")
        self.assertIn("没找到", out)

    def test_no_connectors(self) -> None:
        out = _bot(workflows=[])._run_wf_command(ROOM, "@u:host", "工作流 列表")
        self.assertIn("还没有", out)


if __name__ == "__main__":
    unittest.main()
