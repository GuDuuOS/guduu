"""方舟（Ark / DeepSeek）后端的单元测试。

只测"选 provider"和"中立结构 ↔ OpenAI 兼容格式的翻译",不发任何真实请求、
不需要真 key（构造 ArkProvider 只创建 client，不联网）。

运行：.venv/bin/python -m unittest cosmac.tests.test_ark_provider
"""

from __future__ import annotations

import os
import unittest
from dataclasses import replace

from cosmac.ai import get_provider
from cosmac.ai.base import Message, ToolCall, ToolSpec
from cosmac.ai.echo import EchoProvider
from cosmac.config import CosmacConfig


class TestArkSelection(unittest.TestCase):
    def test_deepseek_without_key_falls_back_to_echo(self) -> None:
        cfg = replace(CosmacConfig(), llm_provider="deepseek")
        saved = os.environ.pop("ARK_API_KEY", None)
        try:
            self.assertIsInstance(get_provider(cfg), EchoProvider)
        finally:
            if saved is not None:
                os.environ["ARK_API_KEY"] = saved

    def test_ark_alias_same_as_deepseek(self) -> None:
        cfg = replace(CosmacConfig(), llm_provider="ark")
        saved = os.environ.pop("ARK_API_KEY", None)
        try:
            self.assertIsInstance(get_provider(cfg), EchoProvider)
        finally:
            if saved is not None:
                os.environ["ARK_API_KEY"] = saved


class TestArkTranslation(unittest.TestCase):
    """构造 ArkProvider（带假 key，不联网）验证消息/工具翻译。"""

    def setUp(self) -> None:
        os.environ.setdefault("ARK_API_KEY", "test-key")
        from cosmac.ai.ark import ArkProvider
        self.p = ArkProvider(model="deepseek-v3.2", system_prompt="你是测试人设")

    def test_system_dedup(self) -> None:
        # 历史里没有 system → 用构造时的人设兜底
        out = self.p._build_messages([Message(role="user", content="你好")])
        self.assertEqual(out[0], {"role": "system", "content": "你是测试人设"})
        self.assertEqual(out[1], {"role": "user", "content": "你好"})
        # 历史里已有 system → 不再重复加构造人设
        out2 = self.p._build_messages(
            [Message(role="system", content="群级人设"), Message(role="user", content="hi")]
        )
        systems = [m for m in out2 if m["role"] == "system"]
        self.assertEqual(len(systems), 1)
        self.assertEqual(systems[0]["content"], "群级人设")

    def test_assistant_tool_calls_and_tool_result(self) -> None:
        msgs = [
            Message(role="user", content="建个群"),
            Message(
                role="assistant",
                content="",
                tool_calls=[ToolCall(id="c1", name="create_room", arguments={"name": "测试群"})],
            ),
            Message(role="tool", content="已建群", tool_call_id="c1"),
        ]
        out = self.p._build_messages(msgs)
        # assistant 那条带 tool_calls，arguments 是 JSON 字符串
        asst = next(m for m in out if m["role"] == "assistant")
        self.assertEqual(asst["tool_calls"][0]["function"]["name"], "create_room")
        self.assertIn("测试群", asst["tool_calls"][0]["function"]["arguments"])
        # tool 结果带 tool_call_id
        tool = next(m for m in out if m["role"] == "tool")
        self.assertEqual(tool["tool_call_id"], "c1")
        self.assertEqual(tool["content"], "已建群")

    def test_build_tools(self) -> None:
        spec = ToolSpec(
            name="create_room",
            description="建群",
            parameters={"type": "object", "properties": {}},
        )
        out = self.p._build_tools([spec])
        self.assertEqual(out[0]["type"], "function")
        self.assertEqual(out[0]["function"]["name"], "create_room")
        self.assertEqual(out[0]["function"]["description"], "建群")


if __name__ == "__main__":
    unittest.main()
