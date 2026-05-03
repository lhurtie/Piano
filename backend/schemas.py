from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel
import enum


class PatientStatus(str, enum.Enum):
    PROBATORIK = "Probatorik"
    LAUFEND = "Therapie laufend"
    ABGESCHLOSSEN = "Therapie abgeschlossen"


class SupervisionType(str, enum.Enum):
    EINZEL = "Einzel"
    GRUPPE = "Gruppe"


# --- Supervisor ---
class SupervisorBase(BaseModel):
    name: str


class SupervisorCreate(SupervisorBase):
    pass


class SupervisorUpdate(BaseModel):
    name: str


class SupervisorOut(SupervisorBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Patient ---
class PatientBase(BaseModel):
    chiffre: str
    status: PatientStatus = PatientStatus.PROBATORIK
    antrag_gesendet_datum: Optional[date] = None
    antrag_genehmigt_datum: Optional[date] = None


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    chiffre: Optional[str] = None
    status: Optional[PatientStatus] = None
    antrag_gesendet_datum: Optional[date] = None
    antrag_genehmigt_datum: Optional[date] = None
    phase_override: Optional[str] = None


class PatientOut(PatientBase):
    id: int
    created_at: datetime
    session_count: int = 0
    phase_override: Optional[str] = None

    model_config = {"from_attributes": True}


# --- Session ---
class SessionBase(BaseModel):
    patient_id: int
    date: date
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    revenue_amount: float = 45.80
    session_type: str = "Einzelsitzung"


class SessionCreate(SessionBase):
    pass


class SessionUpdate(BaseModel):
    date: Optional[date] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    revenue_amount: Optional[float] = None
    session_type: Optional[str] = None


class SessionOut(SessionBase):
    id: int
    patient_chiffre: Optional[str] = None
    phase: Optional[str] = None
    session_number: Optional[int] = None

    model_config = {"from_attributes": True}


# --- Supervision ---
class SupervisionBase(BaseModel):
    supervisor_id: int
    date: date
    duration_minutes: int
    type: SupervisionType
    cost: float
    notes: Optional[str] = None
    patient_ids: List[int] = []


class SupervisionCreate(SupervisionBase):
    pass


class SupervisionUpdate(BaseModel):
    supervisor_id: Optional[int] = None
    date: Optional[date] = None
    duration_minutes: Optional[int] = None
    type: Optional[SupervisionType] = None
    cost: Optional[float] = None
    notes: Optional[str] = None
    patient_ids: Optional[List[int]] = None


class SupervisionOut(SupervisionBase):
    id: int
    supervisor_name: Optional[str] = None
    patient_chiffres: List[str] = []

    model_config = {"from_attributes": True}


# --- Settings ---
class SettingOut(BaseModel):
    key: str
    value: Optional[str]

    model_config = {"from_attributes": True}


class SettingsUpdate(BaseModel):
    target_therapy_sessions: Optional[str] = None
    target_supervision_einzel: Optional[str] = None
    target_supervision_gruppe: Optional[str] = None
    target_self_experience: Optional[str] = None
    target_theorie: Optional[str] = None
    target_pt1: Optional[str] = None
    target_pt2: Optional[str] = None
    default_cost_einzel: Optional[str] = None
    default_cost_gruppe: Optional[str] = None
    default_revenue_probatorik: Optional[str] = None
    default_revenue_einzel: Optional[str] = None
    self_experience_enabled: Optional[str] = None
    self_experience_hours: Optional[str] = None
    theorie_hours: Optional[str] = None
    pt1_hours: Optional[str] = None
    pt2_hours: Optional[str] = None


# --- Auth ---
class LoginRequest(BaseModel):
    password: str


class SetupRequest(BaseModel):
    password: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- Dashboard ---
class PrognosisData(BaseModel):
    avg_sessions_per_month: float
    months_to_target: Optional[float]
    target: int
    current: int


class FinancialSnapshot(BaseModel):
    month_income: float
    month_costs: float
    month_net: float


class DashboardData(BaseModel):
    total_sessions: int
    active_patients: int
    completed_patients: int
    # Supervision breakdown
    total_supervision_einzel: int
    total_supervision_gruppe: int
    total_supervision_minutes: int
    total_supervision_einzel_hours: float
    total_supervision_gruppe_hours: float
    # Manual hours
    self_experience_hours: float
    theorie_hours: float
    pt1_hours: float
    pt2_hours: float
    self_experience_enabled: bool
    # Targets
    target_therapy_sessions: int
    target_supervision_einzel: float
    target_supervision_gruppe: float
    target_self_experience: int
    target_theorie: int
    target_pt1: int
    target_pt2: int
    # Progress
    ambulanz_progress: float
    gesamt_progress: float
    prognosis: PrognosisData
    financial: FinancialSnapshot


# --- Finance ---
class MonthlyFinance(BaseModel):
    year: int
    month: int
    month_label: str
    income: float
    costs: float
    net: float


class QuarterlyFinance(BaseModel):
    year: int
    quarter: int
    quarter_label: str
    sessions: int
    total_amount: float


# --- Backup ---
class BackupFile(BaseModel):
    filename: str
    created_at: str
    size_bytes: int
