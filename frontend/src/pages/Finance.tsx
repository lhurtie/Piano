import { useState, useEffect } from 'react'
import { financeApi } from '../api'
import type { MonthlyFinance, QuarterlyFinance } from '../types'

type Tab = 'monthly' | 'quarterly'

export default function Finance() {
  const [tab, setTab] = useState<Tab>('monthly')
  const [monthly, setMonthly] = useState<MonthlyFinance[]>([])
  const [quarterly, setQuarterly] = useState<QuarterlyFinance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([financeApi.monthly(), financeApi.quarterly()])
      .then(([m, q]) => {
        setMonthly(m)
        setQuarterly(q)
      })
      .finally(() => setLoading(false))
  }, [])

  const totalIncome = monthly.reduce((sum, m) => sum + m.income, 0)
  const totalCosts = monthly.reduce((sum, m) => sum + m.costs, 0)
  const totalNet = monthly.reduce((sum, m) => sum + m.net, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1>Finanzen</h1>
        <p className="text-sm text-slate-500 mt-1">Einnahmen und Kosten im Überblick</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Gesamteinnahmen', value: `${totalIncome.toFixed(2)} €`, color: 'text-emerald-600' },
          { label: 'Gesamtkosten', value: `${totalCosts.toFixed(2)} €`, color: 'text-red-600' },
          { label: 'Netto gesamt', value: `${totalNet.toFixed(2)} €`, color: totalNet >= 0 ? 'text-blue-600' : 'text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col items-center justify-center text-center min-h-[80px]">
            <div className={`text-xl font-bold leading-tight whitespace-nowrap ${color}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-1 text-center">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div>
        <div className="flex rounded-xl overflow-hidden border border-slate-200 mb-6 shadow-sm">
          <button
            onClick={() => setTab('monthly')}
            className={`flex-1 py-3 text-sm font-semibold transition-all duration-200 ${
              tab === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            Monatlich
          </button>
          <button
            onClick={() => setTab('quarterly')}
            className={`flex-1 py-3 text-sm font-semibold transition-all duration-200 ${
              tab === 'quarterly'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            Quartalsweise
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : tab === 'monthly' ? (
          <div className="table-container bg-white">
            {monthly.length === 0 ? (
              <div className="text-center py-12 text-slate-500">Keine Finanzdaten vorhanden.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Monat</th>
                    <th className="text-right">Einnahmen</th>
                    <th className="text-right">Kosten</th>
                    <th className="text-right">Netto</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((m) => (
                    <tr key={`${m.year}-${m.month}`}>
                      <td className="font-medium">{m.month_label}</td>
                      <td className="text-right text-emerald-700 font-medium">
                        {m.income.toFixed(2)} €
                      </td>
                      <td className="text-right text-red-600">
                        {m.costs > 0 ? `-${m.costs.toFixed(2)} €` : '—'}
                      </td>
                      <td className={`text-right font-semibold ${m.net >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                        {m.net.toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-semibold">
                    <td className="px-4 py-3 text-slate-700">Gesamt</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{totalIncome.toFixed(2)} €</td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {totalCosts > 0 ? `-${totalCosts.toFixed(2)} €` : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right ${totalNet >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                      {totalNet.toFixed(2)} €
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        ) : (
          <div className="table-container bg-white">
            {quarterly.length === 0 ? (
              <div className="text-center py-12 text-slate-500">Keine Quartaldaten vorhanden.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Quartal</th>
                    <th className="text-right">Sitzungen</th>
                    <th className="text-right">Gesamtbetrag</th>
                  </tr>
                </thead>
                <tbody>
                  {quarterly.map((q) => (
                    <tr key={`${q.year}-${q.quarter}`}>
                      <td className="font-medium">{q.quarter_label}</td>
                      <td className="text-right text-slate-700">{q.sessions}</td>
                      <td className="text-right font-semibold text-emerald-700">
                        {q.total_amount.toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
