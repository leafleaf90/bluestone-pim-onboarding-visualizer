import { existsSync, readdirSync, statSync } from 'node:fs'
import { relative, resolve } from 'node:path'

const SKIP = new Set(['.ds_store', 'readme.md', '.gitkeep'])

export type ProspectFile = {
  name: string
  relativePath: string
  size: number
}

export function prospectDir() {
  return resolve(process.cwd(), 'prospect')
}

export function listProspectFiles(dir = prospectDir(), acc: ProspectFile[] = []): ProspectFile[] {
  if (!existsSync(dir)) return acc
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    if (SKIP.has(entry.name.toLowerCase())) continue
    const full = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      listProspectFiles(full, acc)
      continue
    }
    acc.push({
      name: entry.name,
      relativePath: relative(prospectDir(), full),
      size: statSync(full).size
    })
  }
  return acc.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
}

export function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
