import { parse } from "yuku-parser";
import { walk, is, b } from "./src/index";

const result = parse(`[10]`, {
  lang: "ts"
});

walk(result.program, {
  Literal(_, path) {
    if (is.ArrayExpression(path.parent) && is.NumericLiteral(path.node)) {
      path.replace(b.booleanLiteral(true));
    }
  }
})

console.log()
