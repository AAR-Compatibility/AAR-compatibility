import { getStoredAuthToken } from './authService'
import { buildApiUrl } from './api'

export type ViewerPayload = {
  tankerNation: string
  tankerType: string
  tankerModel: string
  receiverNation: string
  receiverType: string
  receiverModel: string
}

export type ViewerResultRow = {
  c_tanker: string | null
  c_receiver: string | null
  v_srd_tanker: string | null
  v_srd_receiver: string | null
  boom_pod_bda: string | null
  min_alt: number | null
  max_alt: number | null
  min_as: number | null
  max_as_kcas: number | null
  max_as_m: number | null
  fuel_flow_rate: number | null
  notes: string | null
}

type NationOptionTree = {
  nations: string[]
  byNation: Record<
    string,
    {
      types: string[]
      modelsByType: Record<string, string[]>
    }
  >
}

export type ViewerOptionsResponse = {
  tanker: NationOptionTree
  receiver: NationOptionTree
}

export type ViewerSearchResponse = {
  ok: boolean
  rows: ViewerResultRow[]
}

type ViewerResponse = {
  ok: boolean
  message?: string
}

// Builds headers and adds Authorization when a token exists.
function buildHeaders(includeJsonContentType = false): HeadersInit {
  const token = getStoredAuthToken()
  const headers: Record<string, string> = {}

  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

// Gets an error message from the response, or uses a fallback.
async function getErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string; message?: string }
    return data.error ?? data.message ?? fallback
  } catch {
    return fallback
  }
}

// Loads all viewer filter options for tanker and receiver.
export async function fetchViewerOptions(): Promise<ViewerOptionsResponse> {
  const response = await fetch(buildApiUrl('/viewer/options'), {
    headers: buildHeaders(),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to load options.'))
  }

  return (await response.json()) as ViewerOptionsResponse
}

// Sends the selected filters and returns matching viewer rows.
export async function searchViewer(
  payload: ViewerPayload,
): Promise<ViewerSearchResponse> {
  const response = await fetch(buildApiUrl('/viewer/search'), {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Database search failed.'))
  }

  return (await response.json()) as ViewerSearchResponse
}

// Submits a viewer request to the backend.
export async function submitViewerRequest(
  payload: ViewerPayload,
): Promise<ViewerResponse> {
  const response = await fetch(buildApiUrl('/viewer/submit'), {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Viewer submission failed.'))
  }

  return (await response.json()) as ViewerResponse
}
