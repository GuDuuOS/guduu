"""入驻模板 P2 引导接入·绑定真生效 单元测试（内存 SQLite、零 key、假 client）。

验证：引导按模板写进频道 channel_config 的「模型 / 技能 / 默认工作流」会被 bot 的
_group_context 读到、并在 _skill_addendum 里对 AI 生效（人设/RULE 路径已有别的测试覆盖，
这里补模型/技能/工作流这几条之前标 P2b 的字段）。

运行：.venv/bin/python -m unittest cosmac.tests.test_onboarding_binding
"""

from __future__ import annotations

import unittest

from cosmac.config import CHANNEL_CONFIG_EVENT_TYPE, WORKFLOWS_EVENT_TYPE


def _bot_with(channel_cfg, workflows=None):
    """造一个 bot，其假 client 按事件类型返回给定的频道配置 / 全局工作流定义。"""
    from cosmac.bots.appservice_bot import CosmacBot
    from cosmac.config import CosmacConfig

    bot = CosmacBot(CosmacConfig(llm_provider="echo"))

    class C:
        def resolve_alias(self, a):
            return "!ctrl:h"

        def get_state_event(self, room, etype, key=""):
            if etype == CHANNEL_CONFIG_EVENT_TYPE:
                return channel_cfg
            if etype == WORKFLOWS_EVENT_TYPE:
                return {"workflows": workflows or []}
            return None

        def set_displayname(self, *a, **k):
            pass

        def send_text(self, *a, **k):
            return "$e"

    bot.client = C()
    return bot


class TestOnboardingChannelBinding(unittest.TestCase):
    def test_group_context_reads_model_skill_workflow(self) -> None:
        # 引导按模板写入的 persona.model/skill_slugs + 顶层 workflowSlugs 都要被读到
        cfg = {
            "persona": {"prompt": "你是美妆运营助手", "model": "deepseek-v3.2",
                        "skill_slugs": ["weekly", "xhs"]},
            "workflowSlugs": ["cover-gen", "ghost"],
        }
        bot = _bot_with(cfg)
        g = bot._group_context("!ws:h")
        self.assertIn("美妆运营助手", g["persona"])
        self.assertEqual(g["model"], "deepseek-v3.2")          # 模型覆盖真生效
        self.assertEqual(g["skill_slugs"], ["weekly", "xhs"])  # 技能真生效
        self.assertEqual(g["workflow_slugs"], ["cover-gen", "ghost"])

    def test_preset_workflows_resolves_names_and_skips_missing(self) -> None:
        wfs = [{"slug": "cover-gen", "name": "封面生成", "enabled": True}]
        bot = _bot_with({}, workflows=wfs)
        # cover-gen 解析成名字；ghost 不存在 → 跳过
        text = bot._preset_workflows_text(["cover-gen", "ghost"])
        self.assertIn("封面生成", text)
        self.assertIn("cover-gen", text)
        self.assertNotIn("ghost", text)
        self.assertIn("run_workflow", text)
        # 全不存在 → 空串（不硬塞噪声进 prompt）
        self.assertEqual(bot._preset_workflows_text(["ghost"]), "")
        self.assertEqual(bot._preset_workflows_text([]), "")

    def test_addendum_surfaces_preset_workflows(self) -> None:
        cfg = {"persona": {"prompt": "助手"}, "workflowSlugs": ["cover-gen"]}
        wfs = [{"slug": "cover-gen", "name": "封面生成", "enabled": True}]
        bot = _bot_with(cfg, workflows=wfs)
        add = bot._skill_addendum("!ws:h", "@u:h", query="")
        self.assertIn("本工作区预置的工作流", add)
        self.assertIn("封面生成", add)


if __name__ == "__main__":
    unittest.main()
