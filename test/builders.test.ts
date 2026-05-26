import { describe, expect, test } from "bun:test";
import { b, is } from "../src/index";
import { walk } from "../src/walk";
import { renderProgram } from "./helpers";

describe("builders: span", () => {
  test("every node in a synthetically built tree carries a zero span", () => {
    const prog = b.program([
      b.variableDeclaration("const", [
        b.variableDeclarator(
          b.arrayPattern([
            b.identifier("a", "binding"),
            b.restElement(b.identifier("rest", "binding")),
          ]),
          b.objectExpression([
            b.objectProperty(
              b.identifier("a", "name"),
              b.arrayExpression([b.numericLiteral(1), b.stringLiteral("s")]),
            ),
          ]),
        ),
      ]),
      b.functionDeclaration(
        b.identifier("f", "binding"),
        [b.identifier("x", "binding")],
        b.blockStatement([
          b.returnStatement(b.binaryExpression("+", b.identifier("x"), b.numericLiteral(1))),
        ]),
      ),
      b.classDeclaration(
        b.identifier("C", "binding"),
        b.classBody([
          b.methodDefinition(
            b.identifier("m", "name"),
            b.functionExpression([], b.blockStatement([])),
          ),
          b.propertyDefinition(b.identifier("p", "name"), b.numericLiteral(0)),
        ]),
      ),
    ]);

    let count = 0;
    walk(prog, {
      enter(node) {
        count++;
        expect(node.start).toBe(0);
        expect(node.end).toBe(0);
      },
    });
    expect(count).toBeGreaterThan(10); // sanity: the tree really was walked
  });
});

describe("builders: round-trip through codegen", () => {
  test("a representative program prints to the expected source", () => {
    const prog = b.program([
      b.variableDeclaration("const", [
        b.variableDeclarator(
          b.identifier("x", "binding"),
          b.binaryExpression("+", b.numericLiteral(1), b.numericLiteral(2)),
        ),
      ]),
      b.functionDeclaration(
        b.identifier("f", "binding"),
        [b.identifier("a", "binding")],
        b.blockStatement([b.returnStatement(b.identifier("a"))]),
      ),
      b.expressionStatement(
        b.callExpression(b.memberExpression(b.identifier("console"), b.identifier("log", "name")), [
          b.stringLiteral("hi"),
        ]),
      ),
    ]);
    expect(renderProgram(prog)).toBe(
      ["const x = 1 + 2;", "function f(a) {", "  return a;", "}", 'console.log("hi");'].join("\n"),
    );
  });

  test("control-flow statements print correctly", () => {
    const prog = b.program([
      b.ifStatement(
        b.identifier("a"),
        b.blockStatement([b.expressionStatement(b.identifier("b"))]),
        b.blockStatement([b.expressionStatement(b.identifier("c"))]),
      ),
      b.forStatement(
        b.variableDeclaration("let", [
          b.variableDeclarator(b.identifier("i", "binding"), b.numericLiteral(0)),
        ]),
        b.binaryExpression("<", b.identifier("i"), b.numericLiteral(10)),
        b.updateExpression("++", b.identifier("i"), false),
        b.blockStatement([]),
      ),
    ]);
    expect(renderProgram(prog)).toBe(
      ["if (a) {", "  b;", "} else {", "  c;", "}", "for (let i = 0; i < 10; i++) {}"].join("\n"),
    );
  });

  test("TypeScript constructs print correctly", () => {
    const prog = b.program([
      b.tsTypeAliasDeclaration(
        b.identifier("T", "binding"),
        b.tsUnionType([b.tsStringKeyword(), b.tsNumberKeyword()]),
      ),
    ]);
    expect(renderProgram(prog)).toBe("type T = string | number;");
  });

  test("object destructuring builds with bindingProperty members", () => {
    const prog = b.program([
      b.variableDeclaration("const", [
        b.variableDeclarator(
          b.objectPattern([
            // shorthand `{ a }` and renamed `{ b: c }`
            b.bindingProperty(b.identifier("a", "name"), b.identifier("a", "binding"), {
              shorthand: true,
            }),
            b.bindingProperty(b.identifier("b", "name"), b.identifier("c", "binding")),
            b.restElement(b.identifier("rest", "binding")),
          ]),
          b.identifier("source"),
        ),
      ]),
    ]);
    expect(renderProgram(prog)).toBe("const { a, b: c, ...rest } = source;");
  });
});

describe("builders: Property variants", () => {
  test("objectProperty builds an ObjectExpression member with kind init", () => {
    const node = b.objectProperty(b.identifier("k", "name"), b.numericLiteral(1));
    expect(node.type).toBe("Property");
    expect(node.kind).toBe("init");
    expect(node.method).toBe(false);
  });

  test("objectProperty supports accessor kinds for getters and setters", () => {
    const getter = b.objectProperty(
      b.identifier("g", "name"),
      b.functionExpression([], b.blockStatement([b.returnStatement(b.numericLiteral(1))])),
      { kind: "get" },
    );
    expect(getter.kind).toBe("get");
  });

  test("bindingProperty is fixed to kind init and method false", () => {
    const node = b.bindingProperty(b.identifier("k", "name"), b.identifier("v", "binding"));
    expect(node.type).toBe("Property");
    expect(node.kind).toBe("init");
    expect(node.method).toBe(false);
  });
});

describe("builders: computed-key inference", () => {
  test("an Identifier key is not computed", () => {
    expect(b.objectProperty(b.identifier("a", "name"), b.numericLiteral(1)).computed).toBe(false);
    expect(b.memberExpression(b.identifier("o"), b.identifier("p", "name")).computed).toBe(false);
    expect(
      b.methodDefinition(b.identifier("m", "name"), b.functionExpression([], b.blockStatement([])))
        .computed,
    ).toBe(false);
  });

  test("a PrivateIdentifier key is not computed", () => {
    expect(b.propertyDefinition(b.privateIdentifier("x"), b.numericLiteral(1)).computed).toBe(
      false,
    );
  });

  test("a literal or other expression key is computed", () => {
    expect(b.objectProperty(b.stringLiteral("a"), b.numericLiteral(1)).computed).toBe(true);
    expect(b.memberExpression(b.identifier("o"), b.stringLiteral("p")).computed).toBe(true);
  });

  test("an explicit computed option overrides inference", () => {
    expect(
      b.objectProperty(b.identifier("a", "name"), b.numericLiteral(1), { computed: true }).computed,
    ).toBe(true);
    expect(
      b.objectProperty(b.stringLiteral("a"), b.numericLiteral(1), { computed: false }).computed,
    ).toBe(false);
  });
});

describe("builders: defaults and derived fields", () => {
  test("arrowFunctionExpression derives `expression` from its body", () => {
    expect(b.arrowFunctionExpression([], b.numericLiteral(1)).expression).toBe(true);
    expect(b.arrowFunctionExpression([], b.blockStatement([])).expression).toBe(false);
  });

  test("function-like builders default async and generator to false", () => {
    const fn = b.functionDeclaration(b.identifier("f", "binding"), [], b.blockStatement([]));
    expect(fn.async).toBe(false);
    expect(fn.generator).toBe(false);
    const arrow = b.arrowFunctionExpression([], b.blockStatement([]));
    expect(arrow.async).toBe(false);
  });

  test("callExpression and newExpression default optional/empty args", () => {
    const call = b.callExpression(b.identifier("f"));
    expect(call.arguments).toEqual([]);
    expect(call.optional).toBe(false);
    expect(b.newExpression(b.identifier("C")).arguments).toEqual([]);
  });

  test("unaryExpression is prefix, updateExpression honors its prefix flag", () => {
    expect(b.unaryExpression("!", b.identifier("a")).prefix).toBe(true);
    expect(b.updateExpression("++", b.identifier("a")).prefix).toBe(false);
    expect(b.updateExpression("++", b.identifier("a"), true).prefix).toBe(true);
  });

  test("forOfStatement defaults await to false", () => {
    expect(b.forOfStatement(b.identifier("a"), b.identifier("b"), b.blockStatement([])).await).toBe(
      false,
    );
    expect(
      b.forOfStatement(b.identifier("a"), b.identifier("b"), b.blockStatement([]), true).await,
    ).toBe(true);
  });

  test("classDeclaration defaults decorators, superClass, and implements", () => {
    const cls = b.classDeclaration(b.identifier("C", "binding"), b.classBody([]));
    expect(cls.decorators).toEqual([]);
    expect(cls.superClass).toBeNull();
  });

  test("program defaults to module source type with no hashbang", () => {
    const prog = b.program([]);
    expect(prog.sourceType).toBe("module");
    expect(prog.hashbang).toBeNull();
    expect(prog.body).toEqual([]);
  });
});

describe("builders: literals", () => {
  test("stringLiteral sets value and JSON-escaped raw", () => {
    const node = b.stringLiteral('a"b');
    expect(node.value).toBe('a"b');
    expect(node.raw).toBe('"a\\"b"');
    expect(is.StringLiteral(node)).toBe(true);
  });

  test("numericLiteral", () => {
    const node = b.numericLiteral(42);
    expect(node.value).toBe(42);
    expect(node.raw).toBe("42");
    expect(is.NumericLiteral(node)).toBe(true);
  });

  test("booleanLiteral", () => {
    expect(b.booleanLiteral(true).raw).toBe("true");
    expect(is.BooleanLiteral(b.booleanLiteral(false))).toBe(true);
  });

  test("nullLiteral", () => {
    const node = b.nullLiteral();
    expect(node.value).toBeNull();
    expect(node.raw).toBe("null");
    expect(is.NullLiteral(node)).toBe(true);
  });

  test("bigIntLiteral", () => {
    const node = b.bigIntLiteral(10n);
    expect(node.value).toBe(10n);
    expect(node.raw).toBe("10n");
    expect(node.bigint).toBe("10");
    expect(is.BigIntLiteral(node)).toBe(true);
  });

  test("regExpLiteral builds a usable RegExp and regex metadata", () => {
    const node = b.regExpLiteral("ab", "g");
    expect(node.raw).toBe("/ab/g");
    expect(node.regex).toEqual({ pattern: "ab", flags: "g" });
    expect(node.value).toBeInstanceOf(RegExp);
    expect(is.RegExpLiteral(node)).toBe(true);
  });

  test("regExpLiteral tolerates an invalid pattern by setting value to null", () => {
    const node = b.regExpLiteral("(", "");
    expect(node.value).toBeNull();
    expect(node.regex).toEqual({ pattern: "(", flags: "" });
  });
});

describe("builders: identifiers", () => {
  test("identifier defaults to a reference kind", () => {
    expect(b.identifier("x").kind).toBe("reference");
    expect(is.IdentifierReference(b.identifier("x"))).toBe(true);
  });

  test("identifier kind is configurable", () => {
    expect(is.BindingIdentifier(b.identifier("x", "binding"))).toBe(true);
    expect(is.LabelIdentifier(b.identifier("x", "label"))).toBe(true);
    expect(is.IdentifierName(b.identifier("x", "name"))).toBe(true);
  });

  test("metaProperty builds name-kind identifiers for meta and property", () => {
    const node = b.metaProperty("import", "meta");
    expect(node.meta.name).toBe("import");
    expect(node.meta.kind).toBe("name");
    expect(node.property.name).toBe("meta");
    expect(node.property.kind).toBe("name");
  });
});

describe("builders: directive", () => {
  test("directive builds a string-expression statement flagged as a directive", () => {
    const node = b.directive("use strict");
    expect(node.directive).toBe("use strict");
    expect(node.expression.type).toBe("Literal");
    expect(is.Directive(node)).toBe(true);
  });
});

describe("builders: keyword type nodes", () => {
  test("nullary TS keyword builders produce the right type with a zero span", () => {
    const keywords = [
      b.tsAnyKeyword(),
      b.tsUnknownKeyword(),
      b.tsNeverKeyword(),
      b.tsVoidKeyword(),
      b.tsStringKeyword(),
      b.tsNumberKeyword(),
      b.tsBooleanKeyword(),
      b.tsThisType(),
    ];
    for (const node of keywords) {
      expect(node.start).toBe(0);
      expect(node.end).toBe(0);
      expect(is.TSType(node)).toBe(true);
    }
    expect(keywords.map((n) => n.type)).toEqual([
      "TSAnyKeyword",
      "TSUnknownKeyword",
      "TSNeverKeyword",
      "TSVoidKeyword",
      "TSStringKeyword",
      "TSNumberKeyword",
      "TSBooleanKeyword",
      "TSThisType",
    ]);
  });
});
