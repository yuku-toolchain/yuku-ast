import type { ChildKeys, NodeOfType, NodeType } from "./types";

type VisitorKeysTable = { [K in NodeType]: readonly ChildKeys<NodeOfType<K>>[] };

/**
 * Child fields of each node type, in traversal order. Names are validated
 * against the AST types, so a renamed, removed, or added field fails to compile.
 */
export const VISITOR_KEYS = {
  Program: ["hashbang", "body"],
  Hashbang: [],

  Identifier: ["decorators", "typeAnnotation"],
  PrivateIdentifier: [],
  Literal: [],
  TemplateElement: [],
  Super: [],
  ThisExpression: [],

  ArrayPattern: ["decorators", "elements", "typeAnnotation"],
  ObjectPattern: ["decorators", "properties", "typeAnnotation"],
  AssignmentPattern: ["decorators", "left", "right", "typeAnnotation"],
  RestElement: ["decorators", "argument", "typeAnnotation"],
  Property: ["key", "value"],

  // Expressions
  SequenceExpression: ["expressions"],
  ParenthesizedExpression: ["expression"],
  BinaryExpression: ["left", "right"],
  LogicalExpression: ["left", "right"],
  ConditionalExpression: ["test", "consequent", "alternate"],
  UnaryExpression: ["argument"],
  UpdateExpression: ["argument"],
  AssignmentExpression: ["left", "right"],
  YieldExpression: ["argument"],
  AwaitExpression: ["argument"],
  ArrayExpression: ["elements"],
  ObjectExpression: ["properties"],
  SpreadElement: ["argument"],
  MemberExpression: ["object", "property"],
  CallExpression: ["callee", "typeArguments", "arguments"],
  ChainExpression: ["expression"],
  TaggedTemplateExpression: ["tag", "typeArguments", "quasi"],
  NewExpression: ["callee", "typeArguments", "arguments"],
  MetaProperty: ["meta", "property"],
  ImportExpression: ["source", "options"],
  TemplateLiteral: ["quasis", "expressions"],

  // Statements
  ExpressionStatement: ["expression"],
  BlockStatement: ["body"],
  IfStatement: ["test", "consequent", "alternate"],
  SwitchStatement: ["discriminant", "cases"],
  SwitchCase: ["test", "consequent"],
  ForStatement: ["init", "test", "update", "body"],
  ForInStatement: ["left", "right", "body"],
  ForOfStatement: ["left", "right", "body"],
  WhileStatement: ["test", "body"],
  DoWhileStatement: ["body", "test"],
  BreakStatement: ["label"],
  ContinueStatement: ["label"],
  LabeledStatement: ["label", "body"],
  WithStatement: ["object", "body"],
  ReturnStatement: ["argument"],
  ThrowStatement: ["argument"],
  TryStatement: ["block", "handler", "finalizer"],
  CatchClause: ["param", "body"],
  DebuggerStatement: [],
  EmptyStatement: [],

  VariableDeclaration: ["declarations"],
  VariableDeclarator: ["id", "init"],

  // Functions
  FunctionDeclaration: ["id", "typeParameters", "params", "returnType", "body"],
  FunctionExpression: ["id", "typeParameters", "params", "returnType", "body"],
  TSDeclareFunction: ["id", "typeParameters", "params", "returnType"],
  TSEmptyBodyFunctionExpression: ["id", "typeParameters", "params", "returnType"],
  ArrowFunctionExpression: ["typeParameters", "params", "returnType", "body"],

  ClassDeclaration: [
    "decorators",
    "id",
    "typeParameters",
    "superClass",
    "superTypeArguments",
    "implements",
    "body",
  ],
  ClassExpression: [
    "decorators",
    "id",
    "typeParameters",
    "superClass",
    "superTypeArguments",
    "implements",
    "body",
  ],
  ClassBody: ["body"],
  MethodDefinition: ["decorators", "key", "value"],
  TSAbstractMethodDefinition: ["decorators", "key", "value"],
  PropertyDefinition: ["decorators", "key", "typeAnnotation", "value"],
  TSAbstractPropertyDefinition: ["decorators", "key", "typeAnnotation", "value"],
  AccessorProperty: ["decorators", "key", "typeAnnotation", "value"],
  TSAbstractAccessorProperty: ["decorators", "key", "typeAnnotation", "value"],
  StaticBlock: ["body"],
  Decorator: ["expression"],

  // Modules
  ImportDeclaration: ["specifiers", "source", "attributes"],
  ImportSpecifier: ["imported", "local"],
  ImportDefaultSpecifier: ["local"],
  ImportNamespaceSpecifier: ["local"],
  ImportAttribute: ["key", "value"],
  ExportNamedDeclaration: ["declaration", "specifiers", "source", "attributes"],
  ExportDefaultDeclaration: ["declaration"],
  ExportAllDeclaration: ["exported", "source", "attributes"],
  ExportSpecifier: ["local", "exported"],

  // JSX
  JSXElement: ["openingElement", "children", "closingElement"],
  JSXOpeningElement: ["name", "typeArguments", "attributes"],
  JSXClosingElement: ["name"],
  JSXFragment: ["openingFragment", "children", "closingFragment"],
  JSXOpeningFragment: [],
  JSXClosingFragment: [],
  JSXIdentifier: [],
  JSXNamespacedName: ["namespace", "name"],
  JSXMemberExpression: ["object", "property"],
  JSXAttribute: ["name", "value"],
  JSXSpreadAttribute: ["argument"],
  JSXExpressionContainer: ["expression"],
  JSXEmptyExpression: [],
  JSXText: [],
  JSXSpreadChild: ["expression"],

  // TypeScript
  TSTypeAnnotation: ["typeAnnotation"],
  TSAnyKeyword: [],
  TSUnknownKeyword: [],
  TSNeverKeyword: [],
  TSVoidKeyword: [],
  TSNullKeyword: [],
  TSUndefinedKeyword: [],
  TSStringKeyword: [],
  TSNumberKeyword: [],
  TSBigIntKeyword: [],
  TSBooleanKeyword: [],
  TSSymbolKeyword: [],
  TSObjectKeyword: [],
  TSIntrinsicKeyword: [],
  TSThisType: [],

  TSTypeReference: ["typeName", "typeArguments"],
  TSQualifiedName: ["left", "right"],
  TSTypeQuery: ["exprName", "typeArguments"],
  TSImportType: ["source", "options", "qualifier", "typeArguments"],
  TSTypeParameter: ["name", "constraint", "default"],
  TSTypeParameterDeclaration: ["params"],
  TSTypeParameterInstantiation: ["params"],
  TSLiteralType: ["literal"],
  TSTemplateLiteralType: ["quasis", "types"],
  TSArrayType: ["elementType"],
  TSIndexedAccessType: ["objectType", "indexType"],
  TSTupleType: ["elementTypes"],
  TSNamedTupleMember: ["label", "elementType"],
  TSOptionalType: ["typeAnnotation"],
  TSRestType: ["typeAnnotation"],
  TSJSDocNullableType: ["typeAnnotation"],
  TSJSDocNonNullableType: ["typeAnnotation"],
  TSJSDocUnknownType: [],
  TSUnionType: ["types"],
  TSIntersectionType: ["types"],
  TSConditionalType: ["checkType", "extendsType", "trueType", "falseType"],
  TSInferType: ["typeParameter"],
  TSTypeOperator: ["typeAnnotation"],
  TSParenthesizedType: ["typeAnnotation"],
  TSFunctionType: ["typeParameters", "params", "returnType"],
  TSConstructorType: ["typeParameters", "params", "returnType"],
  TSTypePredicate: ["parameterName", "typeAnnotation"],
  TSTypeLiteral: ["members"],
  TSMappedType: ["key", "constraint", "nameType", "typeAnnotation"],

  TSPropertySignature: ["key", "typeAnnotation"],
  TSMethodSignature: ["key", "typeParameters", "params", "returnType"],
  TSCallSignatureDeclaration: ["typeParameters", "params", "returnType"],
  TSConstructSignatureDeclaration: ["typeParameters", "params", "returnType"],
  TSIndexSignature: ["parameters", "typeAnnotation"],

  TSTypeAliasDeclaration: ["id", "typeParameters", "typeAnnotation"],
  TSInterfaceDeclaration: ["id", "typeParameters", "extends", "body"],
  TSInterfaceBody: ["body"],
  TSInterfaceHeritage: ["expression", "typeArguments"],
  TSClassImplements: ["expression", "typeArguments"],
  TSEnumDeclaration: ["id", "body"],
  TSEnumBody: ["members"],
  TSEnumMember: ["id", "initializer"],
  TSModuleDeclaration: ["id", "body"],
  TSModuleBlock: ["body"],
  TSParameterProperty: ["decorators", "parameter"],

  TSAsExpression: ["expression", "typeAnnotation"],
  TSSatisfiesExpression: ["expression", "typeAnnotation"],
  TSTypeAssertion: ["typeAnnotation", "expression"],
  TSNonNullExpression: ["expression"],
  TSInstantiationExpression: ["expression", "typeArguments"],
  TSExportAssignment: ["expression"],
  TSNamespaceExportDeclaration: ["id"],
  TSImportEqualsDeclaration: ["id", "moduleReference"],
  TSExternalModuleReference: ["expression"],
} as const satisfies VisitorKeysTable;

// Completeness guard. `satisfies` above rejects a key that is not a child field,
// but cannot tell that a child field is missing.
type UnlistedChildKeys = {
  [K in NodeType as [Exclude<ChildKeys<NodeOfType<K>>, (typeof VISITOR_KEYS)[K][number]>] extends [never]
    ? never
    : K]: Exclude<ChildKeys<NodeOfType<K>>, (typeof VISITOR_KEYS)[K][number]>;
};
const _allChildKeysListed: UnlistedChildKeys = {};
void _allChildKeysListed;

/** Child fields of a node type, in traversal order. */
export function getVisitorKeys(type: NodeType): readonly string[] {
  return VISITOR_KEYS[type];
}
