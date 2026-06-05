from app.core.exceptions import DocumentEmptyError


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    if not text or not text.strip():
        raise DocumentEmptyError()

    stripped = text.strip()

    if len(stripped) <= chunk_size:
        return [stripped]

    chunks: list[str] = []
    pos = 0

    while pos < len(stripped):
        end = min(pos + chunk_size, len(stripped))

        if end < len(stripped):
            # Only search the second half of the window for a sentence boundary.
            # This guarantees the window advances by at least chunk_size//2 - overlap
            # characters per iteration, preventing infinite loops when a boundary
            # falls near the start of the window.
            boundary = stripped.rfind(". ", pos + chunk_size // 2, end)
            if boundary != -1:
                end = boundary + 2  # include ". " in this chunk

        chunk = stripped[pos:end].strip()
        if chunk:
            chunks.append(chunk)

        next_pos = end - overlap
        # Safety guard: if overlap >= advance, force minimum progress.
        if next_pos <= pos:
            next_pos = pos + max(1, chunk_size - overlap)
        pos = next_pos

    return chunks
