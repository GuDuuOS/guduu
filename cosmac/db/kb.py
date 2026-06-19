"""知识库引擎：入库（切块 + 嵌入）与检索（语义相似度 top-K）。

设计取舍（见 CLAUDE.md §3）：
- 检索 v1 在 **Python 里算余弦相似度**（嵌入已 L2 归一化，点积即余弦），在「该作用域的
  分块」上排序取 top-K。**SQLite / Postgres 都能跑、本地可验**；不依赖 pgvector。
- 规模化后（分块上万）再在 Postgres 上换 pgvector 列 + 近邻索引提速；接口不变。

作用域沿用 Skill/Agent 那套：room=本群知识库 / user=个人 / global=全平台。
"""

from __future__ import annotations

from typing import List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from cosmac.ai.embeddings import Embedder, cosine, get_embedder
from cosmac.db.models import SCOPE_ROOM, KnowledgeChunk, KnowledgeDoc

# 切块参数：按字符长度切，带重叠避免把一句话拦腰截断丢了上下文。
DEFAULT_CHUNK_SIZE = 500
DEFAULT_CHUNK_OVERLAP = 80


def chunk_text(
    text: str,
    size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> List[str]:
    """把长文本切成带重叠的块。优先在段落/句子边界附近切，找不到就硬切。"""
    text = (text or "").strip()
    if not text:
        return []
    if len(text) <= size:
        return [text]
    chunks: List[str] = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + size, n)
        if end < n:
            # 在 [start+size*0.6, end] 里找最后一个自然断点，断得好看些
            window = text[start:end]
            cut = max(window.rfind("\n"), window.rfind("。"), window.rfind(". "))
            if cut >= int(size * 0.6):
                end = start + cut + 1
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= n:
            break
        start = max(end - overlap, start + 1)  # 重叠回退，且保证前进
    return chunks


def ingest_document(
    session: Session,
    *,
    scope: str = SCOPE_ROOM,
    scope_id: str = "",
    title: str = "",
    source: str = "",
    text: str = "",
    embedder: Optional[Embedder] = None,
) -> KnowledgeDoc:
    """把一篇文档切块 + 嵌入 + 落库，返回建好的 KnowledgeDoc（含 chunks）。"""
    emb = embedder or get_embedder()
    pieces = chunk_text(text)
    vectors = emb.embed(pieces) if pieces else []
    doc = KnowledgeDoc(scope=scope, scope_id=scope_id, title=title, source=source)
    session.add(doc)
    session.flush()  # 拿到 doc.id
    for i, (piece, vec) in enumerate(zip(pieces, vectors)):
        session.add(
            KnowledgeChunk(
                doc_id=doc.id,
                scope=scope,
                scope_id=scope_id,
                ordinal=i,
                text=piece,
                embedding=vec,
            )
        )
    session.flush()
    return doc


def search(
    session: Session,
    *,
    query: str,
    scope: str = SCOPE_ROOM,
    scope_id: str = "",
    k: int = 4,
    embedder: Optional[Embedder] = None,
    min_score: float = 0.0,
) -> List[Tuple[KnowledgeChunk, float]]:
    """在某作用域的分块里按语义相似度取 top-K，返回 [(chunk, score), ...] 降序。

    v1：把该作用域的分块全load 进来在 Python 里算余弦。作用域内分块量不大时足够；
    量大了再上 pgvector。``min_score`` 可过滤掉太不相关的（哈希兜底时尤其有用）。
    """
    q = (query or "").strip()
    if not q:
        return []
    emb = embedder or get_embedder()
    qvec = emb.embed_one(q)
    stmt = select(KnowledgeChunk).where(
        KnowledgeChunk.scope == scope, KnowledgeChunk.scope_id == scope_id
    )
    scored: List[Tuple[KnowledgeChunk, float]] = []
    for ch in session.scalars(stmt).all():
        score = cosine(qvec, ch.embedding or [])
        if score >= min_score:
            scored.append((ch, score))
    scored.sort(key=lambda t: t[1], reverse=True)
    return scored[:k]


def list_docs(
    session: Session, *, scope: str = SCOPE_ROOM, scope_id: str = ""
) -> List[KnowledgeDoc]:
    """列出某作用域的文档（按入库时间倒序）。"""
    stmt = (
        select(KnowledgeDoc)
        .where(KnowledgeDoc.scope == scope, KnowledgeDoc.scope_id == scope_id)
        .order_by(KnowledgeDoc.id.desc())
    )
    return list(session.scalars(stmt).all())


def delete_doc(session: Session, doc_id: int) -> bool:
    """删除一篇文档（连带其分块，cascade）。删掉返回 True。"""
    doc = session.get(KnowledgeDoc, doc_id)
    if doc is None:
        return False
    session.delete(doc)
    session.flush()
    return True
