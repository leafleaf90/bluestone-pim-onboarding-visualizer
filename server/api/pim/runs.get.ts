import { usePimSqlite } from '../../db/pimClient'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20))
  const db = usePimSqlite()
  const rows = db.prepare(`
    SELECT id, created_at AS createdAt, type, mode, status, title, summary, step_count AS stepCount, warning_count AS warningCount
    FROM sync_runs
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit)

  return { runs: rows }
})
