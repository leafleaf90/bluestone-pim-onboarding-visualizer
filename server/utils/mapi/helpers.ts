export const NUMBER_BATCH = 80
export const ATTRIBUTE_UPSERT_BATCH = 100

export type PimDefinitionHit = {
  id: string
  number: string
  name: string | null
  dataType: string | null
}

export type PimNamedHit = {
  id: string
  number: string | null
  name: string | null
  parentId?: string | null
}

export type PimOptionHit = {
  id: string
  number: string | null
  value: string | null
}

export type Listed<T> = { data?: T[] | null }

export function resourceId(response: Response) {
  return (
    response.headers.get('resource-id')
    || response.headers.get('Resource-Id')
    || response.headers.get('resourceid')
    || ''
  ).trim()
}

export function isConflict(error: unknown) {
  return Boolean(
    error
    && typeof error === 'object'
    && 'statusCode' in error
    && (error as { statusCode?: number }).statusCode === 409
  )
}

export function isNotFound(error: unknown) {
  return Boolean(
    error
    && typeof error === 'object'
    && 'statusCode' in error
    && (error as { statusCode?: number }).statusCode === 404
  )
}

export function messageOf(error: unknown) {
  if (error && typeof error === 'object' && 'statusMessage' in error) {
    return String((error as { statusMessage?: string }).statusMessage || error)
  }
  return error instanceof Error ? error.message : String(error)
}

export function isReusableCreateError(error: unknown) {
  if (isConflict(error)) return true
  const message = messageOf(error).toLowerCase()
  return message.includes('already') || message.includes('exists') || message.includes('duplicate')
}
