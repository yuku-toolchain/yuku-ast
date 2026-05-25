import type {
  BigIntLiteral,
  BindingIdentifier,
  BooleanLiteral,
  ComputedMemberExpression,
  Directive,
  Identifier,
  IdentifierName,
  IdentifierReference,
  LabelIdentifier,
  Literal,
  MemberExpression,
  Node,
  NullLiteral,
  NumericLiteral,
  PrivateFieldExpression,
  RegExpLiteral,
  StaticMemberExpression,
  StringLiteral,
} from "yuku-parser";
import { ALIAS_GROUPS, type AliasMap, type AliasName } from "./aliases";

type MaybeNode = Node | null | undefined;

function aliasGuard<K extends AliasName>(name: K): (node: MaybeNode) => node is AliasMap[K] {
  const set = new Set<string>(ALIAS_GROUPS[name]);
  return (node): node is AliasMap[K] => node != null && set.has(node.type);
}

export const is = {
  Expression: aliasGuard("Expression"),
  Statement: aliasGuard("Statement"),
  Declaration: aliasGuard("Declaration"),
  ModuleDeclaration: aliasGuard("ModuleDeclaration"),
  Function: aliasGuard("Function"),
  Class: aliasGuard("Class"),
  Method: aliasGuard("Method"),
  Loop: aliasGuard("Loop"),
  Pattern: aliasGuard("Pattern"),
  JSX: aliasGuard("JSX"),
  TSType: aliasGuard("TSType"),

  Identifier: (node: MaybeNode): node is Identifier => node?.type === "Identifier",
  IdentifierReference: (node: MaybeNode): node is IdentifierReference =>
    node?.type === "Identifier" && node.kind === "reference",
  BindingIdentifier: (node: MaybeNode): node is BindingIdentifier =>
    node?.type === "Identifier" && node.kind === "binding",
  LabelIdentifier: (node: MaybeNode): node is LabelIdentifier => node?.type === "Identifier" && node.kind === "label",
  IdentifierName: (node: MaybeNode): node is IdentifierName => node?.type === "Identifier" && node.kind === "name",

  Literal: (node: MaybeNode): node is Literal => node?.type === "Literal",
  StringLiteral: (node: MaybeNode): node is StringLiteral => node?.type === "Literal" && typeof node.value === "string",
  NumericLiteral: (node: MaybeNode): node is NumericLiteral => node?.type === "Literal" && typeof node.value === "number",
  BooleanLiteral: (node: MaybeNode): node is BooleanLiteral => node?.type === "Literal" && typeof node.value === "boolean",
  NullLiteral: (node: MaybeNode): node is NullLiteral => node?.type === "Literal" && node.raw === "null",
  BigIntLiteral: (node: MaybeNode): node is BigIntLiteral => node?.type === "Literal" && "bigint" in node,
  RegExpLiteral: (node: MaybeNode): node is RegExpLiteral => node?.type === "Literal" && "regex" in node,

  MemberExpression: (node: MaybeNode): node is MemberExpression => node?.type === "MemberExpression",
  ComputedMemberExpression: (node: MaybeNode): node is ComputedMemberExpression =>
    node?.type === "MemberExpression" && node.computed,
  StaticMemberExpression: (node: MaybeNode): node is StaticMemberExpression =>
    node?.type === "MemberExpression" && !node.computed && node.property.type === "Identifier",
  PrivateFieldExpression: (node: MaybeNode): node is PrivateFieldExpression =>
    node?.type === "MemberExpression" && node.property.type === "PrivateIdentifier",

  Directive: (node: MaybeNode): node is Directive => node?.type === "ExpressionStatement" && node.directive != null,
};
