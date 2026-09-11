import { usePimSqlite } from '../../db/pimClient'
import { getPimEnv, hasMapiCredentials, hasPapiKey } from '../../utils/mapi/auth'

export default defineEventHandler(() => {
  const db = usePimSqlite()
  const recentCount = (db.prepare('SELECT COUNT(*) AS c FROM sync_runs').get() as { c: number }).c
  const connected = hasMapiCredentials()
  const env = getPimEnv()

  return {
    connection: connected ? 'connected' as const : 'not_connected' as const,
    tenantLabel: connected ? `Bluestone ${env.toUpperCase()}` : 'Not connected',
    target: connected ? env : null,
    papiReady: hasPapiKey(),
    recentRunCount: recentCount,
    note: connected
      ? `MAPI credentials loaded for ${env}.`
      : 'Add MAPI_CLIENT_ID and MAPI_CLIENT_SECRET to .env for this organisation.'
  }
})
