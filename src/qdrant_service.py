import hashlib
from typing import List

from qdrant_client import QdrantClient
from qdrant_client.http import models as rest

from src.config import COLLECTION_NAME, QDRANT_URL, VECTOR_SIZE
from src.data_loader import ArticleChunk
from src.models import ChunkPayload


def _point_id(article_id: str, chunk_index: int) -> int:
    raw = f"{article_id}:{chunk_index}"
    return int(hashlib.md5(raw.encode()).hexdigest(), 16) % (2**63 - 1)


class QdrantService:
    def __init__(self, url: str = QDRANT_URL):
        self.client = QdrantClient(url=url)

    def ensure_collection(self):
        if self.client.collection_exists(COLLECTION_NAME):
            print(f"Collection '{COLLECTION_NAME}' already exists")
            return

        self.client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config={
                "dense": rest.VectorParams(
                    size=VECTOR_SIZE,
                    distance=rest.Distance.COSINE,
                ),
            },
            sparse_vectors_config={
                "bm25": rest.SparseVectorParams(
                    modifier=rest.Modifier.IDF,
                ),
            },
        )

        self.client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="category_slug",
            field_schema=rest.PayloadSchemaType.KEYWORD,
        )
        self.client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="article_id",
            field_schema=rest.PayloadSchemaType.KEYWORD,
        )

        print(f"Collection '{COLLECTION_NAME}' created (dense={VECTOR_SIZE}, sparse=bm25)")

    def upsert_chunks(self, chunks: List[ArticleChunk], embeddings: List[List[float]]):
        points = []
        for chunk, embedding in zip(chunks, embeddings):
            payload = ChunkPayload(
                article_id=chunk.article_id,
                chunk_index=chunk.chunk_index,
                title=chunk.title,
                url=chunk.url,
                heading=chunk.heading,
                category=chunk.category,
                category_slug=chunk.category_slug,
                body_preview=chunk.body_preview,
                word_count=chunk.word_count,
            )

            points.append(
                rest.PointStruct(
                    id=_point_id(chunk.article_id, chunk.chunk_index),
                    vector={
                        "dense": embedding,
                    },
                    payload=payload.model_dump(),
                )
            )

        self.client.upsert(
            collection_name=COLLECTION_NAME,
            points=points,
        )
        print(f"Upserted {len(points)} points to '{COLLECTION_NAME}'")

    def health_check(self) -> bool:
        try:
            self.client.get_collections()
            return True
        except Exception:
            return False
