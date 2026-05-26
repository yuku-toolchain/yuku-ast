/**
 * The AST walker: depth-first traversal with typed visitors and in-place
 * mutation. Exposed as the `yuku-ast/walk` entry point.
 */

export { walk } from "./sync";
export { walkAsync } from "./async";

export type {
  AsyncVisitFn,
  AsyncVisitor,
  AsyncVisitors,
  ChildKeys,
  Path,
  VisitFn,
  Visitor,
  Visitors,
} from "../types";
