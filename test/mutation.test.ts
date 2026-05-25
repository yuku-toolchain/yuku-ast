import { describe, expect, test } from "bun:test";
import type { Identifier, VariableDeclaration } from "yuku-parser";
import { b, walk } from "../src/index";
import { parseOk, program, render } from "./helpers";

describe("mutation: replace", () => {
  test("replaces a node in a plain field, reflected in the output", () => {
    const result = parseOk("foo;");
    walk(result.program, {
      Identifier(node, path) {
        if (node.name === "foo") path.replace(b.identifier("bar"));
      },
    });
    expect(render(result)).toBe("bar;");
  });

  test("replaces a node within an array field", () => {
    const result = parseOk("[a, b, c];");
    walk(result.program, {
      Identifier(node, path) {
        if (node.name === "b") path.replace(b.numericLiteral(2));
      },
    });
    expect(render(result)).toBe("[a, 2, c];");
  });

  test("path.node points at the replacement after replace", () => {
    walk(program("foo;"), {
      Identifier(_node, path) {
        const next = b.identifier("bar");
        path.replace(next);
        expect(path.node).toBe(next);
      },
    });
  });

  test("descends into the replacement's children", () => {
    const inner: string[] = [];
    const result = parseOk("x;");
    walk(result.program, {
      Identifier(node, path) {
        // Replace x with g(y), so its argument y is visited next.
        if (node.name === "x") path.replace(b.callExpression(b.identifier("g"), [b.identifier("y")]));
        else inner.push(node.name);
      },
    });
    expect(inner).toEqual(["g", "y"]);
    expect(render(result)).toBe("g(y);");
  });

  test("does not re-run the replaced node's own enter handler", () => {
    let enters = 0;
    walk(program("x;"), {
      Identifier(node, path) {
        enters++;
        if (node.name === "x") path.replace(b.identifier("y"));
      },
    });
    // x enters once and is replaced. The replacement y is not entered again.
    expect(enters).toBe(1);
  });

  test("replacing with a different type re-dispatches children and leave", () => {
    const log: string[] = [];
    const result = parseOk("x;");
    walk(result.program, {
      Identifier: {
        enter(node, path) {
          if (node.name === "x") path.replace(b.arrayExpression([b.numericLiteral(1)]));
        },
      },
      ArrayExpression: { leave: () => void log.push("array-leave") },
      Literal: (node) => void log.push(`literal:${node.raw}`),
    });
    // The replacement's element is visited, and the replacement's own leave fires.
    expect(log).toEqual(["literal:1", "array-leave"]);
    expect(render(result)).toBe("[1];");
  });

  test("a synthetic replacement inherits the replaced node's source span", () => {
    const result = parseOk("x + foo;"); // foo spans offsets 4 to 7
    const replaced = b.identifier("bar");
    expect(replaced.start).toBe(0);
    expect(replaced.end).toBe(0);
    walk(result.program, {
      Identifier(node, path) {
        if (node.name === "foo") path.replace(replaced);
      },
    });
    expect(replaced.start).toBe(4);
    expect(replaced.end).toBe(7);
  });

  test("a replacement carrying its own span keeps it", () => {
    const result = parseOk("x + foo;");
    const explicit: Identifier = { ...b.identifier("bar"), start: 99, end: 102 };
    walk(result.program, {
      Identifier(node, path) {
        if (node.name === "foo") path.replace(explicit);
      },
    });
    expect(explicit.start).toBe(99);
    expect(explicit.end).toBe(102);
  });

  test("successive enter handlers each see the prior replacement", () => {
    const seen: string[] = [];
    const result = parseOk("a;");
    walk(result.program, {
      // Both handlers are in the same enter phase for this Identifier.
      Expression(node, path) {
        seen.push(node.type === "Identifier" ? `alias:${node.name}` : `alias:${node.type}`);
        if (node.type === "Identifier") path.replace(b.identifier("R1"));
      },
      Identifier(node, path) {
        seen.push(`concrete:${node.name}`);
        path.replace(b.numericLiteral(2));
      },
    });
    expect(seen).toEqual(["alias:a", "concrete:R1"]);
    expect(render(result)).toBe("2;");
  });

  test("replacing the root returns the replacement", () => {
    const root = program("a;");
    const replacement = b.program([b.expressionStatement(b.identifier("z"))]);
    const out = walk(root, {
      Program(_node, path) {
        path.replace(replacement);
      },
    });
    expect(out).toBe(replacement);
  });
});

describe("mutation: remove", () => {
  test("removes a node from an array field, splicing it out", () => {
    const result = parseOk("a; debugger; b;");
    walk(result.program, {
      DebuggerStatement: (_node, path) => path.remove(),
    });
    expect(result.program.body).toHaveLength(2);
    expect(render(result)).toBe("a;\nb;");
  });

  test("removes a node from a plain field, nulling it", () => {
    const result = parseOk("var x = 1;");
    walk(result.program, {
      // The declarator's init sits in a plain, non-array field.
      Literal: (_node, path) => path.remove(),
    });
    const decl = result.program.body[0] as VariableDeclaration;
    expect(decl.declarations[0]?.init).toBeNull();
    expect(render(result)).toBe("var x;");
  });

  test("removes every matching node in one pass without skipping siblings", () => {
    const result = parseOk("a; debugger; debugger; b; debugger;");
    walk(result.program, {
      DebuggerStatement: (_node, path) => path.remove(),
    });
    expect(result.program.body.map((s) => s.type)).toEqual(["ExpressionStatement", "ExpressionStatement"]);
  });

  test("does not run leave on a removed node", () => {
    const log: string[] = [];
    walk(program("debugger;"), {
      DebuggerStatement: {
        enter: (_node, path) => path.remove(),
        leave: () => void log.push("leave"),
      },
    });
    expect(log).toEqual([]);
  });

  test("does not descend into a node removed on enter", () => {
    const names: string[] = [];
    walk(program("f(x, y); g(z);"), {
      CallExpression(node, path) {
        if (node.callee.type === "Identifier" && node.callee.name === "f") path.remove();
      },
      Identifier: (node) => void names.push(node.name),
    });
    // f(x, y) is removed before its children are visited.
    expect(names).toEqual(["g", "z"]);
  });

  test("removing the root throws", () => {
    expect(() =>
      walk(program("a;"), {
        Program: (_node, path) => path.remove(),
      }),
    ).toThrow("cannot remove the root node");
  });
});

describe("mutation: insertBefore and insertAfter", () => {
  test("insertBefore adds a sibling ahead of the current node", () => {
    const result = parseOk("b;");
    walk(result.program, {
      ExpressionStatement(node, path) {
        if (path.parent?.type === "Program") {
          path.insertBefore(b.expressionStatement(b.identifier("a")));
        }
      },
    });
    expect(render(result)).toBe("a;\nb;");
  });

  test("insertAfter adds a sibling following the current node", () => {
    const result = parseOk("a;");
    walk(result.program, {
      ExpressionStatement(node, path) {
        if (path.parent?.type === "Program") {
          path.insertAfter(b.expressionStatement(b.identifier("b")));
        }
      },
    });
    expect(render(result)).toBe("a;\nb;");
  });

  test("nodes inserted during a visit are not themselves visited", () => {
    const seen: string[] = [];
    const result = parseOk("a;");
    walk(result.program, {
      ExpressionStatement(node, path) {
        seen.push("stmt");
        if (path.parent?.type === "Program" && seen.length === 1) {
          path.insertAfter(b.expressionStatement(b.identifier("b")));
          path.insertBefore(b.expressionStatement(b.identifier("z")));
        }
      },
    });
    // Only the original statement is visited, both inserts are skipped.
    expect(seen).toEqual(["stmt"]);
    expect(render(result)).toBe("z;\na;\nb;");
  });

  test("insertBefore throws on a node in a plain field", () => {
    expect(() =>
      walk(program("a.b;"), {
        MemberExpression: (_node, path) => path.insertBefore(b.identifier("c")),
      }),
    ).toThrow("require a node in an array field");
  });

  test("insertAfter throws at the root", () => {
    expect(() =>
      walk(program("a;"), {
        Program: (_node, path) => path.insertAfter(b.emptyStatement()),
      }),
    ).toThrow("require a node in an array field");
  });
});

describe("mutation: combined", () => {
  test("a transform that renames and removes produces correct output", () => {
    const result = parseOk("var x = 1; debugger; foo;");
    walk(result.program, {
      DebuggerStatement: (_node, path) => path.remove(),
      Identifier(node, path) {
        if (node.name === "foo") path.replace(b.identifier("bar"));
      },
    });
    expect(render(result)).toBe("var x = 1;\nbar;");
  });
});
