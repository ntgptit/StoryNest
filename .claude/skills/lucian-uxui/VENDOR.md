# Vendored: lucian-uxui agent skill

| Field | Value |
| --- | --- |
| Upstream | https://github.com/Seokwoooo/lucian-uxui (`skills/lucian-uxui`) |
| Commit | `0067ad85bfcf62a572071fdbe82a4e02f0d2098f` (2026-10-16) |
| Skill version | 1.2.0 |
| License | MIT, see `LICENSE` (copied from the upstream repo root) |
| Status | Trial (2026-11-05). Remove the whole `.claude/skills/lucian-uxui/` folder to roll back. |

## Local modifications

- `SKILL.md`: added the section "StoryNest project rules" at the top. Everything else is upstream, unchanged.
- `LICENSE`, `VENDOR.md`: added.

## What the CLI does

`scripts/lucian-uxui.mjs` has no dependencies. It downloads static files from
`https://lucianlabs.dev/uxui-prompt/api/v1/` (fallback `raw.githubusercontent.com/Seokwoooo/lucian-uxui-prompt`),
caches them in `~/.cache/lucian-uxui` and prints them. It sends no project data. Review the diff of `scripts/` when
updating.

## Updating

Copy `skills/lucian-uxui/` from a newer upstream commit over this folder, re-apply the StoryNest section in
`SKILL.md`, and update the commit above.
