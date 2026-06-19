import type { Node } from "@yuku-toolchain/types";

type MaybeNode = Node | null | undefined;

/**
 * The static name a node denotes: an `Identifier`'s `name`, or a string
 * `Literal`'s `value`. Returns `null` for anything else, and for `null` or
 * `undefined`, so the common `Identifier | StringLiteral` name slots (a
 * `ModuleExportName`, or a static property or member key) read in one call.
 *
 * @example
 * nameOf(b.identifier("x")) // "x"
 * nameOf(b.stringLiteral("y")) // "y"
 * nameOf(b.numericLiteral(1)) // null
 */
export function nameOf(node: MaybeNode): string | null {
  if (node == null) return null;
  if (node.type === "Identifier") return node.name;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  return null;
}
