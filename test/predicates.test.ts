import { describe, expect, test } from "bun:test";
import type { Node } from "yuku-parser";
import type { AliasName } from "../src/index";
import { is } from "../src/index";
import { find } from "./helpers";

describe("is: concrete guards", () => {
  test("match by exact type", () => {
    const call = find("f(x);", is.CallExpression);
    expect(is.CallExpression(call)).toBe(true);
    expect(is.Identifier(call)).toBe(false);
  });

  test("narrow a matched node's type", () => {
    const node: Node = find("a;", is.Identifier);
    expect(is.Identifier(node)).toBe(true);
    if (is.Identifier(node)) expect(node.name).toBe("a");
  });

  test("every guard rejects null and undefined", () => {
    // Each guard short-circuits on a nullish node before reading any further
    // argument, so a node-only call is safe for the few that take extras.
    for (const guard of Object.values(is) as Array<(node: Node | null | undefined) => boolean>) {
      expect(guard(null)).toBe(false);
      expect(guard(undefined)).toBe(false);
    }
  });
});

describe("is: oneOf", () => {
  test("matches any type in the list and narrows to the union", () => {
    const node: Node = find("f(x);", is.CallExpression);
    expect(is.oneOf(node, ["CallExpression", "NewExpression"])).toBe(true);
    expect(is.oneOf(node, ["Identifier", "Literal"])).toBe(false);
    if (is.oneOf(node, ["CallExpression", "NewExpression"])) {
      // narrowed to CallExpression | NewExpression: `callee` is common to both.
      expect(node.callee.type).toBe("Identifier");
    }
  });

  test("an empty list matches nothing, and null/undefined are safe", () => {
    const node = find("a;", is.Identifier);
    expect(is.oneOf(node, [])).toBe(false);
    expect(is.oneOf(null, ["Identifier"])).toBe(false);
    expect(is.oneOf(undefined, ["Identifier"])).toBe(false);
  });
});

describe("is: Identifier with a name", () => {
  test("matches only the given name, and narrows", () => {
    const node: Node = find("foo;", is.Identifier);
    expect(is.Identifier(node)).toBe(true);
    expect(is.Identifier(node, "foo")).toBe(true);
    expect(is.Identifier(node, "bar")).toBe(false);
    if (is.Identifier(node, "foo")) expect(node.name).toBe("foo");
  });

  test("a non-Identifier never matches, with or without a name", () => {
    const call = find("f(x);", is.CallExpression);
    expect(is.Identifier(call, "f")).toBe(false);
    expect(is.Identifier(null, "f")).toBe(false);
  });
});

describe("is: alias guards", () => {
  const cases: Array<[AliasName, string, string, "ts" | "tsx"]> = [
    ["Expression", "a;", "Identifier", "ts"],
    ["Statement", "if (a) b;", "IfStatement", "ts"],
    ["Declaration", "function f() {}", "FunctionDeclaration", "ts"],
    ["ModuleDeclaration", "export default 1;", "ExportDefaultDeclaration", "ts"],
    ["Function", "const f = () => 1;", "ArrowFunctionExpression", "ts"],
    ["Class", "class C {}", "ClassDeclaration", "ts"],
    ["Method", "class C { m() {} }", "MethodDefinition", "ts"],
    ["Loop", "while (a) {}", "WhileStatement", "ts"],
    ["Pattern", "const [x] = y;", "ArrayPattern", "ts"],
    ["JSX", "const x = <a/>;", "JSXElement", "tsx"],
    ["TSType", "type T = string;", "TSStringKeyword", "ts"],
  ];

  for (const [alias, code, expectedType, lang] of cases) {
    test(`${alias} matches ${expectedType}`, () => {
      const node = find(code, (n): n is Node => n.type === expectedType, lang);
      expect(is[alias](node)).toBe(true);
    });
  }

  test("an alias rejects a node outside its group", () => {
    const stmt = find("if (a) b;", is.IfStatement);
    expect(is.Expression(stmt)).toBe(false);
    expect(is.TSType(stmt)).toBe(false);
  });
});

describe("is: Literal variants", () => {
  const literal = (code: string) => find(code, is.Literal);

  test("StringLiteral", () => {
    expect(is.StringLiteral(literal('"s";'))).toBe(true);
    expect(is.StringLiteral(literal("1;"))).toBe(false);
  });
  test("NumericLiteral", () => {
    expect(is.NumericLiteral(literal("42;"))).toBe(true);
    expect(is.NumericLiteral(literal('"s";'))).toBe(false);
  });
  test("BooleanLiteral", () => {
    expect(is.BooleanLiteral(literal("true;"))).toBe(true);
    expect(is.BooleanLiteral(literal("1;"))).toBe(false);
  });
  test("NullLiteral", () => {
    expect(is.NullLiteral(literal("null;"))).toBe(true);
    expect(is.NullLiteral(literal("0;"))).toBe(false);
  });
  test("BigIntLiteral", () => {
    expect(is.BigIntLiteral(literal("1n;"))).toBe(true);
    expect(is.BigIntLiteral(literal("1;"))).toBe(false);
  });
  test("RegExpLiteral", () => {
    expect(is.RegExpLiteral(literal("/ab/g;"))).toBe(true);
    expect(is.RegExpLiteral(literal('"ab";'))).toBe(false);
  });
});

describe("is: MemberExpression variants", () => {
  const member = (code: string) => find(code, is.MemberExpression);

  test("StaticMemberExpression", () => {
    expect(is.StaticMemberExpression(member("a.b;"))).toBe(true);
    expect(is.StaticMemberExpression(member("a[b];"))).toBe(false);
  });
  test("ComputedMemberExpression", () => {
    expect(is.ComputedMemberExpression(member("a[b];"))).toBe(true);
    expect(is.ComputedMemberExpression(member("a.b;"))).toBe(false);
  });
  test("PrivateFieldExpression", () => {
    const node = find("class C { #x = 1; m() { return this.#x; } }", is.PrivateFieldExpression);
    expect(is.PrivateFieldExpression(node)).toBe(true);
    expect(is.PrivateFieldExpression(member("a.b;"))).toBe(false);
  });
});

describe("is: Directive", () => {
  test("matches a directive prologue but not a plain string statement", () => {
    const directive = find('"use strict"; "plain";', is.ExpressionStatement);
    expect(is.Directive(directive)).toBe(true);
  });

  test("a non-directive string expression statement is not a Directive", () => {
    // Inside a function body, a trailing string expression is not a directive.
    const nonDirective = find(
      'function f() { doThing(); "not a directive"; }',
      (n): n is Node => is.ExpressionStatement(n) && n.expression.type === "Literal",
    );
    expect(is.Directive(nonDirective)).toBe(false);
  });
});

describe("is: narrowing", () => {
  test("a guard narrows a node for typed field access", () => {
    const arr = find("[a, b];", is.ArrayExpression);
    const names: string[] = [];
    for (const el of arr.elements) {
      if (is.Identifier(el)) names.push(el.name);
    }
    expect(names).toEqual(["a", "b"]);
  });
});
