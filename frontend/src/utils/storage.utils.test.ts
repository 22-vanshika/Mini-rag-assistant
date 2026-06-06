import { describe, it, expect, beforeEach } from "vitest";
import {
  saveSessionsToStorage,
  loadSessionsFromStorage,
  saveActiveSessionIdToStorage,
  loadActiveSessionIdFromStorage
} from "./storage.utils";
import type { ChatSession } from "../types";

const mockSession: ChatSession = {
  id: "session-1",
  name: "Test Document",
  documentIngested: true,
  chunks_stored: 2,
  chunks: ["chunk 1", "chunk 2"],
  messages: [
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi there", citations: [{ chunk: "chunk 1", score: 0.9 }] }
  ],
  createdAt: 123456789
};

describe("storage.utils", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should save and load sessions successfully", () => {
    saveSessionsToStorage([mockSession]);
    const loaded = loadSessionsFromStorage();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("session-1");
    expect(loaded[0].name).toBe("Test Document");
  });

  it("should validate and filter out malformed session objects on load", () => {
    const malformedSession = {
      id: "session-bad",
      name: "Bad Session",
      // missing documentIngested, chunks, messages, etc.
      createdAt: 987654321
    };

    localStorage.setItem("docuquery-sessions", JSON.stringify([mockSession, malformedSession]));
    const loaded = loadSessionsFromStorage();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("session-1");
  });

  it("should save and load active session id", () => {
    saveActiveSessionIdToStorage("session-1");
    expect(loadActiveSessionIdFromStorage()).toBe("session-1");

    saveActiveSessionIdToStorage(null);
    expect(loadActiveSessionIdFromStorage()).toBeNull();
  });
});
