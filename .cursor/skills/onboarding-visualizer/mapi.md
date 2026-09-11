# MAPI helpers

One organisation. Import from `server/utils/mapi/*.ts` (Nitro also auto-imports those files). Do **not** add a barrel `index.ts` — Nuxt will duplicate every export.

```ts
import { hasMapiCredentials } from '../utils/mapi/auth'
import { pimFetch } from '../utils/mapi/fetch'
import { createProduct } from '../utils/mapi/products'
```
| Helper | Use |
|---|---|
| `pimFetch` / `completenessFetch` / `mediaBankFetch` / `relationFetch` / `uiSettingsFetch` / `papiFetch` | Raw calls. `resource-id` is on the Response. |
| `createProduct` | Lookup by number first. VARIANT children: create as `SINGLE`, then `assignVariantsToGroup`. |
| `createSimpleDefinition` / `createDictionaryDefinition` / `createMatrixDefinition` | Reuse on name clash. |
| `createCatalogNode` / `createCategoryLevelAttribute` / `updateCategoryLevelAttribute` | CLA. `mandatory` only when every type in the node needs the value. |
| `updateVariantLevelAttribute` | VLA on GROUP. `copy: true` if any other flag is true. |
| `ensureRelation` / `connectProducts` | Omit context on connection writes (already handled). |

Env: `MAPI_CLIENT_ID`, `MAPI_CLIENT_SECRET`, optional `PAPI_KEY`, `PIM_ENV=test|prod`.

If a helper is missing, add it in `server/utils/mapi/` using Fluency `recipes.md` and `gotchas.md`. Do not fork a per-engagement write file.

Never log client secrets. Pin writes to the keys in `.env` — this kit is one org.
