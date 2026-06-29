import time
from typing import List, Optional

from google import genai
from google.genai import types

from src.config import EMBEDDING_MODEL, GOOGLE_API_KEY


class EmbeddingService:
    def __init__(self, api_key: str = GOOGLE_API_KEY, model: str = EMBEDDING_MODEL):
        self.client = genai.Client(api_key=api_key)
        self.model = model

    def embed_document(self, text: str, title: str = "") -> List[float]:
        prefixed = f"title: {title} | text: {text}"
        result = self.client.models.embed_content(
            model=self.model,
            contents=prefixed,
        )
        return result.embeddings[0].values

    def embed_chunks(self, chunks, max_chunks: Optional[int] = None, delay: float = 0.05):
        if max_chunks:
            chunks = chunks[:max_chunks]

        embeddings: List[List[float]] = []
        total = len(chunks)

        for i, chunk in enumerate(chunks):
            embedding = self.embed_document(
                text=chunk.body_chunk,
                title=chunk.title,
            )
            embeddings.append(embedding)

            if (i + 1) % 50 == 0 or i == 0 or i == total - 1:
                print(f"  Embedded chunk {i + 1}/{total}")

            if i < total - 1:
                time.sleep(delay)

        return embeddings
