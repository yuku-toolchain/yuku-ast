import type { Node } from "@yuku-toolchain/types";

/** Discriminant `type` string of every AST node. */
export type NodeType = Node["type"];

/** The node, or union of nodes, carrying a given `type`. */
export type NodeOfType<K extends NodeType> = Extract<Node, { type: K }>;
