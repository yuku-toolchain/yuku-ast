import { describe, expect, test } from "bun:test";
import { is } from "../src/index";
import { nameOf } from "../src/utils";
import { find, program } from "./helpers";

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
    // `export { x as y, x as "z" }` resolves both an Identifier and a string name.
    const decl = program('const x = 1; export { x as y, x as "z" };').body.find(
      is.ExportNamedDeclaration,
    );
    expect(decl?.specifiers.map((s) => nameOf(s.exported))).toEqual(["y", "z"]);
  });
});
