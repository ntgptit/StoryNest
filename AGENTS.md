# Agent guide

Rules for AI agents (and humans) working in this repository. Project background is in [README.md](README.md), planning
in [docs/WBS.md](docs/WBS.md) (the only planning authority) and the living specification in
[docs/functional-spec/](docs/functional-spec/README.md). `apps/web/AGENTS.md` adds Next.js notes for the web app.

## Searching the code: use ripgrep (`rg`), not `grep`

- Search with `rg` (or the editor/agent's built-in search tool, which is ripgrep). Do not use `grep`, `egrep`,
  `fgrep` or `zgrep` in shell commands.
- Why: `rg` respects `.gitignore` (it skips `node_modules`, `.next`, build output), is much faster in this monorepo,
  searches recursively by default and has consistent flags across machines.
- Common equivalents:

  | Instead of | Use |
  | --- | --- |
  | `grep -rn "text" .` | `rg -n "text"` |
  | `grep -rl "text" dir` | `rg -l "text" dir` |
  | `grep -rE "a\|b" .` | `rg "a\|b"` (regex is the default) |
  | `grep -rF "a.b" .` | `rg -F "a.b"` |
  | `grep -ri "text" .` | `rg -i "text"` |
  | `grep -rc "text" .` | `rg -c "text"` |
  | `grep --include='*.ts' -r x` | `rg -g '*.ts' x` |
  | `grep -v` | `rg -v` |
  | `cmd \| grep x` | `cmd \| rg x` |
  | search ignored files too | `rg -uu x` |

- `git grep` is a different tool and is allowed when you need to search a specific revision.
- **Enforced by a hook:** [.claude/settings.json](.claude/settings.json) runs
  [.claude/hooks/prefer-ripgrep.mjs](.claude/hooks/prefer-ripgrep.mjs) before every shell command in Claude Code and
  blocks commands that start a `grep`. The script has a test: `node --test .claude/hooks/prefer-ripgrep.test.mjs`.
  Other agents cannot be blocked this way, so the rule above applies to them as written.
- Rare exception (for example a machine without `rg`): prefix the command with `ALLOW_GREP=1`, and say why in the
  commit or PR text.
