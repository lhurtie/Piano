import { useState, useEffect } from 'react'
import { FileText, Archive, Download, CheckCircle, Users } from 'lucide-react'
import { exportApi, patientsApi } from '../api'
import type { Patient } from '../types'

function DownloadButton({
  onClick,
  icon: Icon,
  label,
  color,
}: {
  onClick: () => Promise<void>
  icon: React.ElementType
  label: string
  color: string
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')

  const handle = async () => {
    if (state !== 'idle') return
    setState('loading')
    try {
      await onClick()
      setState('done')
      setTimeout(() => setState('idle'), 2500)
    } catch {
      setState('idle')
    }
  }

  return (
    <button
      onClick={handle}
      disabled={state === 'loading'}
      className={`btn flex items-center gap-2 justify-center py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
        state === 'done'
          ? 'bg-emerald-600 text-white'
          : `${color} btn-juice`
      }`}
    >
      {state === 'loading' && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />}
      {state === 'done' && <CheckCircle size={15} />}
      {state === 'idle' && <Icon size={15} />}
      {state === 'loading' ? 'Laden...' : state === 'done' ? 'Fertig!' : label}
    </button>
  )
}

export default function Export() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)

  useEffect(() => {
    patientsApi.list(true)
      .then(setPatients)
      .finally(() => setLoadingPatients(false))
  }, [])

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Export</h1>
        <p className="text-sm text-slate-500 mt-1">Daten als PDF oder CSV exportieren und teilen</p>
      </div>

      {/* Gesamtexport */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Users size={20} className="text-blue-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">Gesamtexport</div>
            <div className="text-xs text-slate-500">Alle Patienten, Sitzungen & Supervisionen</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <DownloadButton
            onClick={exportApi.downloadPdf}
            icon={FileText}
            label="PDF exportieren"
            color="btn-primary"
          />
          <DownloadButton
            onClick={exportApi.downloadCsv}
            icon={Archive}
            label="CSV exportieren"
            color="btn-secondary"
          />
        </div>
      </div>

      {/* Pro-Patient Export */}
      <div className="card space-y-4">
        <div className="font-semibold text-slate-900 flex items-center gap-2">
          <FileText size={16} className="text-slate-500" />
          Export nach Patient
        </div>

        {loadingPatients ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : patients.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-4">Noch keine Patienten angelegt.</div>
        ) : (
          <div className="space-y-2">
            {patients.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5 px-3 bg-slate-50 rounded-xl"
              >
                <div>
                  <span className="font-mono font-semibold text-slate-900">{p.chiffre}</span>
                  <span className="ml-2 text-xs text-slate-500">{p.session_count} Sitzungen</span>
                </div>
                <div className="flex gap-2">
                  <DownloadButton
                    onClick={() => exportApi.downloadPatientPdf(p.id, p.chiffre)}
                    icon={FileText}
                    label="PDF"
                    color="btn-secondary"
                  />
                  <DownloadButton
                    onClick={() => exportApi.downloadPatientCsv(p.id, p.chiffre)}
                    icon={Archive}
                    label="CSV"
                    color="btn-secondary"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* iOS Hinweis */}
      <div className="card bg-blue-50 border-blue-200 p-4">
        <div className="flex gap-3">
          <div className="text-blue-500 text-lg">📱</div>
          <div>
            <div className="text-sm font-medium text-blue-800">Teilen auf iPhone</div>
            <p className="text-sm text-blue-700 mt-1">
              Nach dem Download auf „Teilen" tippen — dann kannst du die Datei per iMessage, Mail oder AirDrop versenden.
            </p>
          </div>
        </div>
      </div>

      {/* Datenschutz */}
      <div className="card bg-slate-50 border-slate-200 p-4">
        <div className="flex gap-3">
          <div className="text-slate-400 text-lg">🔒</div>
          <div>
            <div className="text-sm font-medium text-slate-700">Datenschutz</div>
            <p className="text-sm text-slate-500 mt-1">
              Alle Exporte enthalten nur anonymisierte Daten (Chiffren, keine echten Namen). Die Dateien werden lokal erzeugt und nicht in der Cloud gespeichert.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
