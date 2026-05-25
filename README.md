# yuku-walk

A fast, fully typed AST walker for [`yuku-parser`](https://www.npmjs.com/package/yuku-parser).

Type-keyed visitors with `enter`/`leave`, alias groups, in-place mutation, and a
complete set of type guards and node builders. No runtime dependencies.

```ts
import { parse } from "yuku-parser";
import { walk } from "yuku-walk";

const { program } = parse("const greet = (name) => `hi ${name}`;");

walk(program, {
  Identifier(node) {
    console.log(node.name); // greet, name, name
  },
});
```

## Install

```sh
bun add yuku-walk yuku-parser
```

`yuku-parser` and `typescript` are peer dependencies.

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
import { is } from "yuku-walk";

is.CallExpression(node);          // every concrete type
is.Expression(node);              // families
is.StringLiteral(node);           // Literal variants
is.StaticMemberExpression(node);  // MemberExpression variants
is.BindingIdentifier(node);       // Identifier roles, via `kind`

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
import { b } from "yuku-walk";

b.identifier("x");
b.callExpression(b.identifier("f"), [b.numericLiteral(1)]);
b.arrowFunctionExpression([b.identifier("a", "binding")], b.identifier("a"));
b.variableDeclaration("const", [
  b.variableDeclarator(b.identifier("x", "binding"), b.numericLiteral(0)),
]);
```

## Async

`walkAsync` is the same walk with awaitable visitors, run sequentially in
depth-first order. Reach for it only when a visitor must await I/O; `walk` is
faster otherwise.

```ts
import { walkAsync } from "yuku-walk";

await walkAsync(program, {
  async ImportDeclaration(node, path) {
    if (!(await exists(node.source.value))) path.remove();
  },
});
```

## Performance

The walk reads a fixed table of child fields per node type rather than reflecting
over keys, and dispatches through a cached, per-type handler list. On a large
TypeScript file it walks several times faster than `@babel/traverse` and on par
with the lightest reflection walkers, while staying fully typed.

## License

MIT
