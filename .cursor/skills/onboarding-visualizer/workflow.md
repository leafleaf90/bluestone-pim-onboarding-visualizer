# Workflow

Follow these phases. Do not skip confirmation.

## 1. Inventory

List `prospect/` (skip `README.md`, `.gitkeep`, hidden files). Recurse.

If empty: ask the user to copy or symlink files into `prospect/`. Do not scan sibling folders.

Profile each file: format (XML / Excel / CSV / JSON), approximate size, root elements or sheet names, candidate business keys, locales, hierarchy hints.

## 2. Propose (do not write yet)

Present two proposals in the same turn:

**SQLite** — tables, primary keys, parent keys, what to skip on first convert (raw extract later if needed).

**Bluestone PIM** — using Fluency `model.md` (required; see [SKILL.md](SKILL.md) if Fluency is not installed):

- Product types: FAMILY / GROUP / VARIANT / SINGLE / BUNDLE
- Where each fact lives (highest node true for every child)
- CLA vs VLA vs relation vs context (names/descriptions are contexts)
- Closed vocabularies → `single_select` or `dictionary`, not default `text`

Ask the user to confirm or adjust. **Stop.**

## 3. Implement ingest

After confirmation:

1. Extend `server/db/schema.ts` (keep a `meta` table with `convertedAt`, `limit`, `counts` JSON).
2. Replace `scripts/convert.ts`. Streaming parse for large XML (`sax`). Sample `--limit N` (default 100); `--limit 0` is full.
3. Write list/detail APIs under `server/api/`.
4. Run `pnpm convert` with a small limit. Refresh Setup and show counts.

See [sqlite.md](sqlite.md) and [ui.md](ui.md).

## 4. Keys

If `MAPI_CLIENT_ID` / `MAPI_CLIENT_SECRET` are missing, tell the user to copy `.env.example` → `.env` and paste **this organisation’s** TEST credentials. Do not proceed with live writes until Setup shows MAPI loaded. See [secrets.md](secrets.md).

## 5. Map and sync

Build a mapping wizard (scope → attributes → definitions → products) that calls `server/utils/mapi`. Persist runs in `data/pim.db` (`sync_runs`). Dry-run before live create. Reuse by number; read `resource-id` on create; treat 409 as reuse.

Do **not** create `server/utils/bluestone<Name>Write.ts`. Extend `mapi/` if a helper is missing, and only after checking Fluency `recipes.md` / `gotchas.md`.
