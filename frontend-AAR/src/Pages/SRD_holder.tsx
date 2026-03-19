import '../Styles/role-pages.css'

type SRDHolderHomePageProps = {
  onLogout: () => void
  onOpenViewer: () => void
  onOpenMySrd: () => void
  onOpenTankers: () => void
  onOpenReceivers: () => void
}

// SRD home page where users choose which form page to open.
export default function SRDHolderHomePage({
  onLogout,
  onOpenViewer,
  onOpenMySrd,
  onOpenTankers,
  onOpenReceivers,
}: SRDHolderHomePageProps) {
  return (
    <div className="role-page">
      <header className="role-page__header">
        <div>
          <span className="role-pill">SRD_holder</span>
          <h1 className="role-page__title">SRD_holder</h1>
        </div>
        <div className="role-header-controls">
          <button className="btn ghost" type="button" onClick={onLogout}>
            Logout
          </button>
          <section className="role-quick-actions" aria-label="SRD holder actions">
            <ul className="role-quick-actions__list">
              <li>
                <button className="role-quick-actions__link" type="button" onClick={onOpenViewer}>
                  Go to Viewer
                </button>
              </li>
              <li>
                <button className="role-quick-actions__link" type="button" onClick={onOpenMySrd}>
                  My SRD
                </button>
              </li>
            </ul>
          </section>
        </div>
      </header>

      <section className="role-card">
        <p className="viewer-intro">
          Choose Tankers or Receivers to continue. 
        </p>
        <div className="srd-choice-grid" aria-label="SRD form choices">
          <button className="srd-choice-tile" type="button" onClick={onOpenTankers}>
            <span className="srd-choice-tile__title">Tankers</span>
            <span className="srd-choice-tile__desc">Open the tanker form page.</span>
          </button>
          <button className="srd-choice-tile" type="button" onClick={onOpenReceivers}>
            <span className="srd-choice-tile__title">Receivers</span>
            <span className="srd-choice-tile__desc">Open the receiver form page.</span>
          </button>
        </div>
      </section>
    </div>
  )
}
