"""「邮箱→用户名」映射写入（set_email）的分支单测。

聚焦方案A的核心不变量：一邮一号，绝不把已存在的邮箱改绑到别的账号。
不连真库——用一个最小假 session 模拟 select().scalar_one_or_none() 的返回，
覆盖 set_email 的三条分支（新建 / 幂等 / 拒绝改绑）。
"""

from __future__ import annotations

import unittest

from cosmac.db import email_repo
from cosmac.db.email_repo import EmailAlreadyBound
from cosmac.db.models import RegisteredEmail


class _FakeResult:
    """模拟 session.execute(...) 的返回，只实现被用到的 scalar_one_or_none()。"""

    def __init__(self, row):
        self._row = row

    def scalar_one_or_none(self):
        return self._row


class _FakeSession:
    """最小假 session：预置一个已存在的 row（或 None），记录新增/flush 调用。

    set_email 只用到 execute()/add()/flush() 和（insert 路径的）begin_nested()；
    这里把这些都做成无副作用的桩，把"库里已有什么"用 existing_row 注入。
    begin_nested() 正常流程用不到（已存在的分支在 add 之前就 return/raise），故不实现。
    """

    def __init__(self, existing_row=None):
        self._existing = existing_row
        self.added: list = []

    def execute(self, _stmt):
        return _FakeResult(self._existing)

    def add(self, obj):
        self.added.append(obj)

    def flush(self):
        pass


class SetEmailTest(unittest.TestCase):
    def test_new_email_inserts(self) -> None:
        # 邮箱不存在 → 新建一条映射
        s = _FakeSession(existing_row=None)
        email_repo.set_email(s, email="a@b.com", username="alice")
        self.assertEqual(len(s.added), 1)
        self.assertEqual(s.added[0].email, "a@b.com")
        self.assertEqual(s.added[0].username, "alice")

    def test_same_username_is_idempotent(self) -> None:
        # 已存在且指向同一账号 → 幂等，不新增、不报错
        row = RegisteredEmail(email="a@b.com", username="alice")
        s = _FakeSession(existing_row=row)
        email_repo.set_email(s, email="a@b.com", username="alice")
        self.assertEqual(len(s.added), 0)  # 没有新增

    def test_rebind_to_other_account_rejected(self) -> None:
        # 已存在但想改绑到别的账号 → 抛 EmailAlreadyBound（核心不变量：不挤走先注册的账号）
        row = RegisteredEmail(email="a@b.com", username="alice")
        s = _FakeSession(existing_row=row)
        with self.assertRaises(EmailAlreadyBound) as ctx:
            email_repo.set_email(s, email="a@b.com", username="bob")
        self.assertEqual(ctx.exception.existing, "alice")
        self.assertEqual(len(s.added), 0)

    def test_blank_inputs_noop(self) -> None:
        # 空邮箱/空用户名 → 直接返回，不动库
        s = _FakeSession(existing_row=None)
        email_repo.set_email(s, email="", username="alice")
        email_repo.set_email(s, email="a@b.com", username="")
        self.assertEqual(len(s.added), 0)


if __name__ == "__main__":
    unittest.main()
