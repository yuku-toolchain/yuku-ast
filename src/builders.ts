import type * as t from "@yuku-toolchain/types";

const span = { start: 0, end: 0 };

const isComputedKey = (key: t.PropertyKey): boolean =>
  key.type !== "Identifier" && key.type !== "PrivateIdentifier";

export const b = {
  // Identifiers and literals
  identifier(
    name: string,
    opts: {
      typeAnnotation?: t.TSTypeAnnotation | null;
      optional?: boolean;
      decorators?: t.Decorator[];
    } = {},
  ): t.Identifier {
    return { type: "Identifier", name, ...opts, ...span };
  },
  privateIdentifier(name: string): t.PrivateIdentifier {
    return { type: "PrivateIdentifier", name, ...span };
  },
  stringLiteral(value: string): t.StringLiteral {
    return { type: "Literal", value, raw: JSON.stringify(value), ...span };
  },
  numericLiteral(value: number): t.NumericLiteral {
    return { type: "Literal", value, raw: String(value), ...span };
  },
  booleanLiteral(value: boolean): t.BooleanLiteral {
    return { type: "Literal", value, raw: String(value), ...span };
  },
  nullLiteral(): t.NullLiteral {
    return { type: "Literal", value: null, raw: "null", ...span };
  },
  bigIntLiteral(value: bigint): t.BigIntLiteral {
    return { type: "Literal", value, raw: `${value}n`, bigint: String(value), ...span };
  },
  regExpLiteral(pattern: string, flags = ""): t.RegExpLiteral {
    let value: RegExp | null = null;
    try {
      value = new RegExp(pattern, flags);
    } catch {}
    return {
      type: "Literal",
      value,
      raw: `/${pattern}/${flags}`,
      regex: { pattern, flags },
      ...span,
    };
  },
  templateLiteral(quasis: t.TemplateElement[], expressions: t.Expression[]): t.TemplateLiteral {
    return { type: "TemplateLiteral", quasis, expressions, ...span };
  },
  templateElement(cooked: string, tail = false): t.TemplateElement {
    return { type: "TemplateElement", value: { raw: cooked, cooked }, tail, ...span };
  },
  thisExpression(): t.ThisExpression {
    return { type: "ThisExpression", ...span };
  },
  super(): t.Super {
    return { type: "Super", ...span };
  },

  // Patterns
  arrayPattern(elements: Array<t.BindingPattern | t.RestElement | null>): t.ArrayPattern {
    return { type: "ArrayPattern", elements, ...span };
  },
  objectPattern(properties: Array<t.BindingProperty | t.RestElement>): t.ObjectPattern {
    return { type: "ObjectPattern", properties, ...span };
  },
  assignmentPattern(left: t.BindingPattern, right: t.Expression): t.AssignmentPattern {
    return { type: "AssignmentPattern", left, right, ...span };
  },
  restElement(argument: t.BindingPattern): t.RestElement {
    return { type: "RestElement", argument, ...span };
  },
  /** A member of an `ObjectExpression`. For an `ObjectPattern` member, use {@link bindingProperty}. */
  objectProperty(
    key: t.PropertyKey,
    value: t.Expression,
    opts: { computed?: boolean; shorthand?: boolean; kind?: t.PropertyKind; method?: boolean } = {},
  ): t.ObjectProperty {
    return {
      type: "Property",
      kind: opts.kind ?? "init",
      key,
      value,
      method: opts.method ?? false,
      shorthand: opts.shorthand ?? false,
      computed: opts.computed ?? isComputedKey(key),
      ...span,
    };
  },
  /** A member of an `ObjectPattern`, whose value is a binding target. For an `ObjectExpression` member, use {@link objectProperty}. */
  bindingProperty(
    key: t.PropertyKey,
    value: t.BindingPattern,
    opts: { computed?: boolean; shorthand?: boolean } = {},
  ): t.BindingProperty {
    return {
      type: "Property",
      kind: "init",
      key,
      value,
      method: false,
      shorthand: opts.shorthand ?? false,
      computed: opts.computed ?? isComputedKey(key),
      ...span,
    };
  },

  // Expressions
  arrayExpression(elements: t.ArrayExpressionElement[] = []): t.ArrayExpression {
    return { type: "ArrayExpression", elements, ...span };
  },
  objectExpression(properties: t.ObjectPropertyKind[] = []): t.ObjectExpression {
    return { type: "ObjectExpression", properties, ...span };
  },
  spreadElement(argument: t.Expression): t.SpreadElement {
    return { type: "SpreadElement", argument, ...span };
  },
  sequenceExpression(expressions: t.Expression[]): t.SequenceExpression {
    return { type: "SequenceExpression", expressions, ...span };
  },
  parenthesizedExpression(expression: t.Expression): t.ParenthesizedExpression {
    return { type: "ParenthesizedExpression", expression, ...span };
  },
  unaryExpression(operator: t.UnaryOperator, argument: t.Expression): t.UnaryExpression {
    return { type: "UnaryExpression", operator, prefix: true, argument, ...span };
  },
  updateExpression(
    operator: t.UpdateOperator,
    argument: t.Expression,
    prefix = false,
  ): t.UpdateExpression {
    return { type: "UpdateExpression", operator, argument, prefix, ...span };
  },
  binaryExpression(
    operator: t.BinaryOperator,
    left: t.Expression | t.PrivateIdentifier,
    right: t.Expression,
  ): t.BinaryExpression {
    return { type: "BinaryExpression", operator, left, right, ...span };
  },
  logicalExpression(
    operator: t.LogicalOperator,
    left: t.Expression,
    right: t.Expression,
  ): t.LogicalExpression {
    return { type: "LogicalExpression", operator, left, right, ...span };
  },
  assignmentExpression(
    operator: t.AssignmentOperator,
    left: t.AssignmentTarget,
    right: t.Expression,
  ): t.AssignmentExpression {
    return { type: "AssignmentExpression", operator, left, right, ...span };
  },
  conditionalExpression(
    test: t.Expression,
    consequent: t.Expression,
    alternate: t.Expression,
  ): t.ConditionalExpression {
    return { type: "ConditionalExpression", test, consequent, alternate, ...span };
  },
  yieldExpression(argument: t.Expression | null = null, delegate = false): t.YieldExpression {
    return { type: "YieldExpression", delegate, argument, ...span };
  },
  awaitExpression(argument: t.Expression): t.AwaitExpression {
    return { type: "AwaitExpression", argument, ...span };
  },
  memberExpression(
    object: t.Expression | t.Super,
    property: t.Expression | t.IdentifierName | t.PrivateIdentifier,
    opts: { computed?: boolean; optional?: boolean } = {},
  ): t.MemberExpression {
    return {
      type: "MemberExpression",
      object,
      property,
      computed: opts.computed ?? isComputedKey(property as t.PropertyKey),
      optional: opts.optional ?? false,
      ...span,
    } as t.MemberExpression;
  },
  callExpression(
    callee: t.Expression | t.Super,
    args: t.Argument[] = [],
    opts: { optional?: boolean; typeArguments?: t.TSTypeParameterInstantiation | null } = {},
  ): t.CallExpression {
    return {
      type: "CallExpression",
      callee,
      arguments: args,
      optional: opts.optional ?? false,
      ...opts,
      ...span,
    };
  },
  newExpression(
    callee: t.Expression,
    args: t.Argument[] = [],
    opts: { typeArguments?: t.TSTypeParameterInstantiation | null } = {},
  ): t.NewExpression {
    return { type: "NewExpression", callee, arguments: args, ...opts, ...span };
  },
  chainExpression(expression: t.ChainElement): t.ChainExpression {
    return { type: "ChainExpression", expression, ...span };
  },
  taggedTemplateExpression(
    tag: t.Expression,
    quasi: t.TemplateLiteral,
    opts: { typeArguments?: t.TSTypeParameterInstantiation | null } = {},
  ): t.TaggedTemplateExpression {
    return { type: "TaggedTemplateExpression", tag, quasi, ...opts, ...span };
  },
  metaProperty(meta: string, property: string): t.MetaProperty {
    return {
      type: "MetaProperty",
      meta: b.identifier(meta),
      property: b.identifier(property),
      ...span,
    };
  },
  importExpression(
    source: t.Expression,
    opts: { options?: t.Expression | null; phase?: t.ImportPhase | null } = {},
  ): t.ImportExpression {
    return {
      type: "ImportExpression",
      source,
      options: opts.options ?? null,
      phase: opts.phase ?? null,
      ...span,
    };
  },

  // Functions
  arrowFunctionExpression(
    params: t.FunctionParameter[],
    body: t.BlockStatement | t.Expression,
    opts: {
      async?: boolean;
      typeParameters?: t.TSTypeParameterDeclaration | null;
      returnType?: t.TSTypeAnnotation | null;
    } = {},
  ): t.ArrowFunctionExpression {
    return {
      type: "ArrowFunctionExpression",
      id: null,
      generator: false,
      async: opts.async ?? false,
      params,
      body,
      expression: body.type !== "BlockStatement",
      ...opts,
      ...span,
    };
  },
  functionExpression(
    params: t.FunctionParameter[],
    body: t.BlockStatement,
    opts: { id?: t.Identifier | null; async?: boolean; generator?: boolean } = {},
  ): t.FunctionExpression {
    return {
      type: "FunctionExpression",
      id: opts.id ?? null,
      generator: opts.generator ?? false,
      async: opts.async ?? false,
      params,
      body,
      expression: false,
      ...span,
    };
  },
  functionDeclaration(
    id: t.Identifier | null,
    params: t.FunctionParameter[],
    body: t.BlockStatement | null,
    opts: { async?: boolean; generator?: boolean } = {},
  ): t.FunctionDeclaration {
    return {
      type: "FunctionDeclaration",
      id,
      generator: opts.generator ?? false,
      async: opts.async ?? false,
      params,
      body,
      expression: false,
      ...span,
    };
  },

  // Classes
  classDeclaration(
    id: t.Identifier | null,
    body: t.ClassBody,
    opts: {
      superClass?: t.Expression | null;
      decorators?: t.Decorator[];
      typeParameters?: t.TSTypeParameterDeclaration | null;
      abstract?: boolean;
    } = {},
  ): t.ClassDeclaration {
    return {
      type: "ClassDeclaration",
      decorators: opts.decorators ?? [],
      id,
      superClass: opts.superClass ?? null,
      body,
      ...opts,
      ...span,
    };
  },
  classExpression(
    id: t.Identifier | null,
    body: t.ClassBody,
    opts: { superClass?: t.Expression | null; decorators?: t.Decorator[] } = {},
  ): t.ClassExpression {
    return {
      type: "ClassExpression",
      decorators: opts.decorators ?? [],
      id,
      superClass: opts.superClass ?? null,
      body,
      ...span,
    };
  },
  classBody(body: t.ClassElement[] = []): t.ClassBody {
    return { type: "ClassBody", body, ...span };
  },
  methodDefinition(
    key: t.PropertyKey,
    value: t.FunctionExpression | t.TSEmptyBodyFunctionExpression,
    opts: { kind?: t.MethodDefinitionKind; computed?: boolean; static?: boolean } = {},
  ): t.MethodDefinition {
    return {
      type: "MethodDefinition",
      decorators: [],
      key,
      value,
      kind: opts.kind ?? "method",
      computed: opts.computed ?? isComputedKey(key),
      static: opts.static ?? false,
      ...span,
    };
  },
  propertyDefinition(
    key: t.PropertyKey,
    value: t.Expression | null = null,
    opts: { computed?: boolean; static?: boolean; decorators?: t.Decorator[] } = {},
  ): t.PropertyDefinition {
    return {
      type: "PropertyDefinition",
      decorators: opts.decorators ?? [],
      key,
      value,
      computed: opts.computed ?? isComputedKey(key),
      static: opts.static ?? false,
      ...span,
    };
  },
  accessorProperty(
    key: t.PropertyKey,
    value: t.Expression | null = null,
    opts: { computed?: boolean; static?: boolean } = {},
  ): t.AccessorProperty {
    return {
      type: "AccessorProperty",
      decorators: [],
      key,
      value,
      computed: opts.computed ?? isComputedKey(key),
      static: opts.static ?? false,
      ...span,
    };
  },
  tsAbstractMethodDefinition(
    key: t.PropertyKey,
    value: t.FunctionExpression | t.TSEmptyBodyFunctionExpression,
    opts: { kind?: t.MethodDefinitionKind; computed?: boolean; static?: boolean } = {},
  ): t.TSAbstractMethodDefinition {
    return {
      type: "TSAbstractMethodDefinition",
      decorators: [],
      key,
      value,
      kind: opts.kind ?? "method",
      computed: opts.computed ?? isComputedKey(key),
      static: opts.static ?? false,
      ...span,
    };
  },
  tsAbstractPropertyDefinition(
    key: t.PropertyKey,
    value: t.Expression | null = null,
    opts: { computed?: boolean; static?: boolean } = {},
  ): t.TSAbstractPropertyDefinition {
    return {
      type: "TSAbstractPropertyDefinition",
      decorators: [],
      key,
      value,
      computed: opts.computed ?? isComputedKey(key),
      static: opts.static ?? false,
      ...span,
    };
  },
  tsAbstractAccessorProperty(
    key: t.PropertyKey,
    value: t.Expression | null = null,
    opts: { computed?: boolean; static?: boolean } = {},
  ): t.TSAbstractAccessorProperty {
    return {
      type: "TSAbstractAccessorProperty",
      decorators: [],
      key,
      value,
      computed: opts.computed ?? isComputedKey(key),
      static: opts.static ?? false,
      ...span,
    };
  },
  staticBlock(body: t.Statement[] = []): t.StaticBlock {
    return { type: "StaticBlock", body, ...span };
  },
  decorator(expression: t.Expression): t.Decorator {
    return { type: "Decorator", expression, ...span };
  },

  // Statements
  expressionStatement(expression: t.Expression): t.ExpressionStatement {
    return { type: "ExpressionStatement", expression, ...span };
  },
  directive(value: string): t.Directive {
    return {
      type: "ExpressionStatement",
      expression: b.stringLiteral(value),
      directive: value,
      ...span,
    };
  },
  blockStatement(body: Array<t.Statement | t.Directive> = []): t.BlockStatement {
    return { type: "BlockStatement", body, ...span };
  },
  emptyStatement(): t.EmptyStatement {
    return { type: "EmptyStatement", ...span };
  },
  debuggerStatement(): t.DebuggerStatement {
    return { type: "DebuggerStatement", ...span };
  },
  returnStatement(argument: t.Expression | null = null): t.ReturnStatement {
    return { type: "ReturnStatement", argument, ...span };
  },
  ifStatement(
    test: t.Expression,
    consequent: t.Statement,
    alternate: t.Statement | null = null,
  ): t.IfStatement {
    return { type: "IfStatement", test, consequent, alternate, ...span };
  },
  switchStatement(discriminant: t.Expression, cases: t.SwitchCase[]): t.SwitchStatement {
    return { type: "SwitchStatement", discriminant, cases, ...span };
  },
  switchCase(test: t.Expression | null, consequent: t.Statement[]): t.SwitchCase {
    return { type: "SwitchCase", test, consequent, ...span };
  },
  throwStatement(argument: t.Expression): t.ThrowStatement {
    return { type: "ThrowStatement", argument, ...span };
  },
  tryStatement(
    block: t.BlockStatement,
    handler: t.CatchClause | null = null,
    finalizer: t.BlockStatement | null = null,
  ): t.TryStatement {
    return { type: "TryStatement", block, handler, finalizer, ...span };
  },
  catchClause(param: t.BindingPattern | null, body: t.BlockStatement): t.CatchClause {
    return { type: "CatchClause", param, body, ...span };
  },
  whileStatement(test: t.Expression, body: t.Statement): t.WhileStatement {
    return { type: "WhileStatement", test, body, ...span };
  },
  doWhileStatement(body: t.Statement, test: t.Expression): t.DoWhileStatement {
    return { type: "DoWhileStatement", body, test, ...span };
  },
  forStatement(
    init: t.ForStatementInit | null,
    test: t.Expression | null,
    update: t.Expression | null,
    body: t.Statement,
  ): t.ForStatement {
    return { type: "ForStatement", init, test, update, body, ...span };
  },
  forInStatement(
    left: t.ForStatementLeft,
    right: t.Expression,
    body: t.Statement,
  ): t.ForInStatement {
    return { type: "ForInStatement", left, right, body, ...span };
  },
  forOfStatement(
    left: t.ForStatementLeft,
    right: t.Expression,
    body: t.Statement,
    isAwait = false,
  ): t.ForOfStatement {
    return { type: "ForOfStatement", left, right, body, await: isAwait, ...span };
  },
  labeledStatement(label: t.LabelIdentifier, body: t.Statement): t.LabeledStatement {
    return { type: "LabeledStatement", label, body, ...span };
  },
  breakStatement(label: t.LabelIdentifier | null = null): t.BreakStatement {
    return { type: "BreakStatement", label, ...span };
  },
  continueStatement(label: t.LabelIdentifier | null = null): t.ContinueStatement {
    return { type: "ContinueStatement", label, ...span };
  },
  withStatement(object: t.Expression, body: t.Statement): t.WithStatement {
    return { type: "WithStatement", object, body, ...span };
  },

  // Variable declarations
  variableDeclaration(
    kind: t.VariableDeclarationKind,
    declarations: t.VariableDeclarator[],
  ): t.VariableDeclaration {
    return { type: "VariableDeclaration", kind, declarations, ...span };
  },
  variableDeclarator(id: t.BindingPattern, init: t.Expression | null = null): t.VariableDeclarator {
    return { type: "VariableDeclarator", id, init, ...span };
  },

  // Modules
  importDeclaration(
    specifiers: t.ImportDeclarationSpecifier[],
    source: t.StringLiteral,
    opts: {
      attributes?: t.ImportAttribute[];
      phase?: t.ImportPhase | null;
      importKind?: t.ImportOrExportKind;
    } = {},
  ): t.ImportDeclaration {
    return {
      type: "ImportDeclaration",
      specifiers,
      source,
      phase: opts.phase ?? null,
      attributes: opts.attributes ?? [],
      ...opts,
      ...span,
    };
  },
  importSpecifier(
    imported: t.IdentifierName | t.StringLiteral,
    local: t.BindingIdentifier,
  ): t.ImportSpecifier {
    return { type: "ImportSpecifier", imported, local, ...span };
  },
  importDefaultSpecifier(local: t.BindingIdentifier): t.ImportDefaultSpecifier {
    return { type: "ImportDefaultSpecifier", local, ...span };
  },
  importNamespaceSpecifier(local: t.BindingIdentifier): t.ImportNamespaceSpecifier {
    return { type: "ImportNamespaceSpecifier", local, ...span };
  },
  importAttribute(key: t.ImportAttributeKey, value: t.StringLiteral): t.ImportAttribute {
    return { type: "ImportAttribute", key, value, ...span };
  },
  exportNamedDeclaration(
    declaration: t.Declaration | null,
    specifiers: t.ExportSpecifier[] = [],
    opts: {
      source?: t.StringLiteral | null;
      attributes?: t.ImportAttribute[];
      exportKind?: t.ImportOrExportKind;
    } = {},
  ): t.ExportNamedDeclaration {
    return {
      type: "ExportNamedDeclaration",
      declaration,
      specifiers,
      source: opts.source ?? null,
      attributes: opts.attributes ?? [],
      ...opts,
      ...span,
    };
  },
  exportDefaultDeclaration(
    declaration: t.ExportDefaultDeclarationKind,
  ): t.ExportDefaultDeclaration {
    return { type: "ExportDefaultDeclaration", declaration, ...span };
  },
  exportAllDeclaration(
    source: t.StringLiteral,
    opts: {
      exported?: t.ModuleExportName | null;
      attributes?: t.ImportAttribute[];
      exportKind?: t.ImportOrExportKind;
    } = {},
  ): t.ExportAllDeclaration {
    return {
      type: "ExportAllDeclaration",
      exported: opts.exported ?? null,
      source,
      attributes: opts.attributes ?? [],
      ...opts,
      ...span,
    };
  },
  exportSpecifier(local: t.ModuleExportName, exported: t.ModuleExportName): t.ExportSpecifier {
    return { type: "ExportSpecifier", local, exported, ...span };
  },

  // JSX
  jsxIdentifier(name: string): t.JSXIdentifier {
    return { type: "JSXIdentifier", name, ...span };
  },
  jsxNamespacedName(namespace: t.JSXIdentifier, name: t.JSXIdentifier): t.JSXNamespacedName {
    return { type: "JSXNamespacedName", namespace, name, ...span };
  },
  jsxMemberExpression(
    object: t.JSXMemberExpressionObject,
    property: t.JSXIdentifier,
  ): t.JSXMemberExpression {
    return { type: "JSXMemberExpression", object, property, ...span };
  },
  jsxElement(
    openingElement: t.JSXOpeningElement,
    children: t.JSXChild[] = [],
    closingElement: t.JSXClosingElement | null = null,
  ): t.JSXElement {
    return { type: "JSXElement", openingElement, children, closingElement, ...span };
  },
  jsxOpeningElement(
    name: t.JSXElementName,
    attributes: t.JSXAttributeItem[] = [],
    selfClosing = false,
  ): t.JSXOpeningElement {
    return { type: "JSXOpeningElement", name, attributes, selfClosing, ...span };
  },
  jsxClosingElement(name: t.JSXElementName): t.JSXClosingElement {
    return { type: "JSXClosingElement", name, ...span };
  },
  jsxOpeningFragment(): t.JSXOpeningFragment {
    return { type: "JSXOpeningFragment", ...span };
  },
  jsxClosingFragment(): t.JSXClosingFragment {
    return { type: "JSXClosingFragment", ...span };
  },
  jsxFragment(children: t.JSXChild[] = []): t.JSXFragment {
    return {
      type: "JSXFragment",
      openingFragment: b.jsxOpeningFragment(),
      children,
      closingFragment: b.jsxClosingFragment(),
      ...span,
    };
  },
  jsxAttribute(name: t.JSXAttributeName, value: t.JSXAttributeValue | null = null): t.JSXAttribute {
    return { type: "JSXAttribute", name, value, ...span };
  },
  jsxSpreadAttribute(argument: t.Expression): t.JSXSpreadAttribute {
    return { type: "JSXSpreadAttribute", argument, ...span };
  },
  jsxExpressionContainer(expression: t.JSXExpression): t.JSXExpressionContainer {
    return { type: "JSXExpressionContainer", expression, ...span };
  },
  jsxEmptyExpression(): t.JSXEmptyExpression {
    return { type: "JSXEmptyExpression", ...span };
  },
  jsxText(value: string): t.JSXText {
    return { type: "JSXText", value, raw: value, ...span };
  },
  jsxSpreadChild(expression: t.Expression): t.JSXSpreadChild {
    return { type: "JSXSpreadChild", expression, ...span };
  },

  // TypeScript: type annotation and keywords
  tsTypeAnnotation(typeAnnotation: t.TSType): t.TSTypeAnnotation {
    return { type: "TSTypeAnnotation", typeAnnotation, ...span };
  },
  tsAnyKeyword: (): t.TSAnyKeyword => ({ type: "TSAnyKeyword", ...span }),
  tsUnknownKeyword: (): t.TSUnknownKeyword => ({ type: "TSUnknownKeyword", ...span }),
  tsNeverKeyword: (): t.TSNeverKeyword => ({ type: "TSNeverKeyword", ...span }),
  tsVoidKeyword: (): t.TSVoidKeyword => ({ type: "TSVoidKeyword", ...span }),
  tsNullKeyword: (): t.TSNullKeyword => ({ type: "TSNullKeyword", ...span }),
  tsUndefinedKeyword: (): t.TSUndefinedKeyword => ({ type: "TSUndefinedKeyword", ...span }),
  tsStringKeyword: (): t.TSStringKeyword => ({ type: "TSStringKeyword", ...span }),
  tsNumberKeyword: (): t.TSNumberKeyword => ({ type: "TSNumberKeyword", ...span }),
  tsBigIntKeyword: (): t.TSBigIntKeyword => ({ type: "TSBigIntKeyword", ...span }),
  tsBooleanKeyword: (): t.TSBooleanKeyword => ({ type: "TSBooleanKeyword", ...span }),
  tsSymbolKeyword: (): t.TSSymbolKeyword => ({ type: "TSSymbolKeyword", ...span }),
  tsObjectKeyword: (): t.TSObjectKeyword => ({ type: "TSObjectKeyword", ...span }),
  tsIntrinsicKeyword: (): t.TSIntrinsicKeyword => ({ type: "TSIntrinsicKeyword", ...span }),
  tsThisType: (): t.TSThisType => ({ type: "TSThisType", ...span }),

  // TypeScript: composite types
  tsTypeReference(
    typeName: t.TSTypeName,
    typeArguments: t.TSTypeParameterInstantiation | null = null,
  ): t.TSTypeReference {
    return { type: "TSTypeReference", typeName, typeArguments, ...span };
  },
  tsQualifiedName(left: t.TSTypeName, right: t.IdentifierName): t.TSQualifiedName {
    return { type: "TSQualifiedName", left, right, ...span };
  },
  tsTypeQuery(
    exprName: t.TSTypeQueryExprName,
    typeArguments: t.TSTypeParameterInstantiation | null = null,
  ): t.TSTypeQuery {
    return { type: "TSTypeQuery", exprName, typeArguments, ...span };
  },
  tsImportType(
    source: t.StringLiteral,
    opts: {
      options?: t.ObjectExpression | null;
      qualifier?: t.TSImportTypeQualifier | null;
      typeArguments?: t.TSTypeParameterInstantiation | null;
    } = {},
  ): t.TSImportType {
    return {
      type: "TSImportType",
      source,
      options: opts.options ?? null,
      qualifier: opts.qualifier ?? null,
      typeArguments: opts.typeArguments ?? null,
      ...span,
    };
  },
  tsTypeParameter(
    name: t.BindingIdentifier,
    opts: {
      constraint?: t.TSType | null;
      default?: t.TSType | null;
      in?: boolean;
      out?: boolean;
      const?: boolean;
    } = {},
  ): t.TSTypeParameter {
    return {
      type: "TSTypeParameter",
      name,
      constraint: opts.constraint ?? null,
      default: opts.default ?? null,
      in: opts.in ?? false,
      out: opts.out ?? false,
      const: opts.const ?? false,
      ...span,
    };
  },
  tsTypeParameterDeclaration(params: t.TSTypeParameter[]): t.TSTypeParameterDeclaration {
    return { type: "TSTypeParameterDeclaration", params, ...span };
  },
  tsTypeParameterInstantiation(params: t.TSType[]): t.TSTypeParameterInstantiation {
    return { type: "TSTypeParameterInstantiation", params, ...span };
  },
  tsLiteralType(literal: t.TSLiteralType["literal"]): t.TSLiteralType {
    return { type: "TSLiteralType", literal, ...span };
  },
  tsTemplateLiteralType(quasis: t.TemplateElement[], types: t.TSType[]): t.TSTemplateLiteralType {
    return { type: "TSTemplateLiteralType", quasis, types, ...span };
  },
  tsArrayType(elementType: t.TSType): t.TSArrayType {
    return { type: "TSArrayType", elementType, ...span };
  },
  tsIndexedAccessType(objectType: t.TSType, indexType: t.TSType): t.TSIndexedAccessType {
    return { type: "TSIndexedAccessType", objectType, indexType, ...span };
  },
  tsTupleType(elementTypes: t.TSTupleElement[]): t.TSTupleType {
    return { type: "TSTupleType", elementTypes, ...span };
  },
  tsNamedTupleMember(
    label: t.IdentifierName,
    elementType: t.TSType,
    optional = false,
  ): t.TSNamedTupleMember {
    return { type: "TSNamedTupleMember", label, elementType, optional, ...span };
  },
  tsOptionalType(typeAnnotation: t.TSType): t.TSOptionalType {
    return { type: "TSOptionalType", typeAnnotation, ...span };
  },
  tsRestType(typeAnnotation: t.TSType | t.TSNamedTupleMember): t.TSRestType {
    return { type: "TSRestType", typeAnnotation, ...span };
  },
  tsJSDocNullableType(typeAnnotation: t.TSType, postfix = false): t.TSJSDocNullableType {
    return { type: "TSJSDocNullableType", typeAnnotation, postfix, ...span };
  },
  tsJSDocNonNullableType(typeAnnotation: t.TSType, postfix = false): t.TSJSDocNonNullableType {
    return { type: "TSJSDocNonNullableType", typeAnnotation, postfix, ...span };
  },
  tsJSDocUnknownType(): t.TSJSDocUnknownType {
    return { type: "TSJSDocUnknownType", ...span };
  },
  tsUnionType(types: t.TSType[]): t.TSUnionType {
    return { type: "TSUnionType", types, ...span };
  },
  tsIntersectionType(types: t.TSType[]): t.TSIntersectionType {
    return { type: "TSIntersectionType", types, ...span };
  },
  tsConditionalType(
    checkType: t.TSType,
    extendsType: t.TSType,
    trueType: t.TSType,
    falseType: t.TSType,
  ): t.TSConditionalType {
    return { type: "TSConditionalType", checkType, extendsType, trueType, falseType, ...span };
  },
  tsInferType(typeParameter: t.TSTypeParameter): t.TSInferType {
    return { type: "TSInferType", typeParameter, ...span };
  },
  tsTypeOperator(
    operator: t.TSTypeOperator["operator"],
    typeAnnotation: t.TSType,
  ): t.TSTypeOperator {
    return { type: "TSTypeOperator", operator, typeAnnotation, ...span };
  },
  tsParenthesizedType(typeAnnotation: t.TSType): t.TSParenthesizedType {
    return { type: "TSParenthesizedType", typeAnnotation, ...span };
  },
  tsFunctionType(
    params: t.FunctionParameter[],
    returnType: t.TSTypeAnnotation | null,
    typeParameters: t.TSTypeParameterDeclaration | null = null,
  ): t.TSFunctionType {
    return { type: "TSFunctionType", typeParameters, params, returnType, ...span };
  },
  tsConstructorType(
    params: t.FunctionParameter[],
    returnType: t.TSTypeAnnotation | null,
    opts: { abstract?: boolean; typeParameters?: t.TSTypeParameterDeclaration | null } = {},
  ): t.TSConstructorType {
    return {
      type: "TSConstructorType",
      abstract: opts.abstract ?? false,
      typeParameters: opts.typeParameters ?? null,
      params,
      returnType,
      ...span,
    };
  },
  tsTypePredicate(
    parameterName: t.TSTypePredicateName,
    typeAnnotation: t.TSTypeAnnotation | null = null,
    asserts = false,
  ): t.TSTypePredicate {
    return { type: "TSTypePredicate", parameterName, typeAnnotation, asserts, ...span };
  },
  tsTypeLiteral(members: t.TSSignature[]): t.TSTypeLiteral {
    return { type: "TSTypeLiteral", members, ...span };
  },
  tsMappedType(
    key: t.BindingIdentifier,
    constraint: t.TSType,
    opts: {
      nameType?: t.TSType | null;
      typeAnnotation?: t.TSType | null;
      optional?: t.TSMappedTypeModifierOperator | false;
      readonly?: t.TSMappedTypeModifierOperator | null;
    } = {},
  ): t.TSMappedType {
    return {
      type: "TSMappedType",
      key,
      constraint,
      nameType: opts.nameType ?? null,
      typeAnnotation: opts.typeAnnotation ?? null,
      optional: opts.optional ?? false,
      readonly: opts.readonly ?? null,
      ...span,
    };
  },

  // TypeScript: signatures
  tsPropertySignature(
    key: t.PropertyKey,
    opts: {
      typeAnnotation?: t.TSTypeAnnotation | null;
      computed?: boolean;
      optional?: boolean;
      readonly?: boolean;
    } = {},
  ): t.TSPropertySignature {
    return {
      type: "TSPropertySignature",
      key,
      typeAnnotation: opts.typeAnnotation ?? null,
      computed: opts.computed ?? isComputedKey(key),
      optional: opts.optional ?? false,
      readonly: opts.readonly ?? false,
      accessibility: null,
      static: false,
      ...span,
    };
  },
  tsMethodSignature(
    key: t.PropertyKey,
    params: t.FunctionParameter[],
    opts: {
      kind?: t.TSMethodSignatureKind;
      computed?: boolean;
      optional?: boolean;
      typeParameters?: t.TSTypeParameterDeclaration | null;
      returnType?: t.TSTypeAnnotation | null;
    } = {},
  ): t.TSMethodSignature {
    return {
      type: "TSMethodSignature",
      key,
      computed: opts.computed ?? isComputedKey(key),
      optional: opts.optional ?? false,
      kind: opts.kind ?? "method",
      typeParameters: opts.typeParameters ?? null,
      params,
      returnType: opts.returnType ?? null,
      accessibility: null,
      readonly: false,
      static: false,
      ...span,
    };
  },
  tsCallSignatureDeclaration(
    params: t.FunctionParameter[],
    returnType: t.TSTypeAnnotation | null = null,
    typeParameters: t.TSTypeParameterDeclaration | null = null,
  ): t.TSCallSignatureDeclaration {
    return { type: "TSCallSignatureDeclaration", typeParameters, params, returnType, ...span };
  },
  tsConstructSignatureDeclaration(
    params: t.FunctionParameter[],
    returnType: t.TSTypeAnnotation | null = null,
    typeParameters: t.TSTypeParameterDeclaration | null = null,
  ): t.TSConstructSignatureDeclaration {
    return { type: "TSConstructSignatureDeclaration", typeParameters, params, returnType, ...span };
  },
  tsIndexSignature(
    parameters: t.BindingIdentifier[],
    typeAnnotation: t.TSTypeAnnotation,
    opts: { readonly?: boolean; static?: boolean } = {},
  ): t.TSIndexSignature {
    return {
      type: "TSIndexSignature",
      parameters,
      typeAnnotation,
      readonly: opts.readonly ?? false,
      static: opts.static ?? false,
      accessibility: null,
      ...span,
    };
  },

  // TypeScript: declarations
  tsTypeAliasDeclaration(
    id: t.BindingIdentifier,
    typeAnnotation: t.TSType,
    opts: { typeParameters?: t.TSTypeParameterDeclaration | null; declare?: boolean } = {},
  ): t.TSTypeAliasDeclaration {
    return {
      type: "TSTypeAliasDeclaration",
      id,
      typeParameters: opts.typeParameters ?? null,
      typeAnnotation,
      declare: opts.declare ?? false,
      ...span,
    };
  },
  tsInterfaceDeclaration(
    id: t.BindingIdentifier,
    body: t.TSInterfaceBody,
    opts: {
      extends?: t.TSInterfaceHeritage[];
      typeParameters?: t.TSTypeParameterDeclaration | null;
      declare?: boolean;
    } = {},
  ): t.TSInterfaceDeclaration {
    return {
      type: "TSInterfaceDeclaration",
      id,
      typeParameters: opts.typeParameters ?? null,
      extends: opts.extends ?? [],
      body,
      declare: opts.declare ?? false,
      ...span,
    };
  },
  tsInterfaceBody(body: t.TSSignature[]): t.TSInterfaceBody {
    return { type: "TSInterfaceBody", body, ...span };
  },
  tsInterfaceHeritage(
    expression: t.Expression,
    typeArguments: t.TSTypeParameterInstantiation | null = null,
  ): t.TSInterfaceHeritage {
    return { type: "TSInterfaceHeritage", expression, typeArguments, ...span };
  },
  tsClassImplements(
    expression: t.Expression,
    typeArguments: t.TSTypeParameterInstantiation | null = null,
  ): t.TSClassImplements {
    return { type: "TSClassImplements", expression, typeArguments, ...span };
  },
  tsEnumDeclaration(
    id: t.BindingIdentifier,
    body: t.TSEnumBody,
    opts: { const?: boolean; declare?: boolean } = {},
  ): t.TSEnumDeclaration {
    return {
      type: "TSEnumDeclaration",
      id,
      body,
      const: opts.const ?? false,
      declare: opts.declare ?? false,
      ...span,
    };
  },
  tsEnumBody(members: t.TSEnumMember[]): t.TSEnumBody {
    return { type: "TSEnumBody", members, ...span };
  },
  tsEnumMember(id: t.TSEnumMemberName, initializer: t.Expression | null = null): t.TSEnumMember {
    return { type: "TSEnumMember", id, initializer, computed: false, ...span };
  },
  tsModuleDeclaration(
    id: t.TSModuleDeclaration["id"],
    body: t.TSModuleBlock | undefined,
    opts: { kind?: t.TSModuleDeclarationKind; declare?: boolean; global?: boolean } = {},
  ): t.TSModuleDeclaration {
    return {
      type: "TSModuleDeclaration",
      id,
      body,
      kind: opts.kind ?? "module",
      declare: opts.declare ?? false,
      global: opts.global ?? false,
      ...span,
    };
  },
  tsModuleBlock(body: t.ProgramStatement[] = []): t.TSModuleBlock {
    return { type: "TSModuleBlock", body, ...span };
  },
  tsParameterProperty(
    parameter: t.BindingIdentifier | t.AssignmentPattern,
    opts: {
      accessibility?: t.TSAccessibility | null;
      readonly?: boolean;
      override?: boolean;
      decorators?: t.Decorator[];
    } = {},
  ): t.TSParameterProperty {
    return {
      type: "TSParameterProperty",
      decorators: opts.decorators ?? [],
      parameter,
      override: opts.override ?? false,
      readonly: opts.readonly ?? false,
      accessibility: opts.accessibility ?? null,
      static: false,
      ...span,
    };
  },

  // TypeScript: expressions and module statements
  tsAsExpression(expression: t.Expression, typeAnnotation: t.TSType): t.TSAsExpression {
    return { type: "TSAsExpression", expression, typeAnnotation, ...span };
  },
  tsSatisfiesExpression(
    expression: t.Expression,
    typeAnnotation: t.TSType,
  ): t.TSSatisfiesExpression {
    return { type: "TSSatisfiesExpression", expression, typeAnnotation, ...span };
  },
  tsTypeAssertion(typeAnnotation: t.TSType, expression: t.Expression): t.TSTypeAssertion {
    return { type: "TSTypeAssertion", typeAnnotation, expression, ...span };
  },
  tsNonNullExpression(expression: t.Expression): t.TSNonNullExpression {
    return { type: "TSNonNullExpression", expression, ...span };
  },
  tsInstantiationExpression(
    expression: t.Expression,
    typeArguments: t.TSTypeParameterInstantiation,
  ): t.TSInstantiationExpression {
    return { type: "TSInstantiationExpression", expression, typeArguments, ...span };
  },
  tsExportAssignment(expression: t.Expression): t.TSExportAssignment {
    return { type: "TSExportAssignment", expression, ...span };
  },
  tsNamespaceExportDeclaration(id: t.IdentifierName): t.TSNamespaceExportDeclaration {
    return { type: "TSNamespaceExportDeclaration", id, ...span };
  },
  tsImportEqualsDeclaration(
    id: t.BindingIdentifier,
    moduleReference: t.TSModuleReference,
    importKind: t.ImportOrExportKind = "value",
  ): t.TSImportEqualsDeclaration {
    return { type: "TSImportEqualsDeclaration", id, moduleReference, importKind, ...span };
  },
  tsExternalModuleReference(expression: t.StringLiteral): t.TSExternalModuleReference {
    return { type: "TSExternalModuleReference", expression, ...span };
  },
  tsDeclareFunction(
    id: t.BindingIdentifier | null,
    params: t.FunctionParameter[],
    opts: {
      async?: boolean;
      generator?: boolean;
      returnType?: t.TSTypeAnnotation | null;
      typeParameters?: t.TSTypeParameterDeclaration | null;
      declare?: boolean;
    } = {},
  ): t.TSDeclareFunction {
    return {
      type: "TSDeclareFunction",
      id,
      generator: opts.generator ?? false,
      async: opts.async ?? false,
      params,
      body: null,
      expression: false,
      declare: opts.declare ?? false,
      typeParameters: opts.typeParameters ?? null,
      returnType: opts.returnType ?? null,
      ...span,
    };
  },

  tsEmptyBodyFunctionExpression(
    params: t.FunctionParameter[],
    opts: {
      id?: t.BindingIdentifier | null;
      returnType?: t.TSTypeAnnotation | null;
      typeParameters?: t.TSTypeParameterDeclaration | null;
    } = {},
  ): t.TSEmptyBodyFunctionExpression {
    return {
      type: "TSEmptyBodyFunctionExpression",
      id: opts.id ?? null,
      generator: false,
      async: false,
      params,
      body: null,
      expression: false,
      declare: false,
      typeParameters: opts.typeParameters ?? null,
      returnType: opts.returnType ?? null,
      ...span,
    };
  },

  // Program
  hashbang(value: string): t.Hashbang {
    return { type: "Hashbang", value, ...span };
  },
  program(
    body: t.ProgramStatement[] = [],
    opts: { sourceType?: t.ModuleKind; hashbang?: t.Hashbang | null } = {},
  ): t.Program {
    return {
      type: "Program",
      sourceType: opts.sourceType ?? "module",
      hashbang: opts.hashbang ?? null,
      body,
      ...span,
    };
  },
};
