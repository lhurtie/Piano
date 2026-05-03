const BASE_URL = '/api'

function getToken(): string | null {
  return localStorage.getItem('piano_token')
}

function setToken(token: string): void {
  localStorage.setItem('piano_token', token)
}

function clearToken(): void {
  localStorage.removeItem('piano_token')
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  skipAuth = false,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (!skipAuth) {
    const token = getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unbekannter Fehler' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return res.json()
}

// Auth
export const authApi = {
  status: () => request<{ password_set: boolean }>('GET', '/auth/status', undefined, true),
  login: (password: string) =>
    request<{ access_token: string }>('POST', '/auth/login', { password }, true),
  setup: (password: string) =>
    request<{ access_token: string }>('POST', '/auth/setup', { password }, true),
  changePassword: (current_password: string, new_password: string) =>
    request<{ message: string }>('POST', '/auth/change-password', { current_password, new_password }),
  setToken,
  getToken,
  clearToken,
}

// Dashboard
export const dashboardApi = {
  get: () => request<import('./types').DashboardData>('GET', '/dashboard'),
}

// Patients
export const patientsApi = {
  list: (includeCompleted = true) =>
    request<import('./types').Patient[]>('GET', `/patients?include_completed=${includeCompleted}`),
  get: (id: number) => request<import('./types').Patient>('GET', `/patients/${id}`),
  create: (data: Partial<import('./types').Patient>) =>
    request<import('./types').Patient>('POST', '/patients', data),
  update: (id: number, data: Partial<import('./types').Patient>) =>
    request<import('./types').Patient>('PATCH', `/patients/${id}`, data),
  delete: (id: number) => request<void>('DELETE', `/patients/${id}`),
}

// Sessions
export const sessionsApi = {
  list: (patientId?: number) =>
    request<import('./types').Session[]>(
      'GET',
      patientId ? `/sessions?patient_id=${patientId}` : '/sessions',
    ),
  get: (id: number) => request<import('./types').Session>('GET', `/sessions/${id}`),
  create: (data: Partial<import('./types').Session>) =>
    request<import('./types').Session>('POST', '/sessions', data),
  update: (id: number, data: Partial<import('./types').Session>) =>
    request<import('./types').Session>('PATCH', `/sessions/${id}`, data),
  delete: (id: number) => request<void>('DELETE', `/sessions/${id}`),
}

// Supervisors
export const supervisorsApi = {
  list: () => request<import('./types').Supervisor[]>('GET', '/supervisors'),
  create: (name: string) =>
    request<import('./types').Supervisor>('POST', '/supervisors', { name }),
  update: (id: number, name: string) =>
    request<import('./types').Supervisor>('PUT', `/supervisors/${id}`, { name }),
  delete: (id: number) => request<void>('DELETE', `/supervisors/${id}`),
}

// Supervisions
export const supervisionsApi = {
  list: () => request<import('./types').Supervision[]>('GET', '/supervisions'),
  get: (id: number) => request<import('./types').Supervision>('GET', `/supervisions/${id}`),
  create: (data: Partial<import('./types').Supervision>) =>
    request<import('./types').Supervision>('POST', '/supervisions', data),
  update: (id: number, data: Partial<import('./types').Supervision>) =>
    request<import('./types').Supervision>('PATCH', `/supervisions/${id}`, data),
  delete: (id: number) => request<void>('DELETE', `/supervisions/${id}`),
}

// Finance
export const financeApi = {
  monthly: () => request<import('./types').MonthlyFinance[]>('GET', '/finance/monthly'),
  quarterly: () => request<import('./types').QuarterlyFinance[]>('GET', '/finance/quarterly'),
}

// Settings
export const settingsApi = {
  get: () => request<import('./types').Settings>('GET', '/settings'),
  update: (data: Partial<import('./types').Settings>) =>
    request<{ message: string }>('PATCH', '/settings', data),
}

// Export - these open downloads
export const exportApi = {
  downloadPdf: () => {
    const token = getToken()
    const url = `${BASE_URL}/export/pdf`
    const a = document.createElement('a')
    a.href = url
    // Can't set Authorization header via anchor tag, so we'll use fetch
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob)
        a.href = blobUrl
        a.download = `piano_export_${new Date().toISOString().slice(0, 10)}.pdf`
        a.click()
        URL.revokeObjectURL(blobUrl)
      })
  },
  downloadCsv: () => {
    const token = getToken()
    fetch(`${BASE_URL}/export/csv`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = `piano_export_${new Date().toISOString().slice(0, 10)}.zip`
        a.click()
        URL.revokeObjectURL(blobUrl)
      })
  },
}

// Backup
export const backupApi = {
  list: () => request<import('./types').BackupFile[]>('GET', '/backup'),
  create: () => request<{ message: string; filename: string }>('POST', '/backup/create'),
  download: (filename: string) => {
    const token = getToken()
    fetch(`${BASE_URL}/backup/download/${filename}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = filename
        a.click()
        URL.revokeObjectURL(blobUrl)
      })
  },
  delete: (filename: string) => request<void>('DELETE', `/backup/${filename}`),
}
