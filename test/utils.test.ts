import { describe, expect, test } from "bun:test";
import type { Node } from "yuku-parser";
import { is, walk } from "../src/index";
import { nameOf } from "../src/utils";
import { program } from "./helpers";

/** First node matching the guard while walking the source. */
function find<T extends Node>(code: string, guard: (node: Node) => node is T): T {
  let found: T | undefined;
  walk(program(code), {
    enter(node, path) {
      if (found === undefined && guard(node)) {
        found = node;
        path.stop();
      }
    },
  });
  if (found === undefined) throw new Error("no matching node found");
  return found;
}

describe("nameOf", () => {
  test("returns an Identifier's name", () => {
    expect(nameOf(find("foo;", is.Identifier))).toBe("foo");
  });

  test("returns a string Literal's value", () => {
    expect(nameOf(find('"hi";', is.StringLiteral))).toBe("hi");
  });

  test("returns null for a non-string Literal", () => {
    expect(nameOf(find("42;", is.NumericLiteral))).toBeNull();
  });

  test("returns null for any other node", () => {
    expect(nameOf(find("f();", is.CallExpression))).toBeNull();
  });

  test("returns null for null and undefined", () => {
    expect(nameOf(null)).toBeNull();
    expect(nameOf(undefined)).toBeNull();
  });

  test("reads a renamed export's exported name (Identifier or string)", () => {
    const names: Array<string | null> = [];
    walk(program('const x = 1; export { x as y, x as "z" };'), {
      ExportSpecifier(node) {
        names.push(nameOf(node.exported));
      },
    });
    expect(names).toEqual(["y", "z"]);
  });
});
