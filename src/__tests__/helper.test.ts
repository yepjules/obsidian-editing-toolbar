import { describe, it, expect } from "vitest";
// The obsidian mock sets moment.locale() → "en", so the helper will load the
// English locale map at module-import time.
import { t } from "src/translations/helper";

describe("t() – translation helper", () => {
  it("returns the English translation for a known key", () => {
    // "Please select text first" is defined in en.ts
    expect(t("Please select text first")).toBe("Please select text first");
  });

  it("returns the key itself when no translation exists", () => {
    const unknownKey = "this-key-does-not-exist-xyz-12345";
    expect(t(unknownKey)).toBe(unknownKey);
  });

  it("returns an empty string for an empty input", () => {
    expect(t("")).toBe("");
  });

  it("returns an empty string for a non-string input (null)", () => {
    expect(t(null as any)).toBe("");
  });

  it("returns an empty string for a non-string input (number)", () => {
    expect(t(42 as any)).toBe("");
  });

  it("returns the translation for another known key", () => {
    expect(t("Add")).toBe("Add");
  });

  it("returns the translation for 'Save'", () => {
    expect(t("Save")).toBe("Save");
  });

  it("returns the translation for 'Cancel'", () => {
    expect(t("Cancel")).toBe("Cancel");
  });

  it("returns a non-empty string for 'Refresh'", () => {
    expect(t("Refresh").length).toBeGreaterThan(0);
  });
});
