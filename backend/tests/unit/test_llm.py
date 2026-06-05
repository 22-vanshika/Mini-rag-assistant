import httpx
import pytest

from app.core.exceptions import LLMConnectionError, LLMTimeoutError
from app.pipeline import llm

PROMPT = {"system": "you are a test", "user": "hello"}


def _ok_response() -> httpx.Response:
    return httpx.Response(200, json={"message": {"content": "the answer"}})


def _install(monkeypatch, steps):
    """Drive llm.generate with a scripted sequence of transport outcomes.

    Each item in `steps` is either an httpx.Response to return or an Exception to
    raise on that attempt. Returns a dict whose ``count`` tracks how many HTTP
    attempts were made.
    """
    state = {"count": 0}
    remaining = list(steps)

    def handler(request: httpx.Request) -> httpx.Response:
        state["count"] += 1
        outcome = remaining.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    real_async_client = httpx.AsyncClient

    def client_factory(*args, **kwargs):
        # Forward whatever llm.generate passed (timeout, and anything added later) and
        # override only the transport — a transparent passthrough that can't drift.
        kwargs["transport"] = httpx.MockTransport(handler)
        return real_async_client(*args, **kwargs)

    monkeypatch.setattr(llm.httpx, "AsyncClient", client_factory)

    # Make backoff instant so the suite stays fast.
    async def _no_sleep(_seconds):
        return None

    monkeypatch.setattr(llm.asyncio, "sleep", _no_sleep)
    return state


@pytest.mark.asyncio
async def test_succeeds_on_first_try(monkeypatch):
    state = _install(monkeypatch, [_ok_response()])
    result = await llm.generate(PROMPT)
    assert result == "the answer"
    assert state["count"] == 1


@pytest.mark.asyncio
async def test_retries_on_429_then_succeeds(monkeypatch):
    state = _install(monkeypatch, [httpx.Response(429), _ok_response()])
    result = await llm.generate(PROMPT)
    assert result == "the answer"
    assert state["count"] == 2


@pytest.mark.asyncio
async def test_retries_on_connect_error_then_succeeds(monkeypatch):
    connect_error = httpx.ConnectError("connection refused")
    state = _install(monkeypatch, [connect_error, _ok_response()])
    result = await llm.generate(PROMPT)
    assert result == "the answer"
    assert state["count"] == 2


@pytest.mark.asyncio
async def test_exhausts_retries_and_raises_connection_error(monkeypatch):
    from app.core.config import settings

    attempts = settings.LLM_MAX_RETRIES + 1
    state = _install(monkeypatch, [httpx.ConnectError("boom")] * attempts)
    with pytest.raises(LLMConnectionError):
        await llm.generate(PROMPT)
    assert state["count"] == attempts


@pytest.mark.asyncio
async def test_does_not_retry_on_client_error(monkeypatch):
    # A 400 is a caller error — it must fail immediately, no retries.
    state = _install(monkeypatch, [httpx.Response(400), _ok_response()])
    with pytest.raises(LLMConnectionError):
        await llm.generate(PROMPT)
    assert state["count"] == 1


@pytest.mark.asyncio
async def test_timeout_exhaustion_raises_timeout_error(monkeypatch):
    from app.core.config import settings

    attempts = settings.LLM_MAX_RETRIES + 1
    state = _install(monkeypatch, [httpx.TimeoutException("slow")] * attempts)
    with pytest.raises(LLMTimeoutError):
        await llm.generate(PROMPT)
    assert state["count"] == attempts
