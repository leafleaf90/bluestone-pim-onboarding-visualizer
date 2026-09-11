# Secrets

This app has **no login**. Run on localhost only.

## What the user stores

Copy `.env.example` to `.env` (never commit `.env`):

```
MAPI_CLIENT_ID=
MAPI_CLIENT_SECRET=
PAPI_KEY=
PIM_ENV=test
```

`PAPI_KEY` is optional (published reads). Catalog load and PIM writes need MAPI.

Ask the user for **this organisation’s** TEST credentials. Do not reuse keys from another engagement. Do not invent values.

After they save `.env`, restart `pnpm dev` if credentials were added while it was running. Setup and `/pim` should show MAPI loaded.

## Do not

- Commit prospect dumps, `data/*.db`, or API keys
- Bind the dev server to a public interface
- Put secrets in the Nuxt client bundle or in chat logs
