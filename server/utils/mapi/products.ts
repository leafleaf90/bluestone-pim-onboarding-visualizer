import type { PimDataType, PimProductType } from '../../../shared/pim'
import { pimFetch } from './fetch'
import {
  ATTRIBUTE_UPSERT_BATCH,
  NUMBER_BATCH,
  isConflict,
  isReusableCreateError,
  messageOf,
  resourceId
} from './helpers'

export type PimProductHit = {
  id: string
  number: string
  type: string | null
  name: string | null
}

export type ProductAttribute = {
  definitionId: string
  values?: string[]
  dictionary?: string[]
  copy?: boolean
  definingAttributes?: boolean
  locked?: boolean
  mandatory?: boolean
  dataType?: PimDataType
}

type ProductMetadataView = {
  number?: string | null
  type?: string | null
  name?: { value?: string } | Record<string, string> | null
}

type ProductView = {
  id?: string | null
  metadata?: ProductMetadataView | null
}

type UpdateAttributeDto = {
  definitionId: string
  value?: string | null
  dictionaryValueIds?: string[] | null
  selectValueIds?: string[] | null
}

function metadataName(value: ProductMetadataView['name']) {
  if (!value) return null
  if (typeof value === 'object' && 'value' in value && typeof value.value === 'string') {
    return value.value
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const en = record.en
    if (typeof en === 'string') return en
    const first = Object.values(record).find(item => typeof item === 'string')
    return typeof first === 'string' ? first : null
  }
  return null
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

export async function lookupProductsByNumber(numbers: string[]) {
  const unique = [...new Set(numbers.map(n => n.trim()).filter(Boolean))]
  const found = new Map<string, PimProductHit>()

  for (let i = 0; i < unique.length; i += NUMBER_BATCH) {
    const batch = unique.slice(i, i + NUMBER_BATCH)
    const { data } = await pimFetch<{ data?: ProductView[] }>(
      '/products/list/views/by-numbers?archiveState=active',
      {
        method: 'POST',
        body: JSON.stringify({
          numbers: batch,
          page: 0,
          pageSize: NUMBER_BATCH,
          views: [{ type: 'METADATA' }]
        })
      }
    )

    for (const row of data?.data ?? []) {
      const number = row.metadata?.number?.trim()
      const id = row.id?.trim()
      if (!number || !id) continue
      found.set(number, {
        id,
        number,
        type: row.metadata?.type ?? null,
        name: metadataName(row.metadata?.name)
      })
    }
  }

  return found
}

export async function lookupProductsById(ids: string[]) {
  const unique = [...new Set(ids.map(id => id.trim()).filter(Boolean))]
  const found = new Map<string, PimProductHit>()

  for (let i = 0; i < unique.length; i += NUMBER_BATCH) {
    const batch = unique.slice(i, i + NUMBER_BATCH)
    const { data } = await pimFetch<{ data?: ProductView[] }>(
      '/products/list/views/by-ids?archiveState=active',
      {
        method: 'POST',
        body: JSON.stringify({
          ids: batch,
          views: [{ type: 'METADATA' }]
        })
      }
    )

    for (const row of data?.data ?? []) {
      const id = row.id?.trim()
      if (!id) continue
      found.set(id, {
        id,
        number: row.metadata?.number?.trim() || id,
        type: row.metadata?.type ?? null,
        name: metadataName(row.metadata?.name)
      })
    }
  }

  return found
}

function forProductCreate(attributes: ProductAttribute[] | undefined, type: PimProductType) {
  if (!attributes?.length) return undefined
  return attributes.map(({ dataType: _dataType, ...rest }) => {
    if (type !== 'GROUP') {
      const { copy: _copy, definingAttributes: _def, locked: _locked, mandatory: _mandatory, ...safe } = rest
      return safe
    }
    return rest
  })
}

function toUpdateAttributeDto(attribute: ProductAttribute): UpdateAttributeDto {
  if (attribute.dictionary?.length) {
    return { definitionId: attribute.definitionId, dictionaryValueIds: attribute.dictionary }
  }
  if (attribute.dataType === 'single_select' || attribute.dataType === 'multi_select') {
    return { definitionId: attribute.definitionId, selectValueIds: attribute.values || [] }
  }
  return { definitionId: attribute.definitionId, value: attribute.values?.[0] ?? '' }
}

export async function updateProductAttributes(id: string, attributes: ProductAttribute[]) {
  for (let i = 0; i < attributes.length; i += ATTRIBUTE_UPSERT_BATCH) {
    const batch = attributes.slice(i, i + ATTRIBUTE_UPSERT_BATCH).map(toUpdateAttributeDto)
    await pimFetch(`/products/${encodeURIComponent(id)}/attributes`, {
      method: 'PUT',
      body: JSON.stringify(batch)
    })
  }
}

async function reuseProduct(id: string, attributes?: ProductAttribute[]) {
  if (attributes?.length) await updateProductAttributes(id, attributes)
  return { id, reused: true }
}

/** VARIANT children: create as SINGLE, then assignVariantsToGroup. */
export async function createProduct(input: {
  name: string
  number: string
  type: Exclude<PimProductType, 'VARIANT'>
  description?: string | null
  categories?: string[]
  attributes?: ProductAttribute[]
}) {
  const existing = await lookupProductsByNumber([input.number])
  const hit = existing.get(input.number)
  if (hit) return reuseProduct(hit.id, input.attributes)

  try {
    return {
      id: await createResource('/products?validation=NUMBER', {
        name: input.name,
        number: input.number,
        type: input.type,
        description: input.description || undefined,
        categories: input.categories?.length ? input.categories : undefined,
        attributes: forProductCreate(input.attributes, input.type)
      }),
      reused: false
    }
  } catch (error) {
    if (!isReusableCreateError(error)) throw error
    const again = await lookupProductsByNumber([input.number])
    const retry = again.get(input.number)
    if (retry) return reuseProduct(retry.id, input.attributes)
    throw error
  }
}

export async function updateProductName(id: string, name: string) {
  await pimFetch(`/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: { value: name } })
  })
}

export async function assignGroupsToFamily(familyId: string, productIds: string[]) {
  const unique = [...new Set(productIds.filter(Boolean))]
  for (let i = 0; i < unique.length; i += 100) {
    const batch = unique.slice(i, i + 100)
    try {
      await pimFetch('/products/groups/append/by-ids', {
        method: 'POST',
        body: JSON.stringify({
          familyVariantId: familyId,
          productIds: batch
        })
      })
    } catch (error) {
      const message = messageOf(error).toLowerCase()
      if (isConflict(error) || message.includes('already') || message.includes('invalid request')) continue
      throw error
    }
  }
}

export async function assignVariantsToGroup(groupId: string, productIds: string[]) {
  const unique = [...new Set(productIds.filter(Boolean))]
  for (let i = 0; i < unique.length; i += 100) {
    const batch = unique.slice(i, i + 100)
    if (!batch.length) continue
    try {
      await pimFetch('/products/variants/append/by-ids', {
        method: 'POST',
        body: JSON.stringify({
          variantGroupId: groupId,
          productIds: batch
        })
      })
    } catch (error) {
      const message = messageOf(error).toLowerCase()
      if (isConflict(error) || message.includes('already') || message.includes('invalid request')) continue
      throw error
    }
  }
}

export async function addProductToBundle(bundleId: string, complementaryProductId: string, quantity = 1) {
  try {
    await pimFetch(
      `/products/${encodeURIComponent(bundleId)}/bundles/${encodeURIComponent(complementaryProductId)}`,
      {
        method: 'POST',
        body: JSON.stringify({ quantity: Math.max(1, quantity) })
      }
    )
  } catch (error) {
    const message = messageOf(error).toLowerCase()
    if (isConflict(error) || message.includes('already') || message.includes('exists') || message.includes('duplicate')) return
    throw error
  }
}

export async function updateVariantLevelAttribute(
  groupId: string,
  definitionId: string,
  flags: { copy?: boolean, definingAttributes?: boolean, locked?: boolean, mandatory?: boolean },
  forceVla = false
) {
  const body = {
    copy: flags.copy ?? true,
    definingAttributes: flags.definingAttributes ?? false,
    locked: flags.locked ?? false,
    mandatory: flags.mandatory ?? false
  }
  try {
    await pimFetch(`/products/${encodeURIComponent(groupId)}/attributes`, {
      method: 'POST',
      body: JSON.stringify({ definitionId, ...body })
    })
  } catch (error) {
    const message = messageOf(error).toLowerCase()
    if (!isConflict(error) && !message.includes('already')) {
      // Attribute may already be on the group; VLA update still runs.
    }
  }
  await pimFetch(
    `/products/${encodeURIComponent(groupId)}/variants/attributes/${encodeURIComponent(definitionId)}?forceVla=${forceVla}`,
    {
      method: 'PUT',
      body: JSON.stringify(body)
    }
  )
}
