// This page lets admin create viewer or SRD holder accounts with hashed passwords.
import { useState, type FormEvent } from 'react'
import { createUserAccount, type CreateUserPayload } from '../Services/authService'
import '../Styles/role-pages.css'

type CreateAccountPageProps = {
  onBack: () => void
}

const ROLE_OPTIONS: Array<{ value: CreateUserPayload['role']; label: string }> = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'srd_holder', label: 'SRD Holder' },
]

export default function CreateAccountPage({ onBack }: CreateAccountPageProps) {
  const [role, setRole] = useState<CreateUserPayload['role']>('viewer')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    try {
      await createUserAccount({
        role,
        email,
        password,
        name: name.trim() || undefined,
      })
      setSuccess(`Account created for ${email} as ${role}.`)
      setEmail('')
      setPassword('')
      setName('')
      setRole('viewer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="role-page">
      <header className="role-page__header">
        <div>
          <span className="role-pill">Admin</span>
          <h1 className="role-page__title">Create Account</h1>
        </div>
        <button className="btn ghost" type="button" onClick={onBack}>
          Back to Admin
        </button>
      </header>

      <section className="role-card">
        <p className="viewer-intro">
          Create a new Viewer or SRD Holder account. Passwords are hashed automatically before storage.
        </p>
        <form className="create-account-form" onSubmit={handleSubmit} autoComplete="on">
          <div className="create-account-grid">
            <label className="viewer-field">
              <span>Role</span>
              <select
                name="role"
                value={role}
                onChange={(event) => setRole(event.target.value as CreateUserPayload['role'])}
                required
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="viewer-field">
              <span>Email</span>
              <input
                id="create-account-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@domain.com"
                autoComplete="username"
                required
              />
            </label>

            <label className="viewer-field">
              <span>Password</span>
              <input
                id="create-account-password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>

            <label className="viewer-field">
              <span>Name (optional)</span>
              <input
                name="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Display name"
                autoComplete="name"
              />
            </label>
          </div>

          {error && <p className="viewer-error">{error}</p>}
          {success && <p className="create-account-success">{success}</p>}

          <div className="viewer-form__footer">
            <button className="btn ghost" type="button" onClick={onBack}>
              Cancel
            </button>
            <button className="btn primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
