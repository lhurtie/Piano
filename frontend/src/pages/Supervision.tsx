import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Check, X, UserPlus } from 'lucide-react'
import { supervisionsApi, supervisorsApi, patientsApi, settingsApi } from '../api'
import type { Supervision, Supervisor, Patient, SupervisionType } from '../types'

interface AddSupervisionModalProps {
  supervisors: Supervisor[]
  patients: Patient[]
  defaultCostEinzel: number
  defaultCostGruppe: number
  onClose: () => void
  onAdded: (sup: Supervision) => void
}

function AddSupervisionModal({
  supervisors,
  patients,
  defaultCostEinzel,
  defaultCostGruppe,
  onClose,
  onAdded,
}: AddSupervisionModalProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [supervisorId, setSupervisorId] = useState(supervisors[0]?.id?.toString() || '')
  const [date, setDate] = useState(today)
  const [duration, setDuration] = useState('50')
  const [type, setType] = useState<SupervisionType>('Einzel')
  const [cost, setCost] = useState(String(defaultCostEinzel))
  const [notes, setNotes] = useState('')
  const [selectedPatients, setSelectedPatients] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTypeChange = (t: SupervisionType) => {
    setType(t)
    setCost(t === 'Einzel' ? String(defaultCostEinzel) : String(defaultCostGruppe))
  }

  const togglePatient = (pid: number) => {
    setSelectedPatients((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supervisorId) return
    setLoading(true)
    setError('')
    try {
      const sup = await supervisionsApi.create({
        supervisor_id: parseInt(supervisorId),
        date,
        duration_minutes: parseInt(duration),
        type,
        cost: parseFloat(cost),
        notes: notes || undefined,
        patient_ids: selectedPatients,
      })
      onAdded(sup)
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
          <h2 className="mb-6">Neue Supervision</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Supervisor *</label>
              <select
                className="input"
                value={supervisorId}
                onChange={(e) => setSupervisorId(e.target.value)}
                required
              >
                <option value="">Supervisor auswählen...</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <label className="label">Dauer (Min.) *</label>
                <input
                  type="number"
                  className="input"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min={1}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Typ</label>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                  {(['Einzel', 'Gruppe'] as SupervisionType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTypeChange(t)}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        type === t
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
                <label className="label">Kosten (€)</label>
                <input
                  type="number"
                  className="input"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Patienten (optional)</label>
              <div className="border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                {patients.length === 0 ? (
                  <div className="text-sm text-slate-400">Keine Patienten vorhanden</div>
                ) : (
                  patients.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded p-1">
                      <input
                        type="checkbox"
                        checked={selectedPatients.includes(p.id)}
                        onChange={() => togglePatient(p.id)}
                        className="rounded border-slate-300"
                      />
                      <span className="font-mono text-sm">{p.chiffre}</span>
                      <span className="text-xs text-slate-500">{p.status}</span>
                    </label>
                  ))
                )}
              </div>
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

interface ManageSupervisorsModalProps {
  supervisors: Supervisor[]
  onClose: () => void
  onUpdated: (supervisors: Supervisor[]) => void
}

function ManageSupervisorsModal({ supervisors, onClose, onUpdated }: ManageSupervisorsModalProps) {
  const [list, setList] = useState<Supervisor[]>(supervisors)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')

  const addSupervisor = async () => {
    if (!newName.trim()) return
    try {
      const sup = await supervisorsApi.create(newName.trim())
      const updated = [...list, sup]
      setList(updated)
      onUpdated(updated)
      setNewName('')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const updateSupervisor = async (id: number) => {
    if (!editName.trim()) return
    try {
      const sup = await supervisorsApi.update(id, editName.trim())
      const updated = list.map((s) => (s.id === id ? sup : s))
      setList(updated)
      onUpdated(updated)
      setEditingId(null)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const deleteSupervisor = async (id: number) => {
    if (!confirm('Supervisor löschen?')) return
    try {
      await supervisorsApi.delete(id)
      const updated = list.filter((s) => s.id !== id)
      setList(updated)
      onUpdated(updated)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="mb-6">Supervisoren verwalten</h2>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 mb-4">
              {error}
            </div>
          )}

          <div className="space-y-2 mb-4">
            {list.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                {editingId === s.id ? (
                  <>
                    <input
                      className="input flex-1"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                    />
                    <button onClick={() => updateSupervisor(s.id)} className="btn-primary p-2">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="btn-secondary p-2">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-slate-800">{s.name}</span>
                    <button
                      onClick={() => { setEditingId(s.id); setEditName(s.name) }}
                      className="btn-ghost p-2"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => deleteSupervisor(s.id)}
                      className="btn-ghost p-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Neuer Supervisor..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSupervisor()}
            />
            <button onClick={addSupervisor} className="btn-primary">
              <UserPlus size={16} /> Hinzufügen
            </button>
          </div>

          <div className="mt-6 flex justify-end">
            <button onClick={onClose} className="btn-secondary">Schließen</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SupervisionPage() {
  const [supervisions, setSupervisions] = useState<Supervision[]>([])
  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [defaultCostEinzel, setDefaultCostEinzel] = useState(90)
  const [defaultCostGruppe, setDefaultCostGruppe] = useState(40)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSupervisorsModal, setShowSupervisorsModal] = useState(false)

  const totalMinutes = supervisions.reduce((sum, s) => sum + s.duration_minutes, 0)
  const totalCost = supervisions.reduce((sum, s) => sum + s.cost, 0)

  useEffect(() => {
    Promise.all([
      supervisionsApi.list(),
      supervisorsApi.list(),
      patientsApi.list(true),
      settingsApi.get(),
    ]).then(([sups, supervisorList, patientList, settings]) => {
      setSupervisions(sups)
      setSupervisors(supervisorList)
      setPatients(patientList)
      setDefaultCostEinzel(parseFloat(settings.default_cost_einzel || '90'))
      setDefaultCostGruppe(parseFloat(settings.default_cost_gruppe || '40'))
    }).finally(() => setLoading(false))
  }, [])

  const deleteSupervision = async (id: number) => {
    if (!confirm('Supervision löschen?')) return
    await supervisionsApi.delete(id)
    setSupervisions((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Supervision</h1>
          <p className="text-sm text-slate-500 mt-1">
            {supervisions.length} Supervisionen ·{' '}
            {Math.round(totalMinutes / 60 * 10) / 10} Std. ·{' '}
            {totalCost.toFixed(2)} € Kosten
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSupervisorsModal(true)} className="btn-secondary">
            <UserPlus size={16} /> Supervisoren
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus size={16} /> Neue Supervision
          </button>
        </div>
      </div>

      <div className="table-container bg-white">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : supervisions.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            Noch keine Supervisionen.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Supervisor</th>
                <th>Typ</th>
                <th>Dauer</th>
                <th>Kosten</th>
                <th>Patienten</th>
                <th>Notizen</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {supervisions.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{new Date(s.date).toLocaleDateString('de-DE')}</td>
                  <td>{s.supervisor_name}</td>
                  <td>
                    <span className={s.type === 'Einzel' ? 'badge-blue' : 'badge-purple'}>
                      {s.type}
                    </span>
                  </td>
                  <td className="text-slate-600">{s.duration_minutes} Min.</td>
                  <td className="font-medium">{s.cost.toFixed(2)} €</td>
                  <td className="text-slate-600 text-xs">
                    {s.patient_chiffres.length > 0
                      ? s.patient_chiffres.join(', ')
                      : '—'}
                  </td>
                  <td className="text-slate-500 text-xs max-w-xs truncate">
                    {s.notes || '—'}
                  </td>
                  <td>
                    <button
                      onClick={() => deleteSupervision(s.id)}
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

      {showAddModal && (
        <AddSupervisionModal
          supervisors={supervisors}
          patients={patients}
          defaultCostEinzel={defaultCostEinzel}
          defaultCostGruppe={defaultCostGruppe}
          onClose={() => setShowAddModal(false)}
          onAdded={(s) => {
            setSupervisions((prev) => [s, ...prev])
            setShowAddModal(false)
          }}
        />
      )}

      {showSupervisorsModal && (
        <ManageSupervisorsModal
          supervisors={supervisors}
          onClose={() => setShowSupervisorsModal(false)}
          onUpdated={setSupervisors}
        />
      )}
    </div>
  )
}
