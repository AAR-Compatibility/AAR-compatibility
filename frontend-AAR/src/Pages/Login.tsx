import { useState, type FormEvent } from 'react'
import Header from '../Components/Layout/Header'
import Footer from '../Components/Layout/Footer'
import AdminPage from './Admin'
import SRD_holderPage from './SRD_holder'
import ViewerPage from './Viewer'
import PictureAAR from '../Assets/Picture AAR.jpg'
import '../Styles/login.css'

type Role = 'admin' | 'srd_holder' | 'viewer'
type Step = 'select' | 'login' | 'dashboard'

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
  username: string
  password: string
  role: Role
}

type AuthResult = { ok: boolean; message?: string }

const DEMO_ACCOUNTS: Record<Role, { username: string; password: string } | null> =
  {
    admin: { username: 'admin', password: '12345' },
    srd_holder: { username: 'srd_holder', password: '12345' },
    viewer: { username: 'viewer', password: '12345' },
  }

// Checks whether the demo credentials match the selected role.
function isDemoMatch(credentials: LoginCredentials) {
  const demo = DEMO_ACCOUNTS[credentials.role]
  if (!demo) return false
  return (
    credentials.username === demo.username &&
    credentials.password === demo.password
  )
}

// Authenticates a user (placeholder for the future DB/API integration).
async function authenticateUser(credentials: LoginCredentials): Promise<AuthResult> {
  // TODO: replace this with an API call when the database is available.
  // Example: return fetch('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) })
  if (!isDemoMatch(credentials)) {
    return { ok: false, message: 'Invalid demo credentials.' }
  }
  return { ok: true }
}

// Login screen with role selection and redirect to the matching dashboard.
export default function Login() {
  const [step, setStep] = useState<Step>('select')
  const [activeRole, setActiveRole] = useState<Role | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  // Selects a role and moves the user to the login step.
  const handleRoleSelect = (role: Role) => {
    setActiveRole(role)
    setLoginError('')
    setStep('login')
  }

  // Resets the flow to the initial selection state.
  const handleReset = () => {
    setStep('select')
    setActiveRole(null)
    setUsername('')
    setPassword('')
    setLoginError('')
  }

  // Handles form submission and is the hook for DB-based authentication.
  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeRole) return
    setLoginError('')
    const result = await authenticateUser({
      username,
      password,
      role: activeRole,
    })
    if (!result.ok) {
      setLoginError(result.message ?? 'Login failed.')
      return
    }
    setStep('dashboard')
  }

  const currentRole = activeRole ? ROLE_DETAILS[activeRole] : null
  const showRolePage = step === 'dashboard' && activeRole !== null
  const demoAccount = activeRole ? DEMO_ACCOUNTS[activeRole] : null

  return (
    <div className="login-shell">
      <Header />
      <main className={showRolePage ? 'role-main' : 'login-main'}>
        {showRolePage ? (
          activeRole === 'admin' ? (
            <AdminPage onLogout={handleReset} />
          ) : activeRole === 'srd_holder' ? (
            <SRD_holderPage onLogout={handleReset} />
          ) : (
            <ViewerPage onLogout={handleReset} />
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
                <form className="login-form" onSubmit={handleLogin}>
                  <label className="input-group">
                    Username
                    <input
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="name"
                      autoComplete="username"
                      required
                    />
                  </label>
                  <label className="input-group">
                    Password
                    <input
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
                    <span className="muted">
                      Demo {currentRole.label}:{' '}
                      <strong>{demoAccount?.username}</strong> /{' '}
                      <strong>{demoAccount?.password}</strong>
                    </span>
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


