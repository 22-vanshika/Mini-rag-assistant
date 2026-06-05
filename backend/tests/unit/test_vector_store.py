import threading

import pytest

from app.core.exceptions import VectorStoreError

# NOTE: VectorStore itself is provided by the `fresh_vector_store` fixture, so it is
# intentionally not imported here — an unused import would fail the ruff lint check.


def test_search_empty_store_returns_empty_list(fresh_vector_store):
    assert fresh_vector_store.search([0.1, 0.2, 0.3, 0.4], top_k=5) == []


def test_store_and_search_returns_results(fresh_vector_store, sample_chunks, sample_embeddings):
    fresh_vector_store.store(sample_chunks, sample_embeddings)
    results = fresh_vector_store.search([1.0, 0.0, 0.0, 0.0], top_k=5)
    assert results


def test_search_returns_correct_structure(fresh_vector_store, sample_chunks, sample_embeddings):
    fresh_vector_store.store(sample_chunks, sample_embeddings)
    results = fresh_vector_store.search([1.0, 0.0, 0.0, 0.0], top_k=5)
    for result in results:
        assert isinstance(result["chunk"], str)
        assert isinstance(result["score"], float)


def test_similarity_score_range(fresh_vector_store, sample_chunks, sample_embeddings):
    fresh_vector_store.store(sample_chunks, sample_embeddings)
    results = fresh_vector_store.search([0.5, 0.5, 0.5, 0.5], top_k=5)
    for result in results:
        # Cosine similarity is mathematically in [-1, 1]; allow tiny float slack.
        assert -1.0 - 1e-6 <= result["score"] <= 1.0 + 1e-6


def test_top_k_limits_results(fresh_vector_store, sample_chunks, sample_embeddings):
    fresh_vector_store.store(sample_chunks, sample_embeddings)
    results = fresh_vector_store.search([1.0, 0.0, 0.0, 0.0], top_k=2)
    assert len(results) == 2


def test_top_k_larger_than_stored_returns_all(fresh_vector_store):
    fresh_vector_store.store(["a", "b"], [[1.0, 0.0, 0.0, 0.0], [0.0, 1.0, 0.0, 0.0]])
    results = fresh_vector_store.search([1.0, 0.0, 0.0, 0.0], top_k=10)
    assert len(results) == 2


def test_store_replaces_existing_content(fresh_vector_store):
    chunks_a = ["alpha apple", "alpha avocado"]
    embeddings_a = [[1.0, 0.0, 0.0, 0.0], [0.9, 0.1, 0.0, 0.0]]
    chunks_b = ["beta banana", "beta blueberry"]
    embeddings_b = [[0.0, 0.0, 1.0, 0.0], [0.0, 0.0, 0.9, 0.1]]

    fresh_vector_store.store(chunks_a, embeddings_a)
    fresh_vector_store.store(chunks_b, embeddings_b)

    results = fresh_vector_store.search([0.0, 0.0, 1.0, 0.0], top_k=5)
    returned = {result["chunk"] for result in results}
    assert returned == set(chunks_b)
    assert all("alpha" not in chunk for chunk in returned)


def test_store_empty_chunks_raises(fresh_vector_store):
    with pytest.raises(VectorStoreError):
        fresh_vector_store.store([], [])


def test_store_mismatched_lengths_raises(fresh_vector_store):
    with pytest.raises(VectorStoreError):
        fresh_vector_store.store(["a"], [[0.1, 0.2], [0.3, 0.4]])


def test_clear_empties_store(fresh_vector_store, sample_chunks, sample_embeddings):
    fresh_vector_store.store(sample_chunks, sample_embeddings)
    fresh_vector_store.clear()
    assert fresh_vector_store.search([1.0, 0.0, 0.0, 0.0], top_k=5) == []


def test_zero_vector_query_raises(fresh_vector_store, sample_chunks, sample_embeddings):
    fresh_vector_store.store(sample_chunks, sample_embeddings)
    with pytest.raises(VectorStoreError):
        fresh_vector_store.search([0.0, 0.0, 0.0, 0.0], top_k=5)


def test_concurrent_store_and_search_no_crash(
    fresh_vector_store, sample_chunks, sample_embeddings
):
    # Exceptions raised inside a thread do not propagate to the main thread, so we
    # collect them explicitly and assert none occurred — this is what exercises the lock.
    errors: list[Exception] = []

    def writer() -> None:
        try:
            for _ in range(10):
                fresh_vector_store.store(sample_chunks, sample_embeddings)
        except Exception as exc:
            errors.append(exc)

    def reader() -> None:
        try:
            for _ in range(10):
                fresh_vector_store.search([1.0, 0.0, 0.0, 0.0], top_k=3)
        except Exception as exc:
            errors.append(exc)

    threads = [threading.Thread(target=writer) for _ in range(5)]
    threads += [threading.Thread(target=reader) for _ in range(5)]

    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert not errors, f"Concurrent access raised: {errors}"
