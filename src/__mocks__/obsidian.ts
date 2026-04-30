import { vi } from "vitest";

export const moment = {
  locale: vi.fn(() => "en"),
};

export class Notice {
  constructor(public message: string) {}
}

export class MarkdownView {}

export class Plugin {}

export class View {
  getViewType() { return ""; }
}

export function requireApiVersion() { return true; }
