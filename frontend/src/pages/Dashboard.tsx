import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Users, BookOpen, Euro, Calendar, Plus, ArrowRight, Clock
} from 'lucide-react'
import { dashboardApi } from '../api'
import type { DashboardData } from '../types'

function ProgressBar({ value, max, color = 'bg-blue-500' }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="space-y-1">
      <div className="progress-bar">
        <div
          className={`progress-fill ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{value} von {max}</span>
        <span>{pct}%</span>
      </div>
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
    <div className="card flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-slate-900 leading-tight">{value}</div>
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

  useEffect(() => {
    dashboardApi.get()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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

  const supHours = Math.round(data.total_supervision_minutes / 60 * 10) / 10

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Ihr Ausbildungsfortschritt im Überblick</p>
        </div>
        <div className="flex gap-2">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          value={data.total_supervision_count}
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

      {/* Progress section */}
      <div className="card">
        <h2 className="mb-5 flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-500" />
          Ausbildungsfortschritt
        </h2>
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Therapiesitzungen</span>
              <span className="text-sm text-slate-500">
                {data.total_sessions} / {data.target_therapy_sessions}
              </span>
            </div>
            <ProgressBar
              value={data.total_sessions}
              max={data.target_therapy_sessions}
              color="bg-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Supervisionen</span>
              <span className="text-sm text-slate-500">
                {data.total_supervision_count} / {data.target_supervision}
              </span>
            </div>
            <ProgressBar
              value={data.total_supervision_count}
              max={data.target_supervision}
              color="bg-violet-500"
            />
          </div>

          {data.self_experience_enabled && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Selbsterfahrung (Std.)</span>
                <span className="text-sm text-slate-500">
                  {data.self_experience_hours} / {data.target_self_experience}
                </span>
              </div>
              <ProgressBar
                value={data.self_experience_hours}
                max={data.target_self_experience}
                color="bg-emerald-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Prognosis + Financial */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Prognosis */}
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2">
            <Clock size={20} className="text-amber-500" />
            Prognose
          </h2>
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 rounded-xl">
              <div className="text-sm text-blue-700 font-medium">Ø Sitzungen/Monat (letzte 3 Monate)</div>
              <div className="text-2xl font-bold text-blue-900 mt-1">
                {data.prognosis.avg_sessions_per_month}
              </div>
              <div className="text-xs text-blue-600 mt-0.5">nur aktive Patienten</div>
            </div>

            {data.prognosis.months_to_target !== null ? (
              <div className="p-4 bg-emerald-50 rounded-xl">
                <div className="text-sm text-emerald-700 font-medium">Voraussichtlich fertig in</div>
                <div className="text-2xl font-bold text-emerald-900 mt-1">
                  {data.prognosis.months_to_target} Monate
                </div>
                <div className="text-xs text-emerald-600 mt-0.5">
                  bei aktuellem Tempo ({data.prognosis.current} von {data.prognosis.target} Sitzungen)
                </div>
              </div>
            ) : data.total_sessions >= data.target_therapy_sessions ? (
              <div className="p-4 bg-emerald-50 rounded-xl">
                <div className="text-sm text-emerald-700 font-medium">Ziel erreicht!</div>
                <div className="text-2xl font-bold text-emerald-900 mt-1">✓</div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-sm text-slate-500">Noch keine Sitzungen aufgezeichnet</div>
              </div>
            )}
          </div>
        </div>

        {/* Financial snapshot */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2">
              <Euro size={20} className="text-amber-500" />
              Aktueller Monat
            </h2>
            <button
              onClick={() => navigate('/finance')}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Details <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
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
