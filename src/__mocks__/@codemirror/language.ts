import { vi } from "vitest";

export const syntaxTree = vi.fn(() => ({
  iterate: vi.fn(),
}));
