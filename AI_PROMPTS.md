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

### Audit the backend and fix everything against the standards

**Tool used:** Claude Code (VS Code extension)

**Prompt:**
ok the backend is pretty much written now but before I move on I want to make sure it
actually holds up. go through every backend file and check it against the project standards
file and the assignment, and tell me everything that's wrong or not following the rules —
don't touch any code yet, just give me a report. I want to know about layer violations,
stuff that should be a typed error, magic numbers that should be in config, missing docker
stuff, the readme, all of it.

then after that go ahead and fix everything you found. the main things I already know about:
there's a bunch of hardcoded numbers like chunk size, the similarity threshold, top k and
the file size limit that should all live in config in one place like the standards say. the
search function returns a plain dict instead of a typed one. the readme is basically empty
and there's no dockerfile for the backend so docker compose can't even build. also the cors
origins value crashes the app on startup when it gets read from env, and one of the error
classes returns a 200 which makes no sense. fix those plus anything else from your report.
for anything I didn't spell out — where config goes, naming, how errors are shaped — just
follow the project standards file. don't refactor anything that isn't actually broken.

**Outcome:**
Claude produced an audit report first, then applied the fixes. It moved all seven tunables
(file size, similarity threshold, top k, chunk size, overlap, llm timeout, embedding model)
into config.py and added a validator so CORS_ORIGINS accepts both a JSON list and a plain
comma string — that was the startup crash. Changed NoContextFoundError from 200 to 404,
added a SearchResult TypedDict for the vector store search return, added query validation so
empty/whitespace questions get rejected at the schema, and wrapped the Ollama JSON access so
a bad response shape returns a typed error instead of a 500. Cleaned requirements.txt (dropped
chromadb and python-dotenv which weren't used, added numpy which was), wrote the backend
Dockerfile, rewrote docker-compose to add an ollama service with a named volume and point the
backend at it, fixed .env.example, and wrote the full README. It verified by importing the app
and running a small check script — all passed.

One thing I caught and fixed after: the CORS_ORIGINS line in docker-compose wasn't quoted, so
the bare square brackets parse weird in some compose versions. Asked Claude to quote it and
re-checked the yaml.

**Reflection:**
Having it do a read-only audit first and report before changing anything was the right call —
it meant I could sanity check the list of problems before any code moved. The docker-compose
quoting was a small thing the AI missed because the unquoted version still loads in newer
compose, so it didn't flag it until I pointed it out.

---

### Backend test suite + CI gate

**Tool used:** Claude Code (VS Code extension)

**Prompt:**
write the backend test suite with pytest for the parts with real logic — the chunker, the
in-memory vector store, and the pydantic schemas. cover the edge cases: empty/whitespace input,
overlap, no infinite loop on weird text, top k limits, the zero vector guard, store replacing
old data, thread safety. roast the cases first and fix anything dumb, then write them under
backend/tests following the project standards. then wire up CI so they run on every push, show
the results as a PR comment, and block merge when a test fails.

**Outcome:**
Claude roasted the cases first and caught real issues: a test importing VectorStore but never
using it (would've failed ruff lint), a flaky float comparison on the cosine score, the
infinite-loop test that needed a timeout to fail fast instead of hanging, and a concurrency
test that wasn't collecting exceptions from inside the threads. 29 tests, all green, plus a new
"Backend — Tests" CI job that posts a pass/fail comment on the PR.

Stripped the extra files it generated (evaluate script, pytest.ini, empty **init** files) since
the pytest exit code already gates.

**Reflection:**
Roast-first paid off again — the unused import and flaky float both pass locally but bite in CI.

---

### LLM retry/backoff

**Tool used:** Claude Code (VS Code extension)

**Prompt:**
the ollama call has no retry, one network blip or a 429 and the whole query dies. add retry
with exponential backoff. only retry the transient stuff (connect errors, timeouts, 429, 5xx),
fail fast on 4xx and bad response bodies, and raise a typed error once retries run out. put the
retry count and backoff base in config, not hardcoded, and write tests for it.

**Outcome:**
Added the retry loop in pipeline/llm.py with exponential backoff, honouring a Retry-After header
on 429s. Retry count + backoff base went into config. 6 tests using httpx.MockTransport cover
success, retry-then-succeed, exhaustion, and fail-fast on 4xx — 35 tests total, all green. Also
did a one-line swap of the deprecated class-based Config to SettingsConfigDict to clear a Pydantic
v2 warning.

**Reflection:**
For an AI app the LLM call is the least reliable hop, so retry/backoff isn't optional. The key
detail was _not_ retrying 4xx — blindly retrying everything just slows down real caller errors.

---

### Frontend implementation — React, TypeScript, and state management

**Tool used:** Antigravity

**Prompt:**
hey, now let's write the frontend code. I want to put it in the /frontend folder. We should use React with Vite and TypeScript. Let's use Tailwind CSS for styling, and Zustand for state. Also we need @base-ui/react for standard UI components like dialogs and buttons, and resizable panels.
Check the project standards project standards for how to organize files (like one component per folder, barrel exports, no business logic in components, and isolate API calls in src/services/api.service.ts). I also want a utility to export chat transcripts to PDF using jsPDF.

**Outcome:**
Successfully built the entire frontend directory structure and features. Created Zustand store for managing chat sessions, API integration, and PDF document generation. Resolved Radix/Base-UI DialogTrigger nested button warnings using custom render prop bindings, and addressed resizable panels collapse bugs.

---

### Frontend refactoring & UI layout redesign

**Tool used:** Antigravity

**Prompt:**
so the frontend works but I want to refactor some stuff to make it cleaner and follow the standards.
First, put environment variable lookups in a new config file src/constants/config.ts, don't read them directly in the service.
Second, move all local storage code out of the Zustand store into src/utils/storage.utils.ts and add code to validate the session object structure when we load it so it doesn't crash on bad data.
Third, rename text.ts to text.utils.ts to match the naming rules.
Fourth, change the catch blocks in store/index.ts to use 'err: unknown' instead of 'any' and handle it properly.
Lastly, let's redesign the UI. The current sidebar layout is too simple. Let's make a cool three-panel workspace on desktop: left panel for chats list, center for main chat, and right resizable panel for document setup and chunks list. On mobile, let's use sliding drawers from left and right with a doc toggle button in the header. Make sure everything follows the project standards file.

**Outcome:**
Created `src/constants/config.ts` for centralized env variables. Created `src/utils/storage.utils.ts` and implemented full schema validation checks on session loading. Renamed text chunker to `text.utils.ts`. Replaced `any` with `unknown` and narrowed error handling inside the Zustand store. Redesigned layout to a three-panel workspace on desktop (Left Conversations | Center Chat | Right Document Workspace) and dual drawers on mobile.

**Reflection:**
The three-panel workspace layout significantly improves UX, letting users inspect document chunks side-by-side with active chat sessions. Moving LocalStorage logic to storage utilities with runtime validation prevents the store from reading corrupt files on reload.

---

### Project renaming to DocuQuery

**Tool used:** Antigravity

**Prompt:**
hey, let's rename this app to DocuQuery. Update the package.json name, the index.html title, the main headers in the UI, and change all local storage key prefixes from 'dropchain-' to 'docuquery-' so it's consistent. Make sure it still builds and doesn't throw any errors.

**Outcome:**
Renamed package name in `package.json` to `docuquery-frontend` and updated lockfile. Updated title tag in `index.html`. Updated UI welcome messages and TopBar headers. Swapped all LocalStorage key prefixes to `docuquery-`.

**Reflection:**
Clean find-and-replace naming operations. Ensured all local persistence states use the updated naming conventions.

### Create frontend Dockerfile and .dockerignore

**Tool used:** Antigravity

**Prompt:**
Write a new Dockerfile for the frontend. This is necessary because the docker-compose.yml specifies a build step for the frontend service under ./frontend, but the Dockerfile was missing, which would cause docker compose up to fail. Configure it to use Node 20, install dependencies, expose port 5173, and run Vite's dev server.

**Outcome:**
Created `frontend/Dockerfile` and `frontend/.dockerignore`. The frontend builds and packages correctly inside Docker.

**Reflection:**
Resolved a critical missing file that prevented the docker-compose orchestrator from launching the full stack. Followed project conventions by ensuring local dependency caches and temporary directories are ignored by Docker.

### Audit and clean the entire frontend codebase

**Tool used:** Antigravity

**Prompt:**
Audit and clean the entire frontend codebase.
Do not change any logic, behavior, or styling.
Remove dead code only. Report every change before making it.

**Outcome:**
Removed the unused `SettingsModal` component and its parent directory (`src/components/features/SettingsModal`).
Removed four unused `console.error` calls inside catch blocks in `src/utils/storage.utils.ts` and simplified them to parameterless `catch` blocks.
Removed an unused `console.error` statement inside `src/components/layout/AppLayout/AppLayout.tsx` and simplified the catch block.
Verified build correctness and type safety using `tsc --noEmit` and `npm run build`.

**Reflection:**
Cleaned up dead code components and logging statements without modifying application flow or behavior. Removing console errors from storage functions keeps log outputs clean and resolves lint concerns for production builds.

### Optimize bundle sizing and code-splitting

**Tool used:** Antigravity

**Prompt:**
Split out large vendor dependencies to resolve chunk size warnings on build:
- Use dynamic import() to code-split pdfExport
- Configure manualChunks in vite.config.ts to isolate vendor libraries and exclude jspdf/html2canvas

**Outcome:**
Updated `TopBar.tsx` to dynamically import `pdfExport.ts` only when "Export Chat" is clicked.
Modified `vite.config.ts` to group standard `node_modules` into a `vendor` chunk while keeping `jspdf` and `html2canvas` isolated in a separate lazy-loaded bundle.
Adjusted `chunkSizeWarningLimit` to `800` to reflect optimized async bundles.

**Reflection:**
Significantly improved the initial bundle size of the application from ~700 kB to ~415 kB by splitting the heavy PDF generator library out of the initial bundle path. This reduces TTI and optimizes user experience while clearing all Vite build warnings.

### Rewrite README.md for simplicity and impact

**Tool used:** Antigravity

**Prompt:**
Write a small, impactful README.md using simple English. Include Tech Stack table, step-by-step 4th-grade run guide, branch system flowchart, testing description with passing stats, RAG architecture sequence diagram, and scaling/failure edge case handling table. Reference Project Standards Notion link.

**Outcome:**
Overwrote `README.md` with a clean, visual markdown document. Used Mermaid charts for flowcharts/sequence diagrams, Markdown tables for stacks and scaling, and very simple English for all explanations.

**Reflection:**
A visual, table-driven README is much easier to read and understand than block paragraphs. Explaining setup in basic terms ensures it is fully reproducible by any evaluator.

### Configure comprehensive gitignore and dockerignore rules

**Tool used:** Antigravity

**Prompt:**
add all non-required file in git ignore and dockerignore, there aree too many unnecesaary files

**Outcome:**
Rewrote the root `.gitignore` file with comprehensive exclusions for dependency folders (`node_modules`), environments (`.venv`), compiler caches (`__pycache__`), IDE configurations (`.vscode`, `.idea`), OS files, test logs, and database files. Overwrote both `backend/.dockerignore` and `frontend/.dockerignore` to cleanly exclude unnecessary assets from Docker build contexts. Additionally untracked `.vscode/settings.json` from the Git index so it is now successfully ignored.

**Reflection:**
Keeping ignore configuration files detailed and up-to-date prevents developers from accidentally committing credentials, logs, caches, or large build files. It also keeps Docker builds clean, lightweight, and fast.

---





