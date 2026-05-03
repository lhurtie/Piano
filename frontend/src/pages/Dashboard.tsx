import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Users, BookOpen, Euro, Calendar, Plus, ArrowRight, Clock, Save } from 'lucide-react'
import { dashboardApi, settingsApi } from '../api'
import type { DashboardData } from '../types'
import { triggerCelebration, triggerMilestone } from '../utils/celebration'

const MILESTONE_STORAGE_KEY = 'piano_reached_milestones'
const PREV_SESSIONS_KEY = 'piano_prev_session_count'

function getReachedMilestones(): Set<string> {
  try {
    const raw = localStorage.getItem(MILESTONE_STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveReachedMilestones(set: Set<string>) {
  localStorage.setItem(MILESTONE_STORAGE_KEY, JSON.stringify([...set]))
}

function ProgressBar({
  value,
  max,
  color = 'bg-blue-500',
  label,
  unit = '',
}: {
  value: number
  max: number
  color?: string
  label: string
  unit?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-xs text-slate-500">
          {value}{unit} / {max}{unit} · {pct}%
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${pct}%`, transition: 'width 0.8s ease' }}
        />
      </div>
    </div>
  )
}

function RingProgress({ value, label }: { value: number; label: string }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 64 64)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="64" y="64" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold" style={{ fontSize: '22px', fontWeight: 700, fill: '#1e293b' }}>
          {Math.round(value)}%
        </text>
      </svg>
      <span className="text-sm font-medium text-slate-600">{label}</span>
    </div>
  )
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="card flex items-start gap-3 p-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xl font-bold text-slate-900 leading-tight">{value}</div>
        <div className="text-sm font-medium text-slate-700 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<'ambulanz' | 'gesamt'>('ambulanz')
  const checkedMilestones = useRef(false)
  const [manualHours, setManualHours] = useState({ self: '', theorie: '', pt1: '', pt2: '' })
  const [savingHours, setSavingHours] = useState(false)

  useEffect(() => {
    dashboardApi.get()
      .then((d) => {
        setData(d)

        if (!checkedMilestones.current) {
          checkedMilestones.current = true

          // Check if sessions just increased
          const prev = parseInt(localStorage.getItem(PREV_SESSIONS_KEY) || '0', 10)
          if (d.total_sessions > prev && prev > 0) {
            triggerCelebration(`Neue Sitzung eingetragen! Gesamt: ${d.total_sessions}`)
          }
          localStorage.setItem(PREV_SESSIONS_KEY, String(d.total_sessions))

          // Check milestones
          const reached = getReachedMilestones()
          const MILESTONES = [25, 50, 75, 100]

          const areas: Array<{ key: string; label: string; value: number; target: number }> = [
            { key: 'therapy', label: 'Therapiesitzungen', value: d.total_sessions, target: d.target_therapy_sessions },
            { key: 'sup_einzel', label: 'Supervision Einzel', value: d.total_supervision_einzel_hours, target: d.target_supervision_einzel },
            { key: 'sup_gruppe', label: 'Supervision Gruppe', value: d.total_supervision_gruppe_hours, target: d.target_supervision_gruppe },
            { key: 'self_exp', label: 'Selbsterfahrung', value: d.self_experience_hours, target: d.target_self_experience },
            { key: 'theorie', label: 'Theorie', value: d.theorie_hours, target: d.target_theorie },
            { key: 'pt1', label: 'PT1', value: d.pt1_hours, target: d.target_pt1 },
            { key: 'pt2', label: 'PT2', value: d.pt2_hours, target: d.target_pt2 },
          ]

          let needsSave = false
          for (const area of areas) {
            if (area.target <= 0) continue
            const pct = (area.value / area.target) * 100
            for (const ms of MILESTONES) {
              const key = `${area.key}_${ms}`
              if (pct >= ms && !reached.has(key)) {
                reached.add(key)
                needsSave = true
                setTimeout(() => triggerMilestone(area.label, ms), 500)
                break // only one milestone at a time
              }
            }
          }
          if (needsSave) saveReachedMilestones(reached)
        }
      })
      .then((d) => {
        setManualHours({
          self: String(d.self_experience_hours),
          theorie: String(d.theorie_hours),
          pt1: String(d.pt1_hours),
          pt2: String(d.pt2_hours),
        })
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="card text-center text-red-600 py-12">
        Fehler beim Laden: {error}
      </div>
    )
  }

  const totalSupervisions = data.total_supervision_einzel + data.total_supervision_gruppe
  const supHours = Math.round((data.total_supervision_minutes / 60) * 10) / 10
  const progressValue = view === 'ambulanz' ? data.ambulanz_progress : data.gesamt_progress
  const progressLabel = view === 'ambulanz' ? 'Ambulanz-Fortschritt' : 'Gesamtausbildung'

  const saveManualHours = async () => {
    setSavingHours(true)
    try {
      await settingsApi.update({
        self_experience_hours: manualHours.self || '0',
        theorie_hours: manualHours.theorie || '0',
        pt1_hours: manualHours.pt1 || '0',
        pt2_hours: manualHours.pt2 || '0',
      })
      const refreshed = await dashboardApi.get()
      setData(refreshed)
    } finally {
      setSavingHours(false)
    }
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Dein Ausbildungsfortschritt im Überblick</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate('/sessions')} className="btn-primary">
            <Plus size={16} />
            Sitzung
          </button>
          <button onClick={() => navigate('/supervision')} className="btn-secondary">
            <Plus size={16} />
            Supervision
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Sitzungen gesamt"
          value={data.total_sessions}
          sub={`Ziel: ${data.target_therapy_sessions}`}
          icon={Calendar}
          color="bg-blue-500"
        />
        <StatCard
          label="Aktive Patienten"
          value={data.active_patients}
          sub={data.completed_patients > 0 ? `${data.completed_patients} abgeschlossen` : undefined}
          icon={Users}
          color="bg-emerald-500"
        />
        <StatCard
          label="Supervisionen"
          value={totalSupervisions}
          sub={`${supHours} Std. gesamt`}
          icon={BookOpen}
          color="bg-violet-500"
        />
        <StatCard
          label="Einnahmen (Monat)"
          value={`${data.financial.month_income.toFixed(2)} €`}
          sub={`Netto: ${data.financial.month_net.toFixed(2)} €`}
          icon={Euro}
          color="bg-amber-500"
        />
      </div>

      {/* Progress toggle + ring */}
      <div className="card p-4">
        <div className="flex flex-col items-center gap-3 mb-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 self-start">
            <TrendingUp size={18} className="text-blue-500" />
            Deine Fortschritte
          </h2>
          <div className="flex rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <button
              onClick={() => setView('ambulanz')}
              className={`px-5 py-2 text-sm font-semibold transition-all duration-200 ${view === 'ambulanz' ? 'bg-blue-600 text-white shadow-inner' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              Ambulanz
            </button>
            <button
              onClick={() => setView('gesamt')}
              className={`px-5 py-2 text-sm font-semibold transition-all duration-200 ${view === 'gesamt' ? 'bg-blue-600 text-white shadow-inner' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              Gesamtausbildung
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Ring */}
          <div className="flex-shrink-0 self-center">
            <RingProgress value={progressValue} label={progressLabel} />
          </div>

          {/* Individual bars */}
          <div className="flex-1 w-full">
            {view === 'gesamt' ? (
              /* Gesamtausbildung: all areas in one unified frame */
              <div className="ring-2 ring-blue-300 rounded-2xl bg-gradient-to-b from-blue-50/60 to-emerald-50/40 p-4 space-y-3">
                <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">Gesamtausbildung — alle Bereiche</div>
                <ProgressBar label="Therapiesitzungen" value={data.total_sessions} max={data.target_therapy_sessions} color="bg-blue-500" />
                <ProgressBar label="Supervision Einzel" value={Math.round(data.total_supervision_einzel_hours * 10) / 10} max={data.target_supervision_einzel} color="bg-violet-500" unit=" Std." />
                <ProgressBar label="Supervision Gruppe" value={Math.round(data.total_supervision_gruppe_hours * 10) / 10} max={data.target_supervision_gruppe} color="bg-purple-500" unit=" Std." />
                {data.self_experience_enabled && (
                  <ProgressBar label="Selbsterfahrung" value={data.self_experience_hours} max={data.target_self_experience} color="bg-emerald-500" unit=" Std." />
                )}
                <ProgressBar label="Theorie" value={data.theorie_hours} max={data.target_theorie} color="bg-teal-500" unit=" Std." />
                <ProgressBar label="PT1" value={data.pt1_hours} max={data.target_pt1} color="bg-orange-500" unit=" Std." />
                <ProgressBar label="PT2" value={data.pt2_hours} max={data.target_pt2} color="bg-red-500" unit=" Std." />
              </div>
            ) : (
              /* Ambulanz: only ambulanz areas highlighted */
              <div className="space-y-2.5">
                <div className="ring-2 ring-blue-200 bg-blue-50/50 rounded-xl p-3 space-y-2.5">
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Ambulanz</div>
                  <ProgressBar label="Therapiesitzungen" value={data.total_sessions} max={data.target_therapy_sessions} color="bg-blue-500" />
                  <ProgressBar label="Supervision Einzel" value={Math.round(data.total_supervision_einzel_hours * 10) / 10} max={data.target_supervision_einzel} color="bg-violet-500" unit=" Std." />
                  <ProgressBar label="Supervision Gruppe" value={Math.round(data.total_supervision_gruppe_hours * 10) / 10} max={data.target_supervision_gruppe} color="bg-purple-500" unit=" Std." />
                </div>
                <div className="opacity-50 rounded-xl p-3 space-y-2.5 border border-slate-200">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gesamtausbildung</div>
                  {data.self_experience_enabled && (
                    <ProgressBar label="Selbsterfahrung" value={data.self_experience_hours} max={data.target_self_experience} color="bg-emerald-500" unit=" Std." />
                  )}
                  <ProgressBar label="Theorie" value={data.theorie_hours} max={data.target_theorie} color="bg-teal-500" unit=" Std." />
                  <ProgressBar label="PT1" value={data.pt1_hours} max={data.target_pt1} color="bg-orange-500" unit=" Std." />
                  <ProgressBar label="PT2" value={data.pt2_hours} max={data.target_pt2} color="bg-red-500" unit=" Std." />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual hours quick-entry (Gesamtausbildung only) */}
      {view === 'gesamt' && (
        <div className="card p-4">
          <h2 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Save size={16} className="text-emerald-500" />
            Stunden eintragen
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {data.self_experience_enabled && (
              <div>
                <label className="label text-xs">Selbsterfahrung (Std.)</label>
                <input
                  type="number"
                  className="input"
                  step="0.5"
                  min="0"
                  value={manualHours.self}
                  onChange={(e) => setManualHours((h) => ({ ...h, self: e.target.value }))}
                />
              </div>
            )}
            <div>
              <label className="label text-xs">Theorie (Std.)</label>
              <input
                type="number"
                className="input"
                step="0.5"
                min="0"
                value={manualHours.theorie}
                onChange={(e) => setManualHours((h) => ({ ...h, theorie: e.target.value }))}
              />
            </div>
            <div>
              <label className="label text-xs">PT1 (Std.)</label>
              <input
                type="number"
                className="input"
                step="0.5"
                min="0"
                value={manualHours.pt1}
                onChange={(e) => setManualHours((h) => ({ ...h, pt1: e.target.value }))}
              />
            </div>
            <div>
              <label className="label text-xs">PT2 (Std.)</label>
              <input
                type="number"
                className="input"
                step="0.5"
                min="0"
                value={manualHours.pt2}
                onChange={(e) => setManualHours((h) => ({ ...h, pt2: e.target.value }))}
              />
            </div>
          </div>
          <button
            onClick={saveManualHours}
            disabled={savingHours}
            className="btn-primary w-full justify-center mt-3"
          >
            {savingHours ? '...' : 'Speichern'}
          </button>
        </div>
      )}

      {/* Prognosis + Financial */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Prognosis */}
        <div className="card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Clock size={18} className="text-amber-500" />
            Prognose
          </h2>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-xl">
              <div className="text-xs text-blue-700 font-medium">Ø Sitzungen/Monat (letzte 3 Monate)</div>
              <div className="text-xl font-bold text-blue-900 mt-0.5">
                {data.prognosis.avg_sessions_per_month}
              </div>
              <div className="text-xs text-blue-600 mt-0.5">nur aktive Patienten</div>
            </div>

            {data.prognosis.months_to_target !== null ? (
              <div className="p-3 bg-emerald-50 rounded-xl">
                <div className="text-xs text-emerald-700 font-medium">
                  Bei aktuellem Tempo: noch ca.
                </div>
                <div className="text-xl font-bold text-emerald-900 mt-0.5">
                  {data.prognosis.months_to_target} Monate
                </div>
                <div className="text-xs text-emerald-600 mt-0.5">
                  bis zum Ziel ({data.prognosis.current} von {data.prognosis.target} Sitzungen)
                </div>
              </div>
            ) : data.total_sessions >= data.target_therapy_sessions ? (
              <div className="p-3 bg-emerald-50 rounded-xl">
                <div className="text-xs text-emerald-700 font-medium">Ziel erreicht!</div>
                <div className="text-xl font-bold text-emerald-900 mt-0.5">✓</div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-sm text-slate-500">Noch keine Sitzungen aufgezeichnet</div>
              </div>
            )}
          </div>
        </div>

        {/* Financial snapshot */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Euro size={18} className="text-amber-500" />
              Aktueller Monat
            </h2>
            <button
              onClick={() => navigate('/finance')}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Details <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Einnahmen</span>
              <span className="font-semibold text-emerald-700">
                {data.financial.month_income.toFixed(2)} €
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Supervisionskosten</span>
              <span className="font-semibold text-red-600">
                -{data.financial.month_costs.toFixed(2)} €
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-slate-700">Netto</span>
              <span className={`font-bold text-lg ${data.financial.month_net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {data.financial.month_net.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
