import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    walk: "src/walk/index.ts",
    identifier: "src/identifier/index.ts",
  },
  dts: true,
  exports: true,
});
