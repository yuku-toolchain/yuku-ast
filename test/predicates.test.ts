import { describe, expect, test } from "bun:test";
import type { Identifier, Node } from "yuku-parser";
import { is } from "../src/index";
import { walk } from "../src/walk";
import { program } from "./helpers";

/** First node matching the guard while walking the source, typed as that guard's node. */
function find<T extends Node>(
  code: string,
  guard: (node: Node) => node is T,
  lang?: "ts" | "tsx",
): T {
  let found: T | undefined;
  walk(program(code, lang), {
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
    for (const guard of Object.values(is)) {
      expect(guard(null)).toBe(false);
      expect(guard(undefined)).toBe(false);
    }
  });
});

describe("is: alias guards", () => {
  const cases: Array<[keyof typeof is, string, string, "ts" | "tsx"]> = [
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

describe("is: Identifier roles", () => {
  const code = "let b = ref; obj.prop; foo: while (0) break foo;";
  const byKind = (kind: string) =>
    find(code, (n): n is Identifier => n.type === "Identifier" && n.kind === kind);

  test("BindingIdentifier", () => {
    expect(is.BindingIdentifier(byKind("binding"))).toBe(true);
    expect(is.BindingIdentifier(byKind("reference"))).toBe(false);
  });
  test("IdentifierReference", () => {
    expect(is.IdentifierReference(byKind("reference"))).toBe(true);
    expect(is.IdentifierReference(byKind("binding"))).toBe(false);
  });
  test("IdentifierName", () => {
    expect(is.IdentifierName(byKind("name"))).toBe(true);
    expect(is.IdentifierName(byKind("reference"))).toBe(false);
  });
  test("LabelIdentifier", () => {
    expect(is.LabelIdentifier(byKind("label"))).toBe(true);
    expect(is.LabelIdentifier(byKind("name"))).toBe(false);
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
    let nonDirective: Node | undefined;
    walk(program('function f() { doThing(); "not a directive"; }'), {
      ExpressionStatement(node) {
        if (node.expression.type === "Literal") nonDirective = node;
      },
    });
    expect(nonDirective).toBeDefined();
    expect(is.Directive(nonDirective)).toBe(false);
  });
});

describe("is: narrowing inside a walk", () => {
  test("a guard narrows path.parent for typed access", () => {
    const names: string[] = [];
    walk(program("[a, b];"), {
      Identifier(node, path) {
        if (is.ArrayExpression(path.parent)) {
          expect(path.parent.elements).toBeArray();
          names.push(node.name);
        }
      },
    });
    expect(names).toEqual(["a", "b"]);
  });
});
