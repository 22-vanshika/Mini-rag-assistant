from sentence_transformers import SentenceTransformer

from app.core.config import settings
from app.core.exceptions import EmbeddingError


class Embedder:
    def __init__(self, model_name: str = settings.EMBEDDING_MODEL) -> None:
        self.model_name = model_name
        self._model = None

    def _get_model(self) -> SentenceTransformer:
        if self._model is None:
            try:
                self._model = SentenceTransformer(self.model_name)
            except Exception as exc:
                raise EmbeddingError(f"Failed to load embedding model '{self.model_name}'") from exc
        return self._model

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            raise EmbeddingError("Cannot embed an empty list of texts")
        # Consistent with chunker: reject whitespace-only strings, not just "".
        if any(not t or not t.strip() for t in texts):
            raise EmbeddingError("Cannot embed empty or whitespace-only text")
        try:
            model = self._get_model()
            vectors = model.encode(texts)
            return [v.tolist() for v in vectors]
        except EmbeddingError:
            raise
        except Exception as exc:
            raise EmbeddingError("Failed to generate embeddings") from exc

    def embed_one(self, text: str) -> list[float]:
        if not text or not text.strip():
            raise EmbeddingError("Cannot embed empty or whitespace-only text")
        return self.embed([text])[0]


embedder = Embedder(model_name=settings.EMBEDDING_MODEL)
