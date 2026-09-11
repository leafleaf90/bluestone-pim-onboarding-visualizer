export type PimEnv = 'test' | 'prod'

export type MapiConfig = {
  clientId: string
  clientSecret: string
}

export function getPimEnv(): PimEnv {
  const raw = String(useRuntimeConfig().pimEnv || process.env.PIM_ENV || 'test').trim().toLowerCase()
  return raw === 'prod' ? 'prod' : 'test'
}

export function idpTokenUrl() {
  return getPimEnv() === 'prod'
    ? 'https://idp.bluestonepim.com/op/token'
    : 'https://idp.test.bluestonepim.com/op/token'
}

export function apiHost() {
  return getPimEnv() === 'prod'
    ? 'https://api.bluestonepim.com'
    : 'https://api.test.bluestonepim.com'
}

export function appHost() {
  return getPimEnv() === 'prod'
    ? 'https://app.bluestonepim.com'
    : 'https://app.test.bluestonepim.com'
}

export function getMapiConfig(): MapiConfig {
  const config = useRuntimeConfig()
  return {
    clientId: String(config.mapiClientId || process.env.MAPI_CLIENT_ID || '').trim(),
    clientSecret: String(config.mapiClientSecret || process.env.MAPI_CLIENT_SECRET || '').trim()
  }
}

export function hasMapiCredentials() {
  const { clientId, clientSecret } = getMapiConfig()
  return Boolean(clientId && clientSecret)
}

export function requireMapiConfig() {
  const creds = getMapiConfig()
  if (creds.clientId && creds.clientSecret) return creds
  throw createError({
    statusCode: 503,
    statusMessage: 'MAPI keys missing. Set MAPI_CLIENT_ID and MAPI_CLIENT_SECRET in .env for this organisation.'
  })
}

export function getPapiKey() {
  return String(useRuntimeConfig().papiKey || process.env.PAPI_KEY || '').trim()
}

export function hasPapiKey() {
  return Boolean(getPapiKey())
}

export function requirePapiKey() {
  const key = getPapiKey()
  if (key) return key
  throw createError({
    statusCode: 503,
    statusMessage: 'PAPI key missing. Set PAPI_KEY in .env (published reads only).'
  })
}

type TokenCache = {
  accessToken: string
  expiresAt: number
}

const TOKEN_SKEW_MS = 60_000
let tokenCache: TokenCache | null = null
let tokenInflight: Promise<string> | null = null

type BluestoneErrorBody = {
  error?: string
  error_description?: string
  message?: string
}

async function requestAccessToken(includeScope: boolean) {
  const { clientId, clientSecret } = requireMapiConfig()
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret
  })
  if (includeScope) {
    body.set('scope', 'openid profile systemRoles permissions organization email name nickname')
  }

  const response = await fetch(idpTokenUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let detail = text
    try {
      const parsed = JSON.parse(text) as BluestoneErrorBody
      detail = parsed.error_description || parsed.error || parsed.message || text
    } catch {
      // keep raw text
    }
    throw createError({
      statusCode: 502,
      statusMessage: `MAPI token failed: ${detail || `${response.status} ${response.statusText}`}`
    })
  }

  const payload = await response.json() as {
    access_token?: string
    expires_in?: number
  }
  if (!payload.access_token) {
    throw createError({ statusCode: 502, statusMessage: 'MAPI token response had no access_token' })
  }
  return payload
}

async function refreshAccessToken(now: number) {
  let payload: { access_token?: string, expires_in?: number }
  try {
    payload = await requestAccessToken(true)
  } catch {
    payload = await requestAccessToken(false)
  }

  tokenCache = {
    accessToken: payload.access_token!,
    expiresAt: now + Math.max(30, payload.expires_in ?? 3600) * 1000
  }
  return tokenCache.accessToken
}

export async function getAccessToken() {
  const now = Date.now()
  if (tokenCache && tokenCache.expiresAt > now + TOKEN_SKEW_MS) {
    return tokenCache.accessToken
  }
  if (!tokenInflight) {
    tokenInflight = refreshAccessToken(now).finally(() => {
      tokenInflight = null
    })
  }
  return tokenInflight
}
