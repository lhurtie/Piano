# Piano – Psychotherapie-Ausbildungstracker

Piano ist eine lokal gehostete Web-App zur Verfolgung des Ausbildungsfortschritts in der Psychotherapie.

## Schnellstart

```bash
docker compose up -d
```

Die App ist dann unter http://localhost:8080 erreichbar.

Beim ersten Aufruf werden Sie gebeten, ein Passwort einzurichten.

## Funktionen

- Dashboard mit Fortschrittsbalken für Sitzungen, Supervisionen und Selbsterfahrung
- Patientenverwaltung mit Chiffren, Status und Phasenverfolgung (Probatorik → KZT1 → KZT2 → LZT)
- Sitzungsverfolgung mit automatischer Phasenzuordnung
- Supervisionsverwaltung mit Supervisor- und Patientenverknüpfung
- Finanzübersicht (monatlich und quartalsweise)
- PDF- und CSV-Export
- Automatisches tägliches Backup

## Sitzungsphasen

| Sitzungen | Phase      |
|-----------|------------|
| 1–4       | Probatorik |
| 5–16      | KZT1       |
| 17–28     | KZT2       |
| 29+       | LZT        |

## Technische Details

- Backend: FastAPI + SQLAlchemy + SQLite
- Frontend: React 18 + TypeScript + Tailwind CSS
- Auth: JWT (30 Tage) mit bcrypt-Passwort-Hash
- Daten: SQLite unter `/app/data/piano.db` (Docker-Volume)
- Backups: unter `/backups` (Docker-Volume)

## Entwicklung

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8080

# Frontend (separates Terminal)
cd frontend
npm install
npm run dev
```
