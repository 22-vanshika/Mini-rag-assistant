import type { Citation } from "../types";
import { API_BASE_URL } from "@/constants/config";

export interface IngestResponse {
  message: string;
  chunks_stored: number;
}

export interface QueryResponse {
  answer: string;
  citations: Citation[];
  context_found: boolean;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  timestamp: string;
}

/**
 * Handle API response and check for standard error envelope
 */
async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  
  if (!response.ok) {
    if (data && typeof data === "object" && "message" in data) {
      const apiErr = data as ApiError;
      throw new Error(apiErr.message || `Request failed with status ${response.status}`);
    }
    throw new Error(`Request failed with status ${response.status}`);
  }
  
  return data as T;
}

/**
 * Ingestion Service: uploads a text file to the backend
 */
export async function ingestDocument(file: File): Promise<IngestResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/v1/ingest`, {
    method: "POST",
    body: formData,
  });

  return handleResponse<IngestResponse>(response);
}

/**
 * Query Service: asks a question about the ingested document
 */
export async function queryDocument(question: string): Promise<QueryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: question }),
  });

  return handleResponse<QueryResponse>(response);
}
