class AppException(Exception):
    def __init__(self, message: str, status_code: int) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class DocumentEmptyError(AppException):
    def __init__(self, message: str = "Document is empty") -> None:
        super().__init__(message, status_code=422)


class DocumentTooLargeError(AppException):
    def __init__(self, message: str = "Document exceeds maximum size") -> None:
        super().__init__(message, status_code=422)


class UnsupportedFileTypeError(AppException):
    def __init__(self, message: str = "File type is not supported") -> None:
        super().__init__(message, status_code=422)


class ChunkingError(AppException):
    def __init__(self, message: str = "Failed to chunk document") -> None:
        super().__init__(message, status_code=500)


class EmbeddingError(AppException):
    def __init__(self, message: str = "Failed to generate embeddings") -> None:
        super().__init__(message, status_code=502)


class VectorStoreError(AppException):
    def __init__(self, message: str = "Vector store operation failed") -> None:
        super().__init__(message, status_code=500)


class QueryEmptyError(AppException):
    def __init__(self, message: str = "Query must not be empty") -> None:
        super().__init__(message, status_code=422)


class NoContextFoundError(AppException):
    def __init__(self, message: str = "No relevant context found for the query") -> None:
        super().__init__(message, status_code=200)


class LLMConnectionError(AppException):
    def __init__(self, message: str = "Failed to connect to language model") -> None:
        super().__init__(message, status_code=502)


class LLMTimeoutError(AppException):
    def __init__(self, message: str = "Language model request timed out") -> None:
        super().__init__(message, status_code=504)
