#!/usr/bin/env node
// Design-token guard: colours come from packages/design-tokens only. Fails on raw hex colours, Tailwind palette
// colours (text-red-500), black/white utilities and arbitrary colour values in app and package sources.
// Escape hatch for the rare literal that is technically required (e.g. <meta theme-color>): add the comment
// `token-check-ignore: <reason>` on the same line.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "../..");
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "out", "design-tokens", ".claude"]);
const SKIP_FILE = /(\.test\.tsx?|\.generated\.\w+|database\.types\.ts)$/;
const EXT = /\.(tsx?|css)$/;

const PALETTE =
  "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone";
const UTIL = "bg|text|border|ring|outline|fill|stroke|from|via|to|divide|decoration|accent|caret|shadow|placeholder";
const RULES = [
  { name: "hex colour", re: /#[0-9a-fA-F]{3,8}\b/ },
  { name: "palette colour", re: new RegExp(`\\b(?:${UTIL})-(?:${PALETTE})-\\d{2,3}\\b`) },
  { name: "black/white utility", re: new RegExp(`\\b(?:${UTIL})-(?:white|black)\\b`) },
  { name: "arbitrary colour value", re: /\[(?:#|rgba?\(|hsla?\(|oklch\()/ },
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (EXT.test(entry) && !SKIP_FILE.test(entry)) yield path;
  }
}

const problems = [];
for (const base of ["apps", "packages"]) {
  for (const file of walk(join(root, base))) {
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, index) => {
        if (line.includes("token-check-ignore")) return;
        for (const { name, re } of RULES) {
          const match = re.exec(line);
          if (match) problems.push(`${relative(root, file)}:${index + 1}  ${name}: ${match[0]}`);
        }
      });
  }
}

if (problems.length > 0) {
  console.error(
    `Raw colours found (use design tokens, see packages/design-tokens/src/tokens.css):\n${problems.join("\n")}`,
  );
  process.exit(1);
}
console.log("check-tokens: no raw colours");
