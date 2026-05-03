from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Setting
from schemas import LoginRequest, SetupRequest, TokenResponse, PasswordChangeRequest
from auth import hash_password, verify_password, create_access_token, get_current_user
import crud

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/status")
def auth_status(db: Session = Depends(get_db)):
    """Check if password is set up."""
    pw = crud.get_setting(db, "app_password")
    return {"password_set": bool(pw)}


@router.post("/setup", response_model=TokenResponse)
def setup_password(data: SetupRequest, db: Session = Depends(get_db)):
    """Set the initial password (only if not already set)."""
    existing_pw = crud.get_setting(db, "app_password")
    if existing_pw:
        raise HTTPException(status_code=400, detail="Password already set")
    if not data.password or len(data.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    hashed = hash_password(data.password)
    crud.set_setting(db, "app_password", hashed)

    token = create_access_token({"sub": "admin"})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Login with password."""
    stored_pw = crud.get_setting(db, "app_password")
    if not stored_pw:
        raise HTTPException(status_code=400, detail="No password set. Please set up first.")

    if not verify_password(data.password, stored_pw):
        raise HTTPException(status_code=401, detail="Incorrect password")

    token = create_access_token({"sub": "admin"})
    return TokenResponse(access_token=token)


@router.post("/change-password")
def change_password(
    data: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Change the password."""
    stored_pw = crud.get_setting(db, "app_password")
    if not stored_pw:
        raise HTTPException(status_code=400, detail="No password set")

    if not verify_password(data.current_password, stored_pw):
        raise HTTPException(status_code=401, detail="Aktuelles Passwort ist falsch")

    if not data.new_password or len(data.new_password) < 4:
        raise HTTPException(status_code=400, detail="Neues Passwort muss mindestens 4 Zeichen haben")

    hashed = hash_password(data.new_password)
    crud.set_setting(db, "app_password", hashed)
    return {"message": "Passwort erfolgreich geändert"}
