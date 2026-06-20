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
        self.sent = []  # 记录发出的文本(给回调测试看)

    def set_displayname(self, *_a, **_k): pass
    def send_text(self, room, text):
        self.sent.append((room, text))
        return "$e"
    def resolve_alias(self, _a): return CTRL
    def joined_member_count(self, _r): return 5
    def get_state_event(self, _room, etype, _sk="") -> Any:
        return {"workflows": self._wf} if etype == WORKFLOWS_EVENT_TYPE else None


def _bot(workflows=None) -> CosmacBot:
    # control_room_alias 非空：run_workflow 工具据此找控制室（FakeClient.resolve_alias 忽略实参）
    # public_url 非空：异步连接器据此拼回调地址
    bot = CosmacBot(CosmacConfig(
        llm_provider="echo", control_room_alias="#cosmac-ctrl:host",
        public_url="https://hs.cosmac.cc",
    ))
    bot.client = FakeClient(workflows if workflows is not None else [WF])
    bot.toolbox = bot.toolbox.__class__(bot.client, control_room_alias="#cosmac-ctrl:host")
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

    def test_async_submit_creates_pending(self) -> None:
        bot = _bot(workflows=[{**WF, "async": True}])
        with mock.patch("cosmac.wf.run_connector", return_value={"ok": True}) as m:
            out = bot._run_wf_command(ROOM, "@u:host", "工作流 跑 cover 蓝色")
        self.assertIn("已提交", out)
        # 提交时带了回调 URL
        self.assertIn("/cosmac/wf/callback/", m.call_args[1]["callback_url"])
        # 落了一条 pending 记录(带 token)
        with session_scope() as s:
            runs = recent_runs(s, slug="cover")
            self.assertEqual(runs[0].status, "pending")
            self.assertTrue(runs[0].token)

    def test_callback_posts_result_and_completes(self) -> None:
        bot = _bot(workflows=[{**WF, "async": True}])
        with mock.patch("cosmac.wf.run_connector", return_value={"ok": True}):
            bot._run_wf_command(ROOM, "@u:host", "工作流 跑 cover x")
        with session_scope() as s:
            run = recent_runs(s, slug="cover")[0]
            rid, tok = run.id, run.token
        # 正确 token → 200，结果发回原群，状态结清
        code = bot.handle_wf_callback(rid, tok, {"output": "成片已生成: http://v"})
        self.assertEqual(code, 200)
        self.assertTrue(any("成片已生成" in t for _r, t in bot.client.sent))
        with session_scope() as s:
            self.assertEqual(recent_runs(s, slug="cover")[0].status, "ok")
        # 重放(token 已清)→ 404，不会重复发
        self.assertEqual(bot.handle_wf_callback(rid, tok, {"output": "再来"}), 404)

    def test_callback_bad_token_403(self) -> None:
        bot = _bot(workflows=[{**WF, "async": True}])
        with mock.patch("cosmac.wf.run_connector", return_value={"ok": True}):
            bot._run_wf_command(ROOM, "@u:host", "工作流 跑 cover x")
        with session_scope() as s:
            rid = recent_runs(s, slug="cover")[0].id
        self.assertEqual(bot.handle_wf_callback(rid, "wrong", {"output": "x"}), 403)

    def test_callback_unknown_run_404(self) -> None:
        self.assertEqual(_bot().handle_wf_callback(999999, "t", {"output": "x"}), 404)

    def test_run_workflow_ai_tool(self) -> None:
        # 主 AI 工具路径：execute(run_workflow) 跑连接器并返回结果
        from cosmac.ai.base import ToolCall
        from cosmac.ai.tools import ToolContext
        bot = _bot()
        ctx = ToolContext(ROOM, "@u:host")
        with mock.patch("cosmac.wf.run_connector",
                        return_value={"ok": True, "output": "图已生成"}):
            out = bot.toolbox.execute(
                ToolCall(id="t", name="run_workflow",
                         arguments={"slug": "cover", "input": "蓝色"}), ctx)
        self.assertIn("图已生成", out)
        # 不带 slug → 返回可用列表
        out2 = bot.toolbox.execute(
            ToolCall(id="t2", name="run_workflow", arguments={}), ctx)
        self.assertIn("cover", out2)


if __name__ == "__main__":
    unittest.main()
