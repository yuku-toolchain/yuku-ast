/**
 * Node builders (`b`) and type guards (`is`) for the yuku-parser
 * ESTree / TypeScript-ESTree AST.
 *
 * The walker lives at `yuku-ast/walk`; identifier and reserved-word validators
 * live at `yuku-ast/identifier`.
 */

export { is } from "./predicates";
export { b } from "./builders";

export type { AliasMap, AliasName } from "./aliases";
export type { NodeOfType, NodeType } from "./types";
