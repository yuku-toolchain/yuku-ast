import { describe, expect, test } from "bun:test";
import type { Node } from "yuku-parser";
import { walk, walkAsync } from "../src/walk";
import { parseOk, program, render } from "./helpers";

// A broad TS + JSX program exercising most of the node types the walker knows.
const KITCHEN_SINK = `
import a, { b as c } from "m";
export const d = 1;
export default function gen<T>(x: T): T { return x; }
type U = { k: string } | number[] & A;
interface I<P> extends Base { m(p: P): void; readonly r: number; }
enum E { A, B = 2 }
class K<T> extends Base implements I<T> {
  #priv = 1;
  static s = 2;
  @dec accessor acc = 3;
  constructor(private readonly p: number) { super(); }
  get g() { return this.#priv; }
  async *m() { yield* [1, 2]; await x; }
}
const arr = [1, , 2, ...rest];
const obj = { x, [y]: z, ...spread, fn() {} };
const tpl = \`a\${b}c\`;
const cond = a ? b : c;
label: for (const k of items) { if (k) continue label; else break; }
try { risky(); } catch (e) { handle(e); } finally { cleanup(); }
switch (v) { case 1: f(); break; default: g(); }
const tagged = tag\`x\${y}\`;
const opt = a?.b?.[c];
const cast = x as const;
const sat = y satisfies Z;
const jsx = <Comp {...props} id="x">{cond}<br/></Comp>;
const frag = <>{text}</>;
while (cond) do { step(); } while (cond);
`;

describe("integration: comprehensive traversal", () => {
  test("the kitchen-sink program parses without diagnostics", () => {
    expect(parseOk(KITCHEN_SINK, "tsx").diagnostics).toEqual([]);
  });

  test("a single walk reaches a wide range of node types", () => {
    const types = new Set<string>();
    walk(program(KITCHEN_SINK, "tsx"), { enter: (n) => void types.add(n.type) });

    // A representative spread across every category the walker supports.
    const expected = [
      "Program",
      "ImportDeclaration",
      "ImportSpecifier",
      "ExportNamedDeclaration",
      "ExportDefaultDeclaration",
      "FunctionDeclaration",
      "ClassDeclaration",
      "MethodDefinition",
      "PropertyDefinition",
      "AccessorProperty",
      "PrivateIdentifier",
      "Decorator",
      "TSParameterProperty",
      "TSInterfaceDeclaration",
      "TSEnumDeclaration",
      "TSTypeAliasDeclaration",
      "TSUnionType",
      "TSAsExpression",
      "TSSatisfiesExpression",
      "JSXElement",
      "JSXFragment",
      "JSXSpreadAttribute",
      "TemplateLiteral",
      "TaggedTemplateExpression",
      "ChainExpression",
      "SwitchStatement",
      "TryStatement",
      "ForOfStatement",
      "LabeledStatement",
      "YieldExpression",
      "AwaitExpression",
      "SpreadElement",
    ];
    for (const type of expected) expect(types).toContain(type);
    expect(types.size).toBeGreaterThanOrEqual(80);
  });

  test("enter and leave fire the same number of times, once per node", () => {
    let enters = 0;
    let leaves = 0;
    let total = 0;
    walk(program(KITCHEN_SINK, "tsx"), {
      enter: () => void enters++,
      leave: () => void leaves++,
    });
    walk(program(KITCHEN_SINK, "tsx"), { enter: () => void total++ });
    expect(enters).toBe(leaves);
    expect(enters).toBe(total);
  });

  test("a no-op walk does not alter the rendered output", () => {
    const before = render(parseOk(KITCHEN_SINK, "tsx"));
    const walked = parseOk(KITCHEN_SINK, "tsx");
    walk(walked.program, { enter: () => {} });
    expect(render(walked)).toBe(before);
  });

  test("the async walk reaches the same node types as the sync walk", async () => {
    const sync = new Set<string>();
    walk(program(KITCHEN_SINK, "tsx"), { enter: (n: Node) => void sync.add(n.type) });

    const async = new Set<string>();
    await walkAsync(program(KITCHEN_SINK, "tsx"), { enter: (n: Node) => void async.add(n.type) });

    expect([...async].sort()).toEqual([...sync].sort());
  });
});
