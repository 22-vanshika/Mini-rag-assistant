from pydantic import BaseModel


class IngestResponse(BaseModel):
    message: str
    chunks_stored: int
