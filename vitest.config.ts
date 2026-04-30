import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/__tests__/**",
        "src/__mocks__/**",
        "src/types/**",
        "src/translations/locale/**",
      ],
    },
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, "./src"),
      // Redirect Obsidian and CodeMirror to stub implementations so tests
      // don't need a running Obsidian environment.
      obsidian: path.resolve(__dirname, "./src/__mocks__/obsidian.ts"),
      "@codemirror/language": path.resolve(
        __dirname,
        "./src/__mocks__/@codemirror/language.ts"
      ),
    },
  },
});
