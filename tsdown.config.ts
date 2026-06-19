import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    identifier: "src/identifier.ts",
    utils: "src/utils.ts",
  },
  dts: true,
  exports: true,
});
