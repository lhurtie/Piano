import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from database import engine, SessionLocal, get_db
from models import Base
from auth import get_current_user
import crud
import schemas as s
from routes import auth, patients, sessions, supervisors, supervisions, finance, settings, export, backup
from routes.backup import do_auto_backup

# Ensure data directory exists
os.makedirs("/app/data", exist_ok=True)
os.makedirs("/backups", exist_ok=True)

# Create tables
Base.metadata.create_all(bind=engine)

# Migrate: add session_type column if missing (SQLite doesn't support ALTER TABLE via SQLAlchemy auto)
from sqlalchemy import text
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE sessions ADD COLUMN session_type TEXT NOT NULL DEFAULT 'Einzelsitzung'"))
        conn.commit()
    except Exception:
        pass  # Column already exists

# Seed default settings
with SessionLocal() as db:
    crud.seed_settings(db)


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = BackgroundScheduler()
    scheduler.add_job(do_auto_backup, "interval", hours=24, id="daily_backup")
    scheduler.start()
    print("[Piano] Daily backup scheduler started.")
    yield
    scheduler.shutdown()
    print("[Piano] Scheduler stopped.")


app = FastAPI(title="Piano API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routes ───────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(supervisors.router, prefix="/api")
app.include_router(supervisions.router, prefix="/api")
app.include_router(finance.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(backup.router, prefix="/api")


@app.get("/api/dashboard", response_model=s.DashboardData)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return crud.get_dashboard_data(db)


# ── Frontend SPA serving ──────────────────────────────────────────────────────
STATIC_DIR = Path("/app/static")
INDEX_HTML = STATIC_DIR / "index.html"

# Mount Vite-built assets directory so hashed files are served efficiently
if (STATIC_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")


@app.get("/")
async def serve_root():
    if INDEX_HTML.exists():
        return FileResponse(str(INDEX_HTML))
    return JSONResponse({"message": "Piano API is running. Frontend not available."})


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # Try to serve an exact static file first (e.g. favicon.svg, manifest.json)
    candidate = STATIC_DIR / full_path
    if candidate.exists() and candidate.is_file():
        return FileResponse(str(candidate))
    # Fallback: SPA — return index.html so React Router handles the path
    if INDEX_HTML.exists():
        return FileResponse(str(INDEX_HTML))
    return JSONResponse({"detail": "Not found"}, status_code=404)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=False)
