import asyncio
import logging

import httpx

from app.core.config import settings
from app.core.exceptions import LLMConnectionError, LLMTimeoutError
from app.pipeline.prompt_builder import PromptDict

logger = logging.getLogger(__name__)

# Status codes that signal a transient failure worth retrying. Rate limiting (429)
# and server-side errors (5xx, e.g. Ollama still loading the model) can succeed on a
# retry; other 4xx responses are caller errors and are raised immediately.
_RETRYABLE_STATUS_CODES = frozenset({429, 500, 502, 503, 504})


def _retry_after_seconds(response: httpx.Response) -> float | None:
    """Return the Retry-After delay in seconds, if the server sent one we can parse.

    Only the integer-seconds form is honoured; the HTTP-date form falls back to the
    caller's exponential backoff.
    """
    value = response.headers.get("Retry-After")
    if not value:
        return None
    try:
        return max(0.0, float(value))
    except ValueError:
        return None


async def generate(prompt: PromptDict) -> str:
    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": prompt["system"]},
            {"role": "user", "content": prompt["user"]},
        ],
        "stream": False,
    }

    last_exc: Exception | None = None

    # One initial attempt plus LLM_MAX_RETRIES retries.
    for attempt in range(settings.LLM_MAX_RETRIES + 1):
        retry_after: float | None = None
        try:
            async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/chat",
                    json=payload,
                )
                response.raise_for_status()
                try:
                    return response.json()["message"]["content"]
                except (KeyError, ValueError) as exc:
                    # A malformed body is not transient — retrying won't help.
                    raise LLMConnectionError(
                        f"Unexpected response shape from Ollama: {response.text[:200]}"
                    ) from exc
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code not in _RETRYABLE_STATUS_CODES:
                raise LLMConnectionError(
                    f"Language model returned {exc.response.status_code}"
                ) from exc
            last_exc = exc
            retry_after = _retry_after_seconds(exc.response)
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            last_exc = exc

        # Reached only after a transient failure. Back off before the next attempt.
        if attempt < settings.LLM_MAX_RETRIES:
            delay = (
                retry_after
                if retry_after is not None
                else settings.LLM_BACKOFF_BASE_SECONDS * 2**attempt
            )
            logger.warning(
                "Ollama call failed (attempt %d/%d), retrying in %.2fs: %s",
                attempt + 1,
                settings.LLM_MAX_RETRIES + 1,
                delay,
                last_exc,
            )
            await asyncio.sleep(delay)

    # All attempts exhausted — raise a typed error reflecting the last failure.
    if isinstance(last_exc, httpx.TimeoutException):
        raise LLMTimeoutError() from last_exc
    raise LLMConnectionError(
        f"Failed to reach language model after {settings.LLM_MAX_RETRIES + 1} attempts"
    ) from last_exc
