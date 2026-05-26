# yuku-ast

A fast, fully typed AST toolkit for [`yuku-parser`](https://www.npmjs.com/package/yuku-parser):
node builders, type guards, a walker, and identifier validators. No runtime dependencies.

The package is split into three entry points so you only pull in what you use:

| Import                | Provides                                          |
| --------------------- | ------------------------------------------------- |
| `yuku-ast`            | `b` (node builders), `is` (type guards)           |
| `yuku-ast/walk`       | `walk`, `walkAsync`, and the visitor / path types |
| `yuku-ast/identifier` | identifier and reserved-word validators           |

```ts
import { parse } from "yuku-parser";
import { walk } from "yuku-ast/walk";

const { program } = parse("const greet = (name) => `hi ${name}`;");

walk(program, {
  Identifier(node) {
    console.log(node.name); // greet, name, name
  },
});
```

## Install

```sh
bun add yuku-ast yuku-parser
```

`yuku-parser` is a peer dependency.

## Visitors

A visitor is keyed by node `type`, by an alias group, or by the universal
`enter` / `leave`. Each handler receives the typed node and a [`path`](#the-path).

```ts
walk(program, {
  // a concrete node type, `node` is precisely typed
  CallExpression(node, path) {
    if (path.parent?.type === "AwaitExpression") return;
  },

  // an alias group fires for a whole family
  Function(node) {
    node.params; // FunctionDeclaration | FunctionExpression | ArrowFunctionExpression | ...
  },

  // enter/leave for any node type
  MemberExpression: {
    enter(node) {},
    leave(node) {},
  },

  // run for every node
  enter(node) {},
  leave(node) {},
});
```

Aliases: `Expression`, `Statement`, `Declaration`, `ModuleDeclaration`,
`Function`, `Class`, `Method`, `Loop`, `Pattern`, `JSX`, `TSType`.

When several handlers match a node, `enter` runs outermost first
(universal, alias, concrete) and `leave` runs in reverse.

## The path

Every visitor receives a `path` describing where it is and how to change the tree.
Each node has its own path, so it stays valid after the visit returns.

```ts
node: T                       // the current node
parent: Node | null           // owner, or null at the root
key: string | null            // field on the parent holding this node
index: number | null          // position within an array field, else null
ancestors: readonly Node[]    // root down to the parent
state: S                      // value threaded through the walk

skip()                        // do not descend into this node
stop()                        // end the walk
replace(next)                 // swap this node, then walk the replacement
remove()                      // detach from the parent
insertBefore(node)            // add a sibling before (array fields)
insertAfter(node)             // add a sibling after (array fields)
```

```ts
walk(program, {
  DebuggerStatement(_node, path) {
    path.remove();
  },
  Identifier(node, path) {
    if (node.name === "foo") path.replace(b.identifier("bar"));
  },
});
```

`replace` walks into the replacement's children but does not re-run its own
`enter`. A synthetic replacement (one built with `b.*`) inherits the replaced
node's source span, so generated output still maps back to the original.

## Type guards (`is`)

A guard for every node `type`, the alias families, and the variants that share a
`type` string. All accept `null` / `undefined` and return `false`.

```ts
import { is } from "yuku-ast";

is.CallExpression(node); // every concrete type
is.Expression(node); // families
is.StringLiteral(node); // Literal variants
is.StaticMemberExpression(node); // MemberExpression variants
is.BindingIdentifier(node); // Identifier roles, via `kind`

walk(program, {
  Literal(node, path) {
    if (is.ArrayExpression(path.parent)) {
      // path.parent is narrowed to ArrayExpression
    }
  },
});
```

## Builders (`b`)

A builder for every node type. Required fields are positional, the rest go in a
trailing options object. Synthetic nodes get a zero span.

```ts
import { b } from "yuku-ast";

b.identifier("x");
b.callExpression(b.identifier("f"), [b.numericLiteral(1)]);
b.arrowFunctionExpression([b.identifier("a", "binding")], b.identifier("a"));
b.variableDeclaration("const", [
  b.variableDeclarator(b.identifier("x", "binding"), b.numericLiteral(0)),
]);
```

## Transform and print

Pair it with [`yuku-codegen`](https://www.npmjs.com/package/yuku-codegen) to parse,
rewrite, and print back to source.

```ts
import { parse } from "yuku-parser";
import { print } from "yuku-codegen";
import { is, b } from "yuku-ast";
import { walk } from "yuku-ast/walk";

const { program } = parse("const x = 1; debugger; foo(x, 2);");

walk(program, {
  DebuggerStatement(_node, path) {
    path.remove();
  },
  Identifier(node, path) {
    if (node.name === "foo") path.replace(b.identifier("bar"));
  },
  Literal(node, path) {
    if (is.NumericLiteral(node)) path.replace(b.numericLiteral((node.value ?? 0) * 10));
  },
});

console.log(print(program).code);
// const x = 10;
// bar(x, 20);
```

`walk` edits the tree in place, so a transform is just a reusable visitor object,
and passes compose: run as many as you like, then print once.

```ts
import { b } from "yuku-ast";
import { walk, type Visitors } from "yuku-ast/walk";

const stripDebugger: Visitors = {
  DebuggerStatement: (_node, path) => path.remove(),
};
const inlineDevFlag: Visitors = {
  Identifier(node, path) {
    if (node.name === "__DEV__") path.replace(b.booleanLiteral(false));
  },
};

const { program } = parse("if (__DEV__) log(); debugger; run();");
for (const transform of [stripDebugger, inlineDevFlag]) {
  walk(program, transform);
}
console.log(print(program).code);
// if (false) log();
// run();
```

Replacements built with `b.*` inherit the replaced node's source span, so
`yuku-codegen` source maps still point back to the original input.

## Async

`walkAsync` is the same walk with awaitable visitors, run sequentially in
depth-first order. Reach for it only when a visitor must await I/O; `walk` is
faster otherwise.

```ts
import { walkAsync } from "yuku-ast/walk";

await walkAsync(program, {
  async ImportDeclaration(node, path) {
    if (!(await exists(node.source.value))) path.remove();
  },
});
```

## Identifiers

Identifier and reserved-word helpers for raw strings and code points.

```ts
import { isIdentifierName, isValidIdentifier } from "yuku-ast/identifier";

isIdentifierName("π"); // true  - a well-formed IdentifierName
isIdentifierName("class"); // true  - purely syntactic, keywords included
isValidIdentifier("class"); // false - rejects reserved words (use for bindings)
isValidIdentifier("π"); // true
```

| Function                                         | Checks                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| `isIdentifierName(name)`                         | `name` is a syntactically valid `IdentifierName`                          |
| `isValidIdentifier(name, reserved?)`             | a valid binding name; rejects reserved words unless `reserved` is `false` |
| `isIdentifierStart(cp)` / `isIdentifierChar(cp)` | a code point may start / continue an identifier                           |
| `isKeyword(word)`                                | `word` is a core grammar keyword (`if`, `class`, …)                       |
| `isReservedWord(word, inModule?)`                | reserved everywhere (`enum`; `await` in modules)                          |
| `isStrictReservedWord(word, inModule?)`          | also reserved in strict mode (`let`, `yield`, …)                          |
| `isStrictBindOnlyReservedWord(word)`             | `eval` / `arguments`                                                      |
| `isStrictBindReservedWord(word, inModule?)`      | strict reserved, plus `eval` / `arguments`                                |

## Performance

The walk reads a fixed table of child fields per node type rather than reflecting
over keys, and dispatches through a cached, per-type handler list. On a large
TypeScript file it walks several times faster than `@babel/traverse` and on par
with the lightest reflection walkers, while staying fully typed.

## License

MIT
