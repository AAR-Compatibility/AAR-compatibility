import '../Styles/role-pages.css'

type SRDHolderHomePageProps = {
  currentUser: import('../Services/authService').AuthUser | null
  onLogout: () => void
  onOpenViewer: () => void
  onOpenMySrd: () => void
  onOpenTankers: () => void
  onOpenReceivers: () => void
  onOpenBoth: () => void
}

// This page shows the SRD holder home screen and displays the logged-in user in the main title.
export default function SRDHolderHomePage({
  currentUser,
  onLogout,
  onOpenViewer,
  onOpenMySrd,
  onOpenTankers,
  onOpenReceivers,
  onOpenBoth,
}: SRDHolderHomePageProps) {
  const userDisplayName = currentUser?.name?.trim() || currentUser?.email || 'Unknown user'

  return (
    <div className="role-page">
      <header className="role-page__header">
        <div>
          <span className="role-pill">SRD_holder</span>
          <h1 className="role-page__title">Current user: {userDisplayName}</h1>
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
          I am going to update my SRD information for:
        </p>
        <div className="srd-choice-grid" aria-label="SRD form choices">
          <button className="srd-choice-tile" type="button" onClick={onOpenTankers}>
            <span className="srd-choice-tile__title">Tanker</span>
            <span className="srd-choice-tile__desc">My tanker and a foreign receiver</span>
          </button>
          <button className="srd-choice-tile" type="button" onClick={onOpenReceivers}>
            <span className="srd-choice-tile__title">Receiver</span>
            <span className="srd-choice-tile__desc">My receiver and a foreign tanker</span>
          </button>
          <button
            className="srd-choice-tile srd-choice-tile--wide"
            type="button"
            onClick={onOpenBoth}
          >
            <span className="srd-choice-tile__title">Tanker and Receiver</span>
            <span className="srd-choice-tile__desc">Both, my tanker and my receiver</span>
          </button>
        </div>
      </section>
    </div>
  )
}
