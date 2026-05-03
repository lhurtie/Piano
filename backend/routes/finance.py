from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
import schemas
import crud

router = APIRouter(prefix="/finance", tags=["finance"])


@router.get("/monthly", response_model=List[schemas.MonthlyFinance])
def monthly_finance(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return crud.get_monthly_finance(db)


@router.get("/quarterly", response_model=List[schemas.QuarterlyFinance])
def quarterly_finance(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return crud.get_quarterly_finance(db)
