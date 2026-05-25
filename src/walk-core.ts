import type { Node } from "yuku-parser";
import { ALIAS_GROUPS } from "./aliases";
import type { NodeType, Path } from "./types";
import { VISITOR_KEYS } from "./visitor-keys";

export type Handler<S> = (node: Node, path: Path<Node, S>) => unknown;
type Entry<S> = Handler<S> | { enter?: Handler<S>; leave?: Handler<S> };
type Fields = Record<string, unknown>;

export interface Dispatch<S> {
  readonly enter: readonly Handler<S>[];
  readonly leave: readonly Handler<S>[];
  readonly keys: readonly string[];
}

interface AliasHandler<S> {
  readonly types: ReadonlySet<string>;
  readonly enter?: Handler<S>;
  readonly leave?: Handler<S>;
}

/** Returned up the stack when a visitor calls `remove()`. */
export const REMOVED = Symbol("yuku-walk/removed");

/** A node viewed as its fields, for traversal and mutation by key. */
export const fieldsOf = (node: Node): Fields => node as unknown as Fields;

/**
 * One per visited node, holding its own position and a link to its parent path
 * so it stays valid, ancestors included, after the visit returns. Control flow
 * and mutation delegate to the owning walker.
 */
export class NodePath<S> implements Path<Node, S> {
  constructor(
    private readonly walker: WalkerCore<S>,
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
    // Synthetic replacements inherit the original span, for source maps.
    if (next.start === 0 && next.end === 0) {
      next.start = this.node.start;
      next.end = this.node.end;
    }
    this.node = next;
    this.walker.replacement = next;
    const { parent, key, index } = this;
    if (parent === null || key === null) return;
    const fields = fieldsOf(parent);
    if (index === null) fields[key] = next;
    else (fields[key] as unknown[])[index] = next;
  }

  remove(): void {
    if (this.parent === null) throw new Error("yuku-walk: cannot remove the root node");
    this.walker.removeFlag = true;
  }

  insertBefore(node: Node): void {
    this.insertSibling(node, 0);
  }

  insertAfter(node: Node): void {
    this.insertSibling(node, 1);
  }

  private insertSibling(node: Node, offset: 0 | 1): void {
    const { parent, key, index } = this;
    if (parent === null || key === null || index === null) {
      throw new Error("yuku-walk: insertBefore/insertAfter require a node in an array field");
    }
    const list = fieldsOf(parent)[key] as Node[];
    const at = list.indexOf(this.node);
    if (at !== -1) list.splice(at + offset, 0, node);
  }
}

/** Shared dispatch and traversal state. The sync and async drivers extend this. */
export class WalkerCore<S> {
  state: S;
  skipFlag = false;
  stopFlag = false;
  removeFlag = false;
  replacement: Node | null = null;

  protected readonly universalEnter?: Handler<S>;
  protected readonly universalLeave?: Handler<S>;
  protected readonly concrete = new Map<string, { enter?: Handler<S>; leave?: Handler<S> }>();
  protected readonly aliasHandlers: AliasHandler<S>[] = [];
  private readonly cache: Record<string, Dispatch<S>> = Object.create(null);

  constructor(visitors: object, state: S) {
    this.state = state;
    const entries = visitors as Record<string, Entry<S> | undefined>;
    const aliases = ALIAS_GROUPS as Record<string, readonly NodeType[] | undefined>;

    for (const name in entries) {
      const entry = entries[name];
      if (!entry) continue;
      if (name === "enter") {
        if (typeof entry === "function") this.universalEnter = entry;
        continue;
      }
      if (name === "leave") {
        if (typeof entry === "function") this.universalLeave = entry;
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

  protected dispatchFor(type: NodeType): Dispatch<S> {
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

  protected newPath(
    parentPath: NodePath<S> | null,
    parent: Node | null,
    node: Node,
    key: string | null,
    index: number | null,
  ): NodePath<S> {
    return new NodePath<S>(this, parentPath, node, parent, key, index);
  }
}
