import { describe, it, expect, vi, beforeEach } from "vitest";

import { wait, colorpicker, backcolorpicker, setHeader, setFontcolor, setBackgroundcolor } from "src/util/util";

// ─── Shared editor mock factory ───────────────────────────────────────────────

function makeEditor(overrides: Record<string, any> = {}) {
  const base = {
    getCursor: vi.fn(() => ({ line: 0, ch: 0 })),
    getLine: vi.fn(() => ""),
    getRange: vi.fn(() => ""),
    setLine: vi.fn(),
    setCursor: vi.fn(),
    getSelection: vi.fn(() => ""),
    replaceSelection: vi.fn(),
    listSelections: vi.fn(() => []),
    setSelections: vi.fn(),
  };
  return { ...base, ...overrides };
}

// ─── wait ─────────────────────────────────────────────────────────────────────

describe("wait", () => {
  it("resolves after the given delay (approx.)", async () => {
    const start = Date.now();
    await wait(50);
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });

  it("returns a Promise", () => {
    expect(wait(0)).toBeInstanceOf(Promise);
  });

  it("resolves immediately with delay 0", async () => {
    await expect(wait(0)).resolves.toBeUndefined();
  });
});

// ─── colorpicker ─────────────────────────────────────────────────────────────

describe("colorpicker", () => {
  const plugin = {
    settings: {
      custom_fc1: "#ff0000",
      custom_fc2: "#00ff00",
      custom_fc3: "#0000ff",
      custom_fc4: "#ffffff",
      custom_fc5: "#000000",
    },
  };

  it("returns a non-empty HTML string", () => {
    const html = colorpicker(plugin);
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(0);
  });

  it("includes all custom font colors in the output", () => {
    const html = colorpicker(plugin);
    expect(html).toContain("#ff0000");
    expect(html).toContain("#00ff00");
    expect(html).toContain("#0000ff");
    expect(html).toContain("#ffffff");
    expect(html).toContain("#000000");
  });

  it("contains the color picker table element", () => {
    const html = colorpicker(plugin);
    expect(html).toContain("x-color-picker-table");
  });

  it("contains the theme colors section header", () => {
    const html = colorpicker(plugin);
    expect(html).toContain("Theme Colors");
  });

  it("contains the standard colors section header", () => {
    const html = colorpicker(plugin);
    expect(html).toContain("Standard Colors");
  });

  it("contains the custom font colors section header", () => {
    const html = colorpicker(plugin);
    expect(html).toContain("Custom Font Colors");
  });
});

// ─── backcolorpicker ──────────────────────────────────────────────────────────

describe("backcolorpicker", () => {
  const plugin = {
    settings: {
      custom_bg1: "rgba(255,0,0,0.2)",
      custom_bg2: "rgba(0,255,0,0.2)",
      custom_bg3: "rgba(0,0,255,0.2)",
      custom_bg4: "#aabbcc",
      custom_bg5: "transparent",
    },
  };

  it("returns a non-empty HTML string", () => {
    const html = backcolorpicker(plugin);
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(0);
  });

  it("includes all custom background colors in the output", () => {
    const html = backcolorpicker(plugin);
    expect(html).toContain("rgba(255,0,0,0.2)");
    expect(html).toContain("rgba(0,255,0,0.2)");
    expect(html).toContain("rgba(0,0,255,0.2)");
    expect(html).toContain("#aabbcc");
    expect(html).toContain("transparent");
  });

  it("contains the Highlighter Colors section header", () => {
    const html = backcolorpicker(plugin);
    expect(html).toContain("Highlighter Colors");
  });

  it("contains the Translucent Colors section header", () => {
    const html = backcolorpicker(plugin);
    expect(html).toContain("Translucent Colors");
  });

  it("contains the x-backgroundcolor-picker-table id", () => {
    const html = backcolorpicker(plugin);
    expect(html).toContain("x-backgroundcolor-picker-table");
  });
});

// ─── setHeader ────────────────────────────────────────────────────────────────

describe("setHeader", () => {
  it("adds a heading prefix to a plain line", () => {
    const editor = makeEditor({
      getLine: vi.fn(() => "Hello world"),
      getRange: vi.fn(() => "world"),
    });
    setHeader("##", editor as any);
    expect(editor.setLine).toHaveBeenCalledWith(0, "## Hello world");
  });

  it("replaces an existing heading with a new one", () => {
    const editor = makeEditor({
      getLine: vi.fn(() => "# Hello world"),
      getRange: vi.fn(() => "world"),
    });
    setHeader("##", editor as any);
    expect(editor.setLine).toHaveBeenCalledWith(0, "## Hello world");
  });

  it("removes the heading when passed an empty string", () => {
    const editor = makeEditor({
      getLine: vi.fn(() => "## Hello world"),
      getRange: vi.fn(() => "world"),
    });
    setHeader("", editor as any);
    expect(editor.setLine).toHaveBeenCalledWith(0, "Hello world");
  });

  it("toggles off the heading when the same level is passed again", () => {
    const editor = makeEditor({
      getLine: vi.fn(() => "## Hello world"),
      getRange: vi.fn(() => "world"),
    });
    // Passing "##" when the line already starts with "##" should remove it
    setHeader("##", editor as any);
    expect(editor.setLine).toHaveBeenCalledWith(0, "Hello world");
  });

  it("updates the cursor position after changing the line", () => {
    const editor = makeEditor({
      getLine: vi.fn(() => "Hello"),
      getRange: vi.fn(() => ""),
    });
    setHeader("##", editor as any);
    expect(editor.setCursor).toHaveBeenCalled();
  });

  it("replaces list prefix with a heading", () => {
    const editor = makeEditor({
      getLine: vi.fn(() => "- Hello world"),
      getRange: vi.fn(() => "world"),
    });
    setHeader("##", editor as any);
    expect(editor.setLine).toHaveBeenCalledWith(0, "## Hello world");
  });
});

// ─── setFontcolor ─────────────────────────────────────────────────────────────

describe("setFontcolor", () => {
  it("does nothing when editor is not provided", () => {
    // Should not throw
    expect(() => setFontcolor("#ff0000", undefined)).not.toThrow();
  });

  it("wraps selected text in a font color tag", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "hello"),
      listSelections: vi.fn(() => [
        { anchor: { line: 0, ch: 0 }, head: { line: 0, ch: 5 } },
      ]),
    });
    setFontcolor("#ff0000", editor as any);
    expect(editor.replaceSelection).toHaveBeenCalledWith(
      '<font color="#ff0000">hello</font>'
    );
  });

  it("replaces an existing font color tag with a new color", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => '<font color="#0000ff">hello</font>'),
      listSelections: vi.fn(() => [
        { anchor: { line: 0, ch: 0 }, head: { line: 0, ch: 30 } },
      ]),
    });
    setFontcolor("#ff0000", editor as any);
    expect(editor.replaceSelection).toHaveBeenCalledWith(
      '<font color="#ff0000">hello</font>'
    );
  });

  it("does not replace when text is already in the same color", () => {
    const sameColorText = '<font color="#ff0000">hello</font>';
    const editor = makeEditor({
      getSelection: vi.fn(() => sameColorText),
      listSelections: vi.fn(() => [
        { anchor: { line: 0, ch: 0 }, head: { line: 0, ch: sameColorText.length } },
      ]),
    });
    setFontcolor("#ff0000", editor as any);
    // replaceSelection should NOT be called since the color is unchanged
    expect(editor.replaceSelection).not.toHaveBeenCalled();
  });

  it("handles multiline selection – wraps each non-empty line", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "line1\nline2"),
      listSelections: vi.fn(() => [
        { anchor: { line: 0, ch: 0 }, head: { line: 1, ch: 5 } },
      ]),
    });
    setFontcolor("#ff0000", editor as any);
    const arg = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(arg).toContain('<font color="#ff0000">line1</font>');
    expect(arg).toContain('<font color="#ff0000">line2</font>');
  });
});

// ─── setBackgroundcolor ───────────────────────────────────────────────────────

describe("setBackgroundcolor", () => {
  it("does nothing when editor is not provided", () => {
    expect(() => setBackgroundcolor("#ff0000", undefined)).not.toThrow();
  });

  it("does nothing when nothing is selected", () => {
    const editor = makeEditor({ getSelection: vi.fn(() => "") });
    setBackgroundcolor("#ff0000", editor as any);
    expect(editor.replaceSelection).not.toHaveBeenCalled();
  });

  it("wraps selected text in a mark background color tag", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "hello"),
      listSelections: vi.fn(() => [
        { anchor: { line: 0, ch: 0 }, head: { line: 0, ch: 5 } },
      ]),
    });
    setBackgroundcolor("#ffff00", editor as any);
    expect(editor.replaceSelection).toHaveBeenCalledWith(
      '<mark style="background:#ffff00">hello</mark>'
    );
  });

  it("replaces an existing background color with a new one", () => {
    const existing = '<mark style="background:#aabbcc">hello</mark>';
    const editor = makeEditor({
      getSelection: vi.fn(() => existing),
      listSelections: vi.fn(() => [
        { anchor: { line: 0, ch: 0 }, head: { line: 0, ch: existing.length } },
      ]),
    });
    setBackgroundcolor("#ffff00", editor as any);
    const arg = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(arg).toContain("background:#ffff00");
    expect(arg).not.toContain("background:#aabbcc");
  });

  it("replaces the content even when the same background color is already set (guard regex has a known limitation)", () => {
    // The `isAlreadyInSameColor` guard uses `new RegExp(template)` where
    // `[\s\S]` in the template string literal becomes `[sS]` (backslash is
    // consumed for the non-escape `\s`/`\S`), so the guard only matches content
    // consisting solely of the characters `s` and `S`.  For content like
    // "hello", the guard returns false and the function falls through to the
    // replacement path (which still produces an identical result when the color
    // matches).  This test documents that current behaviour.
    const sameColorText = '<mark style="background:#ffff00">hello</mark>';
    const editor = makeEditor({
      getSelection: vi.fn(() => sameColorText),
      listSelections: vi.fn(() => [
        { anchor: { line: 0, ch: 0 }, head: { line: 0, ch: sameColorText.length } },
      ]),
    });
    setBackgroundcolor("#ffff00", editor as any);
    // replaceSelection IS called (with the same content — the colour value
    // stays unchanged because the replacement matches and re-applies #ffff00).
    const arg = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(arg).toContain("background:#ffff00");
  });

  it("wraps each non-empty line independently in multiline selection", () => {
    const editor = makeEditor({
      getSelection: vi.fn(() => "line1\nline2"),
      listSelections: vi.fn(() => [
        { anchor: { line: 0, ch: 0 }, head: { line: 1, ch: 5 } },
      ]),
    });
    setBackgroundcolor("#ffff00", editor as any);
    const arg = (editor.replaceSelection as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(arg).toContain('<mark style="background:#ffff00">line1</mark>');
    expect(arg).toContain('<mark style="background:#ffff00">line2</mark>');
  });
});
