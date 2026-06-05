import pytest
from pydantic import ValidationError

from app.schemas.ingest import IngestResponse
from app.schemas.query import Citation, QueryRequest, QueryResponse


def test_query_request_valid():
    request = QueryRequest(query="What is RAG?")
    assert request.query == "What is RAG?"


def test_query_request_empty_string_raises():
    with pytest.raises(ValidationError):
        QueryRequest(query="")


def test_query_request_whitespace_only_raises():
    with pytest.raises(ValidationError):
        QueryRequest(query="   ")


def test_query_request_strips_whitespace():
    request = QueryRequest(query="  hello  ")
    assert request.query == "hello"


def test_ingest_response_valid():
    response = IngestResponse(message="ok", chunks_stored=3)
    assert response.message == "ok"
    assert response.chunks_stored == 3


def test_citation_valid():
    citation = Citation(chunk="some text", score=0.85)
    assert citation.chunk == "some text"
    assert citation.score == 0.85


def test_query_response_context_found_true():
    response = QueryResponse(
        answer="yes",
        citations=[Citation(chunk="x", score=0.9)],
        context_found=True,
    )
    assert response.context_found is True
    assert len(response.citations) == 1


def test_query_response_context_found_false():
    response = QueryResponse(answer="I don't know", citations=[], context_found=False)
    assert response.context_found is False
    assert response.citations == []
