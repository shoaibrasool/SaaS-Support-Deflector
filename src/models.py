from typing import Optional

from pydantic import BaseModel


class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = None
    category: Optional[str] = None


class SearchResult(BaseModel):
    article_id: str
    title: str
    url: str
    heading: Optional[str]
    category: str
    body_preview: str
    score: float


class ChunkPayload(BaseModel):
    article_id: str
    chunk_index: int
    title: str
    url: str
    heading: Optional[str] = None
    category: str
    category_slug: str
    body_preview: str
    word_count: int
