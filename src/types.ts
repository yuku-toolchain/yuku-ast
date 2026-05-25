import type { Node } from "yuku-parser";
import type { AliasMap } from "./aliases";

/** Discriminant `type` string of every AST node. */
export type NodeType = Node["type"];

/** The node, or union of nodes, carrying a given `type`. */
export type NodeOfType<K extends NodeType> = Extract<Node, { type: K }>;

/** Field names of a node whose values hold child nodes. */
export type ChildKeys<N> = {
  [K in keyof N]-?: [NonNullable<N[K]>] extends [never]
    ? never
    : NonNullable<N[K]> extends Node
      ? K
      : NonNullable<N[K]> extends readonly (infer E)[]
        ? NonNullable<E> extends Node
          ? K
          : never
        : never;
}[keyof N];

/**
 * A node's position in the tree, passed to every visitor. It exposes the
 * surrounding context and the operations for changing the tree. Each node has
 * its own path, so a path stays valid after its visit returns.
 */
export interface Path<T extends Node = Node, S = unknown> {
  /** The node being visited. */
  readonly node: T;
  /** The node that holds {@link node}, or null at the root. */
  readonly parent: Node | null;
  /** The field on {@link parent} that holds {@link node} or its array, or null at the root. */
  readonly key: string | null;
  /** Index of {@link node} within an array field, or null when it sits in a plain field. */
  readonly index: number | null;
  /** Ancestors from the root down to {@link parent}, excluding {@link node}. */
  readonly ancestors: readonly Node[];
  /** State threaded through the walk. */
  state: S;
  /** Do not descend into the current node's children. */
  skip(): void;
  /** Stop the walk entirely. */
  stop(): void;
  /** Replace the current node, then walk the replacement's children. */
  replace(next: Node): void;
  /** Remove the current node from its parent. */
  remove(): void;
  /** Insert a sibling before the current node. Only valid in an array field. */
  insertBefore(node: Node): void;
  /** Insert a sibling after the current node. Only valid in an array field. */
  insertAfter(node: Node): void;
}

/** Handler invoked with a node and the {@link Path} cursor. */
export type VisitFn<T extends Node, S> = (node: T, path: Path<T, S>) => void;

/** A visitor: a function run on enter, or an object with `enter` and/or `leave`. */
export type Visitor<T extends Node, S> =
  | VisitFn<T, S>
  | { enter?: VisitFn<T, S>; leave?: VisitFn<T, S> };

/**
 * Visitors passed to {@link walk}. A key may be a node `type`, an alias group
 * such as `Function` or `Expression`, or `enter`/`leave` to match every node.
 */
export type Visitors<S = unknown> = {
  [K in NodeType]?: Visitor<NodeOfType<K>, S>;
} & {
  [K in keyof AliasMap]?: Visitor<AliasMap[K], S>;
} & {
  enter?: VisitFn<Node, S>;
  leave?: VisitFn<Node, S>;
};
