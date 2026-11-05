#!/usr/bin/env node
// Client bundle guard for apps/web (docs/PERFORMANCE.md, section 5). Run after `pnpm --filter @storynest/web build`.
//   1. Budget: first-load JS per route (Next's own `firstLoadUncompressedJsBytes` from route-bundle-stats.json) must not
//      exceed the limit in scripts/bundle-budget.json.
//   2. Placement: packages listed as route-scoped (the editor: Tiptap/ProseMirror) may only be in the client code of
//      the routes allowed for them. Checked per module with `next experimental-analyze`, because the chunks themselves
//      carry no module names.
// `--report` prints the numbers and never fails (use it to record a baseline).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "../..");
const webDir = join(root, "apps/web");
const statsFile = join(webDir, ".next/diagnostics/route-bundle-stats.json");
const budget = JSON.parse(readFileSync(join(root, "scripts/bundle-budget.json"), "utf8"));
const reportOnly = process.argv.includes("--report");

if (!existsSync(statsFile)) {
  console.error("check-bundle: no production build found. Run `pnpm --filter @storynest/web build` first.");
  process.exit(1);
}

const kb = (bytes) => Math.round(bytes / 1024);
const routeMatches = (route, patterns) => patterns.some((pattern) => new RegExp(pattern).test(route));
const ignored = (route) => routeMatches(route, budget.ignoreRoutes);

// 1. Budget, from the build itself.
const stats = JSON.parse(readFileSync(statsFile, "utf8")).filter((entry) => !ignored(entry.route));
const failures = [];
for (const { route, firstLoadUncompressedJsBytes: bytes } of stats) {
  const limitKb = budget.firstLoadKb.routes[route] ?? budget.firstLoadKb.default;
  if (kb(bytes) > limitKb) failures.push(`${route}: first-load JS ${kb(bytes)} KB > budget ${limitKb} KB`);
}

// 2. Placement, from the analyzer's module graph.
console.log("check-bundle: analysing the client module graph (next experimental-analyze)...");
const run = (args) =>
  execFileSync("pnpm", ["exec", "next", "experimental-analyze", ...args], {
    cwd: webDir,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 1024,
    stdio: ["ignore", "pipe", "inherit"],
  });
run(["--output"]);
const scopedHits = new Map(); // route -> Set of scoped package names found in its client code
for (const line of run(["export"]).split("\n")) {
  if (!line.startsWith('{"type":"part"')) continue;
  const part = JSON.parse(line);
  if (!part.filename.includes("_next/static/chunks/") || ignored(part.route)) continue;
  for (const scoped of budget.routeScopedPackages) {
    if (!part.source_path.includes(`/node_modules/${scoped.package}`)) continue;
    if (routeMatches(part.route, scoped.allowedRoutes)) continue;
    if (!scopedHits.has(part.route)) scopedHits.set(part.route, new Set());
    scopedHits.get(part.route).add(scoped.package);
  }
}
for (const [route, packages] of scopedHits) {
  failures.push(`${route}: loads ${[...packages].join(", ")}, which is only allowed on its own routes`);
}

// Report.
const width = Math.max(...stats.map((entry) => entry.route.length));
console.log(`\n${"route".padEnd(width)}  first-load KB  budget KB`);
for (const { route, firstLoadUncompressedJsBytes: bytes } of [...stats].sort((a, b) =>
  a.route.localeCompare(b.route),
)) {
  const limitKb = budget.firstLoadKb.routes[route] ?? budget.firstLoadKb.default;
  console.log(`${route.padEnd(width)}  ${String(kb(bytes)).padStart(13)}  ${String(limitKb).padStart(9)}`);
}
if (failures.length === 0) {
  console.log("\ncheck-bundle: within budget, route-scoped packages stay on their routes");
  process.exit(0);
}
console.log(`\ncheck-bundle: ${failures.length} problem(s)`);
for (const failure of failures) console.log(`  - ${failure}`);
process.exit(reportOnly ? 0 : 1);
