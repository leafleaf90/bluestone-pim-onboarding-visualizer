import { pimFetch } from './fetch'
import {
  isConflict,
  messageOf,
  resourceId,
  type Listed,
  type PimNamedHit
} from './helpers'

async function createResource(path: string, body: unknown) {
  const { response } = await pimFetch(path, {
    method: 'POST',
    body: JSON.stringify(body)
  })
  const id = resourceId(response)
  if (!id) {
    throw createError({ statusCode: 502, statusMessage: `Create at ${path} returned no resource-id` })
  }
  return id
}

export async function listRelations() {
  const relations: PimNamedHit[] = []
  let page = 0
  while (true) {
    const { data } = await pimFetch<Listed<{
      id?: string | null
      number?: string | null
      name?: string | null
    }>>(`/relations?page=${page}&pageSize=1000`)
    const rows = data?.data ?? []
    for (const row of rows) {
      const id = row.id?.trim()
      if (!id) continue
      relations.push({ id, number: row.number ?? null, name: row.name ?? null })
    }
    if (rows.length < 1000) break
    page += 1
  }
  return relations
}

export async function ensureRelation(input: {
  name: string
  number: string
  reverseName: string
  description?: string
}) {
  const existing = (await listRelations()).find(row => row.number === input.number)
  if (existing) return { ...existing, reused: true }

  try {
    const id = await createResource('/relations', {
      name: input.name,
      number: input.number,
      direction: 'TWO_WAY',
      reverseName: input.reverseName,
      quantityEnabled: false,
      description: input.description || undefined
    })
    return { id, number: input.number, name: input.name, reused: false }
  } catch (error) {
    if (!isConflict(error)) throw error
    const again = (await listRelations()).find(row => row.number === input.number)
    if (again) return { ...again, reused: true }
    throw error
  }
}

export async function connectProducts(fromId: string, relationId: string, toId: string) {
  try {
    await pimFetch(`/products/${encodeURIComponent(fromId)}/connections/products`, {
      method: 'POST',
      body: JSON.stringify({ relationId, to: toId }),
      omitContext: true
    })
  } catch (error) {
    const message = messageOf(error).toLowerCase()
    if (isConflict(error) || message.includes('already') || message.includes('invalid request')) return
    throw error
  }
}
