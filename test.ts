import { parse } from "yuku-parser";
import { walk } from "./src/index";

const { program } = parse(`[10]`, {
  lang: "ts"
});

walk(program, {
  Literal(node, path) {
    if (path.parent?.type == "ArrayExpression") {
      path.insertBefore(node)
    }
  }
})

console.log(JSON.stringify(program, null, 2))
