import { apiHost, getAccessToken, getPapiKey, requirePapiKey } from './auth'

type BluestoneErrorBody = {
  error?: string
  error_description?: string
  message?: string
  errorDetails?: Array<{ message?: string }>
  messages?: Array<{ errorMsg?: string, errorCode?: number }>
}

export type MapiFetchOptions = RequestInit & {
  omitContext?: boolean
}

function parseJsonText(text: string) {
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function errorMessageFromBody(text: string, fallback: string) {
  if (!text) return fallback
  try {
    const body = JSON.parse(text) as BluestoneErrorBody
    const details = body.errorDetails?.map(item => item.message).filter(Boolean).join('; ')
    const messages = body.messages?.map(item => item.errorMsg).filter(Boolean).join('; ')
    const primary = body.error_description || body.error || body.message || details || messages || fallback
    const extra = [details, messages].filter(part => part && part !== primary).join('; ')
    return extra ? `${primary} (${extra})` : primary
  } catch {
    return text
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function retryAfterMs(response: Response, attempt: number) {
  const header = response.headers.get('retry-after')
  if (header) {
    const seconds = Number(header)
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(Math.max(seconds * 1000, 400), 20_000)
    const date = Date.parse(header)
    if (Number.isFinite(date)) return Math.min(Math.max(date - Date.now(), 400), 20_000)
  }
  return Math.min(800 * 2 ** attempt, 12_000)
}

function applyContext(path: string, init: MapiFetchOptions) {
  const headers = new Headers(init.headers)
  const method = (init.method || 'GET').toUpperCase()
  const omit = init.omitContext || path.includes('/connections/')
  if (omit) {
    headers.delete('context')
    headers.delete('context-fallback')
  } else {
    if (!headers.has('context')) headers.set('context', 'en')
    if (method === 'GET' && !headers.has('context-fallback')) {
      headers.set('context-fallback', 'true')
    }
  }
  return headers
}

async function bluestoneFetch(base: string, path: string, init: MapiFetchOptions = {}) {
  const url = path.startsWith('http') ? path : `${base}${path}`
  const method = (init.method || 'GET').toUpperCase()
  const maxAttempts = 6
  const { omitContext: _omit, ...requestInit } = init

  for (let attempt = 0; ; attempt++) {
    const token = await getAccessToken()
    const headers = applyContext(path, init)
    headers.set('Authorization', `Bearer ${token}`)
    if (requestInit.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(url, { ...requestInit, headers })
    const text = await response.text().catch(() => '')

    if (response.status === 429 && attempt < maxAttempts - 1) {
      await sleep(retryAfterMs(response, attempt))
      continue
    }

    if (response.status === 204 || response.status === 207) {
      return { response, json: parseJsonText(text) }
    }
    if (response.status === 404 && method === 'GET') {
      return { response, json: null }
    }
    if (!response.ok) {
      throw createError({
        statusCode: response.status >= 400 && response.status < 500 ? response.status : 502,
        statusMessage: `${method} ${path}: ${errorMessageFromBody(text, `${response.status} ${response.statusText}`)}`
      })
    }
    return { response, json: parseJsonText(text) }
  }
}

export async function pimFetch<T>(path: string, init: MapiFetchOptions = {}) {
  const { response, json } = await bluestoneFetch(`${apiHost()}/pim`, path, init)
  return { response, data: json as T | null }
}

export async function completenessFetch<T>(path: string, init: MapiFetchOptions = {}) {
  const { response, json } = await bluestoneFetch(`${apiHost()}/completeness-score`, path, init)
  return { response, data: json as T | null }
}

export async function mediaBankFetch<T>(path: string, init: MapiFetchOptions = {}) {
  const { response, json } = await bluestoneFetch(`${apiHost()}/media-bank`, path, init)
  return { response, data: json as T | null }
}

export async function externalMediaFetch<T>(path: string, init: MapiFetchOptions = {}) {
  const { response, json } = await bluestoneFetch(`${apiHost()}/external-media`, path, init)
  return { response, data: json as T | null }
}

export async function relationFetch<T>(path: string, init: MapiFetchOptions = {}) {
  const headers = new Headers(init.headers)
  headers.delete('context')
  headers.delete('context-fallback')
  const { response, json } = await bluestoneFetch(`${apiHost()}/relation`, path, {
    ...init,
    headers,
    omitContext: true
  })
  return { response, data: json as T | null }
}

export async function uiSettingsFetch<T>(path: string, init: MapiFetchOptions = {}) {
  const { response, json } = await bluestoneFetch(`${apiHost()}/ui-settings`, path, init)
  return { response, data: json as T | null }
}

export async function papiFetch<T>(path: string, init: RequestInit = {}) {
  requirePapiKey()
  const url = path.startsWith('http') ? path : `${apiHost()}/v1${path}`
  const headers = new Headers(init.headers)
  headers.set('x-api-key', getPapiKey())
  if (!headers.has('context')) headers.set('context', 'en')
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const response = await fetch(url, { ...init, headers })
  const text = await response.text().catch(() => '')

  if (response.status === 404) {
    return { response, data: parseJsonText(text) as T | null, missing: true }
  }
  if (!response.ok) {
    throw createError({
      statusCode: response.status >= 400 && response.status < 500 ? response.status : 502,
      statusMessage: `${(init.method || 'GET').toUpperCase()} ${path}: ${errorMessageFromBody(text, `${response.status} ${response.statusText}`)}`
    })
  }
  return { response, data: parseJsonText(text) as T | null, missing: false }
}
