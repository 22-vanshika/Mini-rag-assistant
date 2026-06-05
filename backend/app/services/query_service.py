import asyncio

from app.core.config import settings
from app.core.exceptions import QueryEmptyError
from app.pipeline.embedder import embedder
from app.pipeline.llm import generate
from app.pipeline.prompt_builder import build_prompt
from app.pipeline.vector_store import vector_store
from app.schemas.query import Citation, QueryResponse

_NO_CONTEXT_ANSWER = (
    "I don't have enough information in the provided context to answer this question."
)


async def query_document(query: str) -> QueryResponse:
    if not query or not query.strip():
        raise QueryEmptyError()

    query_embedding = await asyncio.to_thread(embedder.embed_one, query)
    results = await asyncio.to_thread(
        vector_store.search, query_embedding, settings.TOP_K_RESULTS
    )

    if not results:
        return QueryResponse(answer=_NO_CONTEXT_ANSWER, citations=[], context_found=False)

    filtered = [r for r in results if r["score"] >= settings.SIMILARITY_THRESHOLD]

    if not filtered:
        return QueryResponse(answer=_NO_CONTEXT_ANSWER, citations=[], context_found=False)

    prompt = build_prompt([r["chunk"] for r in filtered], query)
    answer = await generate(prompt)

    return QueryResponse(
        answer=answer,
        citations=[Citation(chunk=r["chunk"], score=r["score"]) for r in filtered],
        context_found=True,
    )
