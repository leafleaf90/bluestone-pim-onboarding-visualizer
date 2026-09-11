import { statSync } from 'node:fs'
import { catalogDbExists, catalogDbPath, useCatalogDb } from '../db/client'
import { meta } from '../db/schema'
import { fluencyStatus } from '../utils/fluency'
import { getPimEnv, hasMapiCredentials, hasPapiKey } from '../utils/mapi/auth'
import { formatBytes, listProspectFiles, prospectDir } from '../utils/prospect'

function catalogStatus() {
  const path = catalogDbPath()
  if (!catalogDbExists(path)) {
    return {
      ready: false,
      path,
      mtime: null as string | null,
      convertedAt: null as string | null,
      counts: null as Record<string, number> | null
    }
  }

  const mtime = new Date(statSync(path).mtimeMs).toISOString()
  try {
    const db = useCatalogDb()
    const rows = db.select().from(meta).all()
    const map = Object.fromEntries(rows.map(row => [row.key, row.value]))
    return {
      ready: true,
      path,
      mtime,
      convertedAt: map.convertedAt ?? null,
      counts: map.counts ? JSON.parse(map.counts) as Record<string, number> : null
    }
  } catch {
    return { ready: true, path, mtime, convertedAt: null, counts: null }
  }
}

export default defineEventHandler(() => {
  const files = listProspectFiles().map(file => ({
    ...file,
    sizeLabel: formatBytes(file.size)
  }))

  return {
    prospectDir: prospectDir(),
    files,
    catalog: catalogStatus(),
    keys: {
      mapi: hasMapiCredentials(),
      papi: hasPapiKey(),
      env: getPimEnv()
    },
    fluency: fluencyStatus(),
    convertCommand: 'pnpm convert'
  }
})
