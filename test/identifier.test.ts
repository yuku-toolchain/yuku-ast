import { describe, expect, test } from "bun:test";
import {
  isIdentifierChar,
  isIdentifierName,
  isIdentifierStart,
  isKeyword,
  isReservedWord,
  isStrictBindOnlyReservedWord,
  isStrictBindReservedWord,
  isStrictReservedWord,
  isValidIdentifier,
} from "../src/identifier";

const cp = (s: string): number => s.codePointAt(0)!;

describe("isIdentifierStart", () => {
  test("accepts ASCII and Unicode start characters", () => {
    for (const c of ["a", "Z", "_", "$", "π", "你", "𝓍"]) {
      expect(isIdentifierStart(cp(c))).toBe(true);
    }
  });

  test("rejects digits, joiners, and non-identifier characters", () => {
    for (const c of ["1", "-", " ", ".", "😀"]) {
      expect(isIdentifierStart(cp(c))).toBe(false);
    }
    expect(isIdentifierStart(0x200c)).toBe(false); // ZWNJ cannot start
  });

  test("rejects out-of-range code points", () => {
    for (const n of [-1, 1.5, NaN, 0x110000]) {
      expect(isIdentifierStart(n)).toBe(false);
    }
  });
});

describe("isIdentifierChar", () => {
  test("accepts identifier-part characters including digits and joiners", () => {
    for (const c of ["a", "0", "_", "$", "π", "𝓍"]) {
      expect(isIdentifierChar(cp(c))).toBe(true);
    }
    expect(isIdentifierChar(0x200c)).toBe(true); // ZWNJ
    expect(isIdentifierChar(0x200d)).toBe(true); // ZWJ
  });

  test("rejects non-identifier characters and out-of-range code points", () => {
    for (const c of ["-", " ", ".", "😀"]) {
      expect(isIdentifierChar(cp(c))).toBe(false);
    }
    expect(isIdentifierChar(0x110000)).toBe(false);
  });
});

describe("isIdentifierName", () => {
  test("accepts well-formed identifiers, including Unicode and joiners", () => {
    for (const name of ["foo", "_foo", "$foo", "f0o", "$", "_", "$_0", "π", "café", "你好", "𝓍"]) {
      expect(isIdentifierName(name)).toBe(true);
    }
    expect(isIdentifierName("a\u200Cb")).toBe(true); // ZWNJ as a part
    expect(isIdentifierName("a\u200Db")).toBe(true); // ZWJ as a part
  });

  test("rejects empty, leading digit, joiner-start, and invalid characters", () => {
    for (const name of ["", "1foo", "0", "\u200Ca", "foo-bar", "foo bar", "@foo", "#foo"]) {
      expect(isIdentifierName(name)).toBe(false);
    }
  });

  test("is purely syntactic: reserved words are still valid IdentifierNames", () => {
    for (const word of ["class", "if", "default", "import", "this", "true"]) {
      expect(isIdentifierName(word)).toBe(true);
    }
  });
});

describe("keyword / reserved-word classification", () => {
  test("isKeyword covers core keywords but not enum, await, or strict-only words", () => {
    for (const w of ["if", "class", "typeof", "return", "this", "true", "delete"]) {
      expect(isKeyword(w)).toBe(true);
    }
    for (const w of ["enum", "await", "let", "static", "yield", "eval", "foo"]) {
      expect(isKeyword(w)).toBe(false);
    }
  });

  test("isReservedWord reserves enum always and await only in modules", () => {
    expect(isReservedWord("enum")).toBe(true);
    expect(isReservedWord("await")).toBe(false);
    expect(isReservedWord("await", true)).toBe(true);
    expect(isReservedWord("foo")).toBe(false);
  });

  test("isStrictReservedWord adds the strict-mode words", () => {
    for (const w of ["let", "static", "yield", "implements", "interface", "package"]) {
      expect(isStrictReservedWord(w)).toBe(true);
    }
    expect(isStrictReservedWord("enum")).toBe(true);
    expect(isStrictReservedWord("eval")).toBe(false);
    expect(isStrictReservedWord("foo")).toBe(false);
  });

  test("strict-bind-only words are eval and arguments", () => {
    expect(isStrictBindOnlyReservedWord("eval")).toBe(true);
    expect(isStrictBindOnlyReservedWord("arguments")).toBe(true);
    expect(isStrictBindOnlyReservedWord("let")).toBe(false);

    expect(isStrictBindReservedWord("eval")).toBe(true);
    expect(isStrictBindReservedWord("let")).toBe(true);
    expect(isStrictBindReservedWord("enum")).toBe(true);
    expect(isStrictBindReservedWord("foo")).toBe(false);
  });
});

describe("isValidIdentifier", () => {
  test("accepts valid binding names", () => {
    for (const name of ["foo", "$x", "_y", "π", "eval", "arguments"]) {
      expect(isValidIdentifier(name)).toBe(true);
    }
  });

  test("rejects keywords and strict reserved words by default", () => {
    for (const name of ["class", "if", "let", "yield", "await", "enum"]) {
      expect(isValidIdentifier(name)).toBe(false);
    }
  });

  test("rejects syntactically invalid names regardless of `reserved`", () => {
    for (const name of ["1foo", "foo-bar", ""]) {
      expect(isValidIdentifier(name)).toBe(false);
      expect(isValidIdentifier(name, false)).toBe(false);
    }
  });

  test("allows reserved words when `reserved` is false", () => {
    for (const name of ["class", "let", "await"]) {
      expect(isValidIdentifier(name, false)).toBe(true);
    }
  });
});
