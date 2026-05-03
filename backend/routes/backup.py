import os
import shutil
import io
import csv
import zipfile
from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
from models import Patient, Session as SessionModel, Supervision, Supervisor
import schemas
import crud

router = APIRouter(prefix="/backup", tags=["backup"])

DB_PATH = "/app/data/piano.db"
BACKUP_DIR = "/backups"


def get_backup_files():
    if not os.path.exists(BACKUP_DIR):
        return []
    files = []
    for fname in sorted(os.listdir(BACKUP_DIR), reverse=True):
        if fname.endswith(".db") or fname.endswith(".zip"):
            fpath = os.path.join(BACKUP_DIR, fname)
            stat = os.stat(fpath)
            files.append(schemas.BackupFile(
                filename=fname,
                created_at=datetime.fromtimestamp(stat.st_mtime).strftime("%d.%m.%Y %H:%M"),
                size_bytes=stat.st_size,
            ))
    return files


@router.get("", response_model=list[schemas.BackupFile])
def list_backups(current_user=Depends(get_current_user)):
    return get_backup_files()


@router.post("/create")
def create_backup(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")

    # DB backup
    db_backup_name = f"backup_{timestamp}.db"
    db_backup_path = os.path.join(BACKUP_DIR, db_backup_name)
    if os.path.exists(DB_PATH):
        shutil.copy2(DB_PATH, db_backup_path)

    return {
        "message": "Backup erfolgreich erstellt",
        "filename": db_backup_name,
        "timestamp": timestamp,
    }


@router.get("/download/{filename}")
def download_backup(
    filename: str,
    current_user=Depends(get_current_user),
):
    # Security: prevent path traversal
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Ungültiger Dateiname")

    filepath = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Backup nicht gefunden")

    return FileResponse(
        filepath,
        filename=filename,
        media_type="application/octet-stream",
    )


@router.delete("/{filename}", status_code=204)
def delete_backup(
    filename: str,
    current_user=Depends(get_current_user),
):
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Ungültiger Dateiname")

    filepath = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Backup nicht gefunden")

    os.remove(filepath)


def do_auto_backup():
    """Called by APScheduler for daily backups."""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
    db_backup_name = f"backup_{timestamp}.db"
    db_backup_path = os.path.join(BACKUP_DIR, db_backup_name)
    if os.path.exists(DB_PATH):
        shutil.copy2(DB_PATH, db_backup_path)
    print(f"[AutoBackup] Created {db_backup_name}")

    # Keep only last 30 backups
    try:
        files = sorted([
            f for f in os.listdir(BACKUP_DIR)
            if f.startswith("backup_") and f.endswith(".db")
        ])
        while len(files) > 30:
            oldest = files.pop(0)
            os.remove(os.path.join(BACKUP_DIR, oldest))
            print(f"[AutoBackup] Removed old backup {oldest}")
    except Exception as e:
        print(f"[AutoBackup] Cleanup error: {e}")
