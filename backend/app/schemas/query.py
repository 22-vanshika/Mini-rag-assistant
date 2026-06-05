from pydantic import BaseModel


class QueryRequest(BaseModel):
    query: str


class Citation(BaseModel):
    chunk: str
    score: float


class QueryResponse(BaseModel):
    answer: str
    citations: list[Citation]
    context_found: bool
