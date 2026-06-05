from typing import TypedDict

from app.core.exceptions import NoContextFoundError, QueryEmptyError

# Single source of truth for the "no relevant context" answer. Used both as the
# exact phrase the LLM is told to return (in SYSTEM_PROMPT) and as the canned
# answer the service returns when retrieval short-circuits before the LLM is called.
NO_CONTEXT_ANSWER: str = (
    "I don't have enough information in the provided context to answer this question."
)

SYSTEM_PROMPT: str = f"""You are a precise assistant that answers questions strictly from the provided context.

Rules you must follow:
- Answer only using the information present in the context provided below.
- Be concise and direct. Do not pad your answer with unnecessary words.
- If the context does not contain enough information to answer the question, respond with exactly:
  "{NO_CONTEXT_ANSWER}"
- Never make up information, infer beyond what the context states, or draw on outside knowledge."""

CONTEXT_DELIMITER: str = "---CONTEXT---"
USER_DELIMITER: str = "---QUESTION---"


class PromptDict(TypedDict):
    system: str
    user: str


def build_prompt(context_chunks: list[str], user_query: str) -> PromptDict:
    if not context_chunks:
        raise NoContextFoundError()
    if not user_query or not user_query.strip():
        raise QueryEmptyError()

    context_block = "\n\n".join(context_chunks)
    user_message = (
        f"{CONTEXT_DELIMITER}\n{context_block}\n\n"
        f"{USER_DELIMITER}\n{user_query}"
    )

    return {"system": SYSTEM_PROMPT, "user": user_message}
