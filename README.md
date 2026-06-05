# Mini RAG Assistant

A mini contextual AI assistant. Upload a small `.txt` document, then ask questions
about it — the assistant answers **only** from the content of that document, and
returns the raw source snippets (citations) it used so every answer can be verified.
The backend is built with **FastAPI (Python)**, runs a local **Retrieval-Augmented
Generation (RAG)** pipeline using **sentence-transformers** for embeddings and an
in-memory vector store for similarity search, and generates answers with a local
**Ollama** LLM. The frontend is **React + TypeScript (Vite)**.

---

## Architecture

The backend follows a strict four-layer architecture; data flows in one direction
only and no layer reaches across another:

```
Request → Router (api/router.py)
        → Route handler (api/v1/ingest.py | api/v1/query.py)   — parse request, call one service
        → Service (services/ingest_service.py | query_service.py) — business logic / orchestration
        → Pipeline (pipeline/*)                                  — the only place that calls
                                                                    sentence-transformers / Ollama / numpy
```

All external calls are isolated in `pipeline/`, so the LLM or embedding provider can
be swapped by changing one module without touching the service layer. All tunable
parameters (chunk size, similarity threshold, top-k, timeouts, model names) live in
`app/core/config.py`. All env vars are read only there. Errors are typed domain
exceptions formatted into a single JSON envelope in `app/main.py`.

### RAG pipeline flow

**Ingestion** (`POST /api/v1/ingest`):

```
.txt upload → validate (extension, size, UTF-8) → chunker → embedder → vector store
```

**Query** (`POST /api/v1/query`):

```
question → embedder → vector store (similarity search)
        → threshold filter → prompt builder (context + question)
        → Ollama LLM → answer + citations
```

The vector store is **intentionally in-memory** (a numpy-backed cosine-similarity
store). It is thread-safe and dependency-free, which keeps the stack simple for this
assignment. **ChromaDB** is the natural future upgrade path when persistence and scale
are required — the `VectorStore` interface is narrow enough to swap behind it.

---

## Quick Start (Local — No Docker)

**Prerequisites:** Python 3.11+, Node 20+, [Ollama](https://ollama.com) installed.

1. **Clone the repo**
   ```bash
   git clone <repo-url>
   cd DropChain
   ```

2. **Backend setup**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate        # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   The API is now on http://localhost:8000 (health check: http://localhost:8000/health).

3. **Frontend setup** (in a new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   The UI is now on http://localhost:5173.

4. **Pull the model** (in a new terminal)
   ```bash
   ollama pull llama3.2:3b
   ```

5. **Start Ollama** (if it is not already running as a service)
   ```bash
   ollama serve
   ```

Copy `.env.example` to `.env` if you want to override any defaults; the backend runs
with the documented defaults if no `.env` is present.

---

## Quick Start (Docker)

**Prerequisites:** Docker + Docker Compose.

1. **Build and start the full stack**
   ```bash
   docker compose up --build
   ```
   This boots three services: `ollama`, `backend`, and `frontend`.

2. **Pull the model into the Ollama service.** Once `ollama` is up, in a new terminal:
   ```bash
   docker exec $(docker ps -qf "name=ollama") ollama pull llama3.2:3b
   ```

3. **Open the app** at http://localhost:5173.

---

## Environment Variables

| Variable          | Default                      | Description                                                        |
| ----------------- | ---------------------------- | ------------------------------------------------------------------ |
| `OLLAMA_BASE_URL` | `http://localhost:11434`     | Base URL of the Ollama server. In Docker this is `http://ollama:11434`. |
| `OLLAMA_MODEL`    | `llama3.2:3b`                | Ollama model used for answer generation.                           |
| `BACKEND_HOST`    | `0.0.0.0`                    | Host the backend binds to.                                         |
| `BACKEND_PORT`    | `8000`                       | Port the backend listens on.                                       |
| `CORS_ORIGINS`    | `["http://localhost:5173"]`  | Allowed CORS origins. Accepts a JSON list or a comma-separated string. |
| `APP_ENV`         | `development`                | Application environment label.                                     |

All variables are read in one place (`app/core/config.py`) and have safe defaults.

---

## API Reference

| Method | Path             | Description                                          | Request                                  | Response                                                                 |
| ------ | ---------------- | ---------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------- |
| `POST` | `/api/v1/ingest` | Upload a `.txt` file; chunk, embed, and store it.    | `multipart/form-data` with `file` (.txt, ≤ 1 MB) | `201` `{ "message": str, "chunks_stored": int }`                |
| `POST` | `/api/v1/query`  | Ask a question; retrieve, prompt the LLM, and answer.| `application/json` `{ "query": str }`    | `200` `{ "answer": str, "citations": [{ "chunk": str, "score": float }], "context_found": bool }` |
| `GET`  | `/health`        | Liveness check.                                      | —                                        | `200` `{ "status": "ok" }`                                              |

**Error envelope** (all error responses):

```json
{ "status": 422, "code": "DOCUMENT_EMPTY_ERROR", "message": "...", "timestamp": "2026-06-05T10:00:00Z" }
```

| Scenario                                  | Status |
| ----------------------------------------- | ------ |
| Empty file, oversized file, empty query   | 422    |
| Non-`.txt` / non-UTF-8 upload             | 422    |
| Ollama unreachable / bad response         | 502    |
| Ollama request timed out                  | 504    |
| Unexpected internal error                 | 500    |

---

## Design Decisions

- **In-memory vector store instead of ChromaDB.** The assignment explicitly allows an
  in-memory array, and a numpy cosine-similarity store has zero operational overhead —
  no extra service, no persistence layer, fewer moving parts. The trade-off is that the
  store resets on restart. ChromaDB is the documented upgrade path; the `VectorStore`
  interface is narrow so it can be swapped without touching the service layer.

- **Local sentence-transformers embeddings instead of OpenAI.** Keeps the system fully
  local, free, and offline — no API key, no network dependency, deterministic output for
  the same input. `all-MiniLM-L6-v2` is small and fast and adequate for short documents.

- **Ollama instead of a hosted LLM API.** Same rationale: local, free, and private. No
  secrets to manage and no per-token cost, which suits an internal operations tool.

- **Retry with exponential backoff on LLM calls.** LLM calls are unreliable, so transient
  failures — connection errors, timeouts, rate limits (429) and 5xx (e.g. Ollama still
  loading the model) — are retried up to `LLM_MAX_RETRIES` times with exponential backoff
  (`LLM_BACKOFF_BASE_SECONDS * 2 ** attempt`), honouring a `Retry-After` header when present.
  Caller errors (other 4xx) and malformed response bodies are *not* retried — they fail fast.
  After exhausting retries a typed `LLMTimeoutError`/`LLMConnectionError` is raised, never a
  silent empty answer.

- **Similarity threshold (`0.3`).** After retrieval, chunks scoring below the cosine
  threshold are discarded. If nothing clears the threshold the pipeline **short-circuits**
  and returns `context_found=false` with a fixed "not enough information" answer instead of
  calling the LLM — this prevents the model from fabricating answers when the knowledge
  base has no relevant content. Raising the threshold makes retrieval stricter; lowering it
  is more permissive.

- **Citations captured at retrieval time.** The retrieved chunks and their scores are
  carried through the pipeline as structured, typed data and returned alongside the answer —
  never reconstructed after the fact — so the UI can always show exactly what the answer
  was grounded in.

- **Known limitations.**
  - The vector store resets on restart (no persistence).
  - File validation is extension-based (`.txt`) plus a UTF-8 decode check; MIME is not
    deep-inspected.

---

## Assumptions

- A single active document set is sufficient: ingesting a new document **replaces** the
  previous store rather than appending to it.
- Documents are small (≤ 1 MB) plain-text `.txt` files, consistent with the assignment.
- A single local user / internal tool — no authentication or multi-tenancy is required.
- Ollama and the `llama3.2:3b` model are available to the backend at the configured URL.
