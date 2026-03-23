export type AuthUser = {
  id: number | string
  name: string
  email: string
  role: string
}

type LoginPayload = {
  email: string
  password: string
}

type LoginResponse = {
  token: string
  user: AuthUser
}

export type CreateUserPayload = {
  email: string
  password: string
  role: 'viewer' | 'srd_holder'
  name?: string
}

type CreateUserResponse = {
  user: AuthUser
}

type MeResponse = {
  user: {
    id?: number | string
    sub?: number | string
    name?: string
    email?: string
    role?: string
  }
}

const TOKEN_KEY = 'aar_auth_token'

// Gets an error message from the response, or uses a fallback.
async function getErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string; message?: string }
    return data.error ?? data.message ?? fallback
  } catch {
    return fallback
  }
}

// Reads the JWT token from localStorage.
export function getStoredAuthToken() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(TOKEN_KEY) ?? ''
}

// Stores the JWT token in localStorage.
export function storeAuthToken(token: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TOKEN_KEY, token)
}

// Removes the JWT token from localStorage.
export function clearAuthToken() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_KEY)
}

// Logs in through the backend and returns token + user.
export async function loginWithCredentials(
  payload: LoginPayload,
): Promise<LoginResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Login failed.'))
  }

  return (await response.json()) as LoginResponse
}

// Loads the current user using the stored token.
export async function fetchCurrentUser(
  token = getStoredAuthToken(),
): Promise<AuthUser> {
  if (!token) {
    throw new Error('No token available.')
  }

  const response = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to load user.'))
  }

  const data = (await response.json()) as MeResponse
  const user = data.user

  if (!user || !user.email || !user.role) {
    throw new Error('Invalid user payload.')
  }

  return {
    id: user.id ?? user.sub ?? '',
    name: user.name ?? '',
    email: user.email,
    role: user.role,
  }
}

// Creates a new viewer or SRD holder account for admin users.
export async function createUserAccount(
  payload: CreateUserPayload,
  token = getStoredAuthToken(),
): Promise<CreateUserResponse> {
  if (!token) {
    throw new Error('No token available.')
  }

  const response = await fetch('/api/auth/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to create account.'))
  }

  return (await response.json()) as CreateUserResponse
}
