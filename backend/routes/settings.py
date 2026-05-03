from typing import Dict, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
import schemas
import crud

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=Dict[str, Optional[str]])
def get_settings(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    settings = crud.get_all_settings(db)
    # Don't expose the password
    settings.pop("app_password", None)
    return settings


@router.patch("")
def update_settings(
    data: schemas.SettingsUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            crud.set_setting(db, key, value)
    return {"message": "Einstellungen gespeichert"}
