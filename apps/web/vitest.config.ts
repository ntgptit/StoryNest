import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Logic tests run in Node; a test that needs a DOM declares `// @vitest-environment jsdom` at the top of the file.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node" },
});
