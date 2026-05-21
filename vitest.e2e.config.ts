import { configDotenv } from "dotenv";
import { expand } from "dotenv-expand";
import swc from "unplugin-swc";
import tsConfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.e2e-spec.ts"],
    globals: true,
    root: "./",
    // setupFiles: ["./test/test-e2e.ts"],
    testTimeout: 40000,
  },
  plugins: [
    tsConfigPaths(),
    swc.vite({
      module: { type: "es6" },
      jsc: {
        parser: { syntax: "typescript", decorators: true },
        transform: { decoratorMetadata: true, legacyDecorator: true },
      },
    }),
  ],
});
