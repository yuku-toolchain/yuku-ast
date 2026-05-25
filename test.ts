import { parse } from "yuku-parser";
import { walk, is, b } from "./src/index";
import { print } from "yuku-codegen"

const result = parse(`[10]`, {
  lang: "ts"
});

walk(result.program, {
  Literal(node, path) {
    if (path.parent?.type == "ArrayExpression") {
      path.replace(b.objectExpression([b.property(b.identifier("hello"), b.bigintLiteral(100n))]));
    }
  }
})

console.log(print(result).code)
