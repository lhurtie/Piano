import { useState, useEffect } from 'react'
import { HardDrive, Download, Trash2, Plus, RefreshCw } from 'lucide-react'
import { backupApi } from '../api'
import type { BackupFile } from '../types'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function Backup() {
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    backupApi.list()
      .then(setBackups)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const createBackup = async () => {
    setCreating(true)
    setMessage('')
    setError('')
    try {
      const res = await backupApi.create()
      setMessage(res.message + ' – ' + res.filename)
      load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const deleteBackup = async (filename: string) => {
    if (!confirm(`Backup "${filename}" löschen?`)) return
    try {
      await backupApi.delete(filename)
      setBackups((prev) => prev.filter((b) => b.filename !== filename))
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Backup</h1>
          <p className="text-sm text-slate-500 mt-1">
            Datenbank sichern und wiederherstellen
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary">
            <RefreshCw size={16} />
          </button>
          <button onClick={createBackup} disabled={creating} className="btn-primary">
            {creating ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Plus size={16} />
            )}
            Backup erstellen
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          ✓ {message}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Info card */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <HardDrive size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-blue-800">Automatisches Backup</div>
            <p className="text-sm text-blue-700 mt-1">
              Backups werden automatisch täglich erstellt und als .db-Dateien gespeichert.
              Die letzten 30 Backups werden aufbewahrt. Backups werden im Docker-Volume
              <code className="bg-blue-100 px-1 rounded mx-1">/backups</code> gespeichert.
            </p>
          </div>
        </div>
      </div>

      {/* Backup list */}
      <div>
        <h2 className="mb-3">Vorhandene Backups ({backups.length})</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : backups.length === 0 ? (
          <div className="card text-center text-slate-500 py-12">
            Noch keine Backups vorhanden. Erstellen Sie jetzt das erste Backup.
          </div>
        ) : (
          <div className="table-container bg-white">
            <table>
              <thead>
                <tr>
                  <th>Dateiname</th>
                  <th>Erstellt am</th>
                  <th>Größe</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.filename}>
                    <td>
                      <div className="flex items-center gap-2">
                        <HardDrive size={14} className="text-slate-400" />
                        <span className="font-mono text-sm">{b.filename}</span>
                      </div>
                    </td>
                    <td className="text-slate-600">{b.created_at}</td>
                    <td className="text-slate-500">{formatSize(b.size_bytes)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => backupApi.download(b.filename)}
                          className="btn-secondary py-1 px-3 text-xs"
                        >
                          <Download size={12} /> Download
                        </button>
                        <button
                          onClick={() => deleteBackup(b.filename)}
                          className="btn-ghost py-1 px-2 text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
