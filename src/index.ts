/**
 * yuku-ast: the AST toolkit for the yuku-parser ESTree / TypeScript-ESTree AST.
 * Node builders (`b`) and type guards (`is`).
 *
 * Node utilities such as `nameOf` live at `yuku-ast/utils`. Identifier and
 * reserved-word validators live at `yuku-ast/identifier`.
 */

export { b } from "./builders";
export { is } from "./predicates";

export type { AliasMap, AliasName } from "./aliases";
export type { NodeOfType, NodeType } from "./types";
