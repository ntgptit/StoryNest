#!/usr/bin/env node
// Checks the `path:line` citations in the functional spec against code that changed after the spec was written.
//
//   node docs/functional-spec/verification/check-citations.mjs [--base <commit>] [--head <ref>] [--docs-rev <ref>] [--written-with-head <range>] [--fix]
//   (run --fix on committed documents only: it is idempotent after a commit because rewritten lines are no longer "old")
//
// For every citation written at or before --base (found with git blame, so citations added later are ignored) it
// looks at the diff of the cited file between --base and --head:
//   - lines before every change     -> still right
//   - lines after a change          -> "shifted": same text, new line number (rewritten with --fix)
//   - lines inside a changed range  -> "changed": the code was edited, a person must re-read the citation
//   - file deleted or renamed       -> "missing"
// Citations whose path matches several files are reported as "ambiguous" and skipped.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const BASE = flag("--base", "d4368d1");
const HEAD = flag("--head", "origin/main");
const FIX = args.includes("--fix");
// Revision of the documents (blame is taken here); the code is compared between --base and --head.
const DOCS_REV = flag("--docs-rev", "HEAD");

const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 28 });
const root = git("rev-parse", "--show-toplevel").trim();
process.chdir(root);

const tracked = git("ls-tree", "-r", "--name-only", HEAD).split("\n").filter(Boolean);
const baseTracked = new Set(git("ls-tree", "-r", "--name-only", BASE).split("\n").filter(Boolean));
// Citations written by a commit in this range already describe the --head code (for example documents merged from main
// together with that code); everything else in --docs-rev is checked.
const SKIP_RANGE = flag("--written-with-head", "");
const writtenWithHead = new Set(SKIP_RANGE ? git("rev-list", SKIP_RANGE).split("\n").filter(Boolean) : []);
const ancestors = SKIP_RANGE
  ? new Set(git("rev-list", DOCS_REV).split("\n").filter((c) => c && !writtenWithHead.has(c)))
  : new Set(git("rev-list", BASE).split("\n").filter(Boolean));
const status = new Map(); // file -> "M" | "D" | "R"
for (const line of git("diff", "--name-status", "-M", BASE, HEAD).split("\n").filter(Boolean)) {
  const [s, from] = line.split("\t");
  status.set(from, s[0]);
}

const hunkCache = new Map();
function hunks(file) {
  if (hunkCache.has(file)) return hunkCache.get(file);
  const out = git("diff", "-U0", BASE, HEAD, "--", file);
  const list = [];
  for (const m of out.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)) {
    list.push({ oldStart: +m[1], oldLen: m[2] === undefined ? 1 : +m[2], newStart: +m[3], newLen: m[4] === undefined ? 1 : +m[4] });
  }
  hunkCache.set(file, list);
  return list;
}

/** Where the old range [a, b] is now: { state: "same"|"shifted"|"changed", from, to }. Any change inside the range = "changed". */
function locateRange(file, a, b) {
  let delta = 0;
  for (const h of hunks(file)) {
    const oldEnd = h.oldStart + Math.max(h.oldLen, 1) - 1;
    if (h.oldLen === 0) {
      // pure insertion after line h.oldStart
      if (h.oldStart >= a && h.oldStart < b) return { state: "changed", from: a, to: b };
      if (h.oldStart < a) delta += h.newLen;
      continue;
    }
    if (h.oldStart <= b && oldEnd >= a) return { state: "changed", from: a, to: b };
    if (oldEnd < a) delta += h.newLen - h.oldLen;
  }
  return { state: delta === 0 ? "same" : "shifted", from: a + delta, to: b + delta };
}

/** Tries to find the old text of lines a..b of `file` verbatim (one place only) in the new file. */
function findMoved(file, a, b) {
  let oldText;
  let newText;
  try {
    oldText = git("show", `${BASE}:${file}`).split("\n");
    newText = git("show", `${HEAD}:${file}`).split("\n");
  } catch {
    return null;
  }
  const block = oldText.slice(a - 1, b);
  if (block.length === 0 || block.every((l) => l.trim() === "")) return null;
  const hits = [];
  for (let i = 0; i + block.length <= newText.length; i += 1) {
    if (block.every((l, k) => newText[i + k] === l)) hits.push(i + 1);
  }
  return hits.length === 1 ? { from: hits[0], to: hits[0] + block.length - 1 } : null;
}

const CITE = /([A-Za-z0-9_./[\]()@…-]+\.(?:tsx?|mjs|css|sql|json|sh)):(\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*)/g;

function resolve(cited) {
  const clean = cited.replace(/^…\//, "").replace(/^\.\//, "");
  const hits = tracked.filter((f) => f === clean || f.endsWith(`/${clean}`));
  const baseHits = [...baseTracked].filter((f) => f === clean || f.endsWith(`/${clean}`));
  if (hits.length === 1) return { file: hits[0] };
  if (hits.length === 0 && baseHits.length === 1) return { file: baseHits[0], gone: true };
  return { ambiguous: hits.length + baseHits.length > 1 };
}

const docs = git("ls-tree", "-r", "--name-only", HEAD)
  .split("\n")
  .filter((f) => f.startsWith("docs/functional-spec/") && f.endsWith(".md"));

const results = { total: 0, same: 0, shifted: [], changed: [], missing: [], ambiguous: 0, unresolved: 0, skippedNew: 0 };

for (const doc of docs) {
  const lines = fs.readFileSync(doc, "utf8").split("\n");
  // blame: which commit wrote each line
  const authorOf = new Array(lines.length + 1).fill("");
  const blame = git("blame", "--line-porcelain", "-w", DOCS_REV, "--", doc);
  for (const l of blame.split("\n")) {
    const m = l.match(/^([0-9a-f]{40}) \d+ (\d+)/);
    if (m) {
      authorOf[+m[2]] = m[1];
    }
  }
  let rewritten = false;
  lines.forEach((text, i) => {
    if (!text.includes(":")) return;
    const wrote = authorOf[i + 1];
    const out = text.replace(CITE, (whole, file, spec) => {
      if (!ancestors.has(wrote)) {
        results.skippedNew += 1;
        return whole;
      }
      const r = resolve(file);
      if (!r.file) {
        if (r.ambiguous) results.ambiguous += 1;
        else results.unresolved += 1;
        return whole;
      }
      results.total += 1;
      if (r.gone || status.get(r.file) === "D" || status.get(r.file) === "R") {
        results.missing.push({ doc, line: i + 1, cite: whole });
        return whole;
      }
      if (!status.has(r.file)) {
        results.same += 1;
        return whole;
      }
      let worst = "same";
      let relocated = false;
      const mapped = spec.split(/,\s*/).map((part) => {
        const [x, y] = part.split("-").map(Number);
        const hi = y === undefined ? x : y;
        const loc = locateRange(r.file, x, hi);
        let { from, to } = loc;
        let state = loc.state;
        if (state === "changed") {
          const moved = findMoved(r.file, x, hi);
          if (moved) {
            from = moved.from;
            to = moved.to;
            state = from === x ? "same" : "shifted";
            relocated = true;
          }
        }
        if (state === "changed") worst = "changed";
        else if (state === "shifted" && worst !== "changed") worst = "shifted";
        return y === undefined ? `${from}` : `${from}-${to}`;
      });
      const rewrite = `${file}:${mapped.join(",")}`;
      if (worst === "same") results.same += 1;
      else if (worst === "shifted") {
        results.shifted.push({ doc, line: i + 1, cite: whole, to: rewrite, relocated });
        if (FIX) {
          rewritten = true;
          return rewrite;
        }
      } else results.changed.push({ doc, line: i + 1, cite: whole });
      return whole;
    });
    lines[i] = out;
  });
  if (FIX && rewritten) fs.writeFileSync(doc, lines.join("\n"));
}

const fmt = (list, n) => list.slice(0, n).map((x) => `  ${x.doc}:${x.line}  ${x.cite}${x.to ? `  ->  ${x.to}` : ""}`).join("\n");
console.log(`citations checked: ${results.total} (skipped: ${results.skippedNew} written after ${BASE}, ${results.ambiguous} ambiguous path, ${results.unresolved} unresolved)`);
console.log(`  unchanged: ${results.same}\n  shifted only: ${results.shifted.length}${FIX ? " (rewritten)" : ""}\n  code changed: ${results.changed.length}\n  file removed/renamed: ${results.missing.length}`);
if (results.changed.length) console.log(`\ncode changed (re-read by a person):\n${fmt(results.changed, 400)}`);
if (results.missing.length) console.log(`\nmissing:\n${fmt(results.missing, 100)}`);
if (results.shifted.length && !FIX) console.log(`\nshifted (run with --fix to rewrite):\n${fmt(results.shifted, 20)}${results.shifted.length > 20 ? "\n  ..." : ""}`);
fs.writeFileSync(path.join(process.env.QA_OUT_DIR || process.env.TMPDIR || "/tmp", "citation-check.json"), JSON.stringify(results, null, 1));
