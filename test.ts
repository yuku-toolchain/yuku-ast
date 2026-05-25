import { parse } from "yuku-parser";
import { walk, is, b } from "./src/index";

const result = parse(`[10]`, {
  lang: "ts"
});

walk(result.program, {
  Literal(_, path) {
    if (is.ArrayExpression(path.parent)) {
      path.replace(b.booleanLiteral(true));
    }
  }
})
