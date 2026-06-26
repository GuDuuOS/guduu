"""一键建专班 assemble_team（模块3.5 档3）+ 本专班任务RULE 注入 单元测试。

内存 SQLite、零 key；假 client 记录 建房/写state/发消息。
运行：.venv/bin/python -m unittest cosmac.tests.test_assemble_team
"""

from __future__ import annotations

import unittest

from cosmac.ai.tools import Toolbox, ToolCall, ToolContext
from cosmac.config import CHANNEL_CONFIG_EVENT_TYPE
from cosmac.db import init_engine, session_scope
from cosmac.db.task_repo import list_tasks


class FakeClient:
    def __init__(self) -> None:
        self.created: list = []
        self.states: list = []
        self.sent: list = []

    def create_room(self, name, invitees=None):
        self.created.append((name, invitees))
        return "!team:h"

    def set_state_event(self, room_id, etype, content, state_key=""):
        self.states.append((room_id, etype, content))
        return True

    def send_text(self, room_id, text, txn_id=None):
        self.sent.append((room_id, text))
        return "$e"


class TestAssembleTeam(unittest.TestCase):
    def setUp(self) -> None:
        init_engine("sqlite://", create_all=True)
        self.client = FakeClient()
        self.tb = Toolbox(self.client)

    def _run(self, args):
        return self.tb.execute(
            ToolCall(id="x", name="assemble_team", arguments=args),
            ToolContext("!cur:h", "@owner:h"),
        )

    def test_full_provisioning(self) -> None:
        out = self._run({
            "project": "双11大促", "members": ["@a:h", "@b:h"],
            "lead_agent": "orchestrator", "worker_agents": ["copywriter"],
            "task_rule": "对外报价需主管确认", "skills": ["weekly"],
            "tasks": [{"title": "写文案", "executor_kind": "human", "executor_ref": "@a:h"}],
        })
        # 建房：名字对、含发起人+成员
        name, invitees = self.client.created[0]
        self.assertEqual(name, "双11大促")
        self.assertGreaterEqual(set(invitees), {"@owner:h", "@a:h", "@b:h"})
        # 频道配置：任务RULE / 协作Agent / 项目主AI / 技能
        room, etype, content = self.client.states[0]
        self.assertEqual(etype, CHANNEL_CONFIG_EVENT_TYPE)
        self.assertEqual(content["taskRule"], "对外报价需主管确认")
        self.assertEqual(content["agentSlugs"], ["copywriter"])
        self.assertEqual(content["persona"]["agentSlug"], "orchestrator")
        self.assertEqual(content["persona"]["skill_slugs"], ["weekly"])
        # 任务派进新专班（作用域=新房间）
        with session_scope() as s:
            rows = list_tasks(s, room_ids=["!team:h"])
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].executor_ref, "@a:h")
        # 开班消息 + 回灌含 room_id
        self.assertTrue(any("专班" in t for _r, t in self.client.sent))
        self.assertIn("!team:h", out)

    def test_builtin_persona_when_no_lead(self) -> None:
        self._run({"project": "小项目"})
        _room, _etype, content = self.client.states[0]
        # 没给 lead_agent → 用内置编排人设
        self.assertIn("项目主AI", content["persona"]["prompt"])
        self.assertNotIn("agentSlug", content["persona"])

    def test_requires_project_name(self) -> None:
        out = self._run({"project": "  "})
        self.assertIn("起个名字", out)
        self.assertEqual(self.client.created, [])  # 没建房


class TestTaskRuleInjection(unittest.TestCase):
    """本专班任务RULE 注入：项目主AI 被频道 taskRule 约束。"""

    def setUp(self) -> None:
        init_engine("sqlite://", create_all=True)

    def _bot(self, channel_cfg):
        from cosmac.bots.appservice_bot import CosmacBot
        from cosmac.config import CosmacConfig

        bot = CosmacBot(CosmacConfig(llm_provider="echo"))

        class C:
            def resolve_alias(self, a):
                return None  # 全局规则读不到→空，聚焦 taskRule

            def get_state_event(self, room, etype, key=""):
                return channel_cfg if etype == CHANNEL_CONFIG_EVENT_TYPE else None

            def set_displayname(self, *a, **k):
                pass

            def send_text(self, *a, **k):
                return "$e"

        bot.client = C()
        bot._gate_allows = lambda u, c: True  # type: ignore
        return bot

    def test_group_context_reads_task_rule(self) -> None:
        bot = self._bot({"persona": {"prompt": "人设X"}, "taskRule": "只做分配与审核"})
        gctx = bot._group_context("!r:h")
        self.assertEqual(gctx["task_rule"], "只做分配与审核")

    def test_addendum_injects_task_rule_high_priority(self) -> None:
        bot = self._bot({"persona": {"prompt": "人设X"}, "taskRule": "对外报价需主管确认"})
        add = bot._skill_addendum("!r:h", "@u:h", query="")
        self.assertIn("对外报价需主管确认", add)
        self.assertIn("本专班任务约束", add)
        # 任务RULE 应排在人设之前（优先级更高）
        self.assertLess(add.index("本专班任务约束"), add.index("人设X"))


if __name__ == "__main__":
    unittest.main()
