import { defineConfig } from "vitest/config";

// Logic tests run in Node; a test that needs a DOM declares `// @vitest-environment jsdom` at the top of the file.
export default defineConfig({ test: { environment: "node" } });
