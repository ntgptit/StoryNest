import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { findBlockedGrep } from "./prefer-ripgrep.mjs";

test("blocks grep at a command position", () => {
  for (const command of [
    'grep -rn "x" .',
    "cat f | grep x",
    "cd a && grep -r x",
    "ls; egrep a b",
    "FOO=1 grep x f",
    "sudo grep x f",
    "xargs grep x",
    "/usr/bin/grep x",
    "echo $(grep x f)",
    "rg a | fgrep b",
  ]) {
    assert.ok(findBlockedGrep(command), command);
  }
});

test("allows ripgrep and other mentions of the word", () => {
  for (const command of [
    'rg -n "x"',
    "git grep x HEAD",
    'git log --grep="x"',
    'echo "do not use grep"',
    "ls grep-notes.txt",
    "cat f | rg x",
    "ALLOW_GREP=1 grep x f",
    "pnpm test",
  ]) {
    assert.equal(findBlockedGrep(command), null, command);
  }
});

test("hook process: exit 2 with a message for grep, 0 otherwise", () => {
  const run = (command) =>
    spawnSync("node", [new URL("./prefer-ripgrep.mjs", import.meta.url).pathname], {
      input: JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
      encoding: "utf8",
    });
  const blocked = run('grep -rn "x" .');
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /ripgrep \(rg\)/);
  assert.equal(run('rg -n "x"').status, 0);
  assert.equal(
    spawnSync("node", [new URL("./prefer-ripgrep.mjs", import.meta.url).pathname], {
      input: "not json",
      encoding: "utf8",
    }).status,
    0,
  );
});
