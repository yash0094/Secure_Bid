const TOKEN_KEY = 'securebid_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request(method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    // FastAPI sends a plain string in `detail` for HTTPException, but a list
    // of {msg} objects for pydantic validation errors -- handle both shapes.
    const detailMsg = typeof data?.detail === 'string' ? data.detail : data?.detail?.[0]?.msg
    throw new ApiError(res.status, data?.error || detailMsg || `Request failed (${res.status})`)
  }
  return data
}

function withQuery(path: string, params?: Record<string, unknown>) {
  if (!params) return path
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    q.set(k, String(v))
  }
  const qs = q.toString()
  return qs ? `${path}?${qs}` : path
}

export const api = {
  get: (path: string, params?: Record<string, unknown>) => request('GET', withQuery(path, params)),
  post: (path: string, body?: unknown) => request('POST', path, body ?? {}),
  put: (path: string, body?: unknown) => request('PUT', path, body ?? {}),
  del: (path: string) => request('DELETE', path),
}
