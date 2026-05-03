export type PatientStatus = 'Probatorik' | 'Therapie laufend' | 'Therapie abgeschlossen'
export type SupervisionType = 'Einzel' | 'Gruppe'

export interface Patient {
  id: number
  chiffre: string
  status: PatientStatus
  created_at: string
  antrag_gesendet_datum: string | null
  antrag_genehmigt_datum: string | null
  session_count: number
}

export interface Session {
  id: number
  patient_id: number
  date: string
  duration_minutes: number | null
  notes: string | null
  revenue_amount: number
  session_type: string
  patient_chiffre: string | null
  phase: string | null
  session_number: number | null
}

export interface Supervisor {
  id: number
  name: string
  created_at: string
}

export interface Supervision {
  id: number
  supervisor_id: number
  date: string
  duration_minutes: number
  type: SupervisionType
  cost: number
  notes: string | null
  patient_ids: number[]
  supervisor_name: string | null
  patient_chiffres: string[]
}

export interface DashboardData {
  total_sessions: number
  active_patients: number
  completed_patients: number
  // Supervision breakdown
  total_supervision_einzel: number
  total_supervision_gruppe: number
  total_supervision_minutes: number
  // Manual hours
  self_experience_hours: number
  theorie_hours: number
  pt1_hours: number
  pt2_hours: number
  self_experience_enabled: boolean
  // Targets
  target_therapy_sessions: number
  target_supervision_einzel: number
  target_supervision_gruppe: number
  target_self_experience: number
  target_theorie: number
  target_pt1: number
  target_pt2: number
  // Progress
  ambulanz_progress: number
  gesamt_progress: number
  prognosis: {
    avg_sessions_per_month: number
    months_to_target: number | null
    target: number
    current: number
  }
  financial: {
    month_income: number
    month_costs: number
    month_net: number
  }
}

export interface MonthlyFinance {
  year: number
  month: number
  month_label: string
  income: number
  costs: number
  net: number
}

export interface QuarterlyFinance {
  year: number
  quarter: number
  quarter_label: string
  sessions: number
  total_amount: number
}

export interface BackupFile {
  filename: string
  created_at: string
  size_bytes: number
}

export interface Settings {
  target_therapy_sessions: string
  target_supervision_einzel: string
  target_supervision_gruppe: string
  target_self_experience: string
  target_theorie: string
  target_pt1: string
  target_pt2: string
  default_cost_einzel: string
  default_cost_gruppe: string
  default_revenue_probatorik: string
  default_revenue_einzel: string
  self_experience_enabled: string
  self_experience_hours: string
  theorie_hours: string
  pt1_hours: string
  pt2_hours: string
}
