import io
import csv
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
from models import Patient, Session as SessionModel, Supervision, Supervisor, PatientStatus, SupervisionType, supervision_patients

router = APIRouter(prefix="/import", tags=["import"])


def _parse_date(s: str) -> Optional[date]:
    for fmt in ('%d.%m.%Y', '%Y-%m-%d', '%d.%m.%y', '%d/%m/%Y'):
        try:
            return datetime.strptime(s.strip(), fmt).date()
        except ValueError:
            continue
    return None


def _parse_float(s: str) -> Optional[float]:
    try:
        return float(s.strip().replace(',', '.'))
    except (ValueError, AttributeError):
        return None


@router.post("/sessions")
async def import_sessions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    content = await file.read()
    text = content.decode("utf-8-sig")

    sample = text[:500]
    sep = ';' if sample.count(';') >= sample.count(',') else ','

    reader = csv.DictReader(io.StringIO(text), delimiter=sep)
    rows = [{k.strip().lower(): v.strip() for k, v in row.items()} for row in reader]

    imported = 0
    errors: list[str] = []

    for i, row in enumerate(rows, start=2):
        try:
            chiffre = row.get('patient_chiffre', '').strip()
            if not chiffre:
                errors.append(f"Zeile {i}: patient_chiffre fehlt")
                continue

            datum = _parse_date(row.get('datum', ''))
            if not datum:
                errors.append(f"Zeile {i}: Ungültiges Datum '{row.get('datum', '')}'")
                continue

            patient = db.query(Patient).filter(Patient.chiffre == chiffre).first()
            if not patient:
                patient = Patient(chiffre=chiffre, status=PatientStatus.PROBATORIK)
                db.add(patient)
                db.flush()

            sitzungstyp = row.get('sitzungstyp', 'Einzelsitzung').strip()
            if sitzungstyp not in ('Probatorik', 'Einzelsitzung'):
                sitzungstyp = 'Einzelsitzung'

            dauer_str = row.get('dauer_min', '').strip()
            dauer = int(dauer_str) if dauer_str.isdigit() else None

            honorar = _parse_float(row.get('honorar_eur', ''))
            if honorar is None:
                honorar = 33.57 if sitzungstyp == 'Probatorik' else 45.80

            notizen = row.get('notizen', '').strip() or None

            db.add(SessionModel(
                patient_id=patient.id,
                date=datum,
                session_type=sitzungstyp,
                duration_minutes=dauer,
                revenue_amount=honorar,
                notes=notizen,
            ))
            imported += 1

        except Exception as e:
            errors.append(f"Zeile {i}: {e}")

    if imported > 0:
        db.commit()
        # Update patient statuses
        for patient in db.query(Patient).filter(Patient.status == PatientStatus.PROBATORIK).all():
            count = db.query(SessionModel).filter(SessionModel.patient_id == patient.id).count()
            if count >= 5:
                patient.status = PatientStatus.LAUFEND
        db.commit()

    return {"imported": imported, "errors": errors}


@router.post("/supervisions")
async def import_supervisions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    content = await file.read()
    text = content.decode("utf-8-sig")

    sample = text[:500]
    sep = ';' if sample.count(';') >= sample.count(',') else ','

    reader = csv.DictReader(io.StringIO(text), delimiter=sep)
    rows = [{k.strip().lower(): v.strip() for k, v in row.items()} for row in reader]

    imported = 0
    errors: list[str] = []

    for i, row in enumerate(rows, start=2):
        try:
            supervisor_name = row.get('supervisor_name', '').strip()
            if not supervisor_name:
                errors.append(f"Zeile {i}: supervisor_name fehlt")
                continue

            datum = _parse_date(row.get('datum', ''))
            if not datum:
                errors.append(f"Zeile {i}: Ungültiges Datum '{row.get('datum', '')}'")
                continue

            typ_str = row.get('typ', '').strip()
            if typ_str not in ('Einzel', 'Gruppe'):
                errors.append(f"Zeile {i}: typ muss 'Einzel' oder 'Gruppe' sein")
                continue
            typ = SupervisionType.EINZEL if typ_str == 'Einzel' else SupervisionType.GRUPPE

            dauer_str = row.get('dauer_min', '').strip()
            if not dauer_str.isdigit():
                errors.append(f"Zeile {i}: dauer_min fehlt oder ungültig")
                continue
            dauer = int(dauer_str)

            kosten = _parse_float(row.get('kosten_eur', '')) or 0.0
            notizen = row.get('notizen', '').strip() or None

            supervisor = db.query(Supervisor).filter(Supervisor.name == supervisor_name).first()
            if not supervisor:
                supervisor = Supervisor(name=supervisor_name)
                db.add(supervisor)
                db.flush()

            sup = Supervision(
                supervisor_id=supervisor.id,
                date=datum,
                type=typ,
                duration_minutes=dauer,
                cost=kosten,
                notes=notizen,
            )
            db.add(sup)
            db.flush()

            chiffres_str = row.get('patient_chiffres', '').strip()
            if chiffres_str:
                for chiffre in chiffres_str.split(','):
                    chiffre = chiffre.strip()
                    if not chiffre:
                        continue
                    patient = db.query(Patient).filter(Patient.chiffre == chiffre).first()
                    if not patient:
                        patient = Patient(chiffre=chiffre, status=PatientStatus.PROBATORIK)
                        db.add(patient)
                        db.flush()
                    db.execute(supervision_patients.insert().values(
                        supervision_id=sup.id,
                        patient_id=patient.id,
                    ))

            imported += 1

        except Exception as e:
            errors.append(f"Zeile {i}: {e}")

    if imported > 0:
        db.commit()

    return {"imported": imported, "errors": errors}
