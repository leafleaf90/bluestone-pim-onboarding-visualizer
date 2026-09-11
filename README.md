# Bluestone onboarding visualizer

Empty starter for prospect catalog work: browse a local SQLite copy of the source files, propose a **Bluestone PIM** tree, then sync into TEST.

There is no sample catalog in this repo. Drop files in `prospect/`, run locally, and tell the agent to analyze them.

Source files and generated DBs stay on your machine. There is no login — bind only to localhost.

## Quick start

```bash
git clone https://github.com/leafleaf90/bluestone-pim-onboarding-visualizer.git
cd bluestone-pim-onboarding-visualizer
pnpm install
pnpm dev
```

Open the URL in the terminal (often `http://localhost:3000`). You should see **Setup**: empty `prospect/`, no `catalog.db`, MAPI keys missing, and whether **Bluestone Fluency** was found on this machine.

## Bluestone Fluency

The agent needs [Bluestone Fluency](https://github.com/leafleaf90/bluestone-pim-ai-devkit-public) (native FAMILY / GROUP / VARIANT, CLA, VLA, MAPI). This kit does not bundle it — people keep the DevKit in different places, or have not cloned it yet.

Install the skill:

```bash
npx skills add leafleaf90/bluestone-pim-ai-devkit-public@bluestone-fluency
```

Or clone [bluestone-pim-ai-devkit-public](https://github.com/leafleaf90/bluestone-pim-ai-devkit-public) and point Cursor at `skills/bluestone-fluency/`. Setup probes `~/.cursor/skills/bluestone-fluency`, a sibling `../bluestone-pim-ai-devkit` or `../bluestone-pim-ai-devkit-public` clone, then `BLUESTONE_FLUENCY_PATH` in `.env`. If none match, the page links to GitHub instead of a path on your laptop.

| Command | Purpose |
|---|---|
| `pnpm dev` | Run the UI |
| `pnpm convert` | Ingest `prospect/` → `data/catalog.db` (stub until the agent writes it) |
| `pnpm db:studio` | Optional Drizzle Studio |

## What you do

1. Copy this folder (without `node_modules`, `.nuxt`, `.env`, `data/*.db`, or anyone else’s dumps).
2. Put source files in **`prospect/`** (XML, Excel, CSV, JSON — nested folders are fine).
3. In Cursor, paste the **Prompt for the agent** from Setup (or the block below). If Fluency is missing, the agent should stop and send you the DevKit GitHub link.

```
Look in prospect/ for source files. Use Bluestone Fluency for PIM modeling. If that skill is missing, stop and point me to https://github.com/leafleaf90/bluestone-pim-ai-devkit-public (clone it or run npx skills add leafleaf90/bluestone-pim-ai-devkit-public@bluestone-fluency). Analyze the files, propose a SQLite schema and a Bluestone PIM tree (FAMILY / GROUP / VARIANT / SINGLE, CLA vs VLA, relations vs attributes), then wait for my confirmation. After that, write the converter, load a sample into the local DB, add browse UI, and tell me which API keys to put in .env before we sync.
```

4. Confirm or adjust the proposed schema and PIM model.
5. When asked, copy `.env.example` to `.env` and add **this organisation’s** `MAPI_CLIENT_ID` and `MAPI_CLIENT_SECRET` (optional `PAPI_KEY`). Never commit `.env`.
6. Reload the app. Setup should show file counts, then DB counts, then MAPI loaded. Catalog browse and `/pim` sync come after the agent implements them.

## Layout

```text
prospect/                 Source files (gitignored)
app/pages/                Setup, catalog stub, PIM status
server/db/                SQLite catalog + pim.db sync history
server/utils/mapi/        One-org MAPI (create + reuse by number)
scripts/convert.ts        Stub until a real pipeline exists
.cursor/skills/           Agent playbook for this kit
```

## Stack

Nuxt 4, Nuxt UI, SQLite via `node:sqlite`, Drizzle, Zod, `sax` / ExcelJS when the converter needs them.

## Out of scope for the empty kit

- Any preloaded catalog or mapping profile
- In-app PBC plugins (add later with Fluency `pbc.md` if the prospect needs UI inside PIM)
- Multi-organisation key sets
