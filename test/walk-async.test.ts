import { describe, expect, test } from "bun:test";
import { b, walkAsync } from "../src/index";
import { parseOk, program, render } from "./helpers";

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("walkAsync: traversal", () => {
  test("returns a promise of the root node", async () => {
    const root = program("a;");
    await expect(walkAsync(root, {})).resolves.toBe(root);
  });

  test("awaits handlers sequentially, preserving depth-first order", async () => {
    const order: string[] = [];
    await walkAsync(program("f(x);"), {
      async enter(node) {
        await tick();
        order.push(`>${node.type}`);
      },
      async leave(node) {
        await tick();
        order.push(`<${node.type}`);
      },
    });
    expect(order).toEqual([
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

  test("synchronous (non-async) handlers also work", async () => {
    const names: string[] = [];
    await walkAsync(program("a.b.c;"), {
      Identifier: (node) => void names.push(node.name),
    });
    expect(names).toEqual(["a", "b", "c"]);
  });
});

describe("walkAsync: control flow", () => {
  test("skip prevents descent but leave still runs", async () => {
    const log: string[] = [];
    await walkAsync(program("f(x);"), {
      CallExpression: {
        enter: async (_node, path) => {
          await tick();
          path.skip();
        },
        leave: () => void log.push("leave"),
      },
      Identifier: () => void log.push("identifier"),
    });
    expect(log).toEqual(["leave"]);
  });

  test("stop halts the walk", async () => {
    const visited: string[] = [];
    await walkAsync(program("a; b; c;"), {
      async Identifier(node, path) {
        await tick();
        visited.push(node.name);
        if (node.name === "a") path.stop();
      },
    });
    expect(visited).toEqual(["a"]);
  });
});

describe("walkAsync: mutation", () => {
  test("replace works and descends into the replacement", async () => {
    const result = parseOk("x;");
    const inner: string[] = [];
    await walkAsync(result.program, {
      async Identifier(node, path) {
        await tick();
        if (node.name === "x")
          path.replace(b.callExpression(b.identifier("g"), [b.identifier("y")]));
        else inner.push(node.name);
      },
    });
    expect(inner).toEqual(["g", "y"]);
    expect(render(result)).toBe("g(y);");
  });

  test("remove splices array elements", async () => {
    const result = parseOk("a; debugger; b;");
    await walkAsync(result.program, {
      DebuggerStatement: async (_node, path) => {
        await tick();
        path.remove();
      },
    });
    expect(render(result)).toBe("a;\nb;");
  });

  test("insertAfter inserts a sibling that is not visited", async () => {
    const seen: string[] = [];
    const result = parseOk("a;");
    await walkAsync(result.program, {
      async ExpressionStatement(_node, path) {
        await tick();
        seen.push("stmt");
        if (path.parent?.type === "Program" && seen.length === 1) {
          path.insertAfter(b.expressionStatement(b.identifier("b")));
        }
      },
    });
    expect(seen).toEqual(["stmt"]);
    expect(render(result)).toBe("a;\nb;");
  });

  test("replacing the root returns the replacement", async () => {
    const root = program("a;");
    const replacement = b.program([b.expressionStatement(b.identifier("z"))]);
    const out = await walkAsync(root, {
      async Program(_node, path) {
        await tick();
        path.replace(replacement);
      },
    });
    expect(out).toBe(replacement);
  });
});

describe("walkAsync: parity with walk", () => {
  test("an awaited side effect completes before the next node is visited", async () => {
    // Concurrent handlers would let this counter exceed one. Sequential
    // awaiting keeps only a single visit in flight at a time.
    let inFlight = 0;
    let maxConcurrent = 0;
    await walkAsync(program("a; b; c; d;"), {
      async Identifier() {
        inFlight++;
        maxConcurrent = Math.max(maxConcurrent, inFlight);
        await tick();
        inFlight--;
      },
    });
    expect(maxConcurrent).toBe(1);
  });
});
