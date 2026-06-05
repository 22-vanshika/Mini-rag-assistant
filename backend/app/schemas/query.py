from pydantic import BaseModel, field_validator


class QueryRequest(BaseModel):
    query: str

    @field_validator("query")
    @classmethod
    def query_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Query must not be empty or whitespace")
        return v.strip()


class Citation(BaseModel):
    chunk: str
    score: float


class QueryResponse(BaseModel):
    answer: str
    citations: list[Citation]
    context_found: bool
