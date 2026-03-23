import { getStoredAuthToken } from './authService'

export type SrdRow = {
  id: number
  tanker_nation: string
  tanker_type: string
  tanker_model: string
  receiver_nation: string
  receiver_type: string
  receiver_model: string
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

function buildHeaders(): HeadersInit {
  const token = getStoredAuthToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function getsrdByNation(nation: string) {
  const response = await fetch(
    `http://localhost:3000/api/srd/search?nation=${encodeURIComponent(nation)}`
  )

  if (!response.ok) {
    throw new Error('Failed to fetch SRD data')
  }

  return await response.json()
}