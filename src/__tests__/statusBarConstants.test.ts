import { describe, it, expect, beforeEach, afterEach } from "vitest";

// statusBarConstants.ts calls `activeWindow.document` when requireApiVersion()
// returns true (as it does in the mock).  In jsdom, `window === globalThis`, so
// we expose `activeWindow` as an alias to satisfy the lookup.
(globalThis as any).activeWindow = globalThis;

import {
  setMenuVisibility,
  setBottomValue,
  setHorizontalValue,
} from "src/util/statusBarConstants";
import type { editingToolbarSettings } from "src/settings/settingsData";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeSettings(
  overrides: Partial<editingToolbarSettings> = {}
): editingToolbarSettings {
  return {
    verticalPosition: 0,
    horizontalPosition: 0,
    // Minimal required properties so TypeScript is happy
    ...overrides,
  } as editingToolbarSettings;
}

// ─── setMenuVisibility ────────────────────────────────────────────────────────

describe("setMenuVisibility", () => {
  let toolbar: HTMLElement;

  beforeEach(() => {
    // Create a toolbar element with the attribute-based selector used in the
    // production code.
    toolbar = document.createElement("div");
    toolbar.classList.add("editingToolbarModalBar");
    toolbar.setAttribute("data-toolbar-style", "top");
    document.body.appendChild(toolbar);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("hides the toolbar when visibility is false", () => {
    setMenuVisibility(false);
    expect(toolbar.style.display).toBe("none");
  });

  it("shows the toolbar when visibility is true", () => {
    // First hide it so we have something to restore.
    toolbar.style.display = "none";
    setMenuVisibility(true);
    expect(toolbar.style.display).toBe("");
    expect(toolbar.style.visibility).toBe("visible");
  });

  it("hides toolbars for all three position styles", () => {
    const styles = ["top", "following", "fixed"];
    const elements = styles.map((style) => {
      const el = document.createElement("div");
      el.classList.add("editingToolbarModalBar");
      el.setAttribute("data-toolbar-style", style);
      document.body.appendChild(el);
      return el;
    });

    setMenuVisibility(false);
    elements.forEach((el) => expect(el.style.display).toBe("none"));
  });

  it("shows toolbars for all three position styles", () => {
    const styles = ["top", "following", "fixed"];
    const elements = styles.map((style) => {
      const el = document.createElement("div");
      el.classList.add("editingToolbarModalBar");
      el.setAttribute("data-toolbar-style", style);
      el.style.display = "none";
      document.body.appendChild(el);
      return el;
    });

    setMenuVisibility(true);
    elements.forEach((el) => {
      expect(el.style.display).toBe("");
      expect(el.style.visibility).toBe("visible");
    });
  });

  it("handles the legacy ID-based toolbar element when hiding", () => {
    const legacy = document.createElement("div");
    legacy.id = "editingToolbarModalBar";
    document.body.appendChild(legacy);

    setMenuVisibility(false);
    expect(legacy.style.display).toBe("none");
  });

  it("handles the legacy ID-based toolbar element when showing", () => {
    const legacy = document.createElement("div");
    legacy.id = "editingToolbarModalBar";
    legacy.style.display = "none";
    document.body.appendChild(legacy);

    setMenuVisibility(true);
    expect(legacy.style.display).toBe("");
    expect(legacy.style.visibility).toBe("visible");
  });

  it("does not throw when no toolbar elements exist", () => {
    document.body.innerHTML = "";
    expect(() => setMenuVisibility(false)).not.toThrow();
    expect(() => setMenuVisibility(true)).not.toThrow();
  });
});

// ─── setBottomValue ───────────────────────────────────────────────────────────

describe("setBottomValue", () => {
  afterEach(() => {
    document.documentElement.style.removeProperty("--toolbar-vertical-offset");
  });

  it("sets the --toolbar-vertical-offset CSS variable to the verticalPosition value", () => {
    setBottomValue(makeSettings({ verticalPosition: 42 }));
    expect(
      document.documentElement.style.getPropertyValue(
        "--toolbar-vertical-offset"
      )
    ).toBe("42px");
  });

  it("sets a negative offset correctly", () => {
    setBottomValue(makeSettings({ verticalPosition: -10 }));
    expect(
      document.documentElement.style.getPropertyValue(
        "--toolbar-vertical-offset"
      )
    ).toBe("-10px");
  });

  it("sets offset to 0px when verticalPosition is 0", () => {
    setBottomValue(makeSettings({ verticalPosition: 0 }));
    expect(
      document.documentElement.style.getPropertyValue(
        "--toolbar-vertical-offset"
      )
    ).toBe("0px");
  });
});

// ─── setHorizontalValue ───────────────────────────────────────────────────────

describe("setHorizontalValue", () => {
  afterEach(() => {
    document.documentElement.style.removeProperty(
      "--toolbar-horizontal-offset"
    );
  });

  it("sets the --toolbar-horizontal-offset CSS variable to the horizontalPosition value", () => {
    setHorizontalValue(makeSettings({ horizontalPosition: 100 }));
    expect(
      document.documentElement.style.getPropertyValue(
        "--toolbar-horizontal-offset"
      )
    ).toBe("100px");
  });

  it("sets a zero horizontal offset correctly", () => {
    setHorizontalValue(makeSettings({ horizontalPosition: 0 }));
    expect(
      document.documentElement.style.getPropertyValue(
        "--toolbar-horizontal-offset"
      )
    ).toBe("0px");
  });

  it("sets a negative horizontal offset correctly", () => {
    setHorizontalValue(makeSettings({ horizontalPosition: -50 }));
    expect(
      document.documentElement.style.getPropertyValue(
        "--toolbar-horizontal-offset"
      )
    ).toBe("-50px");
  });
});
