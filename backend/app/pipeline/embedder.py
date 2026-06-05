from sentence_transformers import SentenceTransformer

from app.core.exceptions import EmbeddingError


class Embedder:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        try:
            self._model = SentenceTransformer(model_name)
        except Exception as exc:
            raise EmbeddingError(f"Failed to load embedding model '{model_name}'") from exc

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            raise EmbeddingError("Cannot embed an empty list of texts")
        # Consistent with chunker: reject whitespace-only strings, not just "".
        if any(not t or not t.strip() for t in texts):
            raise EmbeddingError("Cannot embed empty or whitespace-only text")
        try:
            vectors = self._model.encode(texts)
            return [v.tolist() for v in vectors]
        except Exception as exc:
            raise EmbeddingError("Failed to generate embeddings") from exc

    def embed_one(self, text: str) -> list[float]:
        if not text or not text.strip():
            raise EmbeddingError("Cannot embed empty or whitespace-only text")
        return self.embed([text])[0]


embedder = Embedder()
