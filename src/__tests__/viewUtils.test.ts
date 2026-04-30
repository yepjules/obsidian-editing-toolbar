import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ViewUtils accesses `window.app` at runtime; we need to stub it before import.
// We also mock the `obsidian` module (already mocked via setup.ts).

import { ViewUtils } from "src/util/viewUtils";

function makeView(viewType: string, mode?: string) {
  return {
    getViewType: vi.fn(() => viewType),
    getMode: mode !== undefined ? vi.fn(() => mode) : undefined,
  };
}

describe("ViewUtils.isAllowedViewType", () => {
  beforeEach(() => {
    // Ensure window.app is undefined so the plugin-settings branch is skipped
    (globalThis as any).app = undefined;
    (globalThis as any).window = globalThis;
  });

  afterEach(() => {
    delete (globalThis as any).app;
  });

  it("returns false when view is null", () => {
    expect(ViewUtils.isAllowedViewType(null)).toBe(false);
  });

  it("returns true for the 'markdown' view type (default allowed)", () => {
    expect(ViewUtils.isAllowedViewType(makeView("markdown") as any)).toBe(true);
  });

  it("returns true for the 'canvas' view type (default allowed)", () => {
    expect(ViewUtils.isAllowedViewType(makeView("canvas") as any)).toBe(true);
  });

  it("returns true for 'thino_view' (default allowed)", () => {
    expect(ViewUtils.isAllowedViewType(makeView("thino_view") as any)).toBe(true);
  });

  it("returns true for 'meld-encrypted-view' (default allowed)", () => {
    expect(ViewUtils.isAllowedViewType(makeView("meld-encrypted-view") as any)).toBe(
      true
    );
  });

  it("returns false for an unknown view type", () => {
    expect(ViewUtils.isAllowedViewType(makeView("pdf") as any)).toBe(false);
  });

  it("returns true for a custom allowed type list when the view matches", () => {
    expect(
      ViewUtils.isAllowedViewType(makeView("pdf") as any, ["pdf", "markdown"])
    ).toBe(true);
  });

  it("returns false when the view type is not in the custom allowed list", () => {
    expect(
      ViewUtils.isAllowedViewType(makeView("canvas") as any, ["pdf"])
    ).toBe(false);
  });

  it("respects plugin viewTypeSettings when available", () => {
    // Simulate a plugin that explicitly allows the 'pdf' view
    (globalThis as any).app = {
      plugins: {
        plugins: {
          "editing-toolbar": {
            settings: {
              viewTypeSettings: { pdf: true },
            },
          },
        },
      },
    };
    expect(ViewUtils.isAllowedViewType(makeView("pdf") as any)).toBe(true);
  });

  it("respects plugin viewTypeSettings when a type is explicitly disabled", () => {
    (globalThis as any).app = {
      plugins: {
        plugins: {
          "editing-toolbar": {
            settings: {
              viewTypeSettings: { markdown: false },
            },
          },
        },
      },
    };
    expect(ViewUtils.isAllowedViewType(makeView("markdown") as any)).toBe(false);
  });
});

describe("ViewUtils.isSourceMode", () => {
  it("returns false when view is null", () => {
    expect(ViewUtils.isSourceMode(null)).toBe(false);
  });

  it("returns true when getMode() returns 'source'", () => {
    expect(ViewUtils.isSourceMode(makeView("markdown", "source") as any)).toBe(
      true
    );
  });

  it("returns false when getMode() returns 'preview'", () => {
    expect(ViewUtils.isSourceMode(makeView("markdown", "preview") as any)).toBe(
      false
    );
  });

  it("returns false when getMode() is undefined", () => {
    const view = {
      getViewType: vi.fn(() => "markdown"),
      getMode: undefined,
    };
    expect(ViewUtils.isSourceMode(view as any)).toBe(false);
  });
});
