# AI Prompts Log

---

### Scaffold full project structure

**Tool used:** Claude Code (VS Code extension)

**Prompt:**
ok so I need you to set up the full project structure for a full stack RAG app. frontend
should be React with Vite and TypeScript, put it in /frontend. backend should be FastAPI
with Python, put it in /backend. just create all the folders and empty files, don't write
any logic yet. I also need docker-compose, .env.example, .gitignore and a readme at the root.
follow the project standards file for anything I haven't mentioned like folder names,
what files go where, naming rules, all of that.

**Outcome:**
Used directly. Claude Code created all 56 files and directories in one pass including
requirements.txt, package.json, docker-compose.yml, .env.example, and all empty module stubs.

**Reflection:**
Worked well overall. The .gitignore write failed on the first try because the file already
existed — Claude Code caught it and merged the contents correctly on retry. Pointing it at
the project standards file meant I didn't have to spell out every folder name or naming rule,
it just picked those up from there.

---

### Backend core — config, exceptions, app factory

**Tool used:** Claude Code (VS Code extension)

**Prompt:**
now implement the backend core layer, just three files. config.py should read all env vars
using pydantic-settings. exceptions.py should have a base AppException class and then typed
subclasses for each error the app can throw. main.py should set up the FastAPI app, add CORS,
register exception handlers that return a standard error envelope, and add a health check route.
use the project standards file for the error envelope format, status codes, and anything else
I haven't spelled out here.

**Outcome:**
Generated correctly. One fix needed before accepting — the helper that converts exception
class names to UPPER_SNAKE_CASE used a single regex that broke on consecutive capitals
(LLMConnectionError was turning into L_L_M_CONNECTION_ERROR instead of LLM_CONNECTION_ERROR).
Fixed it with a two-pass regex. Also moved the health check route above include_router
because order matters in FastAPI.

**Reflection:**
AI handled the boilerplate well. The acronym edge case in the snake_case conversion was
something I had to catch and fix myself — the AI didn't think about class names with
multiple capitals in a row.

---

### RAG pipeline — chunker, embedder, vector store, prompt builder

**Tool used:** Claude Code (VS Code extension)

**Prompt:**
hey so I have these four pipeline files I need you to write. they are all empty right now.
first just look at the specs and tell me if anything looks wrong, like roast it.
then go ahead and fix the problems and implement everything.

the four files are chunker.py, embedder.py, vector_store.py and prompt_builder.py,
all inside backend/app/pipeline/. don't touch anything else.

chunker just needs to split text into chunks with overlap, try to cut at sentence endings
if possible. embedder wraps the sentence transformers model. vector store holds everything
in memory and does cosine similarity search, needs to be thread safe. prompt builder just
takes the chunks and the question and makes a prompt dict with system and user keys.

**Outcome:**
Claude first reviewed the specs and found three real problems before writing anything:

1. chunker.py — the sentence boundary search could cause an infinite loop. if a boundary
   landed near the start of the window, the next window started at the same spot. fixed by
   only searching the second half of the window so it always moves forward.

2. vector_store.py — search() had a race condition because only store() held the lock,
   not search(). also the spec said search() should silently return [] on any error which
   is bad because you'd get no results and not know why. fixed both — search() now holds
   the lock and raises VectorStoreError instead of hiding failures.

3. embedder.py — only checked for empty string but not whitespace-only strings, while
   chunker already rejected whitespace. made them consistent.

4. prompt_builder.py — changed plain dict return to TypedDict for type safety.

all four files passed smoke tests on first run.

**Reflection:**
Getting Claude to review the spec first before coding was really useful. The infinite loop
bug in the chunker was the most important one — it would only show up on real text, not
on short test strings you'd write quickly. The silent failure in vector store was also
a big deal because quiet wrong answers are way harder to debug than clear errors.

---

### API routes, services, and schema layer

**Tool used:** Claude Code (VS Code extension)

**Prompt:**
ok I need you to implement the API layer and service layer now. I have the specs written out
for the schemas, services, route handlers and the router. before you just go ahead and write
everything, look at it first and tell me if anything looks wrong with the design — check it
against the project standards too not just the spec.

the schemas are IngestResponse, QueryRequest, QueryResponse and Citation.
ingest service takes the text, chunks it, embeds the chunks, stores them, returns how many
chunks got stored. query service takes the query, embeds it, searches, filters by threshold,
builds a prompt and calls ollama, returns the answer with citations.
ingest route handles .txt file uploads max 1mb. query route just takes a json body with
the query string.

spec says to call ollama directly from the query service using httpx, and to raise
NoContextFoundError with status_code 200 when nothing is found. something feels off
about both of those but I'm not 100% sure, just flag whatever you think is wrong
and then implement with fixes.

check project standards for anything I didn't mention — layer rules, where external calls
should live, how to handle async vs sync pipeline code, constants placement, all of that.

**Outcome:**
Claude reviewed first and caught a few real issues before writing anything. The ollama httpx
call got moved out of the service into a new pipeline/llm.py to follow the layer rules.
NoContextFoundError had status_code=200 which would return HTTP 200 with an error body —
changed to return a proper QueryResponse with context_found=False instead. The sync pipeline
calls in ingest_service got wrapped in asyncio.to_thread since sentence-transformers is
CPU-heavy and would've blocked the event loop. Also fixed build_prompt getting a list[dict]
instead of list[str], added UnicodeDecodeError handling for non-UTF-8 files, and moved
MAX_FILE_SIZE to module level. Had to add python-multipart to requirements.txt separately —
FastAPI needs it for UploadFile but it wasn't there.

**Reflection:**
Getting Claude to review the spec against the project standards before coding caught most of
the real bugs. The architecture violation was the most important fix — putting the httpx call
in the service would've broken the layering rule and made it hard to swap providers later.
The status_code=200 on an exception was a subtle one I wouldn't have caught just reading
quickly. The asyncio.to_thread fix was something I would've noticed only once the server
started dropping requests under any load.

---

### LLM error handling — HTTPStatusError not caught

**Tool used:** Claude Code (VS Code extension)

**Prompt:**
getting a 500 from the query endpoint when ollama errors. server logs show httpx.HTTPStatusError
from response.raise_for_status() — ollama is responding but returning a non-200. we're catching
ConnectError and TimeoutException in pipeline/llm.py but not HTTPStatusError so it bubbles up
as unhandled and hits the generic 500 handler. fix it so that case also maps to LLMConnectionError
with the actual status code in the message.

**Outcome:**
Added `except httpx.HTTPStatusError` block in pipeline/llm.py that raises LLMConnectionError
with the Ollama response status code in the message. Any bad HTTP response from Ollama now
returns a typed 502 instead of a generic 500. Root cause of the original error was a broken
Homebrew Ollama install where the llama-server binary wasn't bundled — fix is to use the
official Ollama installer.

**Reflection:**
Should have caught the missing HTTPStatusError case during implementation. ConnectError and
TimeoutException cover network-layer failures but not server-side HTTP errors — they're
different branches in httpx's exception hierarchy, easy to miss one when listing them out.

---
