/**
 * The yuku-ast toolkit for the yuku-parser ESTree / TypeScript-ESTree AST: a
 * typed walker (`walk` / `walkAsync`), node builders (`b`), and type guards
 * (`is`).
 *
 * Node utilities such as `nameOf` live at `yuku-ast/utils`. Identifier and
 * reserved-word validators live at `yuku-ast/identifier`.
 */

export { is } from "./predicates";
export { b } from "./builders";
export { walk, walkAsync } from "./walk";

export type { AliasMap, AliasName } from "./aliases";
export type { NodeOfType, NodeType } from "./types";
export type {
  AsyncVisitFn,
  AsyncVisitor,
  AsyncVisitors,
  ChildKeys,
  Path,
  VisitFn,
  Visitor,
  Visitors,
} from "./walk";
