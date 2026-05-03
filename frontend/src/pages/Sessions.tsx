import { useState, useEffect } from 'react'
import { Plus, Trash2, Search, Edit2, FileText, Archive, X, SlidersHorizontal } from 'lucide-react'
import { sessionsApi, patientsApi, settingsApi, exportApi } from '../api'
import type { Session, Patient, Settings } from '../types'
import { addRipple, delay } from '../utils/juice'

const PHASE_COLORS: Record<string, string> = {
  'Probatorik': 'badge-amber',
  'KZT1': 'badge-blue',
  'KZT2': 'badge-purple',
  'LZT': 'badge-green',
}

function downloadFilteredCsv(sessions: Session[]) {
  const BOM = '﻿'
  const header = ['ID', 'Patient', 'Datum', 'Typ', 'Phase', 'Nr.', 'Dauer (Min)', 'Honorar (EUR)', 'Notizen'].join(';')
  const rows = sessions.map((s) => [
    s.id,
    s.patient_chiffre ?? '',
    new Date(s.date).toLocaleDateString('de-DE'),
    s.session_type ?? '',
    s.phase ?? '',
    s.session_number ?? '',
    s.duration_minutes ?? '',
    s.revenue_amount.toFixed(2).replace('.', ','),
    (s.notes ?? '').replace(/[\n\r;]/g, ' '),
  ].join(';'))
  const csv = BOM + [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `piano_sitzungen_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface SessionFormProps {
  patients: Patient[]
  settings: Settings
  initial?: Partial<Session>
  onClose: () => void
  onSaved: (session: Session) => void
}

function SessionFormModal({ patients, settings, initial, onClose, onSaved }: SessionFormProps) {
  const isEdit = !!initial?.id
  const today = new Date().toISOString().slice(0, 10)

  const getDefaultRevenue = (type: string) => {
    if (type === 'Probatorik') return settings.default_revenue_probatorik || '33.57'
    return settings.default_revenue_einzel || '45.80'
  }

  const getDefaultTypeForPatient = (pid: string) => {
    if (isEdit) return initial?.session_type ?? 'Einzelsitzung'
    const p = patients.find((p) => String(p.id) === pid)
    if (!p) return 'Einzelsitzung'
    return (p.session_count + 1) <= 4 ? 'Probatorik' : 'Einzelsitzung'
  }

  const initialPid = String(initial?.patient_id ?? patients[0]?.id ?? '')
  const initialType = initial?.session_type ?? getDefaultTypeForPatient(initialPid)

  const [patientId, setPatientId] = useState(initialPid)
  const [date, setDate] = useState(initial?.date ?? today)
  const [sessionType, setSessionType] = useState(initialType)
  const [duration, setDuration] = useState(
    initial?.duration_minutes != null ? String(initial.duration_minutes) : '50'
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [revenue, setRevenue] = useState(
    initial?.revenue_amount !== undefined
      ? String(initial.revenue_amount)
      : getDefaultRevenue(initialType)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handlePatientChange = (pid: string) => {
    setPatientId(pid)
    if (!isEdit) {
      const newType = getDefaultTypeForPatient(pid)
      setSessionType(newType)
      setRevenue(getDefaultRevenue(newType))
    }
  }

  const handleTypeChange = (t: string) => {
    setSessionType(t)
    setRevenue(getDefaultRevenue(t))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId) return
    setLoading(true)
    setError('')
    try {
      let session: Session
      const payload = {
        patient_id: parseInt(patientId),
        date,
        session_type: sessionType,
        duration_minutes: duration !== '' ? parseInt(duration) : 50,
        notes: notes || undefined,
        revenue_amount: parseFloat(revenue),
      }
      if (isEdit && initial?.id) {
        session = await sessionsApi.update(initial.id, payload)
      } else {
        session = await sessionsApi.create(payload)
      }
      setSuccess(true)
      await delay(250)
      onSaved(session)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content${success ? ' success-flash' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="mb-5">{isEdit ? 'Sitzung bearbeiten' : 'Neue Sitzung'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isEdit && (
              <div>
                <label className="label">Patient *</label>
                <select
                  className="input input-juice"
                  value={patientId}
                  onChange={(e) => handlePatientChange(e.target.value)}
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
            )}
            <div>
              <label className="label">Sitzungstyp</label>
              <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                {(['Probatorik', 'Einzelsitzung'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={(e) => { addRipple(e); handleTypeChange(t) }}
                    className={`btn-juice ripple-container flex-1 py-2 text-sm font-medium transition-colors ${
                      sessionType === t
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Datum *</label>
              <input
                type="date"
                className="input input-juice w-full"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Dauer (Minuten)</label>
              <input
                type="number"
                className="input input-juice"
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
                className="input input-juice"
                step="0.01"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Notizen</label>
              <textarea
                className="input input-juice resize-none"
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
              <button type="button" onClick={onClose} className="btn-secondary btn-juice ripple-container flex-1 justify-center" onMouseDown={addRipple}>
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary btn-juice ripple-container flex-1 justify-center"
                onMouseDown={addRipple}
              >
                {loading ? '...' : isEdit ? 'Speichern' : 'Hinzufügen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

interface DeleteConfirmProps {
  session: Session
  onClose: () => void
  onDeleted: (id: number) => void
}

function DeleteConfirmModal({ session, onClose, onDeleted }: DeleteConfirmProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)

  const handleFinalDelete = async () => {
    setLoading(true)
    try {
      await sessionsApi.delete(session.id)
      onDeleted(session.id)
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 text-center">
          {step === 1 ? (
            <>
              <div className="text-3xl mb-3">🗑️</div>
              <h2 className="mb-2 text-lg font-semibold">Sitzung wirklich löschen?</h2>
              <p className="text-sm text-slate-500 mb-5">
                Sitzung vom {new Date(session.date).toLocaleDateString('de-DE')} ({session.patient_chiffre})
              </p>
              <div className="flex gap-3">
                <button onClick={onClose} className="btn-secondary btn-juice ripple-container flex-1 justify-center" onMouseDown={addRipple}>Abbrechen</button>
                <button
                  onClick={(e) => { addRipple(e); setStep(2) }}
                  className="btn-primary btn-juice ripple-container flex-1 justify-center bg-red-600 hover:bg-red-700"
                >
                  Löschen
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-3xl mb-3">⚠️</div>
              <h2 className="mb-2 text-lg font-semibold text-red-700">Nicht rückgängig machbar</h2>
              <p className="text-sm text-slate-500 mb-5">
                Die Sitzung wird endgültig gelöscht. Bist du sicher?
              </p>
              <div className="flex gap-3">
                <button onClick={onClose} className="btn-secondary btn-juice ripple-container flex-1 justify-center" onMouseDown={addRipple}>Abbrechen</button>
                <button
                  onClick={(e) => { addRipple(e); handleFinalDelete() }}
                  disabled={loading}
                  className="btn-primary btn-juice ripple-container flex-1 justify-center bg-red-600 hover:bg-red-700"
                >
                  {loading ? '...' : 'Endgültig löschen'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editSession, setEditSession] = useState<Session | null>(null)
  const [deleteSession, setDeleteSession] = useState<Session | null>(null)
  const [newSessionId, setNewSessionId] = useState<number | null>(null)
  const [collapsingId, setCollapsingId] = useState<number | null>(null)
  const [exportingPdf, setExportingPdf] = useState(false)

  useEffect(() => {
    Promise.all([
      sessionsApi.list(),
      patientsApi.list(true),
      settingsApi.get(),
    ]).then(([s, p, st]) => {
      setSessions(s)
      setPatients(p)
      setSettings(st)
    }).finally(() => setLoading(false))
  }, [])

  const filtered = sessions.filter((s) => {
    if (
      search &&
      !s.patient_chiffre?.toLowerCase().includes(search.toLowerCase()) &&
      !s.phase?.toLowerCase().includes(search.toLowerCase()) &&
      !s.session_type?.toLowerCase().includes(search.toLowerCase())
    ) return false
    if (fromDate && s.date < fromDate) return false
    if (toDate && s.date > toDate) return false
    return true
  })

  const totalRevenue = filtered.reduce((sum, s) => sum + s.revenue_amount, 0)
  const hasDateFilter = !!(fromDate || toDate)

  const handleDeleted = async (id: number) => {
    setCollapsingId(id)
    await delay(350)
    setSessions((prev) => prev.filter((s) => s.id !== id))
    setCollapsingId(null)
    setDeleteSession(null)
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sitzungen</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length !== sessions.length
              ? `${filtered.length} von ${sessions.length} Sitzungen · ${totalRevenue.toFixed(2)} € gefiltert`
              : `${sessions.length} Sitzungen · ${totalRevenue.toFixed(2)} € gesamt`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={async () => { setExportingPdf(true); try { await exportApi.downloadPdf() } finally { setExportingPdf(false) } }}
            disabled={exportingPdf}
            className="btn-secondary btn-juice ripple-container text-sm gap-1.5"
          >
            <FileText size={14} /> {exportingPdf ? '...' : 'PDF'}
          </button>
          <button
            onClick={() => downloadFilteredCsv(filtered)}
            className="btn-secondary btn-juice ripple-container text-sm gap-1.5"
            title={hasDateFilter ? `${filtered.length} gefilterte Sitzungen exportieren` : 'Alle Sitzungen exportieren'}
          >
            <Archive size={14} /> CSV{hasDateFilter ? ` (${filtered.length})` : ''}
          </button>
          <button
            onClick={(e) => { addRipple(e); setShowModal(true) }}
            className="btn-primary btn-juice ripple-container"
          >
            <Plus size={16} /> Neue Sitzung
          </button>
        </div>
      </div>

      {/* Search + Filter toggle */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input input-juice pl-9"
            placeholder="Patient, Phase oder Typ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => { setShowFilterPanel((v) => !v); if (showFilterPanel) { setFromDate(''); setToDate('') } }}
          className={`btn-secondary btn-juice ripple-container gap-1.5 whitespace-nowrap ${(showFilterPanel || hasDateFilter) ? 'ring-2 ring-blue-400 text-blue-700' : ''}`}
        >
          <SlidersHorizontal size={15} />
          Zeitraum{hasDateFilter ? ' ✓' : ''}
        </button>
      </div>

      {/* Date filter panel */}
      {showFilterPanel && (
        <div className="flex flex-wrap gap-3 items-center p-3 bg-blue-50 rounded-xl border border-blue-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 whitespace-nowrap">Von</span>
            <input
              type="date"
              className="input text-sm"
              style={{ width: 'auto', minWidth: 0 }}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 whitespace-nowrap">Bis</span>
            <input
              type="date"
              className="input text-sm"
              style={{ width: 'auto', minWidth: 0 }}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          {hasDateFilter && (
            <button
              onClick={() => { setFromDate(''); setToDate('') }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 transition-colors"
            >
              <X size={12} /> Löschen
            </button>
          )}
        </div>
      )}

      <div className="table-container bg-white overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Keine Sitzungen gefunden.</div>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Patient</th>
                <th>#</th>
                <th>Typ</th>
                <th>Phase</th>
                <th>Dauer</th>
                <th>Honorar</th>
                <th>Notizen</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className={
                    collapsingId === s.id
                      ? 'collapsing'
                      : newSessionId === s.id
                      ? 'slide-in-up'
                      : ''
                  }
                >
                  <td className="font-medium whitespace-nowrap">{new Date(s.date).toLocaleDateString('de-DE')}</td>
                  <td>
                    <span className="font-mono text-slate-900">{s.patient_chiffre}</span>
                  </td>
                  <td className="text-slate-400 text-xs">{s.session_number}</td>
                  <td>
                    <span className={s.session_type === 'Probatorik' ? 'badge-amber' : 'badge-blue'}>
                      {s.session_type}
                    </span>
                  </td>
                  <td>
                    {s.phase && (
                      <span className={PHASE_COLORS[s.phase] || 'badge-slate'}>{s.phase}</span>
                    )}
                  </td>
                  <td className="text-slate-600 whitespace-nowrap">
                    {s.duration_minutes ? `${s.duration_minutes} Min.` : '—'}
                  </td>
                  <td className="font-medium whitespace-nowrap">{s.revenue_amount.toFixed(2)} €</td>
                  <td className="text-slate-500 text-xs max-w-xs truncate">
                    {s.notes || '—'}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { addRipple(e); setEditSession(s) }}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors btn-juice ripple-container"
                        title="Bearbeiten"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => { addRipple(e); setDeleteSession(s) }}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors btn-juice ripple-container"
                        title="Löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && settings && (
        <SessionFormModal
          patients={patients}
          settings={settings}
          onClose={() => setShowModal(false)}
          onSaved={(s) => {
            setSessions((prev) => [s, ...prev])
            setNewSessionId(s.id)
            setTimeout(() => setNewSessionId(null), 1000)
            setShowModal(false)
          }}
        />
      )}

      {editSession && settings && (
        <SessionFormModal
          patients={patients}
          settings={settings}
          initial={editSession}
          onClose={() => setEditSession(null)}
          onSaved={(s) => {
            setSessions((prev) => prev.map((x) => (x.id === s.id ? s : x)))
            setEditSession(null)
          }}
        />
      )}

      {deleteSession && (
        <DeleteConfirmModal
          session={deleteSession}
          onClose={() => setDeleteSession(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
