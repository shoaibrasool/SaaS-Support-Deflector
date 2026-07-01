from src.config import EMBED_DELAY, MAX_CHUNKS_TO_EMBED
from src.data_loader import get_article_chunks, load_articles
from src.embedding import EmbeddingService
from src.qdrant_service import QdrantService, point_id


def main():
    print("=== Ingestion Pipeline ===")

    articles = load_articles()
    all_chunks = get_article_chunks()
    print(f"Total chunks generated: {len(all_chunks)}")

    qdrant = QdrantService()
    qdrant.ensure_collection()

    existing_ids = qdrant.get_existing_point_ids()
    print(f"Existing points in Qdrant: {len(existing_ids)}")

    new_chunks = [
        c for c in all_chunks
        if point_id(c.article_id, c.chunk_index) not in existing_ids
    ]
    print(f"New chunks to embed: {len(new_chunks)}")

    if not new_chunks:
        print("All chunks already ingested. Nothing to do.")
        return

    batch = new_chunks[:MAX_CHUNKS_TO_EMBED]
    held = len(new_chunks) - len(batch)
    already_done = len(all_chunks) - len(new_chunks)
    print(f"Embedding {len(batch)} chunks ({already_done} already done, {held} held for next run)")

    embedder = EmbeddingService()
    embeddings = embedder.embed_chunks(
        batch,
        delay=EMBED_DELAY,
    )
    print(f"Generated {len(embeddings)} embeddings")

    qdrant.upsert_chunks(batch, embeddings)

    print(f"\nDone. Embedded and stored {len(batch)} chunks.")


if __name__ == "__main__":
    main()
