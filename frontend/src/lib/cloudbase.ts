/**
 * CloudBase client (unified).
 * - `auth`  : TCB Auth v2 (login / session)
 * - `db`    : PostgreSQL client via app.rdb({ database: 'public' }) (PostgREST + RLS)
 * - `rpc`   : call PostgreSQL functions through the PG REST RPC endpoint
 * - `getAccessToken` : current user's JWT (empty string if not logged in / anonymous)
 */
import cloudbase from '@cloudbase/js-sdk'

const ENV_ID = import.meta.env.VITE_CLOUDBASE_ENV_ID || ''
const REGION = import.meta.env.VITE_CLOUDBASE_REGION || 'ap-shanghai'
const PUBLISH_KEY = import.meta.env.VITE_CLOUDBASE_PUBLISH_KEY || ''

const app = cloudbase.init({
  env: ENV_ID,
  region: REGION,
  accessKey: PUBLISH_KEY,
  auth: { detectSessionInUrl: true },
})

/** Auth client — used by AuthContext for login / session. */
export const auth = app.auth

/** PostgreSQL client — must pass { database: 'public' } to use the public schema. */
export const db = app.rdb({ database: 'public' })

export default app

/**
 * Get the current user's access_token (JWT).
 * Returns empty string for anonymous / not-logged-in sessions.
 */
export async function getAccessToken(): Promise<string> {
  try {
    const { data, error } = await (auth as any).getSession()
    if (error || !data?.session?.access_token) return ''
    // accessKey-scoped tokens are anonymous sessions — not a real login
    if (data.session.scope === 'accessKey') return ''
    return data.session.access_token
  } catch {
    return ''
  }
}

// ===================== RPC helper =====================
// @cloudbase/js-sdk@3.x has no db.rpc(); call the PG REST RPC endpoint directly.
const TCB_RPC_BASE = `https://${ENV_ID}.api.tcloudbasegateway.com/v1/rdb/rest/rpc`

async function getRpcToken(): Promise<string> {
  try {
    const { data, error } = await (auth as any).getSession()
    if (error || !data?.session?.access_token) return PUBLISH_KEY
    if (data.session.scope === 'accessKey') return PUBLISH_KEY
    return data.session.access_token
  } catch {
    return PUBLISH_KEY
  }
}

export async function rpc<T = any>(
  functionName: string,
  params?: Record<string, any>,
  options?: { select?: string; order?: string; limit?: number; offset?: number }
): Promise<T> {
  const token = await getRpcToken()
  const qs = new URLSearchParams()
  if (options?.select) qs.set('select', options.select)
  if (options?.order) qs.set('order', options.order)
  if (options?.limit !== undefined) qs.set('limit', String(options.limit))
  if (options?.offset !== undefined) qs.set('offset', String(options.offset))

  const queryStr = qs.toString()
  const url = `${TCB_RPC_BASE}/${functionName}${queryStr ? `?${queryStr}` : ''}`

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params || {}),
  })

  if (!resp.ok) {
    const errorText = await resp.text()
    throw new Error(`RPC ${functionName} failed (${resp.status}): ${errorText}`)
  }
  return resp.json()
}
