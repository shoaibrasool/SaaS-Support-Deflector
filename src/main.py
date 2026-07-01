from pathlib import Path
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from src.bm25 import BM25Index
from src.config import HYBRID_ALPHA, TOP_K
from src.data_loader import Article, ArticleChunk, get_article_chunks, load_articles
from src.embedding import EmbeddingService
from src.models import SearchRequest, SearchResult
from src.qdrant_service import QdrantService, _point_id

RRF_K = 60

app = FastAPI(title="SaaS Support Deflector")

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
def index():
    return FileResponse(str(STATIC_DIR / "index.html"))

articles: List[Article] = []
chunks: List[ArticleChunk] = []
embedder: EmbeddingService | None = None
qdrant: QdrantService | None = None
bm25: BM25Index | None = None


@app.on_event("startup")
def startup_event():
    global articles, chunks, embedder, qdrant, bm25
    articles = load_articles()
    chunks = get_article_chunks()
    embedder = EmbeddingService()
    qdrant = QdrantService()
    bm25 = BM25Index(chunks)
    print(f"All data loaded: {len(articles)} articles, {len(chunks)} chunks")


@app.get("/health")
def health():
    if qdrant is None or not qdrant.health_check():
        raise HTTPException(status_code=503, detail="Qdrant not available")
    return {"status": "healthy"}


@app.get("/articles/count")
def articles_count():
    return {"count": len(articles)}


@app.get("/categories")
def categories():
    if qdrant is None:
        raise HTTPException(status_code=503, detail="Qdrant not initialized")
    return {"categories": qdrant.get_categories()}


def _payload_from_chunk(chunk: ArticleChunk) -> Dict:
    return {
        "article_id": chunk.article_id,
        "chunk_index": chunk.chunk_index,
        "title": chunk.title,
        "url": chunk.url,
        "heading": chunk.heading,
        "category": chunk.category,
        "category_slug": chunk.category_slug,
        "body_preview": chunk.body_preview,
        "word_count": chunk.word_count,
    }


def _rrf_merge(
    dense_points,
    bm25_results,
    top_k: int,
    alpha: float = 0.7,
    k: int = RRF_K,
):
    scores: Dict[int, float] = {}

    for rank, point in enumerate(dense_points):
        doc_id = point.id
        scores[doc_id] = alpha / (k + rank + 1)

    for rank, (chunk_idx, _) in enumerate(bm25_results):
        chunk = chunks[chunk_idx]
        doc_id = _point_id(chunk.article_id, chunk.chunk_index)
        scores[doc_id] = scores.get(doc_id, 0) + (1 - alpha) / (k + rank + 1)

    sorted_ids = sorted(scores.items(), key=lambda x: -x[1])[:top_k]

    dense_by_id: Dict[int, type(dense_points[0])] = {
        p.id: p for p in dense_points
    }

    result = []
    for doc_id, score in sorted_ids:
        if doc_id in dense_by_id:
            p = dense_by_id[doc_id]
            result.append(SearchResult(
                article_id=p.payload["article_id"],
                title=p.payload["title"],
                url=p.payload["url"],
                heading=p.payload.get("heading"),
                category=p.payload["category"],
                body_preview=p.payload["body_preview"],
                score=score,
            ))
        else:
            for chunk_idx, _ in bm25_results:
                chunk = chunks[chunk_idx]
                if _point_id(chunk.article_id, chunk.chunk_index) == doc_id:
                    payload = _payload_from_chunk(chunk)
                    result.append(SearchResult(
                        article_id=payload["article_id"],
                        title=payload["title"],
                        url=payload["url"],
                        heading=payload.get("heading"),
                        category=payload["category"],
                        body_preview=payload["body_preview"],
                        score=score,
                    ))
                    break

    return result


@app.post("/search", response_model=List[SearchResult])
def search(request: SearchRequest):
    if embedder is None or qdrant is None or bm25 is None:
        raise HTTPException(status_code=503, detail="Services not initialized")

    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=422, detail="query must not be empty")

    top_k = request.top_k or TOP_K
    category = request.category

    query_embedding = embedder.embed_document(text=query)

    dense_points = qdrant.search_dense(
        query_embedding=query_embedding,
        top_k=top_k * 3,
        category=category,
    )

    bm25_results = bm25.search(query, top_k=top_k * 3)

    if category:
        bm25_results = [
            (idx, score) for idx, score in bm25_results
            if chunks[idx].category_slug == category
        ]

    return _rrf_merge(dense_points, bm25_results, top_k=top_k, alpha=HYBRID_ALPHA)
