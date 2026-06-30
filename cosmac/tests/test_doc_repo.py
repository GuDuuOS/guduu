"""文档教学频道页面仓库（doc_repo）的单测。

覆盖：建页/读页/改页、嵌套树排序、级联删子树、移动与防环、按房间隔离、超量/非法父级兜底。
用内存 SQLite，不接真服务。
"""

from __future__ import annotations

import unittest

from cosmac.db import init_engine, session_scope
from cosmac.db import doc_repo as dr

ROOM = "!doc:guduu.local"
OTHER = "!other:guduu.local"
ALICE = "@alice:guduu.local"


class DocRepoTest(unittest.TestCase):
    def setUp(self) -> None:
        init_engine("sqlite://", create_all=True)

    def test_create_and_get(self) -> None:
        with session_scope() as s:
            p = dr.create_page(s, room_id=ROOM, title="入门", content_md="# Hi", updated_by=ALICE)
            self.assertIsNotNone(p)
            pid = p.id
        with session_scope() as s:
            got = dr.get_page(s, pid)
            self.assertEqual(got.title, "入门")
            self.assertEqual(got.content_md, "# Hi")
            self.assertIsNone(got.parent_id)

    def test_empty_title_defaults(self) -> None:
        with session_scope() as s:
            p = dr.create_page(s, room_id=ROOM, title="   ")
            self.assertEqual(p.title, "未命名页面")

    def test_nested_tree_and_sort(self) -> None:
        with session_scope() as s:
            a = dr.create_page(s, room_id=ROOM, title="A")
            b = dr.create_page(s, room_id=ROOM, title="B")
            a1 = dr.create_page(s, room_id=ROOM, title="A1", parent_id=a.id)
            # 顶层按 sort 递增：A=0, B=1
            self.assertEqual(a.sort, 0)
            self.assertEqual(b.sort, 1)
            # 子页挂在 A 下、sort 从 0 起
            self.assertEqual(a1.parent_id, a.id)
            self.assertEqual(a1.sort, 0)
        with session_scope() as s:
            pages = dr.list_pages(s, ROOM)
            self.assertEqual(len(pages), 3)

    def test_bad_parent_rejected(self) -> None:
        with session_scope() as s:
            # 父页面不存在 → None
            self.assertIsNone(dr.create_page(s, room_id=ROOM, title="x", parent_id=999))
            # 父页面属于别的房间 → None
            other = dr.create_page(s, room_id=OTHER, title="o")
            self.assertIsNone(dr.create_page(s, room_id=ROOM, title="x", parent_id=other.id))

    def test_update(self) -> None:
        with session_scope() as s:
            p = dr.create_page(s, room_id=ROOM, title="旧", content_md="old")
            pid = p.id
        with session_scope() as s:
            up = dr.update_page(s, pid, title="新", content_md="new", updated_by=ALICE)
            self.assertEqual(up.title, "新")
            self.assertEqual(up.content_md, "new")
            self.assertEqual(up.updated_by, ALICE)
        with session_scope() as s:
            self.assertIsNone(dr.update_page(s, 123456, title="x"))

    def test_cascade_delete_subtree(self) -> None:
        with session_scope() as s:
            a = dr.create_page(s, room_id=ROOM, title="A")
            a1 = dr.create_page(s, room_id=ROOM, title="A1", parent_id=a.id)
            a1x = dr.create_page(s, room_id=ROOM, title="A1x", parent_id=a1.id)
            b = dr.create_page(s, room_id=ROOM, title="B")
            aid, a1id, a1xid, bid = a.id, a1.id, a1x.id, b.id
        with session_scope() as s:
            deleted = dr.delete_page(s, aid)
            # A 及其整棵子树都删掉
            self.assertCountEqual(deleted, [aid, a1id, a1xid])
        with session_scope() as s:
            remaining = [p.id for p in dr.list_pages(s, ROOM)]
            self.assertEqual(remaining, [bid])  # 只剩 B

    def test_move_and_cycle_prevention(self) -> None:
        with session_scope() as s:
            a = dr.create_page(s, room_id=ROOM, title="A")
            b = dr.create_page(s, room_id=ROOM, title="B")
            a1 = dr.create_page(s, room_id=ROOM, title="A1", parent_id=a.id)
            aid, bid, a1id = a.id, b.id, a1.id
        with session_scope() as s:
            # 把 B 移到 A 下
            moved = dr.move_page(s, bid, parent_id=aid)
            self.assertEqual(moved.parent_id, aid)
        with session_scope() as s:
            # 防环：不能把 A 移到它的子孙 A1 下
            self.assertIsNone(dr.move_page(s, aid, parent_id=a1id))
            # 防环：不能把页面移到自己下
            self.assertIsNone(dr.move_page(s, aid, parent_id=aid))

    def test_publish_filter(self) -> None:
        # 新建默认草稿；published_only 只返回已发布；update 可切换发布状态。
        with session_scope() as s:
            d = dr.create_page(s, room_id=ROOM, title="草稿页")
            self.assertFalse(d.published)  # 新建即草稿
            did = d.id
        with session_scope() as s:
            self.assertEqual(len(dr.list_pages(s, ROOM, published_only=True)), 0)
            self.assertEqual(len(dr.list_pages(s, ROOM)), 1)  # 后台看得到草稿
        with session_scope() as s:
            dr.update_page(s, did, published=True)
        with session_scope() as s:
            pub = dr.list_pages(s, ROOM, published_only=True)
            self.assertEqual([p.title for p in pub], ["草稿页"])  # 发布后前台可见

    def test_room_isolation(self) -> None:
        with session_scope() as s:
            dr.create_page(s, room_id=ROOM, title="r1")
            dr.create_page(s, room_id=OTHER, title="r2")
        with session_scope() as s:
            self.assertEqual([p.title for p in dr.list_pages(s, ROOM)], ["r1"])
            self.assertEqual([p.title for p in dr.list_pages(s, OTHER)], ["r2"])


if __name__ == "__main__":
    unittest.main()
