from fastapi import APIRouter, File, UploadFile

from app.core.exceptions import DocumentEmptyError, DocumentTooLargeError, UnsupportedFileTypeError
from app.schemas.ingest import IngestResponse
from app.services.ingest_service import ingest_document

router = APIRouter()

MAX_FILE_SIZE: int = 1 * 1024 * 1024  # 1 MB


@router.post("/ingest", response_model=IngestResponse, status_code=201)
async def ingest(file: UploadFile = File(...)) -> IngestResponse:
    if not file.filename or not file.filename.endswith(".txt"):
        raise UnsupportedFileTypeError()

    contents = await file.read()

    if len(contents) > MAX_FILE_SIZE:
        raise DocumentTooLargeError()
    if len(contents) == 0:
        raise DocumentEmptyError()

    try:
        text = contents.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise UnsupportedFileTypeError("File content is not valid UTF-8 text") from exc

    return await ingest_document(text)
