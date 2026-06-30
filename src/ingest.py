import time

from src.config import EMBED_DELAY, MAX_CHUNKS_TO_EMBED
from src.data_loader import get_article_chunks, load_articles
from src.embedding import EmbeddingService
from src.qdrant_service import QdrantService


def main():
    print("=== Ingestion Pipeline ===")

    articles = load_articles()
    all_chunks = get_article_chunks()
    print(f"Total chunks generated: {len(all_chunks)}")

    chunks_to_embed = all_chunks[:MAX_CHUNKS_TO_EMBED]
    dropped = len(all_chunks) - MAX_CHUNKS_TO_EMBED
    print(f"Embedding first {len(chunks_to_embed)} chunks (dropping {dropped})")

    embedder = EmbeddingService()
    embeddings = embedder.embed_chunks(
        chunks_to_embed,
        delay=EMBED_DELAY,
    )
    print(f"Generated {len(embeddings)} embeddings")

    qdrant = QdrantService()
    qdrant.ensure_collection()
    qdrant.upsert_chunks(chunks_to_embed, embeddings)

    print(f"\nDone. Embedded {len(chunks_to_embed)} chunks and stored in Qdrant (dropped {dropped})")


if __name__ == "__main__":
    main()
