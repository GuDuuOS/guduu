"""群级长期记忆（滚动摘要）单元测试（内存 SQLite，零 key）。

覆盖：repo 计数/清零/写回；bot 侧注入、echo 跳过、后台摘要落库（同步化后验证）。
运行：.venv/bin/python -m unittest cosmac.tests.test_memory
"""

from __future__ import annotations

import unittest
from unittest import mock
from typing import List

from cosmac.ai.base import LLMProvider, Message
from cosmac.db import init_engine, session_scope
from cosmac.db.memory_repo import bump_and_check, get_summary, save_summary
from cosmac.db.models import SCOPE_ROOM

ROOM = "!ops:cosmac.cc"


class TestMemoryRepo(unittest.TestCase):
    def setUp(self) -> None:
        init_engine("sqlite://", create_all=True)

    def test_empty_summary(self) -> None:
        with session_scope() as s:
            self.assertEqual(get_summary(s, SCOPE_ROOM, ROOM), "")

    def test_bump_hits_threshold_then_resets(self) -> None:
        with session_scope() as s:
            dues = [bump_and_check(s, SCOPE_ROOM, ROOM, 3)[0] for _ in range(7)]
        # 阈值 3：第 3、6 轮该摘要，其余不该
        self.assertEqual(dues, [False, False, True, False, False, True, False])

    def test_save_and_read_back(self) -> None:
        with session_scope() as s:
            save_summary(s, SCOPE_ROOM, ROOM, "用户偏好简洁；目标做短剧。")
        with session_scope() as s:
            self.assertEqual(get_summary(s, SCOPE_ROOM, ROOM), "用户偏好简洁；目标做短剧。")

    def test_save_empty_keeps_old(self) -> None:
        with session_scope() as s:
            save_summary(s, SCOPE_ROOM, ROOM, "旧摘要")
        with session_scope() as s:
            save_summary(s, SCOPE_ROOM, ROOM, "   ")  # 空摘要不覆盖
        with session_scope() as s:
            self.assertEqual(get_summary(s, SCOPE_ROOM, ROOM), "旧摘要")

    def test_bump_returns_prior_summary(self) -> None:
        with session_scope() as s:
            save_summary(s, SCOPE_ROOM, ROOM, "之前的记忆")
        with session_scope() as s:
            _, prior = bump_and_check(s, SCOPE_ROOM, ROOM, 5)
        self.assertEqual(prior, "之前的记忆")


class _FakeLLM(LLMProvider):
    """假大脑：complete 返回固定摘要，验证摘要落库链路。"""

    name = "fake"

    def __init__(self, out: str = "更新后的记忆要点") -> None:
        self._out = out
        self.calls = 0

    def complete(self, messages: List[Message]) -> str:
        self.calls += 1
        return self._out


def _bot():
    from cosmac.bots.appservice_bot import CosmacBot
    from cosmac.config import CosmacConfig

    return CosmacBot(CosmacConfig(llm_provider="echo"))  # 纯离线


class TestBotMemory(unittest.TestCase):
    def setUp(self) -> None:
        init_engine("sqlite://", create_all=True)

    def test_memory_context_renders_summary(self) -> None:
        with session_scope() as s:
            save_summary(s, SCOPE_ROOM, ROOM, "用户叫小雨，做美妆短视频。")
        out = _bot()._memory_context(ROOM)
        self.assertIn("长期记忆", out)
        self.assertIn("小雨", out)

    def test_memory_context_empty_when_no_summary(self) -> None:
        self.assertEqual(_bot()._memory_context(ROOM), "")

    def test_echo_provider_skips_summary(self) -> None:
        # echo 占位后端不摘要：连计数行都不该建（直接 return）
        bot = _bot()  # provider=echo
        bot._maybe_update_memory(ROOM, [], "你好", "你好呀")
        with session_scope() as s:
            self.assertEqual(get_summary(s, SCOPE_ROOM, ROOM), "")

    def test_render_convo_format(self) -> None:
        from cosmac.bots.appservice_bot import CosmacBot

        hist = [
            Message(role="user", content="上一句"),
            Message(role="assistant", content="上一答"),
        ]
        out = CosmacBot._render_convo_for_summary(hist, "现在问", "现在答")
        self.assertEqual(
            out, "用户: 上一句\n助手: 上一答\n用户: 现在问\n助手: 现在答"
        )

    def test_background_summary_lands_in_db(self) -> None:
        bot = _bot()
        bot.llm = _FakeLLM("小雨偏好简洁；正在做第一支短视频。")  # 换非 echo 后端
        # 把后台池同步化，便于断言（fn 立即执行）
        with mock.patch("cosmac.wf.submit_background", side_effect=lambda fn, pool="fast": (fn(), True)[1]):
            # 阈值默认 8：跑 8 轮，第 8 轮触发摘要
            for i in range(8):
                bot._maybe_update_memory(ROOM, [], f"问题{i}", f"回答{i}")
        with session_scope() as s:
            self.assertEqual(get_summary(s, SCOPE_ROOM, ROOM), "小雨偏好简洁；正在做第一支短视频。")
        self.assertEqual(bot.llm.calls, 1)  # 8 轮只摘要 1 次


if __name__ == "__main__":
    unittest.main()
