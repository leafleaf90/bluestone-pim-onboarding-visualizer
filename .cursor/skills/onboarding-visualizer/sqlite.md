# SQLite and convert

Stack: Node `node:sqlite` + Drizzle. No `better-sqlite3`. Converter opens its own writable connection; the app client is `PRAGMA query_only` and reloads when the DB mtime changes.

## Schema

Start from `server/db/schema.ts` (`meta` only). Add entity tables the user confirmed.

`meta` keys the UI expects:

| key | value |
|---|---|
| `convertedAt` | ISO timestamp |
| `limit` | sample size, or `0` for full |
| `counts` | JSON object, e.g. `{"items":120,"skus":400}` |

Those counts appear on Setup and in the header badge (first entry).

## Converter

Replace `scripts/convert.ts`. Keep `pnpm convert` as the only ingest command.

- Resolve files from `prospect/` (or `PROSPECT_DATA_DIR` if you add it).
- Recreate `data/catalog.db` each run (unlink, then create).
- `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`
- Default `--limit 100`. `--limit 0` = full file.
- Insert parents before children. Buffer locale rows until the parent exists.
- Write `meta` last.

Large XML: stream with `sax`. Excel: `exceljs`. Do not load multi-GB files into the browser.

## App client

`server/db/client.ts` already reloads on mtime. Import new tables from `schema.ts`. Do not open the catalog DB until `catalogDbExists()` is true.
