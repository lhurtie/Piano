import { useState, useEffect } from 'react'
import { Plus, Search, Eye, EyeOff, Trash2, FileText, Archive, ChevronRight } from 'lucide-react'
import { patientsApi, sessionsApi, exportApi } from '../api'
import type { Patient, PatientStatus, Session } from '../types'
import BottomSheet from '../components/BottomSheet'

const STATUS_COLORS: Record<PatientStatus, string> = {
  'Probatorik': 'badge-blue',
  'Therapie laufend': 'badge-green',
  'Therapie abgeschlossen': 'badge-slate',
}

function getPhase(sessionCount: number): string {
  if (sessionCount <= 4) return 'Probatorik'
  if (sessionCount <= 16) return 'KZT1'
  if (sessionCount <= 28) return 'KZT2'
  return 'LZT'
}

// ── New Patient Form ────────────────────────────────────────────────────────

interface NewPatientFormProps {
  onCreated: (patient: Patient) => void
  onClose: () => void
}

function NewPatientForm({ onCreated, onClose }: NewPatientFormProps) {
  const [chiffre, setChiffre] = useState('')
  const [status, setStatus] = useState<PatientStatus>('Probatorik')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chiffre.trim()) return
    setLoading(true)
    setError('')
    try {
      const patient = await patientsApi.create({ chiffre: chiffre.trim(), status })
      onCreated(patient)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Chiffre *</label>
        <input
          className="input"
          placeholder="z.B. AA-23-M"
          value={chiffre}
          onChange={(e) => setChiffre(e.target.value)}
          autoFocus
          required
        />
      </div>
      <div>
        <label className="label">Status</label>
        <select
          className="input"
          value={status}
          onChange={(e) => setStatus(e.target.value as PatientStatus)}
        >
          <option value="Probatorik">Probatorik</option>
          <option value="Therapie laufend">Therapie laufend</option>
          <option value="Therapie abgeschlossen">Therapie abgeschlossen</option>
        </select>
      </div>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
          Abbrechen
        </button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
          {loading ? '...' : 'Erstellen'}
        </button>
      </div>
    </form>
  )
}

// ── Patient Detail Sheet ────────────────────────────────────────────────────

const PHASE_COLORS: Record<string, string> = {
  Probatorik: 'badge-blue',
  KZT1: 'badge-green',
  KZT2: 'badge-purple',
  LZT: 'badge-slate',
}

interface PatientDetailProps {
  patient: Patient
  onUpdated: (p: Patient) => void
  onDeleted: (id: number) => void
  onClose: () => void
}

function PatientDetailSheet({ patient, onUpdated, onDeleted, onClose }: PatientDetailProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [status, setStatus] = useState<PatientStatus>(patient.status)
  const [savingStatus, setSavingStatus] = useState(false)
  const [phaseOverride, setPhaseOverride] = useState<string>(patient.phase_override ?? '')
  const [deleteStep, setDeleteStep] = useState(0)
  const [deletingPatient, setDeletingPatient] = useState(false)
  const [exportLoading, setExportLoading] = useState<'pdf' | 'csv' | null>(null)

  useEffect(() => {
    sessionsApi.list(patient.id)
      .then(setSessions)
      .finally(() => setLoadingSessions(false))
  }, [patient.id])

  const handleStatusChange = async (newStatus: PatientStatus) => {
    setStatus(newStatus)
    setSavingStatus(true)
    try {
      const updated = await patientsApi.update(patient.id, { status: newStatus })
      onUpdated(updated)
    } finally {
      setSavingStatus(false)
    }
  }

  const handlePhaseOverride = async (val: string) => {
    setPhaseOverride(val)
    const updated = await patientsApi.update(patient.id, { phase_override: val || null } as any)
    onUpdated(updated)
  }

  const handleDelete = async () => {
    if (deleteStep === 0) { setDeleteStep(1); return }
    if (deleteStep === 1) { setDeleteStep(2); return }
    setDeletingPatient(true)
    try {
      await patientsApi.delete(patient.id)
      onDeleted(patient.id)
      onClose()
    } finally {
      setDeletingPatient(false)
    }
  }

  const handleExport = async (type: 'pdf' | 'csv') => {
    setExportLoading(type)
    try {
      if (type === 'pdf') await exportApi.downloadPatientPdf(patient.id, patient.chiffre)
      else await exportApi.downloadPatientCsv(patient.id, patient.chiffre)
    } finally {
      setExportLoading(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-2xl font-bold text-slate-900">{patient.chiffre}</div>
          <div className="mt-1">
            <span className={STATUS_COLORS[status]}>{status}</span>
          </div>
        </div>
        <div className="text-xs text-slate-400">
          seit {new Date(patient.created_at).toLocaleDateString('de-DE')}
        </div>
      </div>

      {/* Status change */}
      <div>
        <label className="label">Status ändern</label>
        <select
          className="input"
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as PatientStatus)}
          disabled={savingStatus}
        >
          <option value="Probatorik">Probatorik</option>
          <option value="Therapie laufend">Therapie laufend</option>
          <option value="Therapie abgeschlossen">Therapie abgeschlossen</option>
        </select>
      </div>

      {/* Phase override */}
      <div>
        <label className="label">Phase manuell setzen (überschreibt Auto-Berechnung)</label>
        <select
          className="input"
          value={phaseOverride}
          onChange={(e) => handlePhaseOverride(e.target.value)}
        >
          <option value="">Auto (aus Sitzungsnummer)</option>
          <option value="Probatorik">Probatorik</option>
          <option value="KZT1">KZT1</option>
          <option value="KZT2">KZT2</option>
          <option value="LZT">LZT</option>
        </select>
      </div>

      {/* Export */}
      <div className="flex gap-2">
        <button
          onClick={() => handleExport('pdf')}
          disabled={exportLoading !== null}
          className="btn-secondary flex-1 justify-center text-sm gap-1.5"
        >
          <FileText size={14} />
          {exportLoading === 'pdf' ? 'Laden...' : 'PDF'}
        </button>
        <button
          onClick={() => handleExport('csv')}
          disabled={exportLoading !== null}
          className="btn-secondary flex-1 justify-center text-sm gap-1.5"
        >
          <Archive size={14} />
          {exportLoading === 'csv' ? 'Laden...' : 'CSV'}
        </button>
      </div>

      {/* Sessions */}
      <div>
        <div className="text-sm font-semibold text-slate-700 mb-2">
          Sitzungen ({sessions.length})
        </div>
        {loadingSessions ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-4">Noch keine Sitzungen.</div>
        ) : (
          <div className="space-y-1.5">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PHASE_COLORS[s.phase || ''] || 'badge-slate'}`}>
                    {s.phase}
                  </span>
                  <span className="text-slate-700">{new Date(s.date).toLocaleDateString('de-DE')}</span>
                  <span className="text-xs text-slate-400">{s.session_type}</span>
                </div>
                <span className="font-medium text-slate-800">{s.revenue_amount.toFixed(2)} €</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Probatorik dates */}
      {(patient.antrag_gesendet_datum || patient.antrag_genehmigt_datum) && (
        <div className="bg-blue-50 rounded-xl p-3 space-y-1 text-sm">
          <div className="font-semibold text-blue-800 text-xs uppercase tracking-wide">Antrag</div>
          {patient.antrag_gesendet_datum && (
            <div className="text-slate-700">
              Gesendet: <span className="font-medium">{new Date(patient.antrag_gesendet_datum).toLocaleDateString('de-DE')}</span>
            </div>
          )}
          {patient.antrag_genehmigt_datum && (
            <div className="text-slate-700">
              Genehmigt: <span className="font-medium">{new Date(patient.antrag_genehmigt_datum).toLocaleDateString('de-DE')}</span>
            </div>
          )}
        </div>
      )}

      {/* Delete */}
      <div className="pt-2 border-t border-slate-100">
        {deleteStep === 0 && (
          <button
            onClick={handleDelete}
            className="w-full py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 size={14} /> Patient löschen
          </button>
        )}
        {deleteStep === 1 && (
          <div className="bg-red-50 rounded-xl p-3 text-center space-y-2">
            <div className="text-sm font-semibold text-red-700">Wirklich löschen?</div>
            <div className="text-xs text-red-500">Alle Sitzungen dieses Patienten werden ebenfalls gelöscht.</div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteStep(0)} className="btn-secondary flex-1 text-sm justify-center">Abbrechen</button>
              <button onClick={handleDelete} className="flex-1 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Löschen</button>
            </div>
          </div>
        )}
        {deleteStep === 2 && (
          <div className="bg-red-100 rounded-xl p-3 text-center space-y-2">
            <div className="text-sm font-bold text-red-800">⚠️ Nicht rückgängig machbar</div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteStep(0)} className="btn-secondary flex-1 text-sm justify-center">Abbrechen</button>
              <button
                onClick={handleDelete}
                disabled={deletingPatient}
                className="flex-1 py-1.5 bg-red-700 text-white rounded-lg text-sm font-bold hover:bg-red-800"
              >
                {deletingPatient ? '...' : 'Endgültig löschen'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [allPatients, setAllPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompleted, setShowCompleted] = useState(true)
  const [search, setSearch] = useState('')
  const [showNewSheet, setShowNewSheet] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  const load = (includeCompleted: boolean) => {
    setLoading(true)
    patientsApi.list(includeCompleted)
      .then(setPatients)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    patientsApi.list(true).then(setAllPatients)
    load(showCompleted)
  }, [showCompleted])

  const filtered = patients.filter((p) =>
    p.chiffre.toLowerCase().includes(search.toLowerCase()),
  )

  const activeCount = allPatients.filter((p) => p.status !== 'Therapie abgeschlossen').length
  const completedCount = allPatients.filter((p) => p.status === 'Therapie abgeschlossen').length
  const totalSessions = allPatients.reduce((sum, p) => sum + p.session_count, 0)

  const handlePatientUpdated = (updated: Patient) => {
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setAllPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setSelectedPatient(updated)
  }

  const handlePatientDeleted = (id: number) => {
    setPatients((prev) => prev.filter((p) => p.id !== id))
    setAllPatients((prev) => prev.filter((p) => p.id !== id))
    setSelectedPatient(null)
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Fixed summary bar */}
      <div className="card p-3 flex flex-wrap gap-4 bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Aktiv</span>
          <span className="text-base font-bold text-emerald-700">{activeCount}</span>
        </div>
        <div className="w-px bg-slate-200 hidden sm:block" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Abgeschlossen</span>
          <span className="text-base font-bold text-slate-600">{completedCount}</span>
        </div>
        <div className="w-px bg-slate-200 hidden sm:block" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Sitzungen gesamt</span>
          <span className="text-base font-bold text-blue-700">{totalSessions}</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Patienten</h1>
          <p className="text-sm text-slate-500 mt-0.5">{patients.length} angezeigt</p>
        </div>
        <button onClick={() => setShowNewSheet(true)} className="btn-primary">
          <Plus size={16} />
          Neuer Patient
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Chiffre suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="btn-secondary gap-2 whitespace-nowrap"
        >
          {showCompleted ? <Eye size={16} /> : <EyeOff size={16} />}
          {showCompleted ? 'Abgeschlossene ausblenden' : 'Abgeschlossene anzeigen'}
        </button>
      </div>

      {/* Table */}
      <div className="table-container bg-white">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            {search ? 'Keine Patienten gefunden.' : 'Noch keine Patienten angelegt.'}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Chiffre</th>
                <th>Status</th>
                <th>Sitzungen</th>
                <th>Phase</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPatient(p)}
                  className={`cursor-pointer ${p.status === 'Therapie abgeschlossen' ? 'opacity-60' : ''}`}
                >
                  <td>
                    <span className="font-mono font-semibold text-slate-900">{p.chiffre}</span>
                  </td>
                  <td>
                    <span className={STATUS_COLORS[p.status]}>{p.status}</span>
                  </td>
                  <td className="text-slate-700">{p.session_count}</td>
                  <td>
                    <span className="badge-purple">{getPhase(p.session_count + 1)}</span>
                  </td>
                  <td>
                    <ChevronRight size={16} className="text-slate-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Patient BottomSheet */}
      <BottomSheet
        isOpen={showNewSheet}
        onClose={() => setShowNewSheet(false)}
        title="Neuer Patient"
      >
        <NewPatientForm
          onClose={() => setShowNewSheet(false)}
          onCreated={(p) => {
            setPatients((prev) => [p, ...prev])
            setAllPatients((prev) => [p, ...prev])
            setShowNewSheet(false)
          }}
        />
      </BottomSheet>

      {/* Patient Detail BottomSheet */}
      <BottomSheet
        isOpen={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
        title={selectedPatient?.chiffre ?? ''}
      >
        {selectedPatient && (
          <PatientDetailSheet
            patient={selectedPatient}
            onUpdated={handlePatientUpdated}
            onDeleted={handlePatientDeleted}
            onClose={() => setSelectedPatient(null)}
          />
        )}
      </BottomSheet>
    </div>
  )
}
