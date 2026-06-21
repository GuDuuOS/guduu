"""会员等级（账号权限分层）—— 定义 + 校验 + 控制室读写。

这是什么
--------
在「服务器管理员」（Synapse 原生 admin 标志，管后台用）之外，给**普通用户**再叠一层
**会员身份**：免费 / 付费 / 创作者。两套是**正交**的——一个人既可以是服务器管理员，
又可以是任意会员等级（管理员身份 ≠ 会员身份，见 CLAUDE.md 路线图「账号权限」决策）。

为什么放这里
------------
- **枚举/标签/校验**是纯逻辑，前后端都要用同一套口径，集中在这一处避免飘移。
- **存储**走控制室的 ``cosmac.members`` state event（见 config.MEMBERS_EVENT_TYPE 的长注释：
  权威数据、用户不可自改、只有管理员/bot 能写）。这里提供一个薄封装 :class:`MembersStore`，
  把「读当前 map / 查某人等级 / 授予 / 撤销」收口成几个方法，供 bot 调用。

谁来写
------
1. **管理后台**（管理员浏览器）：手动调整——直接走 Matrix 写 state event（前端 client.ts）。
2. **未来模块4（交易系统）支付成功**：服务端调 :meth:`MembersStore.grant` —— 这就是本期
   预留给「购买获得会员」的服务端接口。本期不接真实支付，只把接口和数据模型立起来。

注意：本模块**只依赖** MatrixClient 的 ``resolve_alias`` / ``get_state_event`` /
``set_state_event`` 三个方法，不引入任何额外依赖，方便单测用假 client 注入。
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional

from cosmac.config import MEMBERS_EVENT_TYPE

logger = logging.getLogger("cosmac.members")

# —— 会员等级枚举（slug 是机器用的稳定标识，绝不改；label 是给人看的中文，可随品牌改）——
TIER_FREE = "free"        # 免费会员（默认；未在 cosmac.members 里列出的用户都算这个）
TIER_PAID = "paid"        # 付费会员（购买/管理员授予）
TIER_CREATOR = "creator"  # 创作者会员（购买/管理员授予；面向内容创作者的身份）

# 默认等级：任何没有显式记录的用户都视为免费会员。
DEFAULT_TIER = TIER_FREE

# 等级目录：slug → 中文标签 + level（数值仅用于「至少 X 级」这类比较；不代表创作者一定
# 比付费"高级"，只是给门控一个可排序的口径）。顺序即前端下拉展示顺序。
MEMBER_TIERS: List[Dict[str, Any]] = [
    {"slug": TIER_FREE, "label": "免费会员", "level": 0},
    {"slug": TIER_PAID, "label": "付费会员", "level": 10},
    {"slug": TIER_CREATOR, "label": "创作者会员", "level": 20},
]

# 便捷映射（由上面的目录派生，避免两处手写不一致）
_TIER_BY_SLUG: Dict[str, Dict[str, Any]] = {t["slug"]: t for t in MEMBER_TIERS}


def is_valid_tier(tier: str) -> bool:
    """tier 是否是已知等级 slug。"""
    return tier in _TIER_BY_SLUG


def normalize_tier(tier: Optional[str]) -> str:
    """把任意输入规整成合法等级 slug；空/未知一律回落到默认（免费）。

    脏数据兜底：控制室 state event 是外部可写的，读出来的 tier 不可信，统一过这一关。
    """
    t = (tier or "").strip()
    return t if t in _TIER_BY_SLUG else DEFAULT_TIER


def tier_label(tier: Optional[str]) -> str:
    """等级 slug → 中文标签（未知回落到「免费会员」）。"""
    return _TIER_BY_SLUG[normalize_tier(tier)]["label"]


def tier_level(tier: Optional[str]) -> int:
    """等级 slug → 数值档位（供门控做「至少付费」这类比较）。"""
    return int(_TIER_BY_SLUG[normalize_tier(tier)]["level"])


def parse_members(content: Optional[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """把 ``cosmac.members`` state event 的内容解析成 {user_id: {tier, source, updated_ts}}。

    强校验 + 兜脏数据（state event 外部可写，绝不信任）：
      - 只收 ``members`` 是 dict 的；
      - key 必须是 ``@..:..`` 形状的 user_id（粗判，挡明显垃圾）；
      - tier 经 normalize_tier 规整；**等于默认(免费)的直接丢弃**——免费是隐含默认，
        不必显式存，也保证 map 里只有"非免费"的覆盖。
    """
    out: Dict[str, Dict[str, Any]] = {}
    if not isinstance(content, dict):
        return out
    members = content.get("members")
    if not isinstance(members, dict):
        return out
    for uid, rec in members.items():
        if not isinstance(uid, str) or not uid.startswith("@") or ":" not in uid:
            continue
        rec = rec if isinstance(rec, dict) else {}
        tier = normalize_tier(rec.get("tier"))
        if tier == DEFAULT_TIER:
            continue  # 免费是默认，不显式保留
        out[uid] = {
            "tier": tier,
            "source": str(rec.get("source") or "admin"),
            "updated_ts": rec.get("updated_ts"),
        }
    return out


class MembersStore:
    """控制室 ``cosmac.members`` 的薄封装：读当前 map / 查等级 / 授予 / 撤销。

    所有写操作都是「读改写」整份 map（state event 没有部分更新语义），并发写极少（管理员
    手动调整 + 偶发支付回调），冲突概率可忽略；真出现也只是最后写赢，不致命。

    构造参数：
        client:               提供 resolve_alias/get_state_event/set_state_event 的 MatrixClient。
        control_room_alias:   控制室别名（#cosmac-ctrl:<server>）。
    """

    def __init__(self, client: Any, control_room_alias: str):
        self._client = client
        self._alias = control_room_alias

    def _ctrl_room(self) -> Optional[str]:
        """解析控制室 room_id；解析不到返回 None（控制室还没建）。"""
        try:
            return self._client.resolve_alias(self._alias)
        except Exception as e:
            logger.debug("解析控制室别名失败（会员）：%s", e)
            return None

    def get_all(self) -> Dict[str, Dict[str, Any]]:
        """读控制室会员 map（{user_id: {tier, source, updated_ts}}）。失败/无数据返回空。"""
        room = self._ctrl_room()
        if not room:
            return {}
        try:
            ev = self._client.get_state_event(room, MEMBERS_EVENT_TYPE)
            return parse_members(ev)
        except Exception as e:
            logger.debug("读取会员等级失败（忽略）：%s", e)
            return {}

    def get_tier(self, user_id: str) -> str:
        """查某用户的会员等级 slug；未记录 → 默认（免费）。"""
        rec = self.get_all().get(user_id)
        return normalize_tier(rec.get("tier")) if rec else DEFAULT_TIER

    def grant(
        self,
        user_id: str,
        tier: str,
        source: str = "admin",
        now_ts: Optional[int] = None,
    ) -> bool:
        """授予/调整某用户的会员等级（**预留给模块4支付的服务端入口**，也用于 bot 命令）。

        - tier 经校验：非法直接拒（返回 False），不写脏数据进控制室。
        - tier == 免费 等价于「撤销」（从 map 里删掉该用户，回落默认）。
        - source 记录来源（"admin"/"purchase"/…），便于以后审计「这级是怎么来的」。
        成功写入返回 True；控制室不存在/写失败返回 False（调用方据此提示）。
        """
        if not is_valid_tier(tier):
            logger.warning("授予会员失败：未知等级 %r", tier)
            return False
        room = self._ctrl_room()
        if not room:
            logger.warning("授予会员失败：控制室不存在（还没建）")
            return False
        try:
            current = self.get_all()
            if tier == DEFAULT_TIER:
                current.pop(user_id, None)  # 免费=撤销=移出 map
            else:
                current[user_id] = {
                    "tier": tier,
                    "source": source,
                    "updated_ts": int(now_ts if now_ts is not None else time.time()),
                }
            return bool(
                self._client.set_state_event(
                    room, MEMBERS_EVENT_TYPE, {"members": current}
                )
            )
        except Exception:
            logger.exception("授予会员等级失败 user=%s tier=%s", user_id, tier)
            return False

    def revoke(self, user_id: str) -> bool:
        """撤销某用户的会员（回落到免费）。等价 grant(user_id, free)。"""
        return self.grant(user_id, TIER_FREE)
