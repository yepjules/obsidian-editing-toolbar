import { describe, it, expect, vi, beforeEach } from "vitest";
// The `obsidian` import resolves to the stub at src/__mocks__/obsidian.ts
import { moment } from "obsidian";

import {
  getCurrentLocale,
  isChineseLocale,
  shouldShowAIFeatures,
} from "src/util/locale";

const mockMomentLocale = moment.locale as ReturnType<typeof vi.fn>;

describe("isChineseLocale", () => {
  it("returns true for 'zh'", () => {
    expect(isChineseLocale("zh")).toBe(true);
  });

  it("returns true for 'zh-CN' (case-insensitive)", () => {
    expect(isChineseLocale("zh-CN")).toBe(true);
  });

  it("returns true for 'zh-cn' (lowercase)", () => {
    expect(isChineseLocale("zh-cn")).toBe(true);
  });

  it("returns true for 'zh-TW'", () => {
    expect(isChineseLocale("zh-TW")).toBe(true);
  });

  it("returns true for 'ZH' (uppercase, normalised)", () => {
    expect(isChineseLocale("ZH")).toBe(true);
  });

  it("returns false for 'en'", () => {
    expect(isChineseLocale("en")).toBe(false);
  });

  it("returns false for 'de'", () => {
    expect(isChineseLocale("de")).toBe(false);
  });

  it("returns false for 'ja' (Japanese, not Chinese)", () => {
    expect(isChineseLocale("ja")).toBe(false);
  });

  it("returns false for 'ko'", () => {
    expect(isChineseLocale("ko")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isChineseLocale("")).toBe(false);
  });

  it("uses getCurrentLocale when no argument is given", () => {
    mockMomentLocale.mockReturnValueOnce("zh-cn");
    expect(isChineseLocale()).toBe(true);
  });

  it("returns false when getCurrentLocale returns 'en'", () => {
    mockMomentLocale.mockReturnValueOnce("en");
    expect(isChineseLocale()).toBe(false);
  });
});

describe("shouldShowAIFeatures", () => {
  it("returns true for Chinese locales", () => {
    expect(shouldShowAIFeatures("zh")).toBe(true);
    expect(shouldShowAIFeatures("zh-CN")).toBe(true);
    expect(shouldShowAIFeatures("zh-tw")).toBe(true);
  });

  it("returns true for non-Chinese locales (AI features are always enabled)", () => {
    // The current implementation unconditionally returns true — AI features
    // are shown for all locales regardless of the locale argument.
    expect(shouldShowAIFeatures("en")).toBe(true);
    expect(shouldShowAIFeatures("fr")).toBe(true);
    expect(shouldShowAIFeatures("ja")).toBe(true);
  });

  it("always returns true regardless of getCurrentLocale result", () => {
    mockMomentLocale.mockReturnValueOnce("zh-cn");
    expect(shouldShowAIFeatures()).toBe(true);

    mockMomentLocale.mockReturnValueOnce("en");
    expect(shouldShowAIFeatures()).toBe(true);
  });
});

describe("getCurrentLocale", () => {
  beforeEach(() => {
    mockMomentLocale.mockReset();
  });

  it("returns the value from moment.locale()", () => {
    mockMomentLocale.mockReturnValueOnce("de");
    expect(getCurrentLocale()).toBe("de");
  });
});
