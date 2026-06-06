import "@testing-library/jest-dom";
import { beforeEach, vi } from "vitest";

// Mock window.matchMedia which is required for next-themes and responsive layouts
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Clear localStorage between test runs
beforeEach(() => {
  localStorage.clear();
});
