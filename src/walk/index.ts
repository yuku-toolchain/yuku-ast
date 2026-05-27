/**
 * The AST walker: depth-first traversal with typed visitors and in-place
 * mutation. Re-exported from the package root (`yuku-ast`).
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
