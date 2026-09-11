# Browse UI

Nuxt 4 + Nuxt UI. Shell is already in `app/app.vue` (Setup / Catalog / PIM). Catalog nav is disabled until `/api/setup` reports `catalog.ready`.

## After convert

Add **list and detail pages** that match the confirmed entities. Do not invent a generic SQL grid.

Typical pattern:

- `app/pages/catalog/index.vue` (or replace the stub `catalog.vue`) — filters via URL query, pagination
- `app/pages/catalog/[id].vue` — one record, attributes, children, source snippet if useful
- `server/api/...` — Zod on query params
- Header counts come from `meta.counts`

Keep `/` as Setup. Do not add a multi-catalog switcher.

## PIM UI

`/pim` already shows connection + empty mapping + `sync_runs`. Add the mapping wizard **on that page or as a slideover**, using `server/utils/mapi`. Suggested steps: scope → attributes (suggested `dataType`) → ensure definitions → create products.

Use Fluency before choosing `dataType` or CLA `mandatory`. If Fluency is not installed, stop — Setup and the README link to the [DevKit](https://github.com/leafleaf90/bluestone-pim-ai-devkit-public).
