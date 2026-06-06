import type { ChatSession, Message, Citation } from "../types";

const SESSIONS_KEY = "docuquery-sessions";
const ACTIVE_SESSION_KEY = "docuquery-active-session";

/**
 * Validates if a value is a valid Citation
 */
function isValidCitation(val: any): val is Citation {
  return (
    val &&
    typeof val === "object" &&
    typeof val.chunk === "string" &&
    typeof val.score === "number"
  );
}

/**
 * Validates if a value is a valid Message
 */
function isValidMessage(val: any): val is Message {
  if (!val || typeof val !== "object") return false;
  if (val.role !== "user" && val.role !== "assistant") return false;
  if (typeof val.content !== "string") return false;
  
  if (val.citations !== undefined) {
    if (!Array.isArray(val.citations)) return false;
    return val.citations.every(isValidCitation);
  }
  
  return true;
}

/**
 * Validates if a value is a valid ChatSession
 */
function isValidChatSession(val: any): val is ChatSession {
  return (
    val &&
    typeof val === "object" &&
    typeof val.id === "string" &&
    typeof val.name === "string" &&
    typeof val.documentIngested === "boolean" &&
    typeof val.chunks_stored === "number" &&
    Array.isArray(val.chunks) &&
    val.chunks.every((c: any) => typeof c === "string") &&
    Array.isArray(val.messages) &&
    val.messages.every(isValidMessage) &&
    typeof val.createdAt === "number"
  );
}

/**
 * Load and validate chat sessions from LocalStorage
 */
export function loadSessionsFromStorage(): ChatSession[] {
  try {
    const saved = localStorage.getItem(SESSIONS_KEY);
    if (!saved) return [];
    
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    
    // Validate each session at runtime
    return parsed.filter(isValidChatSession);
  } catch (err) {
    console.error("Failed to load sessions from localStorage:", err);
    return [];
  }
}

/**
 * Save chat sessions to LocalStorage
 */
export function saveSessionsToStorage(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error("Failed to save sessions to localStorage:", err);
  }
}

/**
 * Load the active session ID from LocalStorage
 */
export function loadActiveSessionIdFromStorage(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY) || null;
  } catch (err) {
    console.error("Failed to load active session ID from localStorage:", err);
    return null;
  }
}

/**
 * Save or remove the active session ID in LocalStorage
 */
export function saveActiveSessionIdToStorage(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_SESSION_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  } catch (err) {
    console.error("Failed to save active session ID to localStorage:", err);
  }
}
