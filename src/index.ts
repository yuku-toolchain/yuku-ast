/**
 * A fast, type-safe AST walker for the yuku-parser ESTree / TypeScript-ESTree AST.
 */

export { walk } from "./walk";
export { walkAsync } from "./walk-async";
export { is } from "./predicates";
export { b } from "./builders";

export type { AliasMap, AliasName } from "./aliases";
export type {
  AsyncVisitFn,
  AsyncVisitor,
  AsyncVisitors,
  ChildKeys,
  NodeType,
  NodeOfType,
  Path,
  VisitFn,
  Visitor,
  Visitors,
} from "./types";
