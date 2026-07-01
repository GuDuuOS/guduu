"""_Handler._client_ip 的取值单测（IP 限频的地基：取错 IP=限频可被绕过）。

重点验证「客户端伪造的 X-Forwarded-For 首段不会污染取到的 IP」——这是本次安全修复的核心：
原实现取 XFF 首段，攻击者每次塞一个假 IP 就能让限频器把每个请求都当成新 IP、绕过限频。
修复后优先信 nginx 注入的 X-Real-IP，其次取 XFF **最后一段**（可信跳），再兜底 socket 地址。
"""

from __future__ import annotations

import unittest

from cosmac.bots.appservice_bot import _Handler


def _handler(headers: dict, peer: tuple) -> _Handler:
    """不跑 __init__，直接造一个只带 headers/client_address 的壳来测纯取值逻辑。"""
    h = _Handler.__new__(_Handler)
    h.headers = headers          # 普通 dict 即可（.get 语义够用）
    h.client_address = peer
    return h


class ClientIpTest(unittest.TestCase):
    def test_x_real_ip_preferred(self) -> None:
        # 有 X-Real-IP（nginx 注入、客户端伪造不了）→ 无条件用它，忽略任何 XFF
        h = _handler(
            {"X-Real-IP": "9.9.9.9", "X-Forwarded-For": "1.1.1.1, 2.2.2.2"},
            ("10.0.0.1", 0),
        )
        self.assertEqual(h._client_ip(), "9.9.9.9")

    def test_forged_xff_first_segment_ignored(self) -> None:
        # 客户端伪造首段 6.6.6.6，nginx 把真实 IP 203.0.113.7 追加在末尾 → 必须取末尾
        h = _handler(
            {"X-Forwarded-For": "6.6.6.6, 203.0.113.7"}, ("10.0.0.1", 0)
        )
        self.assertEqual(h._client_ip(), "203.0.113.7")

    def test_single_xff_segment(self) -> None:
        # 只有一段（直连过一层反代）→ 它既是客户端也是唯一可用值
        h = _handler({"X-Forwarded-For": "203.0.113.7"}, ("10.0.0.1", 0))
        self.assertEqual(h._client_ip(), "203.0.113.7")

    def test_blank_x_real_ip_falls_through_to_xff_last(self) -> None:
        # X-Real-IP 是空白 → 视作没有，回退到 XFF 最后一段
        h = _handler(
            {"X-Real-IP": "   ", "X-Forwarded-For": "1.1.1.1, 203.0.113.7"},
            ("10.0.0.1", 0),
        )
        self.assertEqual(h._client_ip(), "203.0.113.7")

    def test_fallback_to_peer_when_no_headers(self) -> None:
        # 完全没经过反代（本地直连）→ 用 socket 对端地址
        h = _handler({}, ("10.0.0.9", 12345))
        self.assertEqual(h._client_ip(), "10.0.0.9")


if __name__ == "__main__":
    unittest.main()
