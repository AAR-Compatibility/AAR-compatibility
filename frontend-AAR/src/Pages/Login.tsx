// Handles role-based sign-in and supports browser credential autofill/save.
import { useEffect, useState, type FormEvent } from 'react'
import Header from '../Components/Layout/Header'
import Footer from '../Components/Layout/Footer'
import AdminPage from './Admin'
import SRD_holderPage from './SRD_holder'
import TankersPage from './Tankers'
import ReceiversPage from './Receivers'
import BothPage from './Both'
import ViewerPage from './Viewer'
import CreateAccountPage from './CreateAccount'
import PictureAAR from '../Assets/Picture AAR.jpg'
import {
  clearAuthToken,
  fetchCurrentUser,
  getStoredAuthToken,
  loginWithCredentials,
  storeAuthToken,
  type AuthUser,
} from '../Services/authService'
import '../Styles/login.css'

type Role = 'admin' | 'srd_holder' | 'viewer'
type Step = 'select' | 'login' | 'dashboard' | 'create-account'
type SRDView = 'home' | 'tankers' | 'receivers' | 'both'

const ROLE_OPTIONS: Array<{ key: Role; title: string }> = [
  { key: 'admin', title: 'Admin' },
  { key: 'srd_holder', title: 'SRD Holder' },
  { key: 'viewer', title: 'Viewer' },
]

const ROLE_DETAILS: Record<
  Role,
  { label: string; intro: string; highlight: string; quick: string }
> = {
  admin: {
    label: 'Admin',
    intro: 'You get access to administration and reporting.',
    highlight: 'Verify your account to continue.',
    quick: 'Prioritize accounts, roles, and audits.',
  },
  srd_holder: {
    label: 'SRD Holder',
    intro: 'You get access to technical workflows and tooling.',
    highlight: 'Sign in to open your workbench.',
    quick: 'Work on tickets, risks, and releases.',
  },
  viewer: {
    label: 'Viewer',
    intro: 'You get access to the viewer environment.',
    highlight: 'Sign in to open the viewer.',
    quick: 'Search and review compatibility results.',
  },
}

type LoginCredentials = {
  email: string
  password: string
}

type AuthResult = { ok: boolean; message?: string; user?: AuthUser }

// Maps backend role values to valid frontend roles.
function normalizeRole(role: string): Role | null {
  const normalized = role.trim().toLowerCase()
  if (
    normalized !== 'admin' &&
    normalized !== 'srd_holder' &&
    normalized !== 'viewer'
  ) {
    return null
  }
  return normalized
}

// Logs in through the backend and returns user data.
async function authenticateUser(
  credentials: LoginCredentials,
): Promise<AuthResult> {
  try {
    const data = await loginWithCredentials(credentials)
    storeAuthToken(data.token)
    return { ok: true, user: data.user }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Login failed unexpectedly.'
    return { ok: false, message }
  }
}

// Login screen with role selection and redirect to the matching dashboard.
export default function Login() {
  const [step, setStep] = useState<Step>('select')
  const [activeRole, setActiveRole] = useState<Role | null>(null)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [srdView, setSrdView] = useState<SRDView>('home')
  const [viewerReturnRole, setViewerReturnRole] = useState<Exclude<Role, 'viewer'> | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isRestoringSession, setIsRestoringSession] = useState(true)

  // Restores an active session from the stored JWT token.
  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      setIsRestoringSession(false)
      return
    }

    let cancelled = false

    const restoreSession = async () => {
      try {
        const user = await fetchCurrentUser(token)
        const restoredRole = normalizeRole(user.role)

        if (!restoredRole) {
          clearAuthToken()
          return
        }

        if (!cancelled) {
          setCurrentUser(user)
          setActiveRole(restoredRole)
          if (restoredRole === 'srd_holder') {
            setSrdView('home')
          }
          setStep('dashboard')
        }
      } catch {
        clearAuthToken()
      } finally {
        if (!cancelled) {
          setIsRestoringSession(false)
        }
      }
    }

    void restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

  // Selects a role and moves the user to the login step.
  const handleRoleSelect = (role: Role) => {
    setActiveRole(role)
    setLoginError('')
    setStep('login')
  }

  // Resets the flow to the initial selection state.
  const handleReset = () => {
    clearAuthToken()
    setStep('select')
    setActiveRole(null)
    setCurrentUser(null)
    setSrdView('home')
    setViewerReturnRole(null)
    setEmail('')
    setPassword('')
    setLoginError('')
  }

  // Opens one of the role dashboards from in-app quick actions.
  const handleOpenDashboard = (role: Role) => {
    if (role === 'viewer' && activeRole && activeRole !== 'viewer') {
      setViewerReturnRole(activeRole)
    }
    if (role !== 'viewer') {
      setViewerReturnRole(null)
    }
    if (role === 'srd_holder') {
      setSrdView('home')
    }
    setActiveRole(role)
    setStep('dashboard')
    setLoginError('')
  }

  const handleOpenSrdView = (nextView: SRDView) => {
    setActiveRole('srd_holder')
    setSrdView(nextView)
    setStep('dashboard')
    setLoginError('')
  }

  const handleHeaderHome = () => {
    if (currentUser && (activeRole === 'srd_holder' || viewerReturnRole === 'srd_holder')) {
      setActiveRole('srd_holder')
      setSrdView('home')
      setStep('dashboard')
      setViewerReturnRole(null)
      setLoginError('')
      window.location.hash = '#/'
      return
    }

    window.location.hash = '#/'
    handleReset()
  }

  // Opens the dedicated admin page to create a new account.
  const handleCreateAccount = () => {
    if (activeRole !== 'admin') return
    setStep('create-account')
    setLoginError('')
  }

  // Returns to the active dashboard, or falls back to role selection.
  const handleBackFromCreateAccount = () => {
    if (activeRole) {
      setStep('dashboard')
      return
    }
    setStep('select')
  }

  // Sends login to the backend and validates the selected role.
  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeRole) return

    setLoginError('')
    const result = await authenticateUser({
      email,
      password,
    })

    if (!result.ok) {
      setLoginError(result.message ?? 'Login failed.')
      return
    }

    if (!result.user) {
      setLoginError('No user data returned from backend.')
      clearAuthToken()
      return
    }

    const backendRole = normalizeRole(result.user.role)
    if (!backendRole) {
      setLoginError('Unknown role returned by backend.')
      clearAuthToken()
      return
    }

    if (backendRole !== activeRole) {
      setLoginError(`This account belongs to the "${backendRole}" role.`)
      clearAuthToken()
      return
    }

    setActiveRole(backendRole)
    setCurrentUser(result.user)
    if (backendRole === 'srd_holder') {
      setSrdView('home')
    }
    setStep('dashboard')
    setEmail('')
    setPassword('')
  }

  const currentRole = activeRole ? ROLE_DETAILS[activeRole] : null
  const showRolePage = step === 'dashboard' && activeRole !== null

  return (
    <div className="login-shell">
      <Header onHome={handleHeaderHome} />
      <main className={showRolePage || step === 'create-account' ? 'role-main' : 'login-main'}>
        {isRestoringSession ? (
          <section className="login-card" aria-live="polite">
            <div className="step-panel">
              <p className="muted">Restoring session...</p>
            </div>
          </section>
        ) : step === 'create-account' ? (
          <CreateAccountPage onBack={handleBackFromCreateAccount} />
        ) : showRolePage ? (
          activeRole === 'admin' ? (
            <AdminPage
              currentUser={currentUser}
              onLogout={handleReset}
              onOpenViewer={() => handleOpenDashboard('viewer')}
              onCreateAccount={handleCreateAccount}
            />
          ) : activeRole === 'srd_holder' ? (
            srdView === 'tankers' ? (
              <TankersPage
                onLogout={handleReset}
                onOpenViewer={() => handleOpenDashboard('viewer')}
                onOpenMySrd={() => handleOpenSrdView('home')}
              />
            ) : srdView === 'receivers' ? (
              <ReceiversPage
                onLogout={handleReset}
                onOpenViewer={() => handleOpenDashboard('viewer')}
                onOpenMySrd={() => handleOpenSrdView('home')}
              />
            ) : srdView === 'both' ? (
              <BothPage
                onLogout={handleReset}
                onOpenViewer={() => handleOpenDashboard('viewer')}
                onOpenMySrd={() => handleOpenSrdView('home')}
              />
            ) : (
              <SRD_holderPage
                currentUser={currentUser}
                onLogout={handleReset}
                onOpenViewer={() => handleOpenDashboard('viewer')}
                onOpenMySrd={() => handleOpenSrdView('home')}
                onOpenTankers={() => handleOpenSrdView('tankers')}
                onOpenReceivers={() => handleOpenSrdView('receivers')}
                onOpenBoth={() => handleOpenSrdView('both')}
              />
            )
          ) : (
            <ViewerPage
              onLogout={handleReset}
              onBack={
                viewerReturnRole
                  ? () => handleOpenDashboard(viewerReturnRole)
                  : undefined
              }
              backLabel={
                viewerReturnRole === 'admin'
                  ? 'Back to Admin'
                  : viewerReturnRole === 'srd_holder'
                    ? 'Back to SRD Holder'
                    : 'Back'
              }
            />
          )
        ) : (
          <section className="login-card" aria-live="polite">
            {step === 'select' && (
              <div className="step-panel">
                <div className="role-grid">
                  {ROLE_OPTIONS.map((role) => (
                    <button
                      key={role.key}
                      className="role-button"
                      data-role={role.key}
                      type="button"
                      onClick={() => handleRoleSelect(role.key)}
                    >
                      <span className="role-title">{role.title}</span>
                    </button>
                  ))}
                </div>
                <div className="login-image" aria-hidden="true">
                  <img src={PictureAAR} alt="" />
                </div>
                <p className="welcome-copy">
                  Welcome to the AAR Technical Compatibility Matrix
                  <br />
                  A structured web application for submitting, reviewing, and consulting compatibility changes and related technical data in a controlled and traceable way. Designed to improve efficiency, consistency, and role-based collaboration within the JAPCC AAR process.
                </p>
              </div>
            )}

            {step === 'login' && currentRole && (
              <div className="step-panel">
                <div className="step-top">
                  <div>
                    <span className="role-pill">{currentRole.label}</span>
                    <h2>Sign in as {currentRole.label}</h2>
                    <p className="muted">{currentRole.highlight}</p>
                  </div>
                  <button className="btn ghost" type="button" onClick={handleReset}>
                    Different role
                  </button>
                </div>
                <form className="login-form" onSubmit={handleLogin} autoComplete="on">
                  <label className="input-group">
                    Email
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@domain.com"
                      autoComplete="username"
                      required
                    />
                  </label>
                  <label className="input-group">
                    Password
                    <input
                      id="login-password"
                      name="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="********"
                      autoComplete="current-password"
                      required
                    />
                  </label>
                  {loginError && <p className="login-error">{loginError}</p>}
                  <div className="form-footer">
                    <span className="muted">{currentRole.intro}</span>
                    <div className="button-row">
                      <button className="btn ghost" type="button" onClick={handleReset}>
                        Cancel
                      </button>
                      <button className="btn primary" type="submit">
                        Sign in
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
