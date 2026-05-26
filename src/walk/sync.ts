import type { Node } from "yuku-parser";
import type { Visitors } from "../types";
import { type Handler, NodePath, REMOVED, WalkerCore, fieldsOf } from "./core";

class Walker<S> extends WalkerCore<S> {
  run(root: Node): Node {
    const result = this.visit(null, null, root, null, null);
    return result === REMOVED ? root : result;
  }

  private apply(handlers: readonly Handler<S>[], node: Node, path: NodePath<S>): Node {
    this.removeFlag = false;
    for (let i = 0; i < handlers.length; i++) {
      this.replacement = null;
      handlers[i]!(node, path);
      if (this.replacement !== null) node = this.replacement;
      if (this.removeFlag || this.stopFlag) break;
    }
    return node;
  }

  private visit(
    parentPath: NodePath<S> | null,
    parent: Node | null,
    node: Node,
    key: string | null,
    index: number | null,
  ): Node | typeof REMOVED {
    if (this.stopFlag) return node;

    const path = this.newPath(parentPath, parent, node, key, index);
    this.skipFlag = false;
    let dispatch = this.dispatchFor(node.type);

    if (dispatch.enter.length > 0) {
      const before = node;
      node = this.apply(dispatch.enter, node, path);
      if (this.removeFlag) return REMOVED;
      if (this.stopFlag) return node;
      // A replacement may be a different type with different children and handlers.
      if (node !== before) dispatch = this.dispatchFor(node.type);
    }

    if (!this.skipFlag && dispatch.keys.length > 0) {
      this.descend(path, node, dispatch.keys);
      if (this.stopFlag) return node;
    }

    if (dispatch.leave.length > 0) {
      node = this.apply(dispatch.leave, node, path);
      if (this.removeFlag) return REMOVED;
      if (this.stopFlag) return node;
    }

    return node;
  }

  private descend(path: NodePath<S>, node: Node, keys: readonly string[]): void {
    const fields = fieldsOf(node);
    for (let k = 0; k < keys.length; k++) {
      const key = keys[k]!;
      const value = fields[key];
      if (value == null) continue;

      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const child = value[i] as Node | null;
          if (child == null) continue;
          const before = value.length;
          if (this.visit(path, node, child, key, i) === REMOVED) {
            value.splice(i, 1);
            i--;
          } else {
            i += value.length - before; // skip siblings inserted during the visit
          }
          if (this.stopFlag) return;
        }
      } else {
        if (this.visit(path, node, value as Node, key, null) === REMOVED) fields[key] = null;
        if (this.stopFlag) return;
      }
    }
  }
}

/**
 * Walk an AST depth first, dispatching to typed visitors and mutating in place.
 *
 * @param root     The node to start from, usually a `Program`.
 * @param visitors Handlers keyed by node `type`, alias group, or `enter`/`leave`.
 * @param state    Optional value exposed as `path.state` throughout the walk.
 * @returns The root node, or its replacement if the root was replaced.
 *
 * @example
 * ```ts
 * walk(program, {
 *   Identifier(node) {
 *     console.log(node.name);
 *   },
 *   CallExpression(node, path) {
 *     if (node.callee.type === "MemberExpression") path.skip();
 *   },
 * });
 * ```
 */
export function walk<T extends Node, S = unknown>(root: T, visitors: Visitors<S>, state?: S): T {
  return new Walker<S>(visitors, state as S).run(root) as T;
}
