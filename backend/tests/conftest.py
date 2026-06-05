"""Shared fixtures for the backend test suite. No test logic lives here."""

import pytest

from app.pipeline.vector_store import VectorStore


@pytest.fixture
def sample_chunks() -> list[str]:
    return [
        "The mitochondria is the powerhouse of the cell.",
        "Python is a high-level programming language.",
        "The Eiffel Tower is located in Paris, France.",
    ]


@pytest.fixture
def sample_embeddings() -> list[list[float]]:
    # Small 4-dimensional, distinct, non-zero vectors so cosine similarity is
    # meaningful and tests run instantly without loading a real model. The first
    # three are orthogonal unit vectors, which makes "which chunk matched" obvious.
    return [
        [1.0, 0.0, 0.0, 0.0],
        [0.0, 1.0, 0.0, 0.0],
        [0.0, 0.0, 1.0, 0.0],
    ]


@pytest.fixture
def fresh_vector_store() -> VectorStore:
    # A brand-new instance every test — never the module-level singleton — so
    # state never leaks between tests.
    return VectorStore()
