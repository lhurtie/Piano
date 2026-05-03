import { useState, useEffect } from 'react'
import { Plus, Trash2, Search } from 'lucide-react'
import { sessionsApi, patientsApi, settingsApi } from '../api'
import type { Session, Patient } from '../types'

const PHASE_COLORS: Record<string, string> = {
  'Probatorik': 'badge-amber',
  'KZT1': 'badge-blue',
  'KZT2': 'badge-purple',
  'LZT': 'badge-green',
}

interface AddSessionModalProps {
  patients: Patient[]
  defaultRevenue: number
  onClose: () => void
  onAdded: (session: Session) => void
}

function AddSessionModal({ patients, defaultRevenue, onClose, onAdded }: AddSessionModalProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [patientId, setPatientId] = useState(patients[0]?.id?.toString() || '')
  const [date, setDate] = useState(today)
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [revenue, setRevenue] = useState(String(defaultRevenue))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId) return
    setLoading(true)
    setError('')
    try {
      const session = await sessionsApi.create({
        patient_id: parseInt(patientId),
        date,
        duration_minutes: duration ? parseInt(duration) : undefined,
        notes: notes || undefined,
        revenue_amount: parseFloat(revenue),
      })
      onAdded(session)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="mb-6">Neue Sitzung</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Patient *</label>
              <select
                className="input"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
              >
                <option value="">Patient auswählen...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.chiffre} ({p.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Datum *</label>
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Dauer (Minuten)</label>
              <input
                type="number"
                className="input"
                placeholder="50"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min={1}
              />
            </div>
            <div>
              <label className="label">Honorar (€)</label>
              <input
                type="number"
                className="input"
                step="0.01"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Notizen</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Optionale Notizen..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
                Abbrechen
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                {loading ? '...' : 'Hinzufügen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [defaultRevenue, setDefaultRevenue] = useState(90)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    Promise.all([
      sessionsApi.list(),
      patientsApi.list(true),
      settingsApi.get(),
    ]).then(([s, p, settings]) => {
      setSessions(s)
      setPatients(p)
      setDefaultRevenue(parseFloat(settings.default_session_revenue || '90'))
    }).finally(() => setLoading(false))
  }, [])

  const deleteSession = async (id: number) => {
    if (!confirm('Sitzung löschen?')) return
    await sessionsApi.delete(id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }

  const filtered = sessions.filter((s) =>
    !search ||
    s.patient_chiffre?.toLowerCase().includes(search.toLowerCase()) ||
    s.phase?.toLowerCase().includes(search.toLowerCase()),
  )

  const totalRevenue = filtered.reduce((sum, s) => sum + s.revenue_amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Sitzungen</h1>
          <p className="text-sm text-slate-500 mt-1">
            {sessions.length} Sitzungen · {totalRevenue.toFixed(2)} € gesamt
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Neue Sitzung
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Patient oder Phase suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-container bg-white">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Keine Sitzungen gefunden.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Patient</th>
                <th>#</th>
                <th>Phase</th>
                <th>Dauer</th>
                <th>Honorar</th>
                <th>Notizen</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{new Date(s.date).toLocaleDateString('de-DE')}</td>
                  <td>
                    <span className="font-mono text-slate-900">{s.patient_chiffre}</span>
                  </td>
                  <td className="text-slate-400 text-xs">{s.session_number}</td>
                  <td>
                    {s.phase && (
                      <span className={PHASE_COLORS[s.phase] || 'badge-slate'}>{s.phase}</span>
                    )}
                  </td>
                  <td className="text-slate-600">
                    {s.duration_minutes ? `${s.duration_minutes} Min.` : '—'}
                  </td>
                  <td className="font-medium">{s.revenue_amount.toFixed(2)} €</td>
                  <td className="text-slate-500 text-xs max-w-xs truncate">
                    {s.notes || '—'}
                  </td>
                  <td>
                    <button
                      onClick={() => deleteSession(s.id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <AddSessionModal
          patients={patients}
          defaultRevenue={defaultRevenue}
          onClose={() => setShowModal(false)}
          onAdded={(s) => {
            setSessions((prev) => [s, ...prev])
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}
