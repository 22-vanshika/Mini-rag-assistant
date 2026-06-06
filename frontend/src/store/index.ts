import { create } from "zustand";
import type { ChatSession } from "../types";
import { ingestDocument, queryDocument } from "../services/api.service";
import { chunkTextLocal } from "../utils/text.utils";
import {
  loadSessionsFromStorage,
  loadActiveSessionIdFromStorage,
  saveSessionsToStorage,
  saveActiveSessionIdToStorage,
} from "../utils/storage.utils";

interface AppState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isIngesting: boolean;
  isQuerying: boolean;
  error: string | null;
  question: string;

  // Actions
  setQuestion: (q: string) => void;
  setError: (err: string | null) => void;
  switchSession: (id: string) => void;
  startNewSession: () => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, newName: string) => void;
  handleIngest: (selectedFile: File | null, rawText: string) => Promise<void>;
  handleQuery: () => Promise<void>;
}

// Helper to generate unique session IDs
function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export const useAppStore = create<AppState>((set, get) => ({
  sessions: loadSessionsFromStorage(),
  activeSessionId: loadActiveSessionIdFromStorage(),
  isIngesting: false,
  isQuerying: false,
  error: null,
  question: "",

  setQuestion: (q) => set({ question: q }),
  setError: (err) => set({ error: err }),

  switchSession: (id) => {
    saveActiveSessionIdToStorage(id);
    set({ activeSessionId: id, error: null });
  },

  startNewSession: () => {
    saveActiveSessionIdToStorage(null);
    set({ activeSessionId: null, error: null });
  },

  deleteSession: (id) => {
    const newSessions = get().sessions.filter((s) => s.id !== id);
    const activeId = get().activeSessionId;
    const newActiveId = activeId === id ? null : activeId;

    saveSessionsToStorage(newSessions);
    saveActiveSessionIdToStorage(newActiveId);
    set({ sessions: newSessions, activeSessionId: newActiveId });
  },

  renameSession: (id, newName) => {
    const newSessions = get().sessions.map((s) =>
      s.id === id ? { ...s, name: newName.trim() || s.name } : s
    );
    saveSessionsToStorage(newSessions);
    set({ sessions: newSessions });
  },

  handleIngest: async (selectedFile, rawText) => {
    set({ isIngesting: true, error: null });

    const newSessionId = generateId();
    let sessionName = "New Chat";
    let textToIngest = "";

    if (selectedFile) {
      sessionName = selectedFile.name;
    } else if (rawText.trim()) {
      const firstLine = rawText.trim().split("\n")[0].trim();
      sessionName = firstLine.length > 40 ? firstLine.substring(0, 40) + "..." : firstLine;
      textToIngest = rawText;
    }

    // Prepare a temporary file object if raw text was pasted
    let fileToUpload: File;
    if (selectedFile) {
      fileToUpload = selectedFile;
      // Read the file content client-side to generate chunks for visual display
      try {
        textToIngest = await selectedFile.text();
      } catch {
        textToIngest = "[File Binary/Text]";
      }
    } else {
      fileToUpload = new File([rawText], "document.txt", { type: "text/plain" });
    }

    const newSession: ChatSession = {
      id: newSessionId,
      name: sessionName,
      documentIngested: false,
      chunks_stored: 0,
      chunks: [],
      messages: [],
      createdAt: Date.now(),
    };

    // Optimistically add the new session and activate it
    const updatedSessions = [newSession, ...get().sessions];
    saveSessionsToStorage(updatedSessions);
    saveActiveSessionIdToStorage(newSessionId);
    set({ sessions: updatedSessions, activeSessionId: newSessionId });

    try {
      const result = await ingestDocument(fileToUpload);

      // Generate local chunks from our read text to display in the UI
      const clientSideChunks = chunkTextLocal(textToIngest);

      const finalizedSessions = get().sessions.map((s) =>
        s.id === newSessionId
          ? {
              ...s,
              documentIngested: true,
              chunks_stored: result.chunks_stored,
              chunks: clientSideChunks,
            }
          : s
      );

      saveSessionsToStorage(finalizedSessions);
      set({ sessions: finalizedSessions });
    } catch (err: unknown) {
      // Revert session creation on failure
      const revertedSessions = get().sessions.filter((s) => s.id !== newSessionId);
      saveSessionsToStorage(revertedSessions);
      saveActiveSessionIdToStorage(null);
      const errorMessage = err instanceof Error ? err.message : String(err);
      set({
        sessions: revertedSessions,
        activeSessionId: null,
        error: errorMessage || "Failed to ingest document.",
      });
    } finally {
      set({ isIngesting: false });
    }
  },

  handleQuery: async () => {
    const { question, activeSessionId, sessions, isQuerying } = get();
    if (isQuerying || !question.trim() || !activeSessionId) return;

    const userMsg = question.trim();

    // Optimistically add the user's message to the session
    const sessionsWithUserMsg = sessions.map((s) =>
      s.id === activeSessionId
        ? { ...s, messages: [...s.messages, { role: "user" as const, content: userMsg }] }
        : s
    );

    saveSessionsToStorage(sessionsWithUserMsg);
    set({ sessions: sessionsWithUserMsg, question: "", isQuerying: true, error: null });

    try {
      const result = await queryDocument(userMsg);

      const sessionsWithAssistantMsg = get().sessions.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              messages: [
                ...s.messages,
                {
                  role: "assistant" as const,
                  content: result.answer || "No answer provided.",
                  citations: result.citations,
                },
              ],
            }
          : s
      );

      saveSessionsToStorage(sessionsWithAssistantMsg);
      set({ sessions: sessionsWithAssistantMsg });
    } catch (err: unknown) {
      const sessionsWithErrorMsg = get().sessions.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              messages: [
                ...s.messages,
                {
                  role: "assistant" as const,
                  content: "Sorry, I encountered an error while answering your question.",
                },
              ],
            }
          : s
      );

      saveSessionsToStorage(sessionsWithErrorMsg);
      const errorMessage = err instanceof Error ? err.message : String(err);
      set({
        sessions: sessionsWithErrorMsg,
        error: errorMessage || "An error occurred during querying.",
      });
    } finally {
      set({ isQuerying: false });
    }
  },
}));
