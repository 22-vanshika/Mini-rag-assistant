import json

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2:3b"
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    APP_ENV: str = "development"

    # Pipeline tunables — all in one place per CLAUDE.md §7.3.
    MAX_FILE_SIZE_BYTES: int = 1 * 1024 * 1024
    SIMILARITY_THRESHOLD: float = 0.3
    TOP_K_RESULTS: int = 5
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    LLM_TIMEOUT_SECONDS: float = 30.0
    # Retries are attempts *after* the first call. Backoff is exponential:
    # delay = LLM_BACKOFF_BASE_SECONDS * 2 ** attempt (see pipeline/llm.py).
    LLM_MAX_RETRIES: int = 3
    LLM_BACKOFF_BASE_SECONDS: float = 0.5
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: object) -> object:
        # Accept both a JSON list (["a","b"]) and a comma-separated string (a,b)
        # so the same value works in .env files and shell-exported env vars.
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                return json.loads(v)
            return [origin.strip() for origin in v.split(",")]
        return v

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
