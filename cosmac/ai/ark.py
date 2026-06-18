"""火山引擎 方舟（Ark）模型后端 —— OpenAI 兼容，用于接入 DeepSeek 等。

方舟的 Chat Completions 接口与 OpenAI **完全兼容**（messages / tools / tool_calls /
stream 等字段一致），所以直接复用官方 `openai` SDK，只把 base_url 指向方舟、
api_key 用方舟的 API Key 即可。这样多模型抽象层多一个后端，业务代码一行不用改。

环境变量（key 不写进代码，由 SDK 从环境变量读，部署时配进去）：
  ARK_API_KEY   方舟 API Key（方舟控制台「API Key 管理」获取）。**必填**。
  ARK_BASE_URL  可选，默认 https://ark.cn-beijing.volces.com/api/v3
模型 id（用 GUDUU_LLM_MODEL 指定）：填方舟的 **Model ID** 或推理接入点 **Endpoint ID**
  （ep- 开头）。接 DeepSeek 时填 DeepSeek 的 model id（如 deepseek-v3.2），
  以你方舟账号实际开通/创建的为准。
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List

from cosmac.ai.base import LLMProvider, Message, ToolCall, ToolSpec, TurnResult

logger = logging.getLogger("cosmac.ai.ark")

# 方舟北京区默认入口；如用其它区域可用 ARK_BASE_URL 覆盖
DEFAULT_ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"
# 默认接 DeepSeek；按你方舟账号实际的 Model ID / Endpoint ID 用 GUDUU_LLM_MODEL 覆盖
DEFAULT_ARK_MODEL = "deepseek-v3.2"


class ArkProvider(LLMProvider):
    """调用火山引擎方舟（OpenAI 兼容）的后端实现，支持工具调用。"""

    name = "ark"

    def __init__(self, model: str = "", system_prompt: str = ""):
        # 延迟导入：只有真正用方舟时才依赖 openai 包（方舟复用 openai SDK）
        from openai import OpenAI

        self.model = model or DEFAULT_ARK_MODEL
        self.system_prompt = system_prompt
        base_url = os.environ.get("ARK_BASE_URL", DEFAULT_ARK_BASE_URL)
        # 方舟用 ARK_API_KEY（不是 OPENAI_API_KEY），显式传入；base_url 指向方舟
        self._client = OpenAI(
            api_key=os.environ.get("ARK_API_KEY", ""),
            base_url=base_url,
        )

    # —— 内部：中立结构 → OpenAI 兼容格式 ——

    def _build_messages(self, messages: List[Message]) -> List[Dict[str, Any]]:
        """把中立 Message 列表翻译成 OpenAI/方舟 的 messages 数组。

        - tool 角色 → {role: tool, tool_call_id, content}
        - assistant 带 tool_calls → {role: assistant, content, tool_calls:[function...]}
        - system 提示：历史里没有 system 消息时，才用构造时的 self.system_prompt 兜底，
          避免与上层 Agent 传入的 system 消息重复。
        """
        convo: List[Dict[str, Any]] = []
        has_system = any(m.role == "system" for m in messages)
        if self.system_prompt and not has_system:
            convo.append({"role": "system", "content": self.system_prompt})

        for msg in messages:
            if msg.role == "system":
                convo.append({"role": "system", "content": msg.content})
            elif msg.role == "tool":
                convo.append(
                    {
                        "role": "tool",
                        "tool_call_id": msg.tool_call_id,
                        "content": msg.content,
                    }
                )
            elif msg.role == "assistant" and msg.tool_calls:
                convo.append(
                    {
                        "role": "assistant",
                        # 有工具调用时 content 可为空
                        "content": msg.content or None,
                        "tool_calls": [
                            {
                                "id": c.id,
                                "type": "function",
                                "function": {
                                    "name": c.name,
                                    # OpenAI 要求 arguments 是 JSON 字符串
                                    "arguments": json.dumps(
                                        c.arguments, ensure_ascii=False
                                    ),
                                },
                            }
                            for c in msg.tool_calls
                        ],
                    }
                )
            else:
                role = "assistant" if msg.role == "assistant" else "user"
                convo.append({"role": role, "content": msg.content})
        return convo

    @staticmethod
    def _build_tools(tools: List[ToolSpec]) -> List[Dict[str, Any]]:
        """把中立 ToolSpec 翻译成 OpenAI/方舟 的 tools 定义。"""
        return [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.parameters,
                },
            }
            for t in tools
        ]

    # —— 对外：纯对话 ——

    def complete(self, messages: List[Message]) -> str:
        resp = self._client.chat.completions.create(
            model=self.model,
            max_tokens=4096,
            messages=self._build_messages(messages),
        )
        return (resp.choices[0].message.content or "").strip()

    # —— 对外：带工具的一轮推理 ——

    def complete_with_tools(
        self, messages: List[Message], tools: List[ToolSpec]
    ) -> TurnResult:
        """一轮推理：模型要么给最终文本，要么请求调用一批工具。"""
        kwargs: Dict[str, Any] = dict(
            model=self.model,
            max_tokens=4096,
            messages=self._build_messages(messages),
        )
        if tools:
            kwargs["tools"] = self._build_tools(tools)

        resp = self._client.chat.completions.create(**kwargs)
        msg = resp.choices[0].message

        tool_calls: List[ToolCall] = []
        for tc in msg.tool_calls or []:
            try:
                args = json.loads(tc.function.arguments or "{}")
            except (ValueError, TypeError):
                args = {}  # 模型偶尔吐非法 JSON，兜底空参数
            tool_calls.append(
                ToolCall(id=tc.id, name=tc.function.name, arguments=args)
            )
        return TurnResult(text=(msg.content or "").strip(), tool_calls=tool_calls)
