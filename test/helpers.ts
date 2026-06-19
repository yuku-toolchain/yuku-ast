import type { Node, Program, SourceLang } from "yuku-parser";
import { parse } from "yuku-parser";
import { print } from "yuku-codegen";

/** Parse `code`, assert it has no diagnostics, and return the `Program`. */
export function program(code: string, lang: SourceLang = "ts"): Program {
  const result = parse(code, { lang });
  if (result.diagnostics.length > 0) {
    const messages = result.diagnostics.map((d) => d.message).join(", ");
    throw new Error(`unexpected parse diagnostics: ${messages}`);
  }
  return result.program;
}

/**
 * Parse `code` and return the first node (pre-order) matching `guard`, typed as
 * that guard's node. A small self-contained search, so the tests stay decoupled
 * from any particular traversal helper.
 */
export function find<T extends Node>(
  code: string,
  guard: (node: Node) => node is T,
  lang?: SourceLang,
): T {
  let found: T | undefined;
  visit(program(code, lang), (node) => {
    if (guard(node)) {
      found = node;
      return true;
    }
  });
  if (found === undefined) throw new Error("no matching node found");
  return found;
}

/** Every node under `root`, in pre-order. */
export function allNodes(root: Node): Node[] {
  const out: Node[] = [];
  visit(root, (node) => void out.push(node));
  return out;
}

/** Visit every node under `value` in pre-order, stopping when `fn` returns `true`. */
function visit(value: unknown, fn: (node: Node) => boolean | void): boolean {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) {
    for (const item of value) if (visit(item, fn)) return true;
    return false;
  }
  if (typeof (value as { type?: unknown }).type === "string" && fn(value as Node) === true) {
    return true;
  }
  for (const key in value) {
    if (visit((value as Record<string, unknown>)[key], fn)) return true;
  }
  return false;
}

/** Print a synthetically built `Program` back to source, asserting clean codegen. */
export function renderProgram(program: Program): string {
  const { code, errors } = print(program);
  if (errors.length > 0) {
    throw new Error(`unexpected codegen errors: ${errors.map((e) => e.message).join(", ")}`);
  }
  return code;
}
