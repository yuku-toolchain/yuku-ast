import { describe, expect, test } from "bun:test";
import { walk } from "../src/index";
import type { Node } from "yuku-parser";
import { program } from "./helpers";

/** Collect the `type` of every node an alias handler fires for. */
function typesFor(alias: string, code: string, lang?: "ts" | "tsx"): string[] {
  const seen: string[] = [];
  walk(program(code, lang), { [alias]: (node: Node) => void seen.push(node.type) });
  return seen;
}

describe("alias groups", () => {
  test("Expression matches expression node types", () => {
    const types = typesFor("Expression", "a + b * c;");
    expect(types).toEqual([
      "BinaryExpression",
      "Identifier",
      "BinaryExpression",
      "Identifier",
      "Identifier",
    ]);
  });

  test("Statement matches statement node types", () => {
    const types = typesFor("Statement", "{ a; if (b) c; }");
    expect(types).toEqual([
      "BlockStatement",
      "ExpressionStatement",
      "IfStatement",
      "ExpressionStatement",
    ]);
  });

  test("Declaration matches declaration node types", () => {
    const types = typesFor("Declaration", "const a = 1; function f() {} class C {}");
    expect(types).toEqual(["VariableDeclaration", "FunctionDeclaration", "ClassDeclaration"]);
  });

  test("ModuleDeclaration matches import and export node types", () => {
    const types = typesFor(
      "ModuleDeclaration",
      "import a from 'm'; export { a }; export default 1;",
    );
    expect(types).toEqual([
      "ImportDeclaration",
      "ExportNamedDeclaration",
      "ExportDefaultDeclaration",
    ]);
  });

  test("Function includes arrow functions and both declaration and expression forms", () => {
    const types = typesFor(
      "Function",
      "function a() {} const b = function () {}; const c = () => {};",
    );
    expect(types).toEqual(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);
  });

  test("Class matches class declarations and expressions", () => {
    const types = typesFor("Class", "class A {} const B = class {};");
    expect(types).toEqual(["ClassDeclaration", "ClassExpression"]);
  });

  test("Method matches method definitions", () => {
    const types = typesFor("Method", "class A { m() {} get x() { return 1; } }");
    expect(types).toEqual(["MethodDefinition", "MethodDefinition"]);
  });

  test("Loop matches every loop statement", () => {
    const code = "for (;;) {} for (a in b) {} for (a of b) {} while (a) {} do {} while (a);";
    expect(typesFor("Loop", code)).toEqual([
      "ForStatement",
      "ForInStatement",
      "ForOfStatement",
      "WhileStatement",
      "DoWhileStatement",
    ]);
  });

  test("Pattern matches binding patterns and every Identifier (a binding target type)", () => {
    const types = typesFor("Pattern", "const [a, ...b] = c; const { d = 1 } = e;");
    expect(types).toEqual([
      "ArrayPattern",
      "Identifier", // a
      "RestElement",
      "Identifier", // b
      "Identifier", // c (the initializer is still an Identifier)
      "ObjectPattern",
      "Identifier", // d, the property key
      "AssignmentPattern",
      "Identifier", // d, the assignment target
      "Identifier", // e
    ]);
  });

  test("JSX matches JSX node types", () => {
    const types = typesFor("JSX", "const x = <div id='a'>{y}</div>;", "tsx");
    expect(types).toEqual([
      "JSXElement",
      "JSXOpeningElement",
      "JSXIdentifier",
      "JSXAttribute",
      "JSXIdentifier",
      "JSXExpressionContainer",
      "JSXClosingElement",
      "JSXIdentifier",
    ]);
  });

  test("TSType matches type node types", () => {
    const types = typesFor("TSType", "type T = string | number;");
    expect(types).toEqual(["TSUnionType", "TSStringKeyword", "TSNumberKeyword"]);
  });

  test("an alias and a concrete handler for the same node both fire", () => {
    const log: string[] = [];
    walk(program("a;"), {
      Expression: () => void log.push("alias"),
      Identifier: () => void log.push("concrete"),
    });
    expect(log).toEqual(["alias", "concrete"]);
  });

  test("an object-form alias handler supports enter and leave", () => {
    const log: string[] = [];
    walk(program("a + b;"), {
      Expression: {
        enter: (n) => void log.push(`>${n.type}`),
        leave: (n) => void log.push(`<${n.type}`),
      },
    });
    expect(log).toEqual([
      ">BinaryExpression",
      ">Identifier",
      "<Identifier",
      ">Identifier",
      "<Identifier",
      "<BinaryExpression",
    ]);
  });

  test("a node in two registered alias groups runs both, leave in reverse", () => {
    const log: string[] = [];
    const at = (label: string) => ({
      enter: (n: Node) => n.type === "FunctionDeclaration" && void log.push(`>${label}`),
      leave: (n: Node) => n.type === "FunctionDeclaration" && void log.push(`<${label}`),
    });
    walk(program("function f() {}"), { Declaration: at("decl"), Function: at("fn") });
    expect(log).toEqual([">decl", ">fn", "<fn", "<decl"]);
  });
});
