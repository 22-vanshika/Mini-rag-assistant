import asyncio

from app.core.config import settings
from app.pipeline.chunker import chunk_text
from app.pipeline.embedder import embedder
from app.pipeline.vector_store import vector_store
from app.schemas.ingest import IngestResponse


async def ingest_document(text: str) -> IngestResponse:
    chunks = await asyncio.to_thread(
        chunk_text, text, chunk_size=settings.CHUNK_SIZE, overlap=settings.CHUNK_OVERLAP
    )
    embeddings = await asyncio.to_thread(embedder.embed, chunks)
    await asyncio.to_thread(vector_store.store, chunks, embeddings)
    return IngestResponse(message="Document ingested successfully", chunks_stored=len(chunks))
