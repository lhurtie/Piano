import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Music2, Eye, EyeOff, Lock } from 'lucide-react'
import { authApi } from '../api'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'loading' | 'setup' | 'login'>('loading')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // If already logged in, redirect
    if (authApi.getToken()) {
      navigate('/dashboard')
      return
    }

    authApi.status().then((s) => {
      setMode(s.password_set ? 'login' : 'setup')
    }).catch(() => {
      setMode('login')
    })
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (mode === 'setup') {
      if (password.length < 4) {
        setError('Passwort muss mindestens 4 Zeichen lang sein')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwörter stimmen nicht überein')
        return
      }
    }

    setLoading(true)
    try {
      const res = mode === 'setup'
        ? await authApi.setup(password)
        : await authApi.login(password)

      authApi.setToken(res.access_token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Fehler beim Anmelden')
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4">
            <Music2 size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Piano</h1>
          <p className="text-slate-400 mt-1">Psychotherapie-Ausbildungstracker</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            {mode === 'setup' ? 'Passwort einrichten' : 'Anmelden'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {mode === 'setup'
              ? 'Richten Sie ein Passwort für Ihre Piano-App ein. Sie können es später in den Einstellungen ändern.'
              : 'Geben Sie Ihr Passwort ein, um fortzufahren.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Passwort</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-9 pr-10"
                  placeholder="Passwort eingeben"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'setup' && (
              <div>
                <label className="label">Passwort bestätigen</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input pl-9"
                    placeholder="Passwort wiederholen"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              ) : mode === 'setup' ? (
                'Passwort einrichten'
              ) : (
                'Anmelden'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
