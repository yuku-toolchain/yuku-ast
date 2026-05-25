import { parse } from "yuku-parser";
import { walk } from "./src/index";

const { program } = parse(`const nice = function foo() {  }`, {
  lang: "ts"
});
