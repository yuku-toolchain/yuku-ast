# yuku-ast

A fast, fully typed AST toolkit for [`yuku-parser`](https://www.npmjs.com/package/yuku-parser):
node builders, type guards, and identifier validators.

| Import                | Provides                                |
| --------------------- | --------------------------------------- |
| `yuku-ast`            | `b` (node builders), `is` (type guards) |
| `yuku-ast/utils`      | node utilities such as `nameOf`         |
| `yuku-ast/identifier` | identifier and reserved-word validators |

```ts
import { parse } from "yuku-parser";
import { b, is } from "yuku-ast";

const { program } = parse("const greet = 1;");

const decl = program.body[0];
if (is.VariableDeclaration(decl)) {
  // `decl` is narrowed; swap the initializer for a freshly built node.
  decl.declarations[0].init = b.numericLiteral(42);
}
```

## Install

```sh
bun add yuku-ast
```

## Type guards (`is`)

A guard for every node `type`, the alias families, and the variants that share a
`type` string. All accept `null` / `undefined` and return `false`.

```ts
import { is } from "yuku-ast";

is.CallExpression(node); // every concrete type
is.Expression(node); // families
is.StringLiteral(node); // Literal variants
is.StaticMemberExpression(node); // MemberExpression variants

is.Identifier(node, "this"); // an Identifier with that exact name
is.oneOf(node, ["CallExpression", "NewExpression"]); // any of these types
```

`is.oneOf(node, types)` narrows to the union of the listed types, and
`is.Identifier(node, name?)` narrows to `Identifier`. A matching guard narrows the
node for typed field access:

```ts
const element = arrayExpression.elements[0];
if (is.Identifier(element)) {
  element.name; // `element` is narrowed to Identifier
}
```

Aliases: `Expression`, `Statement`, `Declaration`, `ModuleDeclaration`,
`Function`, `Class`, `Method`, `Loop`, `Pattern`, `JSX`, `TSType`.

## Reading names (`nameOf`)

`nameOf(node)` returns the static name a node denotes, an `Identifier`'s `name`
or a string `Literal`'s `value`, and `null` for anything else (including `null`
or `undefined`). It reads the common `Identifier | StringLiteral` slots, such as
a `ModuleExportName` or a static property or member key, in one call.

```ts
import { nameOf } from "yuku-ast/utils";

// `export { x as y }` and `export { x as "z" }` both resolve.
nameOf(specifier.exported); // "y", "z"

// A static (non-computed) property key, else null.
if (!property.computed) nameOf(property.key);
```

## Builders (`b`)

A builder for every node type. Required fields are positional, the rest go in a
trailing options object. Synthetic nodes get a zero span.

```ts
import { b } from "yuku-ast";

b.identifier("x");
b.callExpression(b.identifier("f"), [b.numericLiteral(1)]);
b.arrowFunctionExpression([b.identifier("a")], b.identifier("a"));
b.variableDeclaration("const", [b.variableDeclarator(b.identifier("x"), b.numericLiteral(0))]);
```

When you assign a synthetic node in place of an existing one, copy the original's
`start` / `end` first so [`yuku-codegen`](https://www.npmjs.com/package/yuku-codegen)
source maps still point back to the original input.

## Build and print

Pair it with [`yuku-codegen`](https://www.npmjs.com/package/yuku-codegen) to print
a built tree back to source.

```ts
import { print } from "yuku-codegen";
import { b } from "yuku-ast";

const program = b.program([
  b.variableDeclaration("const", [b.variableDeclarator(b.identifier("x"), b.numericLiteral(42))]),
  b.expressionStatement(
    b.callExpression(b.memberExpression(b.identifier("console"), b.identifier("log")), [
      b.identifier("x"),
    ]),
  ),
]);

console.log(print(program).code);
// const x = 42;
// console.log(x);
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

## License

MIT
