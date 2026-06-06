# DocuQuery

DocuQuery is a smart AI assistant for text files.
- You give it a text file (like a company policy or guide) or paste some text.
- You ask it questions about the document.
- It answers **only** using the document content and shows you the exact sentences it used (citations) so you can check its accuracy.

> [!NOTE]
> During development, we closely followed our [Project Standards](https://app.notion.com/p/Project-Standards-377a0469ae788075a234f760a71d32e3?source=copy_link) to keep our code clean and organized.

---

### Tech Stack

| Part | Technologies | Why We Use It |
|---|---|---|
| **Frontend** | React, TypeScript, Vite, Zustand, Tailwind CSS | Fast page loads, easy state management, nice styling |
| **Backend** | Python, FastAPI, Pydantic, Uvicorn, NumPy | Fast API responses, strict data types, fast similarity search |
| **AI & RAG** | sentence-transformers (`all-MiniLM-L6-v2`), Ollama (`llama3.2:3b`) | Fully local, free, private (runs on your own laptop) |

---

### How to Run

Here is how to run this app on your laptop for the first time:

#### 1. Install Ollama (The AI brain)
- Go to [ollama.com](https://ollama.com) on your web browser and click **Download**.
- Open the file you downloaded and follow the screen instructions to install it.
- Open your laptop's **Terminal** app (search "Terminal" on Mac, or "Command Prompt" on Windows).
- Copy this text, paste it into the terminal, and press **Enter**:
  ```bash
  ollama pull llama3.2:3b
  ```

#### 2. Get Docker Desktop (The container builder)
- Go to [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) and download it.
- Install it and open it. Keep the Docker app running in the background.

#### 3. Run the App
- In your Terminal app, go to this project's folder.
- Type this command and press **Enter**:
  ```bash
  docker compose up --build
  ```
- Wait a minute until it finishes downloading and setting up.
- Open your internet browser (like Chrome or Safari) and go to:
  `http://localhost:5173`
- You are ready! Upload a `.txt` file or paste text, and start chatting.

---

### How We Build & Test (Git & CI)

#### The Branch System
```mermaid
graph LR
    Feature[feature/my-change] -->|PR & Tests Pass| Develop[develop]
    Fix[fix/bug] -->|PR & Tests Pass| Develop
    Develop -->|Stable Release| Main[main / Production]
```

- **Why?** We never write code directly in `main` or `develop`. We write in small task branches, merge them into `develop` to test them together, and only push to `main` when it is 100% ready for production.

#### Automated Testing (CI)
Every time we open a Pull Request (PR):
1. **GitHub Actions** automatically runs all tests.
2. It comments on the PR showing exactly how many tests passed.
3. If **any** test fails, the code **cannot** be merged. This stops bugs from breaking the live app.

| Test Suite | Framework | Count | Purpose |
|---|---|---|---|
| **Backend** | Pytest | 35 | Checks text chunking, search math, and API routes |
| **Frontend** | Vitest | 13 | Checks local storage, store states, and button clicks |

---

### Architecture & Data Flow

```mermaid
sequenceDiagram
    participant User as Browser / User
    participant BE as FastAPI Backend
    participant DB as Cosine Vector Store (In-Memory)
    participant LLM as Local Ollama LLM

    Note over User,DB: Ingestion Flow
    User->>BE: Uploads File / Paste Text
    BE->>BE: Splits text into small chunks
    BE->>BE: Creates mathematical vectors (embeddings)
    BE->>DB: Stores chunks & vectors
    BE-->>User: Success message

    Note over User,LLM: Query Flow
    User->>BE: Asks a question
    BE->>BE: Creates vector for the question
    BE->>DB: Searches for closest matching chunks
    DB-->>BE: Returns top matches
    alt Match score < 0.3
        BE-->>User: Returns "Not enough info" (Short-circuits)
    else Match score >= 0.3
        BE->>LLM: Prompt (Chunks + Question)
        LLM-->>BE: Returns Answer
        BE-->>User: Answer + Source Citations
    end
```

---

### Scaling, Failure, and Edge Cases

| Area | Scenario | How We Handle It |
|---|---|---|
| **Scaling** | Larger/More documents | Swap the in-memory NumPy store with **ChromaDB** or **PGVector**. The interface is already designed for an easy swap. |
| **Failure** | Ollama is busy/unreachable | The backend retries the call **3 times** with **exponential backoff** (waiting longer each time) before showing a clean error to the user. |
| **Edge Case** | User asks off-topic question | If document chunks don't match the question (similarity < 0.3), we **short-circuit** and answer immediately without calling the LLM. This prevents the LLM from making up fake answers. |
| **Edge Case** | Uploading bad files | We reject any files that are empty, too large (> 1 MB), or not plain-text UTF-8, returning a clear error code. |
