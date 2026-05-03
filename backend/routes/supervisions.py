from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
import schemas
import crud

router = APIRouter(prefix="/supervisions", tags=["supervisions"])


@router.get("", response_model=List[schemas.SupervisionOut])
def list_supervisions(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return crud.get_supervisions(db)


@router.post("", response_model=schemas.SupervisionOut, status_code=201)
def create_supervision(
    data: schemas.SupervisionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    supervisor = crud.get_supervisor(db, data.supervisor_id)
    if not supervisor:
        raise HTTPException(status_code=404, detail="Supervisor nicht gefunden")
    return crud.create_supervision(db, data)


@router.get("/{supervision_id}", response_model=schemas.SupervisionOut)
def get_supervision(
    supervision_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sup = crud.get_supervision(db, supervision_id)
    if not sup:
        raise HTTPException(status_code=404, detail="Supervision nicht gefunden")
    return crud.enrich_supervision(sup, db)


@router.patch("/{supervision_id}", response_model=schemas.SupervisionOut)
def update_supervision(
    supervision_id: int,
    data: schemas.SupervisionUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = crud.update_supervision(db, supervision_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Supervision nicht gefunden")
    return result


@router.delete("/{supervision_id}", status_code=204)
def delete_supervision(
    supervision_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ok = crud.delete_supervision(db, supervision_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Supervision nicht gefunden")
