import { describe, expect, test } from "bun:test";
import type { Node } from "yuku-parser";
import { walk } from "../src/walk";
import { program } from "./helpers";

describe("walk: traversal", () => {
  test("returns the root node it was given", () => {
    const root = program("1;");
    expect(walk(root, {})).toBe(root);
  });

  test("visits every node via the universal enter handler", () => {
    const types: string[] = [];
    walk(program("const x = 1 + 2;"), {
      enter(node) {
        types.push(node.type);
      },
    });
    expect(types).toEqual([
      "Program",
      "VariableDeclaration",
      "VariableDeclarator",
      "Identifier",
      "BinaryExpression",
      "Literal",
      "Literal",
    ]);
  });

  test("descends in the declared visitor-key order, not object key order", () => {
    // ForStatement child order is init, test, update, body.
    const order: string[] = [];
    walk(program("for (let i = a; b; c) d;"), {
      Identifier(node) {
        order.push(node.name);
      },
    });
    expect(order).toEqual(["i", "a", "b", "c", "d"]);
  });

  test("a function-form visitor runs on enter only", () => {
    const seen: string[] = [];
    walk(program("f(x);"), {
      enter(node) {
        seen.push(`enter:${node.type}`);
      },
      Identifier(node) {
        seen.push(`id:${node.name}`);
      },
    });
    // id handler interleaves with enter on the way down, never on the way up.
    expect(seen).toEqual([
      "enter:Program",
      "enter:ExpressionStatement",
      "enter:CallExpression",
      "enter:Identifier",
      "id:f",
      "enter:Identifier",
      "id:x",
    ]);
  });

  test("dispatches a concrete type to its precisely-typed handler", () => {
    const names: string[] = [];
    walk(program("a.b.c;"), {
      Identifier(node) {
        names.push(node.name);
      },
    });
    expect(names).toEqual(["a", "b", "c"]);
  });

  test("visits container nodes that are not statements or expressions", () => {
    const types = new Set<string>();
    walk(program("switch (x) { case 1: break; }"), {
      enter(node) {
        types.add(node.type);
      },
    });
    expect(types.has("SwitchCase")).toBe(true);
  });

  test("walking an empty program visits only the program", () => {
    const types: string[] = [];
    walk(program(""), { enter: (n) => void types.push(n.type) });
    expect(types).toEqual(["Program"]);
  });
});

describe("walk: enter and leave", () => {
  test("enter fires before children, leave after", () => {
    const log: string[] = [];
    walk(program("f(x);"), {
      enter: (n) => void log.push(`>${n.type}`),
      leave: (n) => void log.push(`<${n.type}`),
    });
    expect(log).toEqual([
      ">Program",
      ">ExpressionStatement",
      ">CallExpression",
      ">Identifier",
      "<Identifier",
      ">Identifier",
      "<Identifier",
      "<CallExpression",
      "<ExpressionStatement",
      "<Program",
    ]);
  });

  test("object-form visitor with enter and leave", () => {
    const log: string[] = [];
    walk(program("a.b;"), {
      MemberExpression: {
        enter: () => void log.push("enter"),
        leave: () => void log.push("leave"),
      },
    });
    expect(log).toEqual(["enter", "leave"]);
  });

  test("object-form visitor with only leave does not fire on enter", () => {
    const log: string[] = [];
    walk(program("a;"), {
      Identifier: { leave: () => void log.push("leave") },
    });
    expect(log).toEqual(["leave"]);
  });

  test("leave still runs for the root", () => {
    let left = false;
    walk(program("a;"), { Program: { leave: () => void (left = true) } });
    expect(left).toBe(true);
  });
});

describe("walk: handler precedence", () => {
  // When several handlers match a node, enter runs outermost first
  // (universal, alias, concrete) and leave runs in reverse.
  test("enter order is universal, alias, concrete, and leave is the mirror", () => {
    const log: string[] = [];
    // Guard on the Identifier so sibling nodes don't add noise.
    const at = (label: string) => (node: Node) => {
      if (node.type === "Identifier") log.push(label);
    };
    walk(program("a;"), {
      enter: at("enter:universal"),
      leave: at("leave:universal"),
      Expression: { enter: at("enter:alias"), leave: at("leave:alias") },
      Identifier: { enter: at("enter:concrete"), leave: at("leave:concrete") },
    });
    expect(log).toEqual([
      "enter:universal",
      "enter:alias",
      "enter:concrete",
      "leave:concrete",
      "leave:alias",
      "leave:universal",
    ]);
  });

  test("multiple matching alias handlers fire in registration order on enter", () => {
    const log: string[] = [];
    const at = (label: string) => (node: Node) => {
      if (node.type === "FunctionDeclaration") log.push(label);
    };
    walk(program("function f() {}"), {
      Statement: at("Statement"),
      Declaration: at("Declaration"),
      Function: at("Function"),
    });
    expect(log).toEqual(["Statement", "Declaration", "Function"]);
  });

  test("dispatch is cached but consistent across repeated node types", () => {
    let count = 0;
    walk(program("a; b; c;"), { Identifier: () => void count++ });
    expect(count).toBe(3);
  });
});

describe("walk: nullable and array fields", () => {
  test("skips null optional fields without error", () => {
    // An if with no else, alternate is null.
    const types: string[] = [];
    walk(program("if (a) b;"), { enter: (n: Node) => void types.push(n.type) });
    expect(types).toEqual([
      "Program",
      "IfStatement",
      "Identifier",
      "ExpressionStatement",
      "Identifier",
    ]);
  });

  test("skips holes (null elements) in array fields", () => {
    const names: string[] = [];
    walk(program("[a, , b];"), { Identifier: (n) => void names.push(n.name) });
    expect(names).toEqual(["a", "b"]);
  });

  test("visits each element of an array field with its index", () => {
    const indices: (number | null)[] = [];
    walk(program("[a, b, c];"), {
      Identifier: (_n, path) => void indices.push(path.index),
    });
    expect(indices).toEqual([0, 1, 2]);
  });
});
