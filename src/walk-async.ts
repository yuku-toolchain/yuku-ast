import type { Node } from "yuku-parser";
import type { AsyncVisitors } from "./types";
import { type Handler, NodePath, REMOVED, WalkerCore, fieldsOf } from "./walk-core";

class AsyncWalker<S> extends WalkerCore<S> {
  async run(root: Node): Promise<Node> {
    const result = await this.visit(null, null, root, null, null);
    return result === REMOVED ? root : result;
  }

  private async apply(
    handlers: readonly Handler<S>[],
    node: Node,
    path: NodePath<S>,
  ): Promise<Node> {
    this.removeFlag = false;
    for (let i = 0; i < handlers.length; i++) {
      this.replacement = null;
      await handlers[i]!(node, path);
      if (this.replacement !== null) node = this.replacement;
      if (this.removeFlag || this.stopFlag) break;
    }
    return node;
  }

  private async visit(
    parentPath: NodePath<S> | null,
    parent: Node | null,
    node: Node,
    key: string | null,
    index: number | null,
  ): Promise<Node | typeof REMOVED> {
    if (this.stopFlag) return node;

    const path = this.newPath(parentPath, parent, node, key, index);
    this.skipFlag = false;
    let dispatch = this.dispatchFor(node.type);

    if (dispatch.enter.length > 0) {
      const before = node;
      node = await this.apply(dispatch.enter, node, path);
      if (this.removeFlag) return REMOVED;
      if (this.stopFlag) return node;
      // A replacement may be a different type with different children and handlers.
      if (node !== before) dispatch = this.dispatchFor(node.type);
    }

    if (!this.skipFlag && dispatch.keys.length > 0) {
      await this.descend(path, node, dispatch.keys);
      if (this.stopFlag) return node;
    }

    if (dispatch.leave.length > 0) {
      node = await this.apply(dispatch.leave, node, path);
      if (this.removeFlag) return REMOVED;
      if (this.stopFlag) return node;
    }

    return node;
  }

  private async descend(path: NodePath<S>, node: Node, keys: readonly string[]): Promise<void> {
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
          if ((await this.visit(path, node, child, key, i)) === REMOVED) {
            value.splice(i, 1);
            i--;
          } else {
            i += value.length - before; // skip siblings inserted during the visit
          }
          if (this.stopFlag) return;
        }
      } else {
        if ((await this.visit(path, node, value as Node, key, null)) === REMOVED)
          fields[key] = null;
        if (this.stopFlag) return;
      }
    }
  }
}

/**
 * Like {@link walk}, but visitors may be `async`. Handlers are awaited one at a
 * time in depth-first order, so mutation behaves exactly as in the sync walk.
 * Reach for this only when a visitor needs to await I/O; prefer {@link walk}
 * otherwise, as awaiting has per-node overhead.
 *
 * @returns A promise of the root node, or its replacement if the root was replaced.
 */
export function walkAsync<T extends Node, S = unknown>(
  root: T,
  visitors: AsyncVisitors<S>,
  state?: S,
): Promise<T> {
  return new AsyncWalker<S>(visitors, state as S).run(root) as Promise<T>;
}
