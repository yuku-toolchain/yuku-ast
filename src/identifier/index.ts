const ID_START = /^[$_\p{ID_Start}]$/u;
const ID_CONTINUE = /^[$\u200C\u200D\p{ID_Continue}]$/u;
const IDENTIFIER_NAME = /^[$_\p{ID_Start}][$\u200C\u200D\p{ID_Continue}]*$/u;

const MAX_CODE_POINT = 0x10ffff;

/**
 * Returns `true` if the Unicode code point `cp` can **start** an identifier:
 * any character with the Unicode `ID_Start` property, plus `$` and `_`.
 *
 * Takes a numeric code point (as from {@link String.prototype.codePointAt}),
 * mirroring Babel's `isIdentifierStart`. Returns `false` for values that are
 * not a valid code point.
 */
export function isIdentifierStart(cp: number): boolean {
  if (!Number.isInteger(cp) || cp < 0 || cp > MAX_CODE_POINT) return false;
  return ID_START.test(String.fromCodePoint(cp));
}

/**
 * Returns `true` if the Unicode code point `cp` can appear **after** the first
 * character of an identifier: any character with the Unicode `ID_Continue`
 * property, plus `$`, `_`, and the ZWNJ (U+200C) / ZWJ (U+200D) joiners.
 *
 * Takes a numeric code point, mirroring Babel's `isIdentifierChar`. Returns
 * `false` for values that are not a valid code point.
 */
export function isIdentifierChar(cp: number): boolean {
  if (!Number.isInteger(cp) || cp < 0 || cp > MAX_CODE_POINT) return false;
  return ID_CONTINUE.test(String.fromCodePoint(cp));
}

/**
 * Returns `true` if `name` is a valid ECMAScript `IdentifierName`: the grammar
 * an identifier token must satisfy.
 *
 * Unlike the `is.IdentifierName` node guard, this validates a raw string rather
 * than an AST node.
 *
 * @example
 * isIdentifierName("foo");     // true
 * isIdentifierName("$_0");     // true
 * isIdentifierName("π");       // true
 * isIdentifierName("class");   // true  - syntactically an IdentifierName
 * isIdentifierName("1foo");    // false - starts with a digit
 * isIdentifierName("foo-bar"); // false - `-` is not an identifier character
 * isIdentifierName("");        // false
 */
export function isIdentifierName(name: string): boolean {
  return IDENTIFIER_NAME.test(name);
}

// The always-reserved keywords of the core grammar.
const keywords = new Set([
  "break",
  "case",
  "catch",
  "continue",
  "debugger",
  "default",
  "do",
  "else",
  "finally",
  "for",
  "function",
  "if",
  "return",
  "switch",
  "throw",
  "try",
  "var",
  "const",
  "while",
  "with",
  "new",
  "this",
  "super",
  "class",
  "extends",
  "export",
  "import",
  "null",
  "true",
  "false",
  "in",
  "instanceof",
  "typeof",
  "void",
  "delete",
]);

// Reserved only in strict mode.
const strictReservedWords = new Set([
  "implements",
  "interface",
  "let",
  "package",
  "private",
  "protected",
  "public",
  "static",
  "yield",
]);

// Reserved only as assignment / binding targets in strict mode.
const strictBindOnlyReservedWords = new Set(["eval", "arguments"]);

/**
 * Returns `true` if `word` is a reserved keyword of the core grammar (`if`,
 * `class`, `typeof`, `return`, …). Does not include `enum`, `await`, or the
 * strict-mode-only words; see {@link isReservedWord} and
 * {@link isStrictReservedWord} for those.
 */
export function isKeyword(word: string): boolean {
  return keywords.has(word);
}

/**
 * Returns `true` if `word` is unconditionally reserved: `enum` in any context,
 * and `await` when `inModule` (module / async contexts).
 */
export function isReservedWord(word: string, inModule = false): boolean {
  return (inModule && word === "await") || word === "enum";
}

/**
 * Returns `true` if `word` is reserved in strict mode: everything
 * {@link isReservedWord} covers, plus `let`, `static`, `yield`, `implements`,
 * and friends.
 */
export function isStrictReservedWord(word: string, inModule = false): boolean {
  return isReservedWord(word, inModule) || strictReservedWords.has(word);
}

/**
 * Returns `true` for `eval` and `arguments`, which are reserved only as
 * assignment / binding targets in strict mode.
 */
export function isStrictBindOnlyReservedWord(word: string): boolean {
  return strictBindOnlyReservedWords.has(word);
}

/**
 * Returns `true` if `word` is reserved as a strict-mode binding target:
 * everything {@link isStrictReservedWord} covers, plus `eval` / `arguments`.
 */
export function isStrictBindReservedWord(word: string, inModule = false): boolean {
  return isStrictReservedWord(word, inModule) || isStrictBindOnlyReservedWord(word);
}

/**
 * Returns `true` if `name` can be used as an identifier **binding**: a valid
 * {@link isIdentifierName} that, when `reserved` is `true` (the default), is
 * neither a keyword nor a strict-mode reserved word.
 *
 * This is the check to reach for when turning an arbitrary string (e.g. a
 * module specifier) into a local binding name.
 *
 * @example
 * isValidIdentifier("foo");          // true
 * isValidIdentifier("class");        // false - reserved word
 * isValidIdentifier("await");        // false - reserved in modules
 * isValidIdentifier("eval");         // true  - valid identifier (strict-bind only)
 * isValidIdentifier("class", false); // true  - reserved words allowed
 */
export function isValidIdentifier(name: string, reserved = true): boolean {
  if (reserved && (isKeyword(name) || isStrictReservedWord(name, true))) return false;
  return isIdentifierName(name);
}
