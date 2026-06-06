import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAppStore } from "./index";
import * as apiService from "../services/api.service";

// Mock the API service
vi.mock("../services/api.service", () => ({
  ingestDocument: vi.fn(),
  queryDocument: vi.fn(),
}));

describe("Zustand App Store", () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset Zustand store state to default
    useAppStore.setState({
      sessions: [],
      activeSessionId: null,
      isIngesting: false,
      isQuerying: false,
      error: null,
      question: "",
    });
    vi.clearAllMocks();
  });

  it("should initialize with empty sessions", () => {
    const state = useAppStore.getState();
    expect(state.sessions).toEqual([]);
    expect(state.activeSessionId).toBeNull();
  });

  it("should update question value", () => {
    useAppStore.getState().setQuestion("hello world?");
    expect(useAppStore.getState().question).toBe("hello world?");
  });

  it("should switch and start new sessions", () => {
    const { startNewSession, switchSession } = useAppStore.getState();
    switchSession("session-new");
    expect(useAppStore.getState().activeSessionId).toBe("session-new");

    startNewSession();
    expect(useAppStore.getState().activeSessionId).toBeNull();
  });

  it("should rename and delete sessions", () => {
    const initialSession = {
      id: "session-1",
      name: "Original Name",
      documentIngested: false,
      chunks_stored: 0,
      chunks: [],
      messages: [],
      createdAt: Date.now(),
    };

    useAppStore.setState({ sessions: [initialSession], activeSessionId: "session-1" });

    // Rename
    useAppStore.getState().renameSession("session-1", "New Name");
    expect(useAppStore.getState().sessions[0].name).toBe("New Name");

    // Delete
    useAppStore.getState().deleteSession("session-1");
    expect(useAppStore.getState().sessions).toHaveLength(0);
    expect(useAppStore.getState().activeSessionId).toBeNull();
  });

  it("should handle document ingestion flow successfully", async () => {
    const mockResponse = { message: "Success", chunks_stored: 3 };
    vi.mocked(apiService.ingestDocument).mockResolvedValue(mockResponse);

    const file = new File(["test content"], "doc.txt", { type: "text/plain" });

    const promise = useAppStore.getState().handleIngest(file, "");
    expect(useAppStore.getState().isIngesting).toBe(true);

    await promise;

    expect(useAppStore.getState().isIngesting).toBe(false);
    expect(useAppStore.getState().error).toBeNull();
    const sessions = useAppStore.getState().sessions;
    expect(sessions).toHaveLength(1);
    expect(sessions[0].documentIngested).toBe(true);
    expect(sessions[0].chunks_stored).toBe(3);
  });

  it("should handle query document flow successfully", async () => {
    const mockResponse = {
      answer: "This is the answer.",
      citations: [{ chunk: "source chunk", score: 0.95 }],
      context_found: true,
    };
    vi.mocked(apiService.queryDocument).mockResolvedValue(mockResponse);

    const initialSession = {
      id: "session-1",
      name: "Doc",
      documentIngested: true,
      chunks_stored: 1,
      chunks: ["source chunk"],
      messages: [],
      createdAt: Date.now(),
    };

    useAppStore.setState({
      sessions: [initialSession],
      activeSessionId: "session-1",
      question: "What is the answer?",
    });

    const promise = useAppStore.getState().handleQuery();
    expect(useAppStore.getState().isQuerying).toBe(true);
    expect(useAppStore.getState().question).toBe(""); // cleared optimistically

    await promise;

    expect(useAppStore.getState().isQuerying).toBe(false);
    expect(useAppStore.getState().error).toBeNull();
    const messages = useAppStore.getState().sessions[0].messages;
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("user");
    expect(messages[0].content).toBe("What is the answer?");
    expect(messages[1].role).toBe("assistant");
    expect(messages[1].content).toBe("This is the answer.");
    expect(messages[1].citations).toHaveLength(1);
  });
});
