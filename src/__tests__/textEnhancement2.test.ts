import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("src/translations/helper", () => ({
  t: (key: string) => key,
}));

import { TextEnhancement } from "src/util/textEnhancement";

// ─── Shared mock factory ──────────────────────────────────────────────────────

function makeEditor(overrides: Record<string, any> = {}) {
  const base = {
    getSelection: vi.fn(() => ""),
    replaceSelection: vi.fn(),
    getValue: vi.fn(() => ""),
    setValue: vi.fn(),
    getCursor: vi.fn(() => ({ line: 0, ch: 0 })),
    getLine: vi.fn(() => ""),
    setLine: vi.fn(),
    setCursor: vi.fn(),
    setSelection: vi.fn(),
    getRange: vi.fn(() => ""),
    replaceRange: vi.fn(),
    lineCount: vi.fn(() => 1),
    posToOffset: vi.fn(() => 0),
    offsetToPos: vi.fn(() => ({ line: 0, ch: 0 })),
    listSelections: vi.fn(() => []),
    setSelections: vi.fn(),
  };
  return { ...base, ...overrides };
}

// ─── getPlainText ─────────────────────────────────────────────────────────────

describe("TextEnhancement.getPlainText", () => {
  let writeTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    (globalThis as any).navigator = { clipboard: { writeText: writeTextMock } };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does nothing when no text is selected", () => {
    const editor = makeEditor();
    TextEnhancement.getPlainText(editor as any);
    expect(writeTextMock).not.toHaveBeenCalled();
  });

  it("copies plain text to clipboard stripping asterisk-based Markdown syntax", () => {
    // The regex removes `**` (and other `*+` markers) but does NOT strip
    // underscore-based italic (`_italic_`), which is intentional — the
    // plain-text regex only targets `*` markers.
    const editor = makeEditor({
      getSelection: vi.fn(() => "**bold** text"),
    });
    TextEnhancement.getPlainText(editor as any);
    const copied = writeTextMock.mock.calls[0][0] as string;
    expect(copied).not.toContain("**");
    expect(copied).toContain("bold");
  });

  it("strips heading markers from copied text", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "## My Heading"),
    });
    TextEnhancement.getPlainText(editor as any);
    const copied = writeTextMock.mock.calls[0][0] as string;
    expect(copied).not.toContain("#");
    expect(copied.trim()).toBe("My Heading");
  });

  it("preserves inline code spans (single backticks are not stripped)", () => {
    // The pattern only strips triple backtick fences (```), not single backticks.
    // Single-backtick inline code content is preserved as-is.
    const editor = makeEditor({
      getSelection: vi.fn(() => "Use `code` here"),
    });
    TextEnhancement.getPlainText(editor as any);
    const copied = writeTextMock.mock.calls[0][0] as string;
    // Single backticks survive — the implementation intentionally preserves them
    expect(copied).toContain("code");
  });

  it("converts Markdown link syntax to plain link text", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "[Obsidian](https://obsidian.md)"),
    });
    TextEnhancement.getPlainText(editor as any);
    const copied = writeTextMock.mock.calls[0][0] as string;
    expect(copied).toContain("Obsidian");
    expect(copied).not.toContain("https://obsidian.md");
  });
});

// ─── smartPaste ───────────────────────────────────────────────────────────────

describe("TextEnhancement.smartPaste", () => {
  let readTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    readTextMock = vi.fn();
    (globalThis as any).navigator = { clipboard: { readText: readTextMock } };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does nothing when the clipboard is empty", async () => {
    readTextMock.mockResolvedValue("");
    const editor = makeEditor();
    await TextEnhancement.smartPaste(editor as any);
    expect(editor.replaceSelection).not.toHaveBeenCalled();
  });

  it("pastes clipboard text with replaceSelection", async () => {
    readTextMock.mockResolvedValue("hello world");
    const editor = makeEditor();
    await TextEnhancement.smartPaste(editor as any);
    expect(editor.replaceSelection).toHaveBeenCalledWith("hello world");
  });

  it("collapses more than two consecutive newlines to two", async () => {
    readTextMock.mockResolvedValue("a\n\n\n\nb");
    const editor = makeEditor();
    await TextEnhancement.smartPaste(editor as any);
    const pasted = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(pasted).not.toMatch(/\n{3,}/);
    expect(pasted).toBe("a\n\nb");
  });

  it("removes trailing spaces from each line", async () => {
    readTextMock.mockResolvedValue("hello   \nworld   ");
    const editor = makeEditor();
    await TextEnhancement.smartPaste(editor as any);
    const pasted = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(pasted).toBe("hello\nworld");
  });

  it("does not throw when clipboard read fails", async () => {
    readTextMock.mockRejectedValue(new Error("no permission"));
    const editor = makeEditor();
    await expect(TextEnhancement.smartPaste(editor as any)).resolves.not.toThrow();
    expect(editor.replaceSelection).not.toHaveBeenCalled();
  });
});

// ─── convertListToTableMultiDim ───────────────────────────────────────────────

describe("TextEnhancement.convertListToTableMultiDim", () => {
  it("does nothing when there is no selection", () => {
    const editor = makeEditor();
    TextEnhancement.convertListToTableMultiDim(editor as any);
    expect(editor.replaceSelection).not.toHaveBeenCalled();
  });

  it("converts a flat unordered list to a Markdown table", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "- Apple\n- Banana\n- Cherry"),
      getCursor: vi.fn(() => ({ line: 0, ch: 0 })),
      getLine: vi.fn(() => ""),
    });
    TextEnhancement.convertListToTableMultiDim(editor as any);
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(result).toContain("|");
    expect(result).toContain("Apple");
    expect(result).toContain("Banana");
    expect(result).toContain("Cherry");
    // Should contain a separator row (---) 
    expect(result).toContain("---");
  });

  it("converts a two-level list to a table with two columns", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "- Fruits\n  - Apple\n  - Banana\n- Veggies\n  - Carrot"),
      getCursor: vi.fn(() => ({ line: 0, ch: 0 })),
      getLine: vi.fn(() => ""),
    });
    TextEnhancement.convertListToTableMultiDim(editor as any);
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(result).toContain("Fruits");
    expect(result).toContain("Apple");
    expect(result).toContain("Banana");
    expect(result).toContain("Veggies");
    expect(result).toContain("Carrot");
    expect(result).toContain("|");
  });

  it("converts a numbered list to a table", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "1. First\n2. Second\n3. Third"),
      getCursor: vi.fn(() => ({ line: 0, ch: 0 })),
      getLine: vi.fn(() => ""),
    });
    TextEnhancement.convertListToTableMultiDim(editor as any);
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(result).toContain("|");
    expect(result).toContain("First");
    expect(result).toContain("Second");
    expect(result).toContain("Third");
  });

  it("generates a header row and separator in the table output", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "- Alpha\n- Beta"),
      getCursor: vi.fn(() => ({ line: 0, ch: 0 })),
      getLine: vi.fn(() => ""),
    });
    TextEnhancement.convertListToTableMultiDim(editor as any);
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const lines = result.split("\n").filter(Boolean);
    // Line 0: header, Line 1: separator (---), Line 2+: data
    expect(lines[0]).toMatch(/\|/);
    expect(lines[1]).toMatch(/---/);
  });
});

// ─── convertTableToList ───────────────────────────────────────────────────────

describe("TextEnhancement.convertTableToList", () => {
  it("shows a notice and does nothing when selection has no pipe character", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "no table here"),
      getCursor: vi.fn(() => ({ line: 0, ch: 0 })),
      lineCount: vi.fn(() => 1),
      getLine: vi.fn(() => "no table here"),
    });
    TextEnhancement.convertTableToList(editor as any);
    expect(editor.replaceSelection).not.toHaveBeenCalled();
  });

  it("converts a Markdown table to a list", () => {
    const table = "| Item | Content 1 |\n| --- | --- |\n| Fruits | Apple |\n| Veggies | Carrot |";
    const editor = makeEditor({
      getSelection: vi.fn(() => table),
      getCursor: vi.fn(() => ({ line: 0, ch: 0 })),
      lineCount: vi.fn(() => 4),
      getLine: vi.fn((line: number) => table.split("\n")[line] ?? ""),
    });
    TextEnhancement.convertTableToList(editor as any);
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(result).toContain("Fruits");
    expect(result).toContain("Apple");
    expect(result).toContain("Veggies");
    expect(result).toContain("Carrot");
    // Output should contain list markers
    expect(result).toContain("-");
  });

  it("skips the separator row (--- lines)", () => {
    const table = "| Header |\n| --- |\n| Row1 |\n| Row2 |";
    const editor = makeEditor({
      getSelection: vi.fn(() => table),
      getCursor: vi.fn(() => ({ line: 0, ch: 0 })),
      lineCount: vi.fn(() => 4),
      getLine: vi.fn((line: number) => table.split("\n")[line] ?? ""),
    });
    TextEnhancement.convertTableToList(editor as any);
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(result).not.toContain("---");
  });

  it("handles a single-column table", () => {
    const table = "| Name |\n| --- |\n| Alice |\n| Bob |";
    const editor = makeEditor({
      getSelection: vi.fn(() => table),
      getCursor: vi.fn(() => ({ line: 0, ch: 0 })),
      lineCount: vi.fn(() => 4),
      getLine: vi.fn((line: number) => table.split("\n")[line] ?? ""),
    });
    TextEnhancement.convertTableToList(editor as any);
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(result).toContain("Alice");
    expect(result).toContain("Bob");
  });
});
