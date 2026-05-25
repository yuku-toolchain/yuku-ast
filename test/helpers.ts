import { type ParseResult, type Program, type SourceLang, parse } from "yuku-parser";
import { print } from "yuku-codegen";

/** Parse and assert the source has no diagnostics, returning the full result. */
export function parseOk(code: string, lang: SourceLang = "ts"): ParseResult {
  const result = parse(code, { lang });
  if (result.diagnostics.length > 0) {
    const messages = result.diagnostics.map((d) => d.message).join(", ");
    throw new Error(`unexpected parse diagnostics: ${messages}`);
  }
  return result;
}

/** Parse and return just the `Program` node. */
export function program(code: string, lang: SourceLang = "ts"): Program {
  return parseOk(code, lang).program;
}

/** Render a (possibly mutated) parse result back to source, asserting clean codegen. */
export function render(result: ParseResult): string {
  // yuku-codegen pins an older yuku-parser whose ParseResult type differs
  // nominally from ours, though the runtime shape matches. Bridge it here once.
  const { code, errors } = print(result as unknown as Parameters<typeof print>[0]);
  if (errors.length > 0) {
    throw new Error(`unexpected codegen errors: ${errors.map((e) => e.message).join(", ")}`);
  }
  return code;
}

/** Render a synthetically built `Program` to source, asserting clean codegen. */
export function renderProgram(prog: Program): string {
  const result: ParseResult = {
    program: prog,
    diagnostics: [],
    lineStarts: [0],
    locOf: () => ({ line: 1, column: 0 }),
  };
  return render(result);
}
