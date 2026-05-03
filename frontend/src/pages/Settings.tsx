import { useState, useEffect, useRef } from 'react'
import { Save, Eye, EyeOff, Lock, CheckCircle, Upload, Download, AlertTriangle } from 'lucide-react'
import { settingsApi, authApi, importApi } from '../api'
import type { Settings } from '../types'

type ImportType = 'sessions' | 'supervisions'

const SESSION_TEMPLATE = `patient_chiffre;datum;sitzungstyp;dauer_min;honorar_eur;notizen
AB-001;15.03.2024;Probatorik;50;33.57;
AB-001;22.03.2024;Einzelsitzung;50;45.80;Erste reguläre Sitzung
AB-002;01.04.2024;Probatorik;50;33.57;`

const SUPERVISION_TEMPLATE = `supervisor_name;datum;typ;dauer_min;kosten_eur;notizen;patient_chiffres
Dr. Müller;10.03.2024;Einzel;45;110.00;;AB-001
Dr. Müller;17.03.2024;Gruppe;90;0;;AB-001,AB-002`

function downloadTemplate(type: ImportType) {
  const BOM = '﻿'
  const content = type === 'sessions' ? SESSION_TEMPLATE : SUPERVISION_TEMPLATE
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `piano_vorlage_${type === 'sessions' ? 'sitzungen' : 'supervisionen'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Import state
  const [importType, setImportType] = useState<ImportType>('sessions')
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Password change state
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    settingsApi.get()
      .then(setSettings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings) return
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await settingsApi.update(settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')
    if (!newPw || newPw.length < 4) {
      setPwError('Neues Passwort muss mindestens 4 Zeichen haben')
      return
    }
    if (newPw !== confirmPw) {
      setPwError('Passwörter stimmen nicht überein')
      return
    }
    setPwLoading(true)
    try {
      await authApi.changePassword(currentPw, newPw)
      setPwSuccess('Passwort erfolgreich geändert')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err: any) {
      setPwError(err.message)
    } finally {
      setPwLoading(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportLoading(true)
    setImportResult(null)
    try {
      const result = importType === 'sessions'
        ? await importApi.sessions(file)
        : await importApi.supervisions(file)
      setImportResult(result)
    } catch (err: any) {
      setImportResult({ imported: 0, errors: [err.message] })
    } finally {
      setImportLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const update = (key: keyof Settings, value: string) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!settings) {
    return <div className="card text-red-600">Fehler: {error}</div>
  }

  return (
    <div className="space-y-6 max-w-2xl pb-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Einstellungen</h1>
        <p className="text-sm text-slate-500 mt-0.5">Deine Ziele und Standardwerte konfigurieren</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Ambulanz-Ziele */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Ambulanz-Ziele</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Therapiesitzungen (Ziel)</label>
              <input
                type="number"
                className="input"
                value={settings.target_therapy_sessions}
                onChange={(e) => update('target_therapy_sessions', e.target.value)}
                min={1}
              />
            </div>
            <div>
              <label className="label">Supervision Einzel (Ziel)</label>
              <input
                type="number"
                className="input"
                value={settings.target_supervision_einzel}
                onChange={(e) => update('target_supervision_einzel', e.target.value)}
                min={1}
              />
            </div>
            <div>
              <label className="label">Supervision Gruppe (Ziel)</label>
              <input
                type="number"
                className="input"
                value={settings.target_supervision_gruppe}
                onChange={(e) => update('target_supervision_gruppe', e.target.value)}
                min={1}
              />
            </div>
          </div>
        </div>

        {/* Ausbildungsziele gesamt */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Gesamtausbildungs-Ziele</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Theorie (Stunden-Ziel)</label>
              <input
                type="number"
                className="input"
                value={settings.target_theorie}
                onChange={(e) => update('target_theorie', e.target.value)}
                min={1}
              />
            </div>
            <div>
              <label className="label">PT1 (Stunden-Ziel)</label>
              <input
                type="number"
                className="input"
                value={settings.target_pt1}
                onChange={(e) => update('target_pt1', e.target.value)}
                min={1}
              />
            </div>
            <div>
              <label className="label">PT2 (Stunden-Ziel)</label>
              <input
                type="number"
                className="input"
                value={settings.target_pt2}
                onChange={(e) => update('target_pt2', e.target.value)}
                min={1}
              />
            </div>
            <div>
              <label className="label">Selbsterfahrung (Stunden-Ziel)</label>
              <input
                type="number"
                className="input"
                value={settings.target_self_experience}
                onChange={(e) => update('target_self_experience', e.target.value)}
                min={1}
              />
            </div>
          </div>

          {/* Self experience toggle */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() =>
                update(
                  'self_experience_enabled',
                  settings.self_experience_enabled === 'true' ? 'false' : 'true',
                )
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                settings.self_experience_enabled === 'true' ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.self_experience_enabled === 'true' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm font-medium text-slate-700">
              Selbsterfahrung im Dashboard anzeigen
            </span>
          </div>
        </div>

        {/* Geleistete Stunden */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Deine geleisteten Stunden</h2>
          <p className="text-xs text-slate-500">
            Trag hier deine bisher absolvierten Stunden ein. Diese werden im Dashboard als Fortschritt angezeigt.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Geleistete Selbsterfahrungs-Stunden</label>
              <input
                type="number"
                className="input"
                value={settings.self_experience_hours}
                onChange={(e) => update('self_experience_hours', e.target.value)}
                min={0}
                step="0.5"
              />
            </div>
            <div>
              <label className="label">Geleistete Theorie-Stunden</label>
              <input
                type="number"
                className="input"
                value={settings.theorie_hours}
                onChange={(e) => update('theorie_hours', e.target.value)}
                min={0}
                step="0.5"
              />
            </div>
            <div>
              <label className="label">Geleistete PT1-Stunden</label>
              <input
                type="number"
                className="input"
                value={settings.pt1_hours}
                onChange={(e) => update('pt1_hours', e.target.value)}
                min={0}
                step="0.5"
              />
            </div>
            <div>
              <label className="label">Geleistete PT2-Stunden</label>
              <input
                type="number"
                className="input"
                value={settings.pt2_hours}
                onChange={(e) => update('pt2_hours', e.target.value)}
                min={0}
                step="0.5"
              />
            </div>
          </div>
        </div>

        {/* Standardvergütung */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Standardvergütung (€)</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Vergütung Probatorik</label>
              <input
                type="number"
                className="input"
                value={settings.default_revenue_probatorik}
                onChange={(e) => update('default_revenue_probatorik', e.target.value)}
                min={0}
                step="0.01"
              />
            </div>
            <div>
              <label className="label">Vergütung Einzelsitzung</label>
              <input
                type="number"
                className="input"
                value={settings.default_revenue_einzel}
                onChange={(e) => update('default_revenue_einzel', e.target.value)}
                min={0}
                step="0.01"
              />
            </div>
          </div>
        </div>

        {/* Supervisionskosten */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Standard-Supervisionskosten (€)</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Supervision Einzel (Kosten)</label>
              <input
                type="number"
                className="input"
                value={settings.default_cost_einzel}
                onChange={(e) => update('default_cost_einzel', e.target.value)}
                min={0}
                step="0.01"
              />
            </div>
            <div>
              <label className="label">Supervision Gruppe (Kosten)</label>
              <input
                type="number"
                className="input"
                value={settings.default_cost_gruppe}
                onChange={(e) => update('default_cost_gruppe', e.target.value)}
                min={0}
                step="0.01"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? (
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : saved ? (
            <>
              <CheckCircle size={16} />
              Gespeichert!
            </>
          ) : (
            <>
              <Save size={16} />
              Einstellungen speichern
            </>
          )}
        </button>
      </form>

      {/* CSV Import */}
      <div className="card space-y-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Upload size={18} className="text-blue-500" />
          Daten importieren (CSV)
        </h2>
        <p className="text-xs text-slate-500">
          Lade vergangene Sitzungen oder Supervisionen aus einer CSV-Datei. Neue Patienten und Supervisoren werden automatisch angelegt.
        </p>

        {/* Type selector */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {(['sessions', 'supervisions'] as ImportType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setImportType(t); setImportResult(null) }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${importType === t ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {t === 'sessions' ? 'Sitzungen' : 'Supervisionen'}
            </button>
          ))}
        </div>

        {/* Template download */}
        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg text-sm">
          <Download size={14} className="text-slate-400 flex-shrink-0" />
          <span className="text-slate-600 flex-1">Vorlage herunterladen:</span>
          <button type="button" onClick={() => downloadTemplate(importType)} className="btn-secondary text-xs py-1 px-3">
            Vorlage CSV
          </button>
        </div>

        {/* Format hint */}
        <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 font-mono leading-relaxed overflow-x-auto">
          {importType === 'sessions'
            ? 'patient_chiffre;datum;sitzungstyp;dauer_min;honorar_eur;notizen'
            : 'supervisor_name;datum;typ;dauer_min;kosten_eur;notizen;patient_chiffres'}
        </div>

        {/* File upload */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImport}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importLoading}
            className="btn-primary w-full justify-center"
          >
            {importLoading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <><Upload size={16} /> CSV-Datei auswählen & importieren</>
            )}
          </button>
        </div>

        {/* Result */}
        {importResult && (
          <div className={`p-3 rounded-lg text-sm ${importResult.imported > 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            {importResult.imported > 0 && (
              <div className="text-emerald-700 font-medium mb-1">
                ✓ {importResult.imported} Einträge erfolgreich importiert
              </div>
            )}
            {importResult.errors.length > 0 && (
              <div className="text-red-700">
                <div className="font-medium mb-1">{importResult.errors.length} Fehler:</div>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Password reset instructions */}
      <div className="card space-y-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <AlertTriangle size={18} className="text-amber-500" />
          Passwort vergessen?
        </h2>
        <p className="text-sm text-slate-600">
          Falls du keinen Zugang mehr hast, kannst du das Passwort über die NAS-Konsole zurücksetzen:
        </p>
        <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
          <li>
            Per SSH mit dem NAS verbinden:
            <div className="mt-1 font-mono text-xs bg-slate-100 rounded px-3 py-2 text-slate-800">
              ssh Louis@192.168.178.98
            </div>
          </li>
          <li>
            Reset-Datei im Piano-Datenverzeichnis erstellen:
            <div className="mt-1 font-mono text-xs bg-slate-100 rounded px-3 py-2 text-slate-800">
              echo "NeuesPasswort" {'>'} /pfad/zu/piano/data/RESET_PASSWORD
            </div>
          </li>
          <li>
            Container neu starten:
            <div className="mt-1 font-mono text-xs bg-slate-100 rounded px-3 py-2 text-slate-800">
              docker compose restart
            </div>
          </li>
        </ol>
        <p className="text-xs text-slate-500">
          Das Passwort wird beim Start automatisch gesetzt und die Datei gelöscht. Das Datenverzeichnis findest du mit: <span className="font-mono bg-slate-100 px-1 rounded">docker inspect piano-app | grep Source</span>
        </p>
      </div>

      {/* Password change */}
      <div className="card space-y-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Lock size={18} className="text-slate-500" />
          Passwort ändern
        </h2>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="label">Aktuelles Passwort</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="input pr-10"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Neues Passwort</label>
              <input
                type={showPw ? 'text' : 'password'}
                className="input"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Bestätigen</label>
              <input
                type={showPw ? 'text' : 'password'}
                className="input"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
              />
            </div>
          </div>

          {pwError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              ✓ {pwSuccess}
            </div>
          )}

          <button type="submit" disabled={pwLoading} className="btn-secondary">
            {pwLoading ? '...' : 'Passwort ändern'}
          </button>
        </form>
      </div>
    </div>
  )
}
