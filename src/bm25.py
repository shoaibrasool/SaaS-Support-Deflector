import math
import re
from collections import Counter
from typing import Dict, List, Tuple

from src.data_loader import ArticleChunk


def _tokenize(text: str) -> List[str]:
    text = re.sub(r"[^\w]", " ", text.lower())
    return text.strip().split()


class BM25Index:
    def __init__(self, chunks: List[ArticleChunk]):
        self.chunks = chunks
        self.k1 = 1.2
        self.b = 0.75
        self._build()

    def _build(self):
        self.doc_lens: List[int] = []
        self.tf: List[Dict[str, int]] = []
        df: Dict[str, int] = {}

        for chunk in self.chunks:
            tokens = _tokenize(chunk.body_chunk)
            self.doc_lens.append(len(tokens))
            counter = Counter(tokens)
            self.tf.append(dict(counter))
            for token in counter:
                df[token] = df.get(token, 0) + 1

        self.avgdl = sum(self.doc_lens) / len(self.doc_lens) if self.doc_lens else 0
        self.num_docs = len(self.chunks)
        self.idf: Dict[str, float] = {}
        for token, doc_freq in df.items():
            self.idf[token] = math.log(
                (self.num_docs - doc_freq + 0.5) / (doc_freq + 0.5) + 1
            )

    def search(self, query: str, top_k: int = 5) -> List[Tuple[int, float]]:
        query_tokens = set(_tokenize(query))
        if not query_tokens:
            return []

        scores: List[Tuple[int, float]] = []
        for i, chunk_tf in enumerate(self.tf):
            score = 0.0
            for token in query_tokens:
                if token not in self.idf or token not in chunk_tf:
                    continue
                tf_val = chunk_tf[token]
                idf_val = self.idf[token]
                doc_len = self.doc_lens[i]
                numerator = tf_val * (self.k1 + 1)
                denominator = tf_val + self.k1 * (
                    1 - self.b + self.b * doc_len / self.avgdl
                )
                score += idf_val * numerator / denominator

            if score > 0:
                scores.append((i, score))

        scores.sort(key=lambda x: -x[1])
        return scores[:top_k]
