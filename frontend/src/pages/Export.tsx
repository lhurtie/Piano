import { useState } from 'react'
import { FileText, Archive, Download, CheckCircle } from 'lucide-react'
import { exportApi } from '../api'

export default function Export() {
  const [pdfLoading, setPdfLoading] = useState(false)
  const [csvLoading, setCsvLoading] = useState(false)
  const [pdfDone, setPdfDone] = useState(false)
  const [csvDone, setCsvDone] = useState(false)

  const handlePdf = async () => {
    setPdfLoading(true)
    setPdfDone(false)
    try {
      exportApi.downloadPdf()
      setTimeout(() => setPdfDone(true), 1500)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleCsv = async () => {
    setCsvLoading(true)
    setCsvDone(false)
    try {
      exportApi.downloadCsv()
      setTimeout(() => setCsvDone(true), 1500)
    } finally {
      setCsvLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>Export</h1>
        <p className="text-sm text-slate-500 mt-1">
          Daten als PDF oder CSV exportieren
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* PDF Export */}
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <FileText size={24} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">PDF-Bericht</h2>
              <p className="text-sm text-slate-500">Vollständiger Ausbildungsbericht</p>
            </div>
          </div>

          <div className="text-sm text-slate-600 space-y-1">
            <p>Der PDF-Export enthält:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500 ml-2">
              <li>Ausbildungsfortschritt</li>
              <li>Patientenliste (nur Chiffren)</li>
              <li>Alle Therapiesitzungen</li>
              <li>Alle Supervisionen</li>
              <li>Finanzübersicht (letzte 12 Monate)</li>
            </ul>
          </div>

          <button
            onClick={handlePdf}
            disabled={pdfLoading}
            className={`btn w-full justify-center py-3 ${
              pdfDone
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'btn-primary'
            }`}
          >
            {pdfLoading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : pdfDone ? (
              <>
                <CheckCircle size={16} />
                Heruntergeladen!
              </>
            ) : (
              <>
                <Download size={16} />
                PDF exportieren
              </>
            )}
          </button>
        </div>

        {/* CSV Export */}
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Archive size={24} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">CSV-Export</h2>
              <p className="text-sm text-slate-500">Rohdaten als ZIP-Archiv</p>
            </div>
          </div>

          <div className="text-sm text-slate-600 space-y-1">
            <p>Das ZIP-Archiv enthält:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500 ml-2">
              <li>patients.csv – Patientendaten</li>
              <li>sessions.csv – Sitzungsdaten mit Phasen</li>
              <li>supervisions.csv – Supervisionsdaten</li>
            </ul>
          </div>

          <button
            onClick={handleCsv}
            disabled={csvLoading}
            className={`btn w-full justify-center py-3 ${
              csvDone
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'btn-primary'
            }`}
          >
            {csvLoading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : csvDone ? (
              <>
                <CheckCircle size={16} />
                Heruntergeladen!
              </>
            ) : (
              <>
                <Download size={16} />
                CSV exportieren
              </>
            )}
          </button>
        </div>
      </div>

      <div className="card bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <div className="text-blue-500 mt-0.5">ℹ️</div>
          <div>
            <div className="text-sm font-medium text-blue-800">Datenschutz</div>
            <p className="text-sm text-blue-700 mt-1">
              Alle Exporte enthalten nur anonymisierte Daten (Chiffren, keine echten Namen).
              Die Exporte werden direkt in Ihrem Browser generiert und nicht gespeichert.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
