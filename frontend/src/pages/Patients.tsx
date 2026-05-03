import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { patientsApi } from '../api'
import type { Patient, PatientStatus } from '../types'

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

interface NewPatientModalProps {
  onClose: () => void
  onCreated: (patient: Patient) => void
}

function NewPatientModal({ onClose, onCreated }: NewPatientModalProps) {
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="mb-6">Neuer Patient</h2>
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
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
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
        </div>
      </div>
    </div>
  )
}

export default function Patients() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompleted, setShowCompleted] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  const load = (includeCompleted: boolean) => {
    setLoading(true)
    patientsApi.list(includeCompleted)
      .then(setPatients)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(showCompleted)
  }, [showCompleted])

  const filtered = patients.filter((p) =>
    p.chiffre.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Patienten</h1>
          <p className="text-sm text-slate-500 mt-1">{patients.length} Patienten gesamt</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} />
          Neuer Patient
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
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
          className="btn-secondary gap-2"
        >
          {showCompleted ? <Eye size={16} /> : <EyeOff size={16} />}
          Abgeschlossene {showCompleted ? 'ausblenden' : 'anzeigen'}
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
                <th>Aktuelle Phase</th>
                <th>Erstellt</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/patients/${p.id}`)}
                  className={`cursor-pointer ${p.status === 'Therapie abgeschlossen' ? 'opacity-60' : ''}`}
                >
                  <td>
                    <span className="font-mono font-semibold text-slate-900">{p.chiffre}</span>
                  </td>
                  <td>
                    <span className={STATUS_COLORS[p.status]}>
                      {p.status}
                    </span>
                  </td>
                  <td className="text-slate-700">{p.session_count}</td>
                  <td>
                    <span className="badge-purple">{getPhase(p.session_count + 1)}</span>
                  </td>
                  <td className="text-slate-500 text-xs">
                    {new Date(p.created_at).toLocaleDateString('de-DE')}
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

      {showModal && (
        <NewPatientModal
          onClose={() => setShowModal(false)}
          onCreated={(p) => {
            setPatients((prev) => [p, ...prev])
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}
