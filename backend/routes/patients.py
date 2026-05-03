from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
from models import Patient as PatientModel
import schemas
import crud

router = APIRouter(prefix="/patients", tags=["patients"])


def patient_to_out(patient, db: Session) -> schemas.PatientOut:
    session_count = len(patient.sessions)
    return schemas.PatientOut(
        id=patient.id,
        chiffre=patient.chiffre,
        status=patient.status,
        created_at=patient.created_at,
        antrag_gesendet_datum=patient.antrag_gesendet_datum,
        antrag_genehmigt_datum=patient.antrag_genehmigt_datum,
        phase_override=patient.phase_override,
        session_count=session_count,
    )


@router.get("", response_model=List[schemas.PatientOut])
def list_patients(
    include_completed: bool = Query(True),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    patients = crud.get_patients(db, include_completed=include_completed)
    return [patient_to_out(p, db) for p in patients]


@router.post("", response_model=schemas.PatientOut, status_code=201)
def create_patient(
    data: schemas.PatientCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Check for duplicate chiffre
    existing = db.query(PatientModel).filter(PatientModel.chiffre == data.chiffre).first()
    if existing:
        raise HTTPException(status_code=400, detail="Chiffre bereits vergeben")
    patient = crud.create_patient(db, data)
    return patient_to_out(patient, db)


@router.get("/{patient_id}", response_model=schemas.PatientOut)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    patient = crud.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient nicht gefunden")
    return patient_to_out(patient, db)


@router.patch("/{patient_id}", response_model=schemas.PatientOut)
def update_patient(
    patient_id: int,
    data: schemas.PatientUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    patient = crud.update_patient(db, patient_id, data)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient nicht gefunden")
    return patient_to_out(patient, db)


@router.delete("/{patient_id}", status_code=204)
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ok = crud.delete_patient(db, patient_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Patient nicht gefunden")
