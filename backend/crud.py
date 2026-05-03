from datetime import date, datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import Patient, Session as SessionModel, Supervision, Supervisor, Setting, PatientStatus, supervision_patients
import schemas


DEFAULT_SETTINGS = {
    "target_therapy_sessions": "600",
    "target_supervision_einzel": "37.5",   # hours (was "50" sessions)
    "target_supervision_gruppe": "75",     # hours (was "100" sessions)
    "target_self_experience": "120",
    "target_theorie": "600",
    "target_pt1": "1200",
    "target_pt2": "600",
    "default_cost_einzel": "110",
    "default_cost_gruppe": "0",
    "default_revenue_probatorik": "33.57",
    "default_revenue_einzel": "45.80",
    "self_experience_enabled": "true",
    "self_experience_hours": "0",
    "theorie_hours": "0",
    "pt1_hours": "0",
    "pt2_hours": "0",
    "app_password": "",
}


def seed_settings(db: Session):
    for key, value in DEFAULT_SETTINGS.items():
        existing = db.query(Setting).filter(Setting.key == key).first()
        if not existing:
            db.add(Setting(key=key, value=value))
    db.commit()


def get_setting(db: Session, key: str) -> Optional[str]:
    s = db.query(Setting).filter(Setting.key == key).first()
    return s.value if s else None


def set_setting(db: Session, key: str, value: str):
    s = db.query(Setting).filter(Setting.key == key).first()
    if s:
        s.value = value
    else:
        db.add(Setting(key=key, value=value))
    db.commit()


def get_all_settings(db: Session) -> Dict[str, Optional[str]]:
    settings = db.query(Setting).all()
    return {s.key: s.value for s in settings}


# --- Patients ---
def get_patients(db: Session, include_completed: bool = True) -> List[Patient]:
    q = db.query(Patient)
    if not include_completed:
        q = q.filter(Patient.status != PatientStatus.ABGESCHLOSSEN)
    return q.order_by(Patient.created_at.desc()).all()


def get_patient(db: Session, patient_id: int) -> Optional[Patient]:
    return db.query(Patient).filter(Patient.id == patient_id).first()


def create_patient(db: Session, data: schemas.PatientCreate) -> Patient:
    patient = Patient(**data.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def update_patient(db: Session, patient_id: int, data: schemas.PatientUpdate) -> Optional[Patient]:
    patient = get_patient(db, patient_id)
    if not patient:
        return None
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(patient, field, val)
    db.commit()
    db.refresh(patient)
    return patient


def delete_patient(db: Session, patient_id: int) -> bool:
    patient = get_patient(db, patient_id)
    if not patient:
        return False
    db.delete(patient)
    db.commit()
    return True


# --- Sessions ---
def get_phase_for_session_number(n: int) -> str:
    if n <= 4:
        return "Probatorik"
    elif n <= 16:
        return "KZT1"
    elif n <= 28:
        return "KZT2"
    else:
        return "LZT"


def enrich_session(session: SessionModel, db: Session) -> schemas.SessionOut:
    # Get session number for this patient ordered by date
    patient_sessions = (
        db.query(SessionModel)
        .filter(SessionModel.patient_id == session.patient_id)
        .order_by(SessionModel.date.asc(), SessionModel.id.asc())
        .all()
    )
    session_number = next((i + 1 for i, s in enumerate(patient_sessions) if s.id == session.id), None)
    phase = get_phase_for_session_number(session_number) if session_number else None

    patient = db.query(Patient).filter(Patient.id == session.patient_id).first()

    return schemas.SessionOut(
        id=session.id,
        patient_id=session.patient_id,
        date=session.date,
        duration_minutes=session.duration_minutes,
        notes=session.notes,
        revenue_amount=session.revenue_amount,
        session_type=session.session_type,
        patient_chiffre=patient.chiffre if patient else None,
        phase=phase,
        session_number=session_number,
    )


def get_sessions(db: Session, patient_id: Optional[int] = None) -> List[schemas.SessionOut]:
    q = db.query(SessionModel)
    if patient_id:
        q = q.filter(SessionModel.patient_id == patient_id)
    sessions = q.order_by(SessionModel.date.desc()).all()
    return [enrich_session(s, db) for s in sessions]


def get_session(db: Session, session_id: int) -> Optional[SessionModel]:
    return db.query(SessionModel).filter(SessionModel.id == session_id).first()


def create_session(db: Session, data: schemas.SessionCreate) -> schemas.SessionOut:
    session = SessionModel(**data.model_dump())
    db.add(session)
    db.commit()
    db.refresh(session)

    # Auto-update patient status Probatorik → Therapie laufend at 5th session
    patient = db.query(Patient).filter(Patient.id == session.patient_id).first()
    if patient and patient.status == PatientStatus.PROBATORIK:
        count = db.query(SessionModel).filter(SessionModel.patient_id == patient.id).count()
        if count >= 5:
            patient.status = PatientStatus.LAUFEND
            db.commit()

    return enrich_session(session, db)


def update_session(db: Session, session_id: int, data: schemas.SessionUpdate) -> Optional[schemas.SessionOut]:
    session = get_session(db, session_id)
    if not session:
        return None
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(session, field, val)
    db.commit()
    db.refresh(session)
    return enrich_session(session, db)


def delete_session(db: Session, session_id: int) -> bool:
    session = get_session(db, session_id)
    if not session:
        return False
    db.delete(session)
    db.commit()
    return True


# --- Supervisors ---
def get_supervisors(db: Session) -> List[Supervisor]:
    return db.query(Supervisor).order_by(Supervisor.name).all()


def get_supervisor(db: Session, supervisor_id: int) -> Optional[Supervisor]:
    return db.query(Supervisor).filter(Supervisor.id == supervisor_id).first()


def create_supervisor(db: Session, data: schemas.SupervisorCreate) -> Supervisor:
    supervisor = Supervisor(**data.model_dump())
    db.add(supervisor)
    db.commit()
    db.refresh(supervisor)
    return supervisor


def update_supervisor(db: Session, supervisor_id: int, data: schemas.SupervisorUpdate) -> Optional[Supervisor]:
    supervisor = get_supervisor(db, supervisor_id)
    if not supervisor:
        return None
    supervisor.name = data.name
    db.commit()
    db.refresh(supervisor)
    return supervisor


def delete_supervisor(db: Session, supervisor_id: int) -> bool:
    supervisor = get_supervisor(db, supervisor_id)
    if not supervisor:
        return False
    db.delete(supervisor)
    db.commit()
    return True


# --- Supervisions ---
def enrich_supervision(sup: Supervision, db: Session) -> schemas.SupervisionOut:
    supervisor = db.query(Supervisor).filter(Supervisor.id == sup.supervisor_id).first()
    patients = db.query(Patient).join(
        supervision_patients,
        Patient.id == supervision_patients.c.patient_id
    ).filter(supervision_patients.c.supervision_id == sup.id).all()

    return schemas.SupervisionOut(
        id=sup.id,
        supervisor_id=sup.supervisor_id,
        date=sup.date,
        duration_minutes=sup.duration_minutes,
        type=sup.type,
        cost=sup.cost,
        notes=sup.notes,
        patient_ids=[p.id for p in patients],
        supervisor_name=supervisor.name if supervisor else None,
        patient_chiffres=[p.chiffre for p in patients],
    )


def get_supervisions(db: Session) -> List[schemas.SupervisionOut]:
    sups = db.query(Supervision).order_by(Supervision.date.desc()).all()
    return [enrich_supervision(s, db) for s in sups]


def get_supervision(db: Session, supervision_id: int) -> Optional[Supervision]:
    return db.query(Supervision).filter(Supervision.id == supervision_id).first()


def create_supervision(db: Session, data: schemas.SupervisionCreate) -> schemas.SupervisionOut:
    patient_ids = data.patient_ids
    sup_data = data.model_dump(exclude={"patient_ids"})
    sup = Supervision(**sup_data)
    db.add(sup)
    db.flush()

    for pid in patient_ids:
        patient = db.query(Patient).filter(Patient.id == pid).first()
        if patient:
            sup.patients.append(patient)

    db.commit()
    db.refresh(sup)
    return enrich_supervision(sup, db)


def update_supervision(db: Session, supervision_id: int, data: schemas.SupervisionUpdate) -> Optional[schemas.SupervisionOut]:
    sup = get_supervision(db, supervision_id)
    if not sup:
        return None

    update_data = data.model_dump(exclude_unset=True)
    patient_ids = update_data.pop("patient_ids", None)

    for field, val in update_data.items():
        setattr(sup, field, val)

    if patient_ids is not None:
        sup.patients = []
        for pid in patient_ids:
            patient = db.query(Patient).filter(Patient.id == pid).first()
            if patient:
                sup.patients.append(patient)

    db.commit()
    db.refresh(sup)
    return enrich_supervision(sup, db)


def delete_supervision(db: Session, supervision_id: int) -> bool:
    sup = get_supervision(db, supervision_id)
    if not sup:
        return False
    db.delete(sup)
    db.commit()
    return True


# --- Dashboard ---
def get_dashboard_data(db: Session) -> schemas.DashboardData:
    settings = get_all_settings(db)

    target_sessions = int(settings.get("target_therapy_sessions") or "600")
    target_sup_einzel = float(settings.get("target_supervision_einzel") or "37.5")
    target_sup_gruppe = float(settings.get("target_supervision_gruppe") or "75")
    target_self_exp = int(settings.get("target_self_experience") or "120")
    target_theorie = int(settings.get("target_theorie") or "600")
    target_pt1 = int(settings.get("target_pt1") or "1200")
    target_pt2 = int(settings.get("target_pt2") or "600")
    self_exp_enabled = (settings.get("self_experience_enabled") or "true").lower() == "true"
    self_exp_hours = float(settings.get("self_experience_hours") or "0")
    theorie_hours = float(settings.get("theorie_hours") or "0")
    pt1_hours = float(settings.get("pt1_hours") or "0")
    pt2_hours = float(settings.get("pt2_hours") or "0")

    all_sessions = db.query(SessionModel).all()
    total_sessions = len(all_sessions)

    active_patients = db.query(Patient).filter(
        Patient.status != PatientStatus.ABGESCHLOSSEN
    ).count()
    completed_patients = db.query(Patient).filter(
        Patient.status == PatientStatus.ABGESCHLOSSEN
    ).count()

    from models import SupervisionType as SVType
    all_supervisions = db.query(Supervision).all()
    total_supervision_einzel = sum(1 for s in all_supervisions if s.type == SVType.EINZEL)
    total_supervision_gruppe = sum(1 for s in all_supervisions if s.type == SVType.GRUPPE)
    total_supervision_minutes = sum(s.duration_minutes for s in all_supervisions)
    # Supervision progress in hours
    total_supervision_einzel_hours = sum(s.duration_minutes for s in all_supervisions if s.type == SVType.EINZEL) / 60.0
    total_supervision_gruppe_hours = sum(s.duration_minutes for s in all_supervisions if s.type == SVType.GRUPPE) / 60.0

    # Prognosis: avg sessions per month over last 3 months
    # Only count sessions from patients who were NOT abgeschlossen in that month
    today = date.today()
    month = today.month - 3
    year = today.year
    if month <= 0:
        month += 12
        year -= 1
    three_months_ago = date(year, month, 1)

    # Build set of (patient_id, year, month) where patient was abgeschlossen
    # We approximate: if patient is currently abgeschlossen, check sessions in last 3 months
    # More accurately: count sessions for patients who are active (not abgeschlossen)
    # as per the spec: patients NOT abgeschlossen in that month
    active_patient_ids = [
        p.id for p in db.query(Patient).filter(Patient.status != PatientStatus.ABGESCHLOSSEN).all()
    ]

    recent_sessions = db.query(SessionModel).filter(
        SessionModel.patient_id.in_(active_patient_ids),
        SessionModel.date >= three_months_ago,
    ).all() if active_patient_ids else []

    months_in_range = 3
    avg_per_month = len(recent_sessions) / months_in_range if months_in_range > 0 else 0

    remaining = target_sessions - total_sessions
    months_to_target = (remaining / avg_per_month) if avg_per_month > 0 and remaining > 0 else None

    prognosis = schemas.PrognosisData(
        avg_sessions_per_month=round(avg_per_month, 1),
        months_to_target=round(months_to_target, 1) if months_to_target else None,
        target=target_sessions,
        current=total_sessions,
    )

    # Financial snapshot for current month
    current_month_sessions = db.query(SessionModel).filter(
        SessionModel.date >= date(today.year, today.month, 1),
        SessionModel.date <= today,
    ).all()
    month_income = sum(s.revenue_amount for s in current_month_sessions)

    current_month_supervisions = db.query(Supervision).filter(
        Supervision.date >= date(today.year, today.month, 1),
        Supervision.date <= today,
    ).all()
    month_costs = sum(s.cost for s in current_month_supervisions)

    financial = schemas.FinancialSnapshot(
        month_income=month_income,
        month_costs=month_costs,
        month_net=month_income - month_costs,
    )

    # Progress calculations
    def pct(value: float, target: float) -> float:
        if target <= 0:
            return 0.0
        return min(100.0, (value / target) * 100.0)

    therapy_pct = pct(total_sessions, target_sessions)
    sup_einzel_pct = pct(total_supervision_einzel_hours, target_sup_einzel)
    sup_gruppe_pct = pct(total_supervision_gruppe_hours, target_sup_gruppe)
    self_exp_pct = pct(self_exp_hours, target_self_exp) if self_exp_enabled else 0.0
    theorie_pct = pct(theorie_hours, target_theorie)
    pt1_pct = pct(pt1_hours, target_pt1)
    pt2_pct = pct(pt2_hours, target_pt2)

    # ambulanz_progress: average of therapy + sup_einzel + sup_gruppe
    ambulanz_progress = (therapy_pct + sup_einzel_pct + sup_gruppe_pct) / 3.0

    # gesamt_progress: average of all 6 areas (self experience counts only if enabled)
    if self_exp_enabled:
        gesamt_progress = (therapy_pct + sup_einzel_pct + sup_gruppe_pct + self_exp_pct + theorie_pct + (pt1_pct + pt2_pct) / 2.0) / 5.0
    else:
        gesamt_progress = (therapy_pct + sup_einzel_pct + sup_gruppe_pct + theorie_pct + (pt1_pct + pt2_pct) / 2.0) / 4.0

    return schemas.DashboardData(
        total_sessions=total_sessions,
        active_patients=active_patients,
        completed_patients=completed_patients,
        total_supervision_einzel=total_supervision_einzel,
        total_supervision_gruppe=total_supervision_gruppe,
        total_supervision_minutes=total_supervision_minutes,
        total_supervision_einzel_hours=round(total_supervision_einzel_hours, 2),
        total_supervision_gruppe_hours=round(total_supervision_gruppe_hours, 2),
        self_experience_hours=self_exp_hours,
        theorie_hours=theorie_hours,
        pt1_hours=pt1_hours,
        pt2_hours=pt2_hours,
        self_experience_enabled=self_exp_enabled,
        target_therapy_sessions=target_sessions,
        target_supervision_einzel=target_sup_einzel,
        target_supervision_gruppe=target_sup_gruppe,
        target_self_experience=target_self_exp,
        target_theorie=target_theorie,
        target_pt1=target_pt1,
        target_pt2=target_pt2,
        ambulanz_progress=round(ambulanz_progress, 1),
        gesamt_progress=round(gesamt_progress, 1),
        prognosis=prognosis,
        financial=financial,
    )


# --- Finance ---
def get_monthly_finance(db: Session) -> List[schemas.MonthlyFinance]:
    sessions = db.query(SessionModel).all()
    supervisions = db.query(Supervision).all()

    monthly: Dict[tuple, Dict] = {}

    for s in sessions:
        key = (s.date.year, s.date.month)
        if key not in monthly:
            monthly[key] = {"income": 0.0, "costs": 0.0}
        monthly[key]["income"] += s.revenue_amount

    for s in supervisions:
        key = (s.date.year, s.date.month)
        if key not in monthly:
            monthly[key] = {"income": 0.0, "costs": 0.0}
        monthly[key]["costs"] += s.cost

    MONTHS_DE = [
        "", "Januar", "Februar", "März", "April", "Mai", "Juni",
        "Juli", "August", "September", "Oktober", "November", "Dezember"
    ]

    result = []
    for (year, month), data in sorted(monthly.items(), reverse=True):
        result.append(schemas.MonthlyFinance(
            year=year,
            month=month,
            month_label=f"{MONTHS_DE[month]} {year}",
            income=round(data["income"], 2),
            costs=round(data["costs"], 2),
            net=round(data["income"] - data["costs"], 2),
        ))
    return result


def get_quarterly_finance(db: Session) -> List[schemas.QuarterlyFinance]:
    sessions = db.query(SessionModel).all()

    quarterly: Dict[tuple, Dict] = {}
    for s in sessions:
        q = (s.date.month - 1) // 3 + 1
        key = (s.date.year, q)
        if key not in quarterly:
            quarterly[key] = {"sessions": 0, "total": 0.0}
        quarterly[key]["sessions"] += 1
        quarterly[key]["total"] += s.revenue_amount

    result = []
    for (year, q), data in sorted(quarterly.items(), reverse=True):
        result.append(schemas.QuarterlyFinance(
            year=year,
            quarter=q,
            quarter_label=f"Q{q} {year}",
            sessions=data["sessions"],
            total_amount=round(data["total"], 2),
        ))
    return result
