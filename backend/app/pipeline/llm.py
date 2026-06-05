import httpx

from app.core.config import settings
from app.core.exceptions import LLMConnectionError, LLMTimeoutError
from app.pipeline.prompt_builder import PromptDict


async def generate(prompt: PromptDict) -> str:
    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": prompt["system"]},
            {"role": "user", "content": prompt["user"]},
        ],
        "stream": False,
    }
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
                raise LLMConnectionError(
                    f"Unexpected response shape from Ollama: {response.text[:200]}"
                ) from exc
    except httpx.ConnectError as exc:
        raise LLMConnectionError() from exc
    except httpx.TimeoutException as exc:
        raise LLMTimeoutError() from exc
    except httpx.HTTPStatusError as exc:
        raise LLMConnectionError(
            f"Language model returned {exc.response.status_code}"
        ) from exc
