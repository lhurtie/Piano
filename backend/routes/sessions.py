from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
import schemas
import crud

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("", response_model=List[schemas.SessionOut])
def list_sessions(
    patient_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return crud.get_sessions(db, patient_id=patient_id)


@router.post("", response_model=schemas.SessionOut, status_code=201)
def create_session(
    data: schemas.SessionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    patient = crud.get_patient(db, data.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient nicht gefunden")
    return crud.create_session(db, data)


@router.get("/{session_id}", response_model=schemas.SessionOut)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    session = crud.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sitzung nicht gefunden")
    return crud.enrich_session(session, db)


@router.patch("/{session_id}", response_model=schemas.SessionOut)
def update_session(
    session_id: int,
    data: schemas.SessionUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = crud.update_session(db, session_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Sitzung nicht gefunden")
    return result


@router.delete("/{session_id}", status_code=204)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ok = crud.delete_session(db, session_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Sitzung nicht gefunden")
