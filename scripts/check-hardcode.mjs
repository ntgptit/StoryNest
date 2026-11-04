#!/usr/bin/env node
// Hardcode guard. Fails on, outside of tests:
//   1. user-facing Vietnamese text in code: it belongs in a `strings.ts` module (the single place WBS WP 0.4 will
//      replace with the i18n catalogue). Comments are ignored; `strings.ts` files (and their `strings.en.ts` translations) are the allowed home.
//   2. string literals as query filter values, e.g. .eq("status", "published"): use the enum constants from
//      @storynest/validation (STORY_STATUS, CHAPTER_STATUS, VISIBILITY, ...), which a test keeps equal to the schema.
//   3. literal text in accessibility/label attributes (aria-label="Đóng", placeholder="..."): use a strings entry.
// Escape hatch for the rare legitimate literal (e.g. a diacritics map): add `hardcode-check-ignore: <reason>` on the
// same line.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "../..");
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "out"]);
const SKIP_FILE = /(\.test\.tsx?|strings(\.en)?\.ts|\.generated\.\w+|database\.types\.ts)$/;
// The component gallery is a developer-only page (404 in production) with throwaway demo text.
const SKIP_PATH = /apps\/web\/src\/app\/dev\//;
const EXT = /\.tsx?$/;

const VIETNAMESE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const RULES = [
  { name: "Vietnamese text in code (move it to strings.ts)", re: VIETNAMESE },
  {
    name: "string literal as query filter value (use an enum constant)",
    re: /\.(?:eq|neq|gt|gte|lt|lte)\(\s*["'][\w.]+["']\s*,\s*["'][^"']*["']|\.in\(\s*["'][\w.]+["']\s*,\s*\[\s*["']/,
  },
  {
    name: "literal label attribute (use a strings entry)",
    re: /\b(?:aria-label|placeholder|alt|title)="[^"{]*[A-Za-zÀ-ỹ]/,
  },
];

/** The code part of a line: comments removed (naive, but enough for this guard: no `//` inside our strings). */
function codeOf(line, state) {
  let text = line;
  if (state.inBlock) {
    const end = text.indexOf("*/");
    if (end === -1) return "";
    state.inBlock = false;
    text = text.slice(end + 2);
  }
  for (;;) {
    const start = text.indexOf("/*");
    if (start === -1) break;
    const end = text.indexOf("*/", start + 2);
    if (end === -1) {
      state.inBlock = true;
      text = text.slice(0, start);
      break;
    }
    text = text.slice(0, start) + text.slice(end + 2);
  }
  const lineComment = text.search(/(^|[^:"'`\\])\/\//);
  return lineComment === -1 ? text : text.slice(0, lineComment + (text[lineComment] === "/" ? 0 : 1));
}

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
    const rel = relative(root, file);
    if (SKIP_PATH.test(rel)) continue;
    const state = { inBlock: false };
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, index) => {
        const code = codeOf(line, state);
        if (code.trim() === "" || line.includes("hardcode-check-ignore")) return;
        for (const { name, re } of RULES) {
          const match = re.exec(code);
          if (match) problems.push(`${rel}:${index + 1}  ${name}: ${match[0].trim()}`);
        }
      });
  }
}

if (problems.length > 0) {
  console.error(`Hardcoded values found:\n${problems.join("\n")}`);
  process.exit(1);
}
console.log("check-hardcode: no hardcoded text or enum literals");
