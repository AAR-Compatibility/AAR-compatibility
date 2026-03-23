import '../Styles/login.css'
import {useState } from 'react'
import { getsrdByNation } from '../Services/srdService'

type SRD = {
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

type MySrdPageProps = {
  onBack: () => void
  onOpenViewer: () => void
  onLogout: () => void
}

export default function MySrdPage({ onBack }: { onBack: () => void }) {
  const [nation, setNation] = useState('')
  const [data, setData] = useState<SRD[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (!nation) return

    setLoading(true)
    setError('')

    try {
      const result = await getsrdByNation(nation)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SRD data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="role-page">
      <header className="role-page__header">
        <h1>My SRD</h1>
        <button className="btn ghost" onClick={onBack}>
          Back
        </button>
      </header>

      <section className="role-card">
        <div>
          <input
            type="text"
            placeholder="Enter nation (e.g. NL)"
            value={nation}
            onChange={(e) => setNation(e.target.value)}
          />
          <button onClick={handleSearch}>Search</button>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="viewer-error">{error}</p>}

        <ul>
          {data.map((item) => (
            <li key={item.id}>
              {item.tanker_model} → {item.receiver_model}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}