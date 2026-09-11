---
name: onboarding-visualizer
description: >-
  Onboard a prospect catalog into this visualizer: inventory prospect/, design
  SQLite, convert, propose a Bluestone PIM tree, collect MAPI keys, then browse
  and sync. Use when the user drops files in prospect/, asks to set up the local
  DB, map into PIM, store API keys, or sync into Bluestone TEST.
---

# Onboarding visualizer

This repo is an **empty kit**. There is no catalog until you build one from `prospect/`.

Always also load **Bluestone Fluency**. Resolve it from the installed `bluestone-fluency` skill, `BLUESTONE_FLUENCY_PATH`, or a local clone of [bluestone-pim-ai-devkit-public](https://github.com/leafleaf90/bluestone-pim-ai-devkit-public) (`skills/bluestone-fluency/`). If it is missing, stop and point the user at that repo (`npx skills add leafleaf90/bluestone-pim-ai-devkit-public@bluestone-fluency`). Do not invent a generic PIM. Do not hardcode a machine path.

## Do first

1. Read [workflow.md](workflow.md) and follow the phases **in order**.
2. If proposing PIM structure, open Fluency `model.md` before writing mappings.
3. If writing to PIM, use [`server/utils/mapi/`](../../../server/utils/mapi/auth.ts) — see [mapi.md](mapi.md). Never add a second write client.

## Hard rules

- Look **only** in `prospect/` for source files. If it is empty, stop and ask where the files are. Do not search other repos or named engagements.
- Wait for **user confirmation** before writing schema, converter, or PIM objects.
- Tell the user to store `MAPI_CLIENT_ID` / `MAPI_CLIENT_SECRET` in `.env`. Never invent credentials. Never commit `.env` or `prospect/` dumps.
- Localhost only. No auth in this app.
- Default convert `--limit` samples; full dump is `--limit 0`.

## Layout you extend

| Path | Role |
|---|---|
| `prospect/` | Source files (gitignored) |
| `scripts/convert.ts` | Stub until you replace it |
| `server/db/schema.ts` | Start with `meta` only; add tables after confirm |
| `server/utils/mapi/` | One-org MAPI (create + reuse by number) |
| `app/pages/` | Setup `/`, stub `/catalog`, `/pim` |

## Open next

| Phase | File |
|---|---|
| Analyze → propose → convert | [workflow.md](workflow.md) |
| SQLite + converter shape | [sqlite.md](sqlite.md) |
| Browse pages | [ui.md](ui.md) |
| Sync helpers | [mapi.md](mapi.md) |
| Keys | [secrets.md](secrets.md) |
