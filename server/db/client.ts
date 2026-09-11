import { existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { drizzle } from 'drizzle-orm/node-sqlite'
import * as schema from './schema'

const DEFAULT_DB_PATH = resolve(process.cwd(), 'data/catalog.db')

let sqlite: DatabaseSync | null = null
let cached: ReturnType<typeof createDb> | null = null
let cachedDbPath: string | null = null
let cachedMtimeMs: number | null = null

function createDb(dbPath: string) {
  mkdirSync(dirname(dbPath), { recursive: true })
  const client = new DatabaseSync(dbPath)
  client.exec('PRAGMA foreign_keys = ON;')
  client.exec('PRAGMA query_only = ON;')
  sqlite = client
  cachedDbPath = dbPath
  cachedMtimeMs = existsSync(dbPath) ? statSync(dbPath).mtimeMs : null
  return drizzle({ client, schema })
}

function shouldReload(dbPath: string) {
  if (!cached || !sqlite || cachedDbPath !== dbPath) return true
  if (!existsSync(dbPath)) return false
  return cachedMtimeMs !== statSync(dbPath).mtimeMs
}

export function catalogDbPath() {
  return process.env.CATALOG_DB_PATH || DEFAULT_DB_PATH
}

export function useCatalogDb() {
  const dbPath = catalogDbPath()
  if (shouldReload(dbPath)) {
    try {
      sqlite?.close()
    } catch {
      // ignore close errors on replaced DB files
    }
    sqlite = null
    cached = createDb(dbPath)
  }
  return cached!
}

export function useCatalogSqlite() {
  useCatalogDb()
  return sqlite!
}

export function catalogDbExists(dbPath = catalogDbPath()) {
  return existsSync(dbPath)
}

export type CatalogDb = ReturnType<typeof useCatalogDb>
