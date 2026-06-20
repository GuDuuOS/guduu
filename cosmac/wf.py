"""外部工作流连接器引擎（模块3）。

不自建工作流引擎——把主 AI / 聊天命令的请求，转成对 n8n / Make 等平台 **webhook** 的
一次同步 HTTP 调用，再把结果规范化拿回来发进群。后续再加 Dify/Coze/ComfyUI 专用适配器。

纯 HTTP、不依赖 DB/SQLAlchemy（运行记录由调用方另存），方便单测与降级。
密钥**绝不**来自连接器定义（state event 不加密）：定义里只放"凭据名 cred"，
真值从服务端环境变量 ``COSMAC_WF_<CRED>`` 读，作为 Bearer 头发出（同 LLM key 策略）。
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Dict

import requests

logger = logging.getLogger("cosmac.wf")

DEFAULT_TIMEOUT = 30  # 秒；webhook 同步等待上限
_MAX_OUT = 4000       # 结果文本截断，避免把超长内容塞进群/上下文

# 从平台返回 JSON 里按顺序找"主要文本输出"的常见字段
_OUTPUT_KEYS = ("output", "result", "text", "message", "answer", "data", "content")


def resolve_credential(cred: str) -> str:
    """凭据名 → 服务端 env 里的密钥值（``COSMAC_WF_<CRED>``）。空/未配返回空串。

    例：cred="n8n_main" → 读环境变量 ``COSMAC_WF_N8N_MAIN``。
    很多 n8n/Make webhook 把令牌带在 URL 里、无需额外鉴权，那就把 cred 留空。
    """
    if not cred:
        return ""
    key = "COSMAC_WF_" + re.sub(r"[^A-Za-z0-9]", "_", cred).upper()
    return os.environ.get(key, "")


def run_webhook(
    conn: Dict[str, Any], user_input: str, *, timeout: int = DEFAULT_TIMEOUT
) -> Dict[str, Any]:
    """同步调用一个 webhook 型连接器，返回规范化结果。

    返回 dict：``{"ok": bool, "status": int|None, "output": str, "error": str}``。
    绝不抛异常——网络/超时/非 2xx 都转成 ok=False + error 文案。
    """
    url = (conn.get("url") or "").strip()
    if not url:
        return {"ok": False, "status": None, "output": "", "error": "连接器未配置 URL"}
    method = (conn.get("method") or "POST").upper()
    headers = {"Content-Type": "application/json"}
    token = resolve_credential(conn.get("cred") or "")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    # 统一的输入约定：平台侧从 input 取用户这句话；source 标记来源
    payload = {"input": user_input, "source": "cosmac"}
    try:
        resp = requests.request(
            method, url, json=payload, headers=headers, timeout=timeout
        )
    except requests.RequestException as exc:
        logger.warning("工作流 webhook 调用失败: %s", exc)
        return {"ok": False, "status": None, "output": "", "error": f"请求失败：{exc}"}

    ok = 200 <= resp.status_code < 300
    text = _extract_text(resp)
    err = "" if ok else f"平台返回 {resp.status_code}"
    return {"ok": ok, "status": resp.status_code, "output": text, "error": err}


def _extract_text(resp: requests.Response) -> str:
    """从响应里抽一段"主要文本"：JSON 命中常见字段则取之，否则整体字符串化。"""
    try:
        data = resp.json()
    except ValueError:
        return (resp.text or "").strip()[:_MAX_OUT]
    if isinstance(data, dict):
        for k in _OUTPUT_KEYS:
            v = data.get(k)
            if isinstance(v, str) and v.strip():
                return v.strip()[:_MAX_OUT]
        return json.dumps(data, ensure_ascii=False)[:_MAX_OUT]
    if isinstance(data, str):
        return data.strip()[:_MAX_OUT]
    return json.dumps(data, ensure_ascii=False)[:_MAX_OUT]


# 目前只支持 webhook 平台；Dify/Coze/ComfyUI 后续在这里分派到各自适配器
def run_connector(
    conn: Dict[str, Any], user_input: str, *, timeout: int = DEFAULT_TIMEOUT
) -> Dict[str, Any]:
    """按连接器的 platform 分派执行。未知平台返回 ok=False。"""
    platform = (conn.get("platform") or "webhook").lower()
    if platform in ("webhook", "n8n", "make", "custom", ""):
        return run_webhook(conn, user_input, timeout=timeout)
    return {
        "ok": False,
        "status": None,
        "output": "",
        "error": f"暂不支持的平台「{platform}」（当前仅 webhook）",
    }
