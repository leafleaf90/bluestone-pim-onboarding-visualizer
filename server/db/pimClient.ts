import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const DEFAULT_PIM_DB = resolve(process.cwd(), 'data/pim.db')

let client: DatabaseSync | null = null

function ensureSchema(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS sync_runs (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      type TEXT NOT NULL,
      mode TEXT NOT NULL,
      status TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      plan_json TEXT NOT NULL,
      step_count INTEGER NOT NULL,
      warning_count INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sync_runs_created_idx ON sync_runs(created_at DESC);
  `)
}

export function pimDbPath() {
  return process.env.PIM_DB_PATH || DEFAULT_PIM_DB
}

export function usePimSqlite() {
  const dbPath = pimDbPath()
  if (!client) {
    mkdirSync(dirname(dbPath), { recursive: true })
    client = new DatabaseSync(dbPath)
  }
  ensureSchema(client)
  return client
}

export function pimDbExists() {
  return existsSync(pimDbPath())
}
