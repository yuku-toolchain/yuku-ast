import type { Node } from "yuku-parser";
import { ALIAS_GROUPS } from "./aliases";
import type { NodeType, Path, VisitFn, Visitors } from "./types";
import { VISITOR_KEYS } from "./visitor-keys";

type Handler<S> = VisitFn<Node, S>;
type Entry<S> = Handler<S> | { enter?: Handler<S>; leave?: Handler<S> };
type Fields = Record<string, unknown>;

interface Dispatch<S> {
  readonly enter: readonly Handler<S>[];
  readonly leave: readonly Handler<S>[];
  readonly keys: readonly string[];
}

interface AliasHandler<S> {
  readonly types: ReadonlySet<string>;
  readonly enter?: Handler<S>;
  readonly leave?: Handler<S>;
}

const REMOVED = Symbol("yuku-walk/removed");

/**
 * One per visited node, holding its own position and a link to its parent path
 * so it stays valid, ancestors included, after the visit returns. Control flow
 * and mutation delegate to the owning {@link Walker}.
 */
class NodePath<S> implements Path<Node, S> {
  constructor(
    private readonly walker: Walker<S>,
    private readonly parentPath: NodePath<S> | null,
    public node: Node,
    public readonly parent: Node | null,
    public readonly key: string | null,
    public readonly index: number | null,
  ) {}

  get state(): S {
    return this.walker.state;
  }
  set state(value: S) {
    this.walker.state = value;
  }

  get ancestors(): readonly Node[] {
    const out: Node[] = [];
    for (let p = this.parentPath; p !== null; p = p.parentPath) out.push(p.node);
    return out.reverse();
  }

  skip(): void {
    this.walker.skipFlag = true;
  }
  stop(): void {
    this.walker.stopFlag = true;
  }

  replace(next: Node): void {
    this.node = next;
    this.walker.replacement = next;
    const { parent, key, index } = this;
    if (parent === null || key === null) return;
    const fields = parent as unknown as Fields;
    if (index === null) fields[key] = next;
    else (fields[key] as unknown[])[index] = next;
  }

  remove(): void {
    if (this.parent === null) throw new Error("yuku-walk: cannot remove the root node");
    this.walker.removeFlag = true;
  }
}

class Walker<S> {
  state: S;
  skipFlag = false;
  stopFlag = false;
  removeFlag = false;
  replacement: Node | null = null;

  private readonly universalEnter?: Handler<S>;
  private readonly universalLeave?: Handler<S>;
  private readonly concrete = new Map<string, { enter?: Handler<S>; leave?: Handler<S> }>();
  private readonly aliasHandlers: AliasHandler<S>[] = [];
  private readonly cache: Record<string, Dispatch<S>> = Object.create(null);

  constructor(visitors: Visitors<S>, state: S) {
    this.state = state;
    const entries = visitors as unknown as Record<string, Entry<S> | undefined>;
    const aliases = ALIAS_GROUPS as Record<string, readonly NodeType[] | undefined>;

    for (const name in entries) {
      const entry = entries[name];
      if (!entry) continue;
      if (name === "enter") {
        this.universalEnter = entry as Handler<S>;
        continue;
      }
      if (name === "leave") {
        this.universalLeave = entry as Handler<S>;
        continue;
      }

      const enter = typeof entry === "function" ? entry : entry.enter;
      const leave = typeof entry === "function" ? undefined : entry.leave;
      const aliasTypes = aliases[name];
      if (aliasTypes) {
        this.aliasHandlers.push({ types: new Set(aliasTypes), enter, leave });
      } else {
        const prev = this.concrete.get(name);
        this.concrete.set(name, { enter: enter ?? prev?.enter, leave: leave ?? prev?.leave });
      }
    }
  }

  run(root: Node): Node {
    const result = this.visit(null, null, root, null, null);
    return result === REMOVED ? root : result;
  }

  private dispatchFor(type: NodeType): Dispatch<S> {
    const cached = this.cache[type];
    if (cached !== undefined) return cached;

    const enter: Handler<S>[] = [];
    const leave: Handler<S>[] = [];
    const concrete = this.concrete.get(type);

    if (this.universalEnter) enter.push(this.universalEnter);
    for (let i = 0; i < this.aliasHandlers.length; i++) {
      const a = this.aliasHandlers[i]!;
      if (a.enter && a.types.has(type)) enter.push(a.enter);
    }
    if (concrete?.enter) enter.push(concrete.enter);

    // leave mirrors enter, concrete, then aliases reversed, then universal.
    if (concrete?.leave) leave.push(concrete.leave);
    for (let i = this.aliasHandlers.length - 1; i >= 0; i--) {
      const a = this.aliasHandlers[i]!;
      if (a.leave && a.types.has(type)) leave.push(a.leave);
    }
    if (this.universalLeave) leave.push(this.universalLeave);

    return (this.cache[type] = { enter, leave, keys: VISITOR_KEYS[type] });
  }

  /** Run a phase's handlers, applying replacements, and return the current node. */
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

    const path = new NodePath<S>(this, parentPath, node, parent, key, index);
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
    const fields = node as unknown as Fields;
    for (let k = 0; k < keys.length; k++) {
      const key = keys[k]!;
      const value = fields[key];
      if (value == null) continue;

      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const child = value[i] as Node | null;
          if (child == null) continue;
          if (this.visit(path, node, child, key, i) === REMOVED) {
            value.splice(i, 1);
            i--;
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
