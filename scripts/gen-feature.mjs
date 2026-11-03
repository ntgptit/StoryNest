#!/usr/bin/env node
// Usage: pnpm gen:feature <kebab-case-name>
// Creates packages/features/src/<name>/ with the standard layout from docs/WBS.md (section 1.2) and registers it
// in packages/features/src/index.ts. Refuses to overwrite an existing feature.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const name = process.argv[2];
if (!name || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)) {
  console.error("Usage: pnpm gen:feature <kebab-case-name>   e.g. pnpm gen:feature reading-lists");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "packages/features/src");
const dir = join(srcDir, name);
if (existsSync(dir) || name.startsWith("_")) {
  console.error(`Feature "${name}" already exists or the name is reserved.`);
  process.exit(1);
}

const camel = name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const pascal = camel[0].toUpperCase() + camel.slice(1);

const files = {
  "index.ts": `// Public API of the "${name}" feature. Only export what other features or the apps need.
export { ${camel}Keys } from "./keys.ts";
`,
  "keys.ts": `// TanStack Query keys. Always build keys here so invalidation stays consistent.
export const ${camel}Keys = {
  all: ["${name}"] as const,
};
`,
  "api/index.ts": `// Data access: pure functions with the signature (client: DataClient, args) => Promise<...>.
// No React, no Next. Business rules live here or in model/, never in components.
export {};
`,
  "hooks/index.ts": `// useXxx hooks wrapping TanStack Query around ../api (queries and mutations, optimistic updates).
export {};
`,
  "screens/index.ts": `// ${pascal}Screen components: router-agnostic (props in, PlatformProvider for navigation).
export {};
`,
  "components/index.ts": `// Components used only by this feature. Reusable presentation belongs in @storynest/ui.
export {};
`,
  "model/index.ts": `// Domain mapping and helpers (row -> view model, derived state, local Zod schemas).
export {};
`,
  [`${name}.test.ts`]: `import { describe, expect, it } from "vitest";

import { ${camel}Keys } from "./keys.ts";

describe("${name} query keys", () => {
  it("are rooted at the feature name", () => {
    expect(${camel}Keys.all).toEqual(["${name}"]);
  });
});
`,
};

for (const [path, content] of Object.entries(files)) {
  const target = join(dir, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

const indexPath = join(srcDir, "index.ts");
const exportLine = `export * from "./${name}/index.ts";\n`;
const current = readFileSync(indexPath, "utf8");
if (!current.includes(exportLine)) writeFileSync(indexPath, current.replace(/\n*$/, "\n") + exportLine);

console.log(`Created packages/features/src/${name}/ (run pnpm format to normalise).`);
