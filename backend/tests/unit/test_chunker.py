import threading

import pytest

from app.core.exceptions import DocumentEmptyError
from app.pipeline.chunker import chunk_text


def test_empty_string_raises():
    with pytest.raises(DocumentEmptyError):
        chunk_text("")


def test_whitespace_only_raises():
    with pytest.raises(DocumentEmptyError):
        chunk_text("     ")


def test_short_text_returns_single_chunk():
    result = chunk_text("Hello world")
    assert result == ["Hello world"]


def test_long_text_produces_multiple_chunks():
    result = chunk_text("word " * 300)  # 1500 chars, well over the 500 default
    assert len(result) > 1


def test_all_chunks_are_non_empty_strings():
    result = chunk_text("sentence one. sentence two. " * 50)
    assert all(isinstance(chunk, str) and chunk for chunk in result)


def test_overlap_means_chunks_share_content():
    # No spaces and no ". " boundaries, so every window advances by a fixed
    # stride and the overlap region is exact and predictable.
    text = "abcdefghij" * 120  # 1200 chars
    chunks = chunk_text(text, chunk_size=100, overlap=20)

    assert len(chunks) > 1
    # The last `overlap` chars of each chunk must equal the first `overlap`
    # chars of the next. Every chunk but the last is full length, so this holds
    # for all consecutive pairs.
    for current, following in zip(chunks, chunks[1:]):
        assert current[-20:] == following[:20]


def test_no_infinite_loop_on_no_sentence_boundaries():
    # Run in a daemon thread so a regression that loops forever fails fast
    # instead of hanging the whole CI job.
    captured: dict[str, list[str]] = {}

    def run() -> None:
        captured["chunks"] = chunk_text("a" * 2000, chunk_size=200, overlap=50)

    worker = threading.Thread(target=run, daemon=True)
    worker.start()
    worker.join(timeout=5)

    assert not worker.is_alive(), "chunk_text did not finish — possible infinite loop"
    assert captured["chunks"]
    assert len(captured["chunks"]) < 1000  # bounded, proves forward progress


def test_chunks_cover_full_content():
    text = "The quick brown fox. " * 20
    chunks = chunk_text(text)
    joined = " ".join(chunks)
    for word in ("The", "quick", "brown", "fox"):
        assert word in joined


def test_custom_chunk_size_respected():
    chunks = chunk_text("word " * 100, chunk_size=50, overlap=10)
    assert len(chunks) > 1
    # 50 plus a little slack for sentence-boundary tolerance.
    assert max(len(chunk) for chunk in chunks) < 80
