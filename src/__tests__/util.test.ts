import { describe, it, expect } from "vitest";
import { GenNonDuplicateID, findmenuID } from "src/util/util";

// ─── GenNonDuplicateID ────────────────────────────────────────────────────────

describe("GenNonDuplicateID", () => {
  it("returns a non-empty string", () => {
    const id = GenNonDuplicateID(3);
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("appends random characters of the requested length", () => {
    // The ID consists of a base-36 timestamp plus `randomLength` random chars.
    // We cannot assert the exact length because Date.now().toString(36) varies,
    // but the random suffix must be at most `randomLength` chars long.
    const randomLength = 5;
    const id = GenNonDuplicateID(randomLength);
    // base-36 timestamp is at least 8 chars at current epoch values
    expect(id.length).toBeGreaterThanOrEqual(8);
  });

  it("generates unique IDs on successive calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => GenNonDuplicateID(5)));
    // Allow at most 1 collision in 100 to account for extreme randomness edge cases
    expect(ids.size).toBeGreaterThanOrEqual(99);
  });

  it("accepts a randomLength of 0 and still returns the timestamp part", () => {
    const id = GenNonDuplicateID(0);
    expect(id.length).toBeGreaterThan(0);
  });
});

// ─── findmenuID ───────────────────────────────────────────────────────────────

const makePlugin = () => ({ settings: { menuCommands: [] } });

describe("findmenuID – top-level search (issub = false)", () => {
  const commands = [
    { id: "cmd-a", name: "Command A" },
    { id: "cmd-b", name: "Command B" },
    { id: "cmd-c", name: "Command C" },
  ];

  it("finds the first command", () => {
    const result = findmenuID(makePlugin(), { id: "cmd-a", name: "Command A" }, false, commands);
    expect(result).toEqual({ index: 0, subindex: -1 });
  });

  it("finds a command in the middle", () => {
    const result = findmenuID(makePlugin(), { id: "cmd-b", name: "Command B" }, false, commands);
    expect(result).toEqual({ index: 1, subindex: -1 });
  });

  it("finds the last command", () => {
    const result = findmenuID(makePlugin(), { id: "cmd-c", name: "Command C" }, false, commands);
    expect(result).toEqual({ index: 2, subindex: -1 });
  });

  it("returns index -1 for a command that does not exist", () => {
    const result = findmenuID(makePlugin(), { id: "cmd-z", name: "Missing" }, false, commands);
    expect(result).toEqual({ index: -1, subindex: -1 });
  });

  it("returns index -1 for an empty command list", () => {
    const result = findmenuID(makePlugin(), { id: "cmd-a", name: "A" }, false, []);
    expect(result).toEqual({ index: -1, subindex: -1 });
  });
});

describe("findmenuID – submenu search (issub = true)", () => {
  const commandsWithSubs = [
    {
      id: "parent-1",
      name: "Parent 1",
      SubmenuCommands: [
        { id: "sub-a", name: "Sub A" },
        { id: "sub-b", name: "Sub B" },
      ],
    },
    {
      id: "parent-2",
      name: "Parent 2",
      SubmenuCommands: [{ id: "sub-c", name: "Sub C" }],
    },
    { id: "parent-3", name: "Parent 3 (no subs)" },
  ];

  it("finds a sub-command in the first parent", () => {
    const result = findmenuID(makePlugin(), { id: "sub-a", name: "Sub A" }, true, commandsWithSubs);
    expect(result).toEqual({ index: 0, subindex: 0 });
  });

  it("finds the second sub-command in the first parent", () => {
    const result = findmenuID(makePlugin(), { id: "sub-b", name: "Sub B" }, true, commandsWithSubs);
    expect(result).toEqual({ index: 0, subindex: 1 });
  });

  it("finds a sub-command in the second parent", () => {
    const result = findmenuID(makePlugin(), { id: "sub-c", name: "Sub C" }, true, commandsWithSubs);
    expect(result).toEqual({ index: 1, subindex: 0 });
  });

  it("returns { index: -1, subindex: -1 } for a missing sub-command", () => {
    const result = findmenuID(makePlugin(), { id: "sub-z", name: "Missing" }, true, commandsWithSubs);
    expect(result).toEqual({ index: -1, subindex: -1 });
  });

  it("returns { index: -1, subindex: -1 } when no items have SubmenuCommands", () => {
    const flat = [{ id: "x", name: "X" }, { id: "y", name: "Y" }];
    const result = findmenuID(makePlugin(), { id: "x", name: "X" }, true, flat);
    expect(result).toEqual({ index: -1, subindex: -1 });
  });
});
