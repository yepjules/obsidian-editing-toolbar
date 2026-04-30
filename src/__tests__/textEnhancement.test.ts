import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the translation helper so tests are locale-independent
vi.mock("src/translations/helper", () => ({
  t: (key: string) => key,
}));

import { TextEnhancement } from "src/util/textEnhancement";

// ─── Shared mock factory ──────────────────────────────────────────────────────

function makeEditor(overrides: Partial<ReturnType<typeof buildEditor>> = {}) {
  return { ...buildEditor(), ...overrides };
}

function buildEditor() {
  return {
    getSelection: vi.fn(() => ""),
    replaceSelection: vi.fn(),
    getValue: vi.fn(() => ""),
    setValue: vi.fn(),
    getCursor: vi.fn(() => ({ line: 0, ch: 0 })),
    getLine: vi.fn(() => ""),
    setLine: vi.fn(),
    setCursor: vi.fn(),
    getRange: vi.fn(() => ""),
    replaceRange: vi.fn(),
    lineCount: vi.fn(() => 1),
    posToOffset: vi.fn(() => 0),
    offsetToPos: vi.fn(() => ({ line: 0, ch: 0 })),
    listSelections: vi.fn(() => []),
    setSelections: vi.fn(),
  };
}

// ─── insertBlankLines ─────────────────────────────────────────────────────────

describe("TextEnhancement.insertBlankLines", () => {
  it("inserts a blank line between consecutive lines", () => {
    const editor = makeEditor({ getValue: vi.fn(() => "line1\nline2\nline3") });
    TextEnhancement.insertBlankLines(editor as any);
    expect(editor.setValue).toHaveBeenCalledWith("line1\n\nline2\n\nline3");
  });

  it("does not insert blank lines when they already exist", () => {
    const text = "line1\n\nline2";
    const editor = makeEditor({ getValue: vi.fn(() => text) });
    TextEnhancement.insertBlankLines(editor as any);
    expect(editor.setValue).toHaveBeenCalledWith(text);
  });

  it("does nothing if the document is empty", () => {
    const editor = makeEditor({ getValue: vi.fn(() => "") });
    TextEnhancement.insertBlankLines(editor as any);
    expect(editor.setValue).not.toHaveBeenCalled();
  });
});

// ─── processWhitespace ────────────────────────────────────────────────────────

describe("TextEnhancement.processWhitespace", () => {
  it("shows a notice when no text is selected", () => {
    const editor = makeEditor();
    TextEnhancement.processWhitespace(editor as any, { trim: true });
    expect(editor.replaceSelection).not.toHaveBeenCalled();
  });

  it("trims leading and trailing whitespace from each line (trim option)", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "  hello  \n  world  "),
    });
    TextEnhancement.processWhitespace(editor as any, { trim: true });
    expect(editor.replaceSelection).toHaveBeenCalledWith("hello\nworld");
  });

  it("removes all spaces including full-width when all option is set", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "hel lo\u3000world"),
    });
    TextEnhancement.processWhitespace(editor as any, { all: true });
    expect(editor.replaceSelection).toHaveBeenCalledWith("helloworld");
  });

  it("compresses multiple spaces into one (compress option)", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "foo   bar"),
    });
    TextEnhancement.processWhitespace(editor as any, { compress: true });
    expect(editor.replaceSelection).toHaveBeenCalledWith("foo bar");
  });

  it("removes tab characters (tabs option)", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "foo\tbar"),
    });
    TextEnhancement.processWhitespace(editor as any, { tabs: true });
    expect(editor.replaceSelection).toHaveBeenCalledWith("foobar");
  });

  it("removes all empty lines (removeEmptyLines option)", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "line1\n\nline2\n\n\nline3"),
    });
    TextEnhancement.processWhitespace(editor as any, { removeEmptyLines: true });
    expect(editor.replaceSelection).toHaveBeenCalledWith("line1\nline2\nline3");
  });

  it("compresses consecutive empty lines into one (compactEmptyLines option)", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "line1\n\n\n\nline2"),
    });
    TextEnhancement.processWhitespace(editor as any, { compactEmptyLines: true });
    expect(editor.replaceSelection).toHaveBeenCalledWith("line1\n\nline2");
  });
});

// ─── dedupe ───────────────────────────────────────────────────────────────────

describe("TextEnhancement.dedupe", () => {
  it("does nothing when there is no selection", () => {
    const editor = makeEditor();
    TextEnhancement.dedupe(editor as any);
    expect(editor.replaceSelection).not.toHaveBeenCalled();
  });

  it("removes duplicate lines", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "apple\nbanana\napple\ncherry"),
    });
    TextEnhancement.dedupe(editor as any);
    expect(editor.replaceSelection).toHaveBeenCalledWith(
      "apple\nbanana\ncherry"
    );
  });

  it("preserves empty lines by default (they are not deduped)", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "a\n\nb\n\nc"),
    });
    TextEnhancement.dedupe(editor as any);
    // Empty lines should be preserved
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(result).toContain("\n\n");
  });

  it("dedupes empty lines when includeEmpty is true", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "\n\n\na"),
    });
    TextEnhancement.dedupe(editor as any, { includeEmpty: true });
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    // Should have only one empty line
    expect(result).not.toMatch(/\n\n/);
  });

  it("sorts output when sort option is enabled", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "cherry\napple\nbanana"),
    });
    TextEnhancement.dedupe(editor as any, { sort: true });
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(result).toBe("apple\nbanana\ncherry");
  });

  it("trims before comparing when trimBeforeCompare is true", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "apple\n  apple\n banana"),
    });
    TextEnhancement.dedupe(editor as any, { trimBeforeCompare: true });
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const lines = result.split("\n");
    // "apple" and "  apple" are considered the same after trim → only 2 unique lines
    expect(lines.length).toBe(2);
  });
});

// ─── addWrap ──────────────────────────────────────────────────────────────────

describe("TextEnhancement.addWrap", () => {
  it("wraps each non-empty line with prefix and suffix", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "line1\nline2"),
    });
    TextEnhancement.addWrap(editor as any, "- ", " -");
    expect(editor.replaceSelection).toHaveBeenCalledWith("- line1 -\n- line2 -");
  });

  it("skips empty lines when excludeEmpty is true (default)", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "line1\n\nline2"),
    });
    TextEnhancement.addWrap(editor as any, "> ");
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(result).toBe("> line1\n\n> line2");
  });

  it("wraps empty lines when excludeEmpty is false", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "line1\n\nline2"),
    });
    TextEnhancement.addWrap(editor as any, "> ", "", false);
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(result).toBe("> line1\n> \n> line2");
  });

  it("falls back to full document when there is no selection", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => ""),
      getValue: vi.fn(() => "a\nb"),
    });
    TextEnhancement.addWrap(editor as any, "* ");
    expect(editor.setValue).toHaveBeenCalledWith("* a\n* b");
  });
});

// ─── numberList ───────────────────────────────────────────────────────────────

describe("TextEnhancement.numberList", () => {
  it("does nothing when there is no selection", () => {
    const editor = makeEditor();
    TextEnhancement.numberList(editor as any);
    expect(editor.replaceSelection).not.toHaveBeenCalled();
  });

  it("numbers lines starting from 1", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "apple\nbanana\ncherry"),
    });
    TextEnhancement.numberList(editor as any);
    expect(editor.replaceSelection).toHaveBeenCalledWith(
      "1. apple\n2. banana\n3. cherry"
    );
  });

  it("respects a custom start number", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "a\nb"),
    });
    TextEnhancement.numberList(editor as any, 5);
    expect(editor.replaceSelection).toHaveBeenCalledWith("5. a\n6. b");
  });

  it("respects a custom step number", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "a\nb\nc"),
    });
    TextEnhancement.numberList(editor as any, 10, 10);
    expect(editor.replaceSelection).toHaveBeenCalledWith(
      "10. a\n20. b\n30. c"
    );
  });

  it("replaces existing numbering on re-number", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "1. apple\n2. banana"),
    });
    TextEnhancement.numberList(editor as any, 1, 1, ") ");
    expect(editor.replaceSelection).toHaveBeenCalledWith(
      "1) apple\n2) banana"
    );
  });

  it("skips blank lines", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "a\n\nb"),
    });
    TextEnhancement.numberList(editor as any);
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const lines = result.split("\n");
    expect(lines[0]).toBe("1. a");
    expect(lines[1]).toBe(""); // blank line kept
    expect(lines[2]).toBe("2. b");
  });
});

// ─── mergeLines ───────────────────────────────────────────────────────────────

describe("TextEnhancement.mergeLines", () => {
  it("does nothing when there is no selection", () => {
    const editor = makeEditor();
    TextEnhancement.mergeLines(editor as any, { separator: "" });
    expect(editor.replaceSelection).not.toHaveBeenCalled();
  });

  it("merges English lines with a space (smart mode)", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "hello\nworld"),
    });
    TextEnhancement.mergeLines(editor as any, { separator: "" });
    expect(editor.replaceSelection).toHaveBeenCalledWith("hello world");
  });

  it("merges Chinese lines without a space (smart mode)", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "你好\n世界"),
    });
    TextEnhancement.mergeLines(editor as any, { separator: "" });
    expect(editor.replaceSelection).toHaveBeenCalledWith("你好世界");
  });

  it("uses the custom separator when provided", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "a\nb\nc"),
    });
    TextEnhancement.mergeLines(editor as any, { separator: ", " });
    expect(editor.replaceSelection).toHaveBeenCalledWith("a, b, c");
  });

  it("preserves paragraphs (double newlines) when option is set", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "a\nb\n\nc\nd"),
    });
    TextEnhancement.mergeLines(editor as any, {
      separator: "",
      preserveParagraphs: true,
    });
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    // Paragraph break must remain
    expect(result).toContain("\n\n");
  });

  it("trims each line before merging when trimLines is set", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "  hello  \n  world  "),
    });
    TextEnhancement.mergeLines(editor as any, {
      separator: "",
      trimLines: true,
    });
    expect(editor.replaceSelection).toHaveBeenCalledWith("hello world");
  });
});

// ─── smartTypography ─────────────────────────────────────────────────────────

describe("TextEnhancement.smartTypography", () => {
  it("does nothing when there is no selection", () => {
    const editor = makeEditor();
    TextEnhancement.smartTypography(editor as any);
    expect(editor.replaceSelection).not.toHaveBeenCalled();
  });

  it("converts ASCII punctuation to full-width in Chinese context", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "你好, 世界! 今天?"),
    });
    TextEnhancement.smartTypography(editor as any);
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(result).toContain("，");
    expect(result).toContain("！");
    expect(result).toContain("？");
  });

  it("converts full-width punctuation to ASCII in English context", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "Hello，world！How are you？"),
    });
    TextEnhancement.smartTypography(editor as any);
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(result).toContain(",");
    expect(result).toContain("!");
    expect(result).toContain("?");
  });

  it("preserves code spans (backtick-wrapped content)", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "`x,y`"),
    });
    TextEnhancement.smartTypography(editor as any);
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    // The comma inside backticks must not be changed
    expect(result).toContain("`x,y`");
  });

  it("preserves URLs in selections", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "visit https://example.com today"),
    });
    TextEnhancement.smartTypography(editor as any);
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(result).toContain("https://example.com");
  });
});

// ─── extractBetween ───────────────────────────────────────────────────────────

describe("TextEnhancement.extractBetween", () => {
  it("extracts content between two delimiters", () => {
    const editor = makeEditor({
      getValue: vi.fn(() => "[hello] [world]"),
    });
    TextEnhancement.extractBetween(editor as any, "[", "]");
    expect(editor.setValue).toHaveBeenCalledWith("hello\nworld");
  });

  it("does nothing if the document is empty", () => {
    const editor = makeEditor({ getValue: vi.fn(() => "") });
    TextEnhancement.extractBetween(editor as any, "[", "]");
    expect(editor.setValue).not.toHaveBeenCalled();
  });

  it("does nothing when no matches are found", () => {
    const editor = makeEditor({ getValue: vi.fn(() => "no brackets here") });
    TextEnhancement.extractBetween(editor as any, "[", "]");
    expect(editor.setValue).not.toHaveBeenCalled();
  });

  it("handles regex special characters in delimiters", () => {
    const editor = makeEditor({
      getValue: vi.fn(() => "(hello) (world)"),
    });
    TextEnhancement.extractBetween(editor as any, "(", ")");
    expect(editor.setValue).toHaveBeenCalledWith("hello\nworld");
  });

  it("shows a notice when no start or end string is given", () => {
    const editor = makeEditor({ getValue: vi.fn(() => "some text") });
    TextEnhancement.extractBetween(editor as any, "", "");
    expect(editor.setValue).not.toHaveBeenCalled();
  });
});

// ─── splitLines ───────────────────────────────────────────────────────────────

describe("TextEnhancement.splitLines", () => {
  it("does nothing when there is no selection", () => {
    const editor = makeEditor();
    TextEnhancement.splitLines(editor as any);
    expect(editor.replaceSelection).not.toHaveBeenCalled();
  });

  it("splits a numbered list into separate lines", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "1. apple 2. banana 3. cherry"),
    });
    TextEnhancement.splitLines(editor as any);
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const lines = result.split("\n").filter(Boolean);
    expect(lines.length).toBeGreaterThan(1);
  });

  it("splits a comma-separated list", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "apple,banana,cherry"),
    });
    TextEnhancement.splitLines(editor as any);
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(result).toContain("\n");
  });

  it("splits an arrow-separated list", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "step1 → step2 → step3"),
    });
    TextEnhancement.splitLines(editor as any);
    const result = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const lines = result.split("\n").filter(Boolean);
    expect(lines.length).toBe(3);
  });

  it("does not split when no obvious separator is detected", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "just a plain sentence"),
    });
    TextEnhancement.splitLines(editor as any);
    expect(editor.replaceSelection).not.toHaveBeenCalled();
  });
});
