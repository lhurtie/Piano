import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Check, X, Plus, Trash2 } from 'lucide-react'
import { patientsApi, sessionsApi, supervisionsApi } from '../api'
import type { Patient, Session, Supervision, PatientStatus } from '../types'

const STATUS_COLORS: Record<PatientStatus, string> = {
  'Probatorik': 'badge-blue',
  'Therapie laufend': 'badge-green',
  'Therapie abgeschlossen': 'badge-slate',
}

const PHASE_COLORS: Record<string, string> = {
  'Probatorik': 'badge-amber',
  'KZT1': 'badge-blue',
  'KZT2': 'badge-purple',
  'LZT': 'badge-green',
}

interface AddSessionModalProps {
  patientId: number
  defaultRevenue: number
  onClose: () => void
  onAdded: (session: Session) => void
}

function AddSessionModal({ patientId, defaultRevenue, onClose, onAdded }: AddSessionModalProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [revenue, setRevenue] = useState(String(defaultRevenue))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const session = await sessionsApi.create({
        patient_id: patientId,
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
          <h2 className="mb-6">Sitzung hinzufügen</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
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

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [supervisions, setSupervisions] = useState<Supervision[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Patient>>({})
  const [showAddSession, setShowAddSession] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      patientsApi.get(parseInt(id)),
      sessionsApi.list(parseInt(id)),
      supervisionsApi.list(),
    ])
      .then(([p, s, allSups]) => {
        setPatient(p)
        setEditData(p)
        setSessions(s)
        setSupervisions(allSups.filter((sup) => sup.patient_ids.includes(parseInt(id))))
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const saveEdit = async () => {
    if (!patient) return
    try {
      const updated = await patientsApi.update(patient.id, editData)
      setPatient(updated)
      setEditing(false)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const markCompleted = async () => {
    if (!patient || !confirm('Patient als "Therapie abgeschlossen" markieren?')) return
    try {
      const updated = await patientsApi.update(patient.id, { status: 'Therapie abgeschlossen' })
      setPatient(updated)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const deleteSession = async (sessionId: number) => {
    if (!confirm('Sitzung löschen?')) return
    try {
      await sessionsApi.delete(sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!patient) {
    return <div className="card text-center text-red-600">Patient nicht gefunden.</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/patients')}
          className="btn-ghost mb-4 -ml-2"
        >
          <ArrowLeft size={16} />
          Zurück
        </button>

        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-blue-700 font-bold text-lg">
                  {patient.chiffre.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                {editing ? (
                  <input
                    className="input text-xl font-bold mb-2"
                    value={editData.chiffre || ''}
                    onChange={(e) => setEditData({ ...editData, chiffre: e.target.value })}
                  />
                ) : (
                  <h1 className="font-mono">{patient.chiffre}</h1>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {editing ? (
                    <select
                      className="input text-sm py-1"
                      value={editData.status || patient.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value as PatientStatus })}
                    >
                      <option>Probatorik</option>
                      <option>Therapie laufend</option>
                      <option>Therapie abgeschlossen</option>
                    </select>
                  ) : (
                    <span className={STATUS_COLORS[patient.status]}>{patient.status}</span>
                  )}
                  <span className="text-sm text-slate-500">
                    {sessions.length} Sitzungen
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {editing ? (
                <>
                  <button onClick={saveEdit} className="btn-primary">
                    <Check size={16} /> Speichern
                  </button>
                  <button onClick={() => { setEditing(false); setEditData(patient) }} className="btn-secondary">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditing(true)} className="btn-secondary">
                    <Edit2 size={16} /> Bearbeiten
                  </button>
                  {patient.status !== 'Therapie abgeschlossen' && (
                    <button onClick={markCompleted} className="btn-secondary text-amber-700 border-amber-300">
                      Abschließen
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Probatorik info */}
          <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Antrag gesendet</label>
              {editing ? (
                <input
                  type="date"
                  className="input"
                  value={editData.antrag_gesendet_datum || ''}
                  onChange={(e) => setEditData({ ...editData, antrag_gesendet_datum: e.target.value || null })}
                />
              ) : (
                <div className="text-sm text-slate-700">
                  {patient.antrag_gesendet_datum
                    ? new Date(patient.antrag_gesendet_datum).toLocaleDateString('de-DE')
                    : '—'}
                </div>
              )}
            </div>
            <div>
              <label className="label">Antrag genehmigt</label>
              {editing ? (
                <input
                  type="date"
                  className="input"
                  value={editData.antrag_genehmigt_datum || ''}
                  onChange={(e) => setEditData({ ...editData, antrag_genehmigt_datum: e.target.value || null })}
                />
              ) : (
                <div className="text-sm text-slate-700">
                  {patient.antrag_genehmigt_datum
                    ? new Date(patient.antrag_genehmigt_datum).toLocaleDateString('de-DE')
                    : '—'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2>Sitzungen ({sessions.length})</h2>
          <button onClick={() => setShowAddSession(true)} className="btn-primary">
            <Plus size={16} /> Sitzung hinzufügen
          </button>
        </div>

        <div className="table-container bg-white">
          {sessions.length === 0 ? (
            <div className="text-center py-10 text-slate-500">Noch keine Sitzungen.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Datum</th>
                  <th>Phase</th>
                  <th>Dauer</th>
                  <th>Honorar</th>
                  <th>Notizen</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="text-slate-400 text-xs font-mono">{s.session_number}</td>
                    <td>{new Date(s.date).toLocaleDateString('de-DE')}</td>
                    <td>
                      <span className={PHASE_COLORS[s.phase || 'Probatorik'] || 'badge-slate'}>
                        {s.phase}
                      </span>
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
      </div>

      {/* Linked supervisions */}
      {supervisions.length > 0 && (
        <div>
          <h2 className="mb-3">Verknüpfte Supervisionen ({supervisions.length})</h2>
          <div className="table-container bg-white">
            <table>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Supervisor</th>
                  <th>Typ</th>
                  <th>Dauer</th>
                </tr>
              </thead>
              <tbody>
                {supervisions.map((s) => (
                  <tr key={s.id}>
                    <td>{new Date(s.date).toLocaleDateString('de-DE')}</td>
                    <td>{s.supervisor_name}</td>
                    <td>
                      <span className={s.type === 'Einzel' ? 'badge-blue' : 'badge-purple'}>
                        {s.type}
                      </span>
                    </td>
                    <td>{s.duration_minutes} Min.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddSession && (
        <AddSessionModal
          patientId={patient.id}
          defaultRevenue={90}
          onClose={() => setShowAddSession(false)}
          onAdded={(s) => {
            setSessions((prev) => [s, ...prev].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            ))
            setShowAddSession(false)
          }}
        />
      )}
    </div>
  )
}
