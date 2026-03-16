const DEFAULT_API_BASE_PATH = '/api'

function normalizeBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim()
  if (!trimmed) {
    return DEFAULT_API_BASE_PATH
  }

  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

export function buildApiUrl(path: string) {
  const configuredBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL ?? '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (configuredBaseUrl === DEFAULT_API_BASE_PATH) {
    return `${DEFAULT_API_BASE_PATH}${normalizedPath}`
  }

  return `${configuredBaseUrl}${normalizedPath}`
}
