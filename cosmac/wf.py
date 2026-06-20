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
import time
from typing import Any, Dict, List, Optional, Tuple

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


def run_dify(
    conn: Dict[str, Any], user_input: str, *, timeout: int = DEFAULT_TIMEOUT
) -> Dict[str, Any]:
    """调用 Dify 应用：mode=workflow 走 /v1/workflows/run，mode=chat 走 /v1/chat-messages。

    连接器字段：url=Dify 服务地址(默认 https://api.dify.ai)、cred=App API Key、
    mode=workflow|chat、input_key=workflow 输入变量名(默认 input)。
    """
    base = (conn.get("url") or "https://api.dify.ai").rstrip("/")
    key = resolve_credential(conn.get("cred") or "")
    if not key:
        return _err("Dify 连接器缺凭据（服务端 env COSMAC_WF_<CRED> 未配）")
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    mode = (conn.get("mode") or "workflow").lower()
    if mode == "chat":
        url = f"{base}/v1/chat-messages"
        payload: Dict[str, Any] = {
            "query": user_input, "inputs": {},
            "response_mode": "blocking", "user": "cosmac",
        }
    else:
        url = f"{base}/v1/workflows/run"
        ikey = conn.get("input_key") or "input"
        payload = {
            "inputs": {ikey: user_input},
            "response_mode": "blocking", "user": "cosmac",
        }
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=timeout)
    except requests.RequestException as exc:
        logger.warning("Dify 调用失败: %s", exc)
        return _err(f"请求失败：{exc}")
    ok = 200 <= resp.status_code < 300
    text = _extract_dify(resp, mode) if ok else _extract_text(resp)
    return {"ok": ok, "status": resp.status_code, "output": text,
            "error": "" if ok else f"Dify 返回 {resp.status_code}"}


def _extract_dify(resp: "requests.Response", mode: str) -> str:
    try:
        data = resp.json()
    except ValueError:
        return (resp.text or "").strip()[:_MAX_OUT]
    if not isinstance(data, dict):
        return str(data)[:_MAX_OUT]
    if mode == "chat":
        return (data.get("answer") or json.dumps(data, ensure_ascii=False))[:_MAX_OUT]
    outs = (data.get("data") or {}).get("outputs")
    if isinstance(outs, dict) and outs:
        for v in outs.values():
            if isinstance(v, str) and v.strip():
                return v[:_MAX_OUT]
        return json.dumps(outs, ensure_ascii=False)[:_MAX_OUT]
    return json.dumps(data, ensure_ascii=False)[:_MAX_OUT]


def run_coze(
    conn: Dict[str, Any], user_input: str, *, timeout: int = DEFAULT_TIMEOUT
) -> Dict[str, Any]:
    """调用 Coze 工作流：POST {base}/v1/workflow/run。

    连接器字段：url=Coze 服务地址(默认 https://api.coze.cn)、cred=PAT/OAuth token、
    ref_id=workflow_id、input_key=参数名(默认 input)。
    """
    base = (conn.get("url") or "https://api.coze.cn").rstrip("/")
    key = resolve_credential(conn.get("cred") or "")
    if not key:
        return _err("Coze 连接器缺凭据（服务端 env COSMAC_WF_<CRED> 未配）")
    wfid = (conn.get("ref_id") or "").strip()
    if not wfid:
        return _err("Coze 连接器需填 workflow_id（连接器的 ref_id 字段）")
    ikey = conn.get("input_key") or "input"
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    payload = {"workflow_id": wfid, "parameters": {ikey: user_input}}
    try:
        resp = requests.post(
            f"{base}/v1/workflow/run", json=payload, headers=headers, timeout=timeout
        )
    except requests.RequestException as exc:
        logger.warning("Coze 调用失败: %s", exc)
        return _err(f"请求失败：{exc}")
    if not (200 <= resp.status_code < 300):
        return {"ok": False, "status": resp.status_code, "output": "",
                "error": f"Coze 返回 {resp.status_code}"}
    try:
        data = resp.json()
    except ValueError:
        return {"ok": True, "status": resp.status_code,
                "output": (resp.text or "")[:_MAX_OUT], "error": ""}
    # Coze 业务码：code==0 才算成功，data 常是 JSON 字符串
    if isinstance(data, dict) and data.get("code") not in (0, None):
        return {"ok": False, "status": resp.status_code, "output": "",
                "error": f"Coze 错误：{data.get('msg') or data.get('code')}"}
    out = data.get("data") if isinstance(data, dict) else data
    text = out if isinstance(out, str) else json.dumps(out, ensure_ascii=False)
    return {"ok": True, "status": resp.status_code, "output": text[:_MAX_OUT], "error": ""}


def _err(msg: str) -> Dict[str, Any]:
    return {"ok": False, "status": None, "output": "", "error": msg}


# —— ComfyUI（图/视频生成：提交工作流图 → 轮询 → 回传媒体到 Matrix）——
COMFY_TIMEOUT = 120   # 轮询等待上限（秒）；超长生成需异步回调(后续)
COMFY_MAX_IMAGES = 4  # 单次最多回传几张

# 文件后缀 → MIME（ComfyUI /view 不一定给可靠的 Content-Type）
_MIME = {
    "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
    "webp": "image/webp", "gif": "image/gif", "mp4": "video/mp4", "webm": "video/webm",
}


def run_comfyui(
    conn: Dict[str, Any], user_input: str, *,
    client: Any = None, room_id: str = "", timeout: int = COMFY_TIMEOUT,
) -> Dict[str, Any]:
    """提交 ComfyUI 工作流图 → 轮询完成 → 把产出的图片回传到本群。

    连接器字段：url=ComfyUI 地址、cred=可选鉴权、graph=API 格式工作流 JSON 模板
    （把要被用户输入替换的地方写成占位符 ``{{input}}``）。需在群里触发（要 client+room_id 发图）。
    """
    if client is None or not room_id:
        return _err("ComfyUI 工作流要在群里触发（需要发图的目标房间）")
    base = (conn.get("url") or "").rstrip("/")
    if not base:
        return _err("ComfyUI 连接器未配置 URL")
    graph_tpl = conn.get("graph") or ""
    if not graph_tpl:
        return _err("ComfyUI 连接器未配置工作流图（graph）")
    # 把 {{input}} 安全注入到图的字符串值里（json.dumps 后去掉外层引号→得到已转义内容）
    safe = json.dumps(user_input or "", ensure_ascii=False)[1:-1]
    try:
        graph = json.loads(graph_tpl.replace("{{input}}", safe))
    except ValueError as exc:
        return _err(f"工作流图 JSON 解析失败：{exc}")

    headers: Dict[str, str] = {}
    key = resolve_credential(conn.get("cred") or "")
    if key:
        headers["Authorization"] = f"Bearer {key}"
    # 1) 提交
    try:
        resp = requests.post(
            f"{base}/prompt", json={"prompt": graph, "client_id": "cosmac"},
            headers=headers, timeout=30,
        )
    except requests.RequestException as exc:
        return _err(f"提交失败：{exc}")
    if not (200 <= resp.status_code < 300):
        return _err(f"ComfyUI 提交返回 {resp.status_code}：{(resp.text or '')[:200]}")
    pid = (resp.json() or {}).get("prompt_id")
    if not pid:
        return _err("ComfyUI 未返回 prompt_id")
    # 2) 轮询
    images = _comfy_poll(base, pid, headers, timeout)
    if images is None:
        return _err(f"等待超时（{timeout}s），工作流可能还在跑")
    if not images:
        return _err("ComfyUI 已完成但没有产出图片")
    # 3) 下载 → 上传 Matrix → 发图
    sent = 0
    for img in images[:COMFY_MAX_IMAGES]:
        data, mime, fname = _comfy_download(base, img, headers)
        if not data:
            continue
        mxc = client.upload_media(data, mime, fname)
        if not mxc:
            continue
        if client.send_image(room_id, mxc, fname, {"mimetype": mime, "size": len(data)}):
            sent += 1
    if sent == 0:
        return _err("生成了图但上传/发送失败")
    return {"ok": True, "status": 200, "output": f"已生成 {sent} 张图并发到本群", "error": ""}


def _comfy_poll(
    base: str, pid: str, headers: Dict[str, str], timeout: int
) -> Optional[List[Dict[str, Any]]]:
    """轮询 /history/{pid} 直到出 outputs；返回图片项列表，超时返回 None。"""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            r = requests.get(f"{base}/history/{pid}", headers=headers, timeout=15)
            if r.status_code == 200:
                hist = r.json() or {}
                entry = hist.get(pid)
                if entry and entry.get("outputs"):
                    imgs: List[Dict[str, Any]] = []
                    for node_out in entry["outputs"].values():
                        for im in (node_out or {}).get("images", []) or []:
                            if im.get("filename"):
                                imgs.append(im)
                    return imgs
        except requests.RequestException:
            pass
        time.sleep(2)
    return None


def _comfy_download(
    base: str, img: Dict[str, Any], headers: Dict[str, str]
) -> Tuple[Optional[bytes], str, str]:
    """从 /view 下载一张产出图，返回 (bytes, mime, filename)。失败 bytes=None。"""
    fname = img.get("filename") or "output.png"
    params = {
        "filename": fname,
        "subfolder": img.get("subfolder", ""),
        "type": img.get("type", "output"),
    }
    ext = fname.rsplit(".", 1)[-1].lower() if "." in fname else "png"
    mime = _MIME.get(ext, "application/octet-stream")
    try:
        r = requests.get(f"{base}/view", params=params, headers=headers, timeout=60)
        if r.status_code == 200 and r.content:
            return r.content, mime, fname
    except requests.RequestException:
        pass
    return None, mime, fname


# 按 platform 分派到各自适配器
def run_connector(
    conn: Dict[str, Any], user_input: str, *,
    client: Any = None, room_id: str = "", timeout: int = DEFAULT_TIMEOUT,
) -> Dict[str, Any]:
    """按连接器的 platform 分派执行。未知平台返回 ok=False。

    client/room_id 仅 ComfyUI 用（要把生成的图发回群）；其它平台忽略。
    """
    platform = (conn.get("platform") or "webhook").lower()
    if platform in ("webhook", "n8n", "make", "custom", ""):
        return run_webhook(conn, user_input, timeout=timeout)
    if platform == "dify":
        return run_dify(conn, user_input, timeout=timeout)
    if platform == "coze":
        return run_coze(conn, user_input, timeout=timeout)
    if platform == "comfyui":
        return run_comfyui(conn, user_input, client=client, room_id=room_id)
    return _err(f"暂不支持的平台「{platform}」（当前 webhook/dify/coze/comfyui）")
