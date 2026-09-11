import type { PimDataType } from '../../../shared/pim'
import { pimFetch } from './fetch'
import {
  NUMBER_BATCH,
  isConflict,
  isReusableCreateError,
  resourceId,
  type Listed,
  type PimDefinitionHit,
  type PimNamedHit,
  type PimOptionHit
} from './helpers'

export type DefinitionWrite = {
  id: string
  reused: boolean
  existingNumber?: string | null
  existingName?: string | null
  existingDataType?: string | null
}

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

export async function lookupDefinitionsByNumber(numbers: string[]) {
  const unique = [...new Set(numbers.map(n => n.trim()).filter(Boolean))]
  const found = new Map<string, PimDefinitionHit>()

  for (let i = 0; i < unique.length; i += NUMBER_BATCH) {
    const batch = unique.slice(i, i + NUMBER_BATCH)
    const { data } = await pimFetch<Listed<{
      id?: string | null
      number?: string | null
      name?: string | null
      dataType?: string | null
    }>>('/definitions/list', {
      method: 'POST',
      body: JSON.stringify({
        filters: [{ type: 'NUMBER_IN', values: batch }],
        page: 0,
        pageSize: Math.max(batch.length, 1)
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
        dataType: row.dataType ?? null
      })
    }
  }

  return found
}

function normalizeDefinitionName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function lookupDefinitionByName(name: string): Promise<PimDefinitionHit | null> {
  const wanted = normalizeDefinitionName(name)
  if (!wanted) return null
  let page = 0
  while (true) {
    const { data } = await pimFetch<Listed<{
      id?: string | null
      number?: string | null
      name?: string | null
      dataType?: string | null
    }>>(`/definitions?page=${page}&pageSize=1000`)
    const rows = Array.isArray(data) ? data : (data?.data ?? [])
    for (const row of rows) {
      const id = row.id?.trim()
      if (!id) continue
      if (normalizeDefinitionName(row.name || '') !== wanted) continue
      return {
        id,
        number: row.number?.trim() || '',
        name: row.name ?? null,
        dataType: row.dataType ?? null
      }
    }
    if (rows.length < 1000) break
    page += 1
  }
  return null
}

async function reuseDefinitionOnNameClash(name: string, error: unknown): Promise<DefinitionWrite> {
  if (!isReusableCreateError(error)) throw error
  const hit = await lookupDefinitionByName(name)
  if (!hit) throw error
  return {
    id: hit.id,
    reused: true,
    existingNumber: hit.number,
    existingName: hit.name,
    existingDataType: hit.dataType
  }
}

export async function listAttributeGroups() {
  const groups: PimNamedHit[] = []
  let page = 0
  while (true) {
    const { data } = await pimFetch<Listed<{
      id?: string | null
      number?: string | null
      name?: string | null
    }>>(`/attributeGroups?page=${page}&pageSize=1000`)
    const rows = data?.data ?? []
    for (const row of rows) {
      const id = row.id?.trim()
      if (!id) continue
      groups.push({ id, number: row.number ?? null, name: row.name ?? null })
    }
    if (rows.length < 1000) break
    page += 1
  }
  return groups
}

export async function ensureAttributeGroup(input: { number: string, name: string }) {
  const existing = (await listAttributeGroups()).find(group =>
    group.number === input.number || group.name === input.name
  )
  if (existing) return { ...existing, reused: true }

  try {
    const id = await createResource('/attributeGroups', { name: input.name, number: input.number })
    return { id, number: input.number, name: input.name, reused: false }
  } catch (error) {
    if (!isConflict(error)) throw error
    const again = (await listAttributeGroups()).find(group =>
      group.number === input.number || group.name === input.name
    )
    if (again) return { ...again, reused: true }
    throw error
  }
}

export async function createSimpleDefinition(input: {
  name: string
  number: string
  dataType: Exclude<PimDataType, 'dictionary' | 'matrix'>
  description?: string | null
  groupId?: string | null
  contextAware?: boolean
  selectValues?: Array<{ value: string, number?: string | null }>
}): Promise<DefinitionWrite> {
  const body: Record<string, unknown> = {
    name: input.name,
    number: input.number,
    dataType: input.dataType,
    contextAware: Boolean(input.contextAware),
    description: input.description || undefined,
    groupId: input.groupId || undefined
  }
  if (input.dataType === 'formatted_text') {
    body.contentType = 'text/markdown'
  }
  if ((input.dataType === 'single_select' || input.dataType === 'multi_select') && input.selectValues?.length) {
    body.restrictions = {
      enum: {
        values: input.selectValues.map(value => ({
          value: value.value,
          number: value.number || undefined
        }))
      }
    }
  }
  try {
    return { id: await createResource('/definitions?validation=NAME', body), reused: false }
  } catch (error) {
    return reuseDefinitionOnNameClash(input.name, error)
  }
}

export async function createDictionaryDefinition(input: {
  name: string
  number: string
  description?: string | null
  groupId?: string | null
  contextAware?: boolean
  selectedValuesLimit?: number | null
}): Promise<DefinitionWrite> {
  try {
    return {
      id: await createResource('/definitions/dictionary?validation=NAME', {
        name: input.name,
        number: input.number,
        contextAware: Boolean(input.contextAware),
        description: input.description || undefined,
        groupId: input.groupId || undefined,
        selectedValuesLimit: input.selectedValuesLimit ?? undefined
      }),
      reused: false
    }
  } catch (error) {
    return reuseDefinitionOnNameClash(input.name, error)
  }
}

export async function createMatrixDefinition(input: {
  name: string
  number: string
  description?: string | null
  groupId?: string | null
  contextAware?: boolean
  rows: Array<{ value: string }>
  columns: Array<{ value: string }>
}): Promise<DefinitionWrite> {
  if (!input.rows.length || !input.columns.length) {
    throw createError({
      statusCode: 400,
      statusMessage: `${input.number} is a matrix definition and needs rows and columns`
    })
  }
  try {
    return {
      id: await createResource('/definitions/matrix?validation=NAME', {
        name: input.name,
        number: input.number,
        contextAware: Boolean(input.contextAware),
        description: input.description || undefined,
        groupId: input.groupId || undefined,
        restrictions: {
          matrix: {
            rows: input.rows,
            columns: input.columns
          }
        }
      }),
      reused: false
    }
  } catch (error) {
    return reuseDefinitionOnNameClash(input.name, error)
  }
}

export async function lookupDictionaryValuesByNumber(definitionId: string, numbers: string[]) {
  const unique = [...new Set(numbers.map(n => n.trim()).filter(Boolean))]
  const found = new Map<string, PimOptionHit>()
  if (!unique.length) return found

  for (let i = 0; i < unique.length; i += NUMBER_BATCH) {
    const batch = unique.slice(i, i + NUMBER_BATCH)
    const { data } = await pimFetch<Listed<{
      id?: string | null
      number?: string | null
      value?: { value?: Record<string, string> | null } | null
    }>>(`/definitions/dictionary/${encodeURIComponent(definitionId)}/values/list`, {
      method: 'POST',
      body: JSON.stringify({
        filters: [{ type: 'NUMBER_IN', values: batch }],
        page: 0,
        pageSize: Math.max(batch.length, 1)
      })
    })
    for (const row of data?.data ?? []) {
      const id = row.id?.trim()
      const number = row.number?.trim()
      if (!id || !number) continue
      const labels = row.value?.value || {}
      found.set(number, {
        id,
        number,
        value: labels.en || Object.values(labels)[0] || null
      })
    }
  }
  return found
}

export async function createDictionaryValue(definitionId: string, input: { value: string, number?: string | null }) {
  try {
    return await createResource(`/definitions/dictionary/${encodeURIComponent(definitionId)}/values`, {
      value: input.value,
      number: input.number || undefined
    })
  } catch (error) {
    if (!isConflict(error) || !input.number) throw error
    const existing = await lookupDictionaryValuesByNumber(definitionId, [input.number])
    const hit = existing.get(input.number)
    if (hit) return hit.id
    throw error
  }
}

export async function listSelectValues(definitionId: string) {
  const { data } = await pimFetch<{
    restrictions?: {
      enum?: {
        values?: Array<{
          valueId?: string | null
          value?: string | null
          number?: string | null
        }>
      }
      select?: {
        values?: Array<{
          valueId?: string | null
          value?: string | null
          number?: string | null
        }>
      }
    }
  }>(`/definitions/${encodeURIComponent(definitionId)}`)
  const found = new Map<string, PimOptionHit>()
  const rows = data?.restrictions?.enum?.values ?? data?.restrictions?.select?.values ?? []
  for (const row of rows) {
    const id = row.valueId?.trim()
    if (!id) continue
    const number = row.number?.trim() || row.value?.trim() || id
    found.set(number, { id, number, value: row.value ?? null })
    if (row.value?.trim()) found.set(row.value.trim(), { id, number, value: row.value })
  }
  return found
}

export async function createSelectValue(definitionId: string, input: { value: string, number?: string | null }) {
  try {
    return await createResource(`/definitions/select/${encodeURIComponent(definitionId)}/values`, {
      value: input.value,
      number: input.number || undefined
    })
  } catch (error) {
    if (!isConflict(error)) throw error
    return null
  }
}
