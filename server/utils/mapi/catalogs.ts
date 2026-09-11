import { pimFetch } from './fetch'
import {
  isConflict,
  isNotFound,
  isReusableCreateError,
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

export async function lookupCatalogsByNumber(numbers: string[]) {
  const unique = [...new Set(numbers.map(n => n.trim()).filter(Boolean))]
  const found = new Map<string, PimNamedHit>()
  if (!unique.length) return found

  const { data } = await pimFetch<Listed<{
    id?: string | null
    number?: string | null
    name?: string | null
    parentId?: string | null
  }>>('/catalogs/nodes/list', {
    method: 'POST',
    body: JSON.stringify({
      filters: [{ type: 'NUMBER_IN', values: unique }],
      page: 0,
      pageSize: Math.min(Math.max(unique.length, 1), 1000)
    })
  })

  for (const row of data?.data ?? []) {
    const number = row.number?.trim()
    const id = row.id?.trim()
    if (!number || !id) continue
    found.set(number, {
      id,
      number,
      name: row.name ?? null,
      parentId: 'parentId' in row ? row.parentId ?? null : undefined
    })
  }
  return found
}

export async function getCatalogNode(id: string) {
  const { data } = await pimFetch<{
    id?: string | null
    name?: string | null
    number?: string | null
    parentId?: string | null
  }>(`/catalogs/nodes/${encodeURIComponent(id)}`)
  if (!data?.id) {
    throw createError({ statusCode: 404, statusMessage: `Catalog node ${id} was not found` })
  }
  return {
    id: data.id,
    name: data.name ?? null,
    number: data.number ?? null,
    parentId: data.parentId ?? null
  }
}

export async function createCatalogNode(input: {
  name: string
  number: string
  parentId?: string | null
  uniqueName?: boolean
}) {
  const existing = await lookupCatalogsByNumber([input.number])
  const hit = existing.get(input.number)
  if (hit) return { id: hit.id, reused: true }

  const path = input.uniqueName === false ? '/catalogs/nodes' : '/catalogs/nodes?validation=NAME'
  try {
    return {
      id: await createResource(path, {
        name: input.name,
        number: input.number,
        parentId: input.parentId || undefined
      }),
      reused: false
    }
  } catch (error) {
    if (!isConflict(error) && !isReusableCreateError(error)) {
      const again = await lookupCatalogsByNumber([input.number])
      const retry = again.get(input.number)
      if (retry) return { id: retry.id, reused: true }
      throw error
    }
    const again = await lookupCatalogsByNumber([input.number])
    const retry = again.get(input.number)
    if (retry) return { id: retry.id, reused: true }
    throw error
  }
}

export async function addProductToCatalog(categoryId: string, productId: string) {
  try {
    await pimFetch(`/catalogs/nodes/${encodeURIComponent(categoryId)}/products`, {
      method: 'POST',
      body: JSON.stringify({ productId })
    })
  } catch (error) {
    const message = messageOf(error).toLowerCase()
    if (isConflict(error) || message.includes('already')) return
    throw error
  }
}

export async function removeProductFromCatalog(categoryId: string, productId: string) {
  try {
    await pimFetch(
      `/products/${encodeURIComponent(productId)}/categories/${encodeURIComponent(categoryId)}`,
      { method: 'DELETE' }
    )
  } catch (error) {
    if (isConflict(error) || isNotFound(error)) return
    const message = messageOf(error).toLowerCase()
    if (
      message.includes('not found')
      || message.includes('not assigned')
      || message.includes('does not belong')
      || message.includes('invalid request')
    ) return
    throw error
  }
}

export async function listCategoryLevelAttributes() {
  const found: Array<{ categoryId: string, definitionId: string }> = []
  let page = 0
  while (true) {
    const { data } = await pimFetch<Listed<{
      categoryId?: string | null
      assignedOn?: string | null
      attributeDefinitionId?: string | null
    }>>(`/catalogs/nodes/attributes?page=${page}&pageSize=1000`)
    const rows = data?.data ?? []
    for (const row of rows) {
      const categoryId = row.categoryId?.trim() || row.assignedOn?.trim()
      const definitionId = row.attributeDefinitionId?.trim()
      if (!categoryId || !definitionId) continue
      found.push({ categoryId, definitionId })
    }
    if (rows.length < 1000) break
    page += 1
  }
  return found
}

export async function createCategoryLevelAttribute(categoryId: string, attributeDefinitionId: string) {
  try {
    await pimFetch(
      `/catalogs/nodes/${encodeURIComponent(categoryId)}/attributes/${encodeURIComponent(attributeDefinitionId)}?forceCla=false`,
      {
        method: 'POST',
        body: JSON.stringify({})
      }
    )
    return { reused: false }
  } catch (error) {
    const message = messageOf(error).toLowerCase()
    if (isConflict(error) || message.includes('already exists')) return { reused: true }
    throw error
  }
}

export async function updateCategoryLevelAttribute(
  categoryId: string,
  attributeDefinitionId: string,
  flags: { copyAttribute?: boolean, locked?: boolean, mandatory?: boolean }
) {
  await pimFetch(
    `/catalogs/nodes/${encodeURIComponent(categoryId)}/attributes/${encodeURIComponent(attributeDefinitionId)}?forceCla=false`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        copyAttribute: flags.copyAttribute,
        locked: flags.locked,
        mandatory: flags.mandatory
      })
    }
  )
}
