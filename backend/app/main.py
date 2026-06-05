import logging
import re
from datetime import UTC, datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import router
from app.core.config import settings
from app.core.exceptions import AppException

logger = logging.getLogger(__name__)

app = FastAPI(title="DropChain", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _to_upper_snake_case(name: str) -> str:
    s = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", name)
    s = re.sub(r"([a-z\d])([A-Z])", r"\1_\2", s)
    return s.upper()


def _utc_now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


@app.exception_handler(AppException)
async def app_exception_handler(request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": exc.status_code,
            "code": _to_upper_snake_case(type(exc).__name__),
            "message": exc.message,
            "timestamp": _utc_now_iso(),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "status": 500,
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred",
            "timestamp": _utc_now_iso(),
        },
    )


@app.get("/health")
async def health_check() -> dict:
    return {"status": "ok"}


app.include_router(router)
