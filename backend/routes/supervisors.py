from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
from models import Supervisor
import schemas
import crud

router = APIRouter(prefix="/supervisors", tags=["supervisors"])


@router.get("", response_model=List[schemas.SupervisorOut])
def list_supervisors(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return crud.get_supervisors(db)


@router.post("", response_model=schemas.SupervisorOut, status_code=201)
def create_supervisor(
    data: schemas.SupervisorCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    existing = db.query(Supervisor).filter(Supervisor.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Supervisor mit diesem Namen existiert bereits")
    return crud.create_supervisor(db, data)


@router.put("/{supervisor_id}", response_model=schemas.SupervisorOut)
def update_supervisor(
    supervisor_id: int,
    data: schemas.SupervisorUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = crud.update_supervisor(db, supervisor_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Supervisor nicht gefunden")
    return result


@router.delete("/{supervisor_id}", status_code=204)
def delete_supervisor(
    supervisor_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ok = crud.delete_supervisor(db, supervisor_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Supervisor nicht gefunden")
