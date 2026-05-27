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
  const { code, errors } = print(result.program);
  if (errors.length > 0) {
    throw new Error(`unexpected codegen errors: ${errors.map((e) => e.message).join(", ")}`);
  }
  return code;
}

export function renderProgram(program: Program): string {
  return render({
    program,
    comments: [],
    diagnostics: [],
    lineStarts: [],
    locOf() {
      return {
        line: 0,
        column: 0,
      };
    },
  });
}
