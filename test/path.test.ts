import { describe, expect, test } from "bun:test";
import type { Node } from "yuku-parser";
import { walk } from "../src/walk";
import { program } from "./helpers";

describe("path: position", () => {
  test("node is the node currently being visited", () => {
    walk(program("a;"), {
      Identifier(node, path) {
        expect(path.node).toBe(node);
      },
    });
  });

  test("parent, key, and index for a node in a plain field", () => {
    walk(program("a.b;"), {
      MemberExpression(node, path) {
        // The member expression sits in ExpressionStatement.expression.
        expect(path.parent?.type).toBe("ExpressionStatement");
        expect(path.key).toBe("expression");
        expect(path.index).toBeNull();
        // Its `object` is the identifier `a`, a plain field too.
        expect(node.object.type).toBe("Identifier");
      },
    });
  });

  test("parent, key, and index for a node in an array field", () => {
    const indices: (number | null)[] = [];
    walk(program("[a, b, c];"), {
      Identifier(_node, path) {
        expect(path.parent?.type).toBe("ArrayExpression");
        expect(path.key).toBe("elements");
        indices.push(path.index);
      },
    });
    expect(indices).toEqual([0, 1, 2]);
  });

  test("the root has null parent, key, and index", () => {
    walk(program("a;"), {
      Program(_node, path) {
        expect(path.parent).toBeNull();
        expect(path.key).toBeNull();
        expect(path.index).toBeNull();
      },
    });
  });
});

describe("path: ancestors", () => {
  test("ancestors run from the root down to the parent, excluding the node", () => {
    let captured: readonly Node[] = [];
    walk(program("f(x);"), {
      Identifier(node, path) {
        if (node.name === "x") captured = path.ancestors;
      },
    });
    expect(captured.map((n) => n.type)).toEqual([
      "Program",
      "ExpressionStatement",
      "CallExpression",
    ]);
  });

  test("the root has no ancestors", () => {
    walk(program("a;"), {
      Program(_node, path) {
        expect(path.ancestors).toEqual([]);
      },
    });
  });

  test("ancestors reflects each node's own position, not a shared cursor", () => {
    let aDepth = 0;
    let bDepth = 0;
    let cDepth = 0;
    walk(program("a + (b + c);"), {
      Identifier(node, path) {
        if (node.name === "a") aDepth = path.ancestors.length;
        if (node.name === "b") bDepth = path.ancestors.length;
        if (node.name === "c") cDepth = path.ancestors.length;
      },
    });
    // a is shallower than b and c, which nest inside a parenthesized sub-expression.
    expect(aDepth).toBeLessThan(bDepth);
    expect(bDepth).toBe(cDepth);
  });
});

describe("path: state", () => {
  test("state is undefined when none is provided", () => {
    walk(program("a;"), {
      Identifier(_node, path) {
        expect(path.state).toBeUndefined();
      },
    });
  });

  test("state threads the provided value through the walk", () => {
    const counter = { count: 0 };
    walk(
      program("a; b; c;"),
      {
        Identifier(_node, path) {
          path.state.count++;
        },
      },
      counter,
    );
    expect(counter.count).toBe(3);
  });

  test("assigning path.state replaces it for later visits", () => {
    const seen: number[] = [];
    walk(
      program("a; b;"),
      {
        Identifier(_node, path) {
          seen.push(path.state);
          path.state = path.state + 1;
        },
      },
      0,
    );
    expect(seen).toEqual([0, 1]);
  });
});

describe("path: skip", () => {
  test("skip prevents descent into the current node's children", () => {
    const names: string[] = [];
    walk(program("f(x, y); g(z);"), {
      CallExpression(node, path) {
        if (node.callee.type === "Identifier" && node.callee.name === "f") path.skip();
      },
      Identifier(node) {
        names.push(node.name);
      },
    });
    // f's arguments are skipped, g's call is walked normally.
    expect(names).toEqual(["g", "z"]);
  });

  test("leave still runs on a node whose children were skipped", () => {
    const log: string[] = [];
    walk(program("f(x);"), {
      CallExpression: {
        enter: (_node, path) => path.skip(),
        leave: () => void log.push("leave"),
      },
      Identifier: () => void log.push("identifier"),
    });
    expect(log).toEqual(["leave"]);
  });

  test("skip is scoped to one node and does not leak to siblings", () => {
    const names: string[] = [];
    walk(program("[a, b, c];"), {
      Identifier(node, path) {
        names.push(node.name);
        path.skip(); // identifiers have children fields, but no child nodes here
      },
    });
    expect(names).toEqual(["a", "b", "c"]);
  });
});

describe("path: stop", () => {
  test("stop in enter halts the walk, skipping later nodes and leaves", () => {
    const log: string[] = [];
    walk(program("a; b; c;"), {
      enter(node, path) {
        log.push(`>${node.type}`);
        if (node.type === "Identifier" && node.name === "a") path.stop();
      },
      leave: (node) => void log.push(`<${node.type}`),
    });
    expect(log).toEqual([">Program", ">ExpressionStatement", ">Identifier"]);
  });

  test("stop in leave halts the walk before later nodes", () => {
    const visited: string[] = [];
    walk(program("a; b;"), {
      Identifier(node, path) {
        visited.push(node.name);
        if (node.name === "a") path.stop();
      },
    });
    expect(visited).toEqual(["a"]);
  });

  test("stop returns the root unchanged", () => {
    const root = program("a; b;");
    const out = walk(root, {
      Identifier: (_n, path) => path.stop(),
    });
    expect(out).toBe(root);
  });
});
