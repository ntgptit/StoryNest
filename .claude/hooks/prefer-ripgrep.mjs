#!/usr/bin/env node
// PreToolUse hook (matcher: Bash). Blocks shell commands that run `grep`/`egrep`/`fgrep`/`zgrep`; the repository
// rule (AGENTS.md) is to search with ripgrep (`rg`). Reads the hook JSON on stdin; exit code 2 blocks the call and
// sends the message on stderr back to the agent. Anything unexpected lets the command through (never breaks a session).

const BLOCKED = new Set(["grep", "egrep", "fgrep", "zgrep", "zegrep", "zfgrep"]);
const WRAPPERS = new Set(["sudo", "xargs", "time", "command", "nohup", "env", "exec", "nice", "builtin"]);
const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

/** Splits a shell command into simple-command segments (separators: ; & | newline ( ) ` and $( )). */
function segments(command) {
  return command.split(/;|&|\||\n|\(|\)|`/);
}

/** The program a segment runs, and whether ALLOW_GREP=1 is set for it. */
function programOf(segment) {
  const words = segment.trim().split(/\s+/).filter(Boolean);
  let allow = false;
  for (const word of words) {
    if (ENV_ASSIGNMENT.test(word)) {
      if (word === "ALLOW_GREP=1") allow = true;
      continue;
    }
    if (WRAPPERS.has(word) || word.startsWith("-")) continue;
    return { program: word.replace(/^.*\//, ""), allow };
  }
  return { program: "", allow };
}

/** The blocked program found at a command position in `command`, or null. */
export function findBlockedGrep(command) {
  if (typeof command !== "string") return null;
  for (const segment of segments(command)) {
    const { program, allow } = programOf(segment);
    if (BLOCKED.has(program) && !allow) return program;
  }
  return null;
}

export const MESSAGE = (program) =>
  `Blocked: use ripgrep (rg) instead of ${program}. See AGENTS.md "Searching the code". ` +
  `Examples: rg -n "text" ; rg -l "text" dir ; rg -g '*.ts' "text" ; cmd | rg "text". ` +
  `(git grep is allowed. If rg really cannot be used, prefix the command with ALLOW_GREP=1 and explain why.)`;

async function main() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  let command;
  try {
    command = JSON.parse(raw)?.tool_input?.command;
  } catch {
    return; // not hook JSON: do not interfere
  }
  const blocked = findBlockedGrep(command);
  if (blocked) {
    process.stderr.write(`${MESSAGE(blocked)}\n`);
    process.exit(2);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
