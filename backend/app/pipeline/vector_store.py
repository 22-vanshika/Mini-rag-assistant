import logging
import threading

import numpy as np

from app.core.exceptions import VectorStoreError

logger = logging.getLogger(__name__)


class VectorStore:
    def __init__(self) -> None:
        self._chunks: list[str] = []
        self._embeddings: list[list[float]] = []
        # Single lock covers both reads and writes.
        # search() must hold the lock so a concurrent store() cannot
        # replace the lists mid-computation and produce a length mismatch.
        self._lock = threading.Lock()

    def store(self, chunks: list[str], embeddings: list[list[float]]) -> None:
        if not chunks or not embeddings:
            raise VectorStoreError("chunks and embeddings must not be empty")
        if len(chunks) != len(embeddings):
            raise VectorStoreError(
                f"Length mismatch: {len(chunks)} chunks vs {len(embeddings)} embeddings"
            )
        with self._lock:
            self._chunks = list(chunks)
            self._embeddings = list(embeddings)

    def search(self, query_embedding: list[float], top_k: int = 5) -> list[dict]:
        with self._lock:
            if not self._chunks:
                return []
            try:
                q = np.array(query_embedding, dtype=np.float32)
                matrix = np.array(self._embeddings, dtype=np.float32)

                q_norm = np.linalg.norm(q)
                if q_norm == 0.0:
                    raise VectorStoreError("Query embedding is a zero vector")

                row_norms = np.linalg.norm(matrix, axis=1)
                # 1e-10 prevents division by zero for degenerate stored embeddings
                scores = (matrix @ q) / (row_norms * q_norm + 1e-10)

                k = min(top_k, len(self._chunks))
                top_indices = np.argsort(scores)[::-1][:k]
                return [
                    {"chunk": self._chunks[int(i)], "score": float(scores[i])}
                    for i in top_indices
                ]
            except VectorStoreError:
                raise
            except Exception as exc:
                raise VectorStoreError(f"Search failed: {exc}") from exc

    def clear(self) -> None:
        with self._lock:
            self._chunks = []
            self._embeddings = []


vector_store = VectorStore()
