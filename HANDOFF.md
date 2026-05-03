# Piano — Handoff-Dokument

Stand: 2026-05-04

---

## Stack & Deployment

| Komponente | Detail |
|---|---|
| Backend | FastAPI (Python 3.12), SQLAlchemy sync, SQLite |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Container | Einzelner Docker-Container (Multi-Stage Build) |
| Port | 4444 (Host) → 8080 (Container) |
| NAS-IP | 192.168.178.98, User: Louis |
| GitHub | https://github.com/lhurtie/Piano |
| Datenbank | /app/data/piano.db |
| Backups | /backups/ (täglich via APScheduler) |

### Deployment auf NAS
```bash
ssh Louis@192.168.178.98
cd /pfad/zu/piano
git pull && docker compose up -d --build
```

---

## Architektur-Entscheidungen

- **Auth**: Einzelnes App-Passwort (bcrypt, nicht passlib), JWT 30-Tage, localStorage
- **Sessions-Phasen**: 1–4 = Probatorik, 5–16 = KZT1, 17–28 = KZT2, 29+ = LZT (pro Patient, nach Datum sortiert); überschreibbar per `phase_override`
- **Supervision-Ziele**: in Stunden (Einzel = 37,5 h, Gruppe = 75 h); Kosten auto-berechnet: `(min/45) * 110 €`
- **bcrypt**: direkt (`import bcrypt`), nicht über passlib (passlib 1.7.4 crasht mit bcrypt 4.x)

---

## Datenmodell

### Tabelle `patients`
| Feld | Typ | Beschreibung |
|---|---|---|
| id | INTEGER PK | |
| chiffre | TEXT UNIQUE | z. B. „AB-001" |
| status | ENUM | Probatorik / Therapie laufend / Therapie abgeschlossen |
| phase_override | TEXT nullable | Überschreibt automatische Phasenberechnung |
| created_at | TEXT | |
| antrag_gesendet_datum | TEXT nullable | |
| antrag_genehmigt_datum | TEXT nullable | |

### Tabelle `sessions`
| Feld | Typ | Beschreibung |
|---|---|---|
| id | INTEGER PK | |
| patient_id | INTEGER FK | |
| date | TEXT | ISO 8601 |
| session_type | TEXT | Probatorik / Einzelsitzung |
| duration_minutes | INTEGER nullable | Default 50 |
| revenue_amount | REAL | |
| notes | TEXT nullable | |

### Tabelle `supervisions`
| Feld | Typ | Beschreibung |
|---|---|---|
| id | INTEGER PK | |
| supervisor_id | INTEGER FK | |
| date | TEXT | |
| type | ENUM | Einzel / Gruppe |
| duration_minutes | INTEGER | Default 45 für Einzel |
| cost | REAL | |
| notes | TEXT nullable | |

M:N-Verknüpfung `supervision_patients` (supervision_id, patient_id)

### Tabelle `settings` (alle Keys)
| Key | Default | Beschreibung |
|---|---|---|
| target_therapy_sessions | 600 | |
| target_supervision_einzel | 37.5 | Stunden |
| target_supervision_gruppe | 75 | Stunden |
| target_self_experience | 120 | Stunden |
| target_theorie | 600 | Stunden |
| target_pt1 | 1200 | Stunden |
| target_pt2 | 600 | Stunden |
| default_revenue_probatorik | 33.57 | € |
| default_revenue_einzel | 45.80 | € |
| default_cost_einzel | 110 | € pro 45-Min-Einheit |
| default_cost_gruppe | 0 | € |
| self_experience_enabled | true | Selbsterfahrung im Dashboard anzeigen |
| self_experience_hours | 0 | Manuell eingetragene Stunden |
| theorie_hours | 0 | Manuell eingetragene Stunden |
| pt1_hours | 0 | Manuell eingetragene Stunden |
| pt2_hours | 0 | Manuell eingetragene Stunden |
| app_password | "" | bcrypt-Hash |

---

## Features (aktueller Stand)

### Dashboard
- Ambulanz / Gesamtausbildung Toggle mit farbigem Ring-Indikator (blau / violett)
- Ring-Fortschrittsanzeige + Balken pro Bereich
- Stunden eintragen (Selbsterfahrung, Theorie, PT1, PT2) — immer sichtbar
- Prognose: Ø Sitzungen/Monat, Monate bis zum Ziel
- Finanzen des laufenden Monats (Einnahmen, Kosten, Netto)
- Gamification: Konfetti + Toast bei neuer Sitzung; Meilensteine bei 25/50/75/100 %

### Sitzungen
- Liste mit Suche (Patient, Phase, Typ) + Zeitraum-Filter (hinter Toggle-Button)
- Neue Sitzung: Smart-Default für Typ (Probatorik für Sessions 1–4, danach Einzelsitzung), Dauer-Default 50 Min.
- Bearbeiten + Löschen mit doppelter Bestätigung
- Export: PDF (alle Sitzungen) + CSV (gefilterte Sitzungen, client-seitig generiert)
- Patientenstatus wechselt automatisch auf „Therapie laufend" ab 5. Sitzung (≥5)

### Patienten
- BottomSheet für Details + neue Patienten (swipe-down-to-close)
- Phase-Override per Dropdown
- Status manuell änderbar (inkl. Abgeschlossen)
- 3-Schritt-Löschen
- Pro-Patient PDF + ZIP-Export

### Supervision
- Auto-Kostenberechnung für Einzel: `(Minuten/45) * 110 €`
- Supervisoren verwalten (anlegen, umbenennen, löschen)
- Patienten einer Supervision zuordnen
- Datum und Dauer untereinander (kein Überlapp auf Mobile)

### Finanzen
- Monatliche und quartalsweise Übersicht
- Summary-Karten zentriert, Euro-Beträge ohne Zeilenumbruch

### Einstellungen
- Alle Ziele und Standardvergütungen konfigurierbar
- Geleistete Stunden direkt eingebbar
- **CSV-Import**: Sitzungen und Supervisionen aus CSV laden (Vorlage downloadbar, Patienten/Supervisoren werden auto-angelegt)
- **Passwort ändern** (erfordert aktuelles Passwort)
- **Passwort-Reset** über Datei (siehe unten)

### Backup
- Täglich automatisch via APScheduler
- Manueller Backup-Trigger + Download in der App

---

## Passwort zurücksetzen (wenn Zugang verloren)

1. Per SSH mit NAS verbinden
2. Datei mit neuem Passwort anlegen:
   ```bash
   echo "NeuesPasswort" > /pfad/zu/piano/data/RESET_PASSWORD
   ```
3. Container neu starten:
   ```bash
   docker compose restart
   ```
   → Passwort wird gesetzt, Datei wird gelöscht. Datenverzeichnis finden mit:
   ```bash
   docker inspect piano-app | grep Source
   ```

---

## CSV-Import-Format

### Sitzungen (`/api/import/sessions`)
```
patient_chiffre;datum;sitzungstyp;dauer_min;honorar_eur;notizen
AB-001;15.03.2024;Probatorik;50;33.57;
AB-001;22.03.2024;Einzelsitzung;50;45.80;Beispielnotiz
```
- Datum: `DD.MM.YYYY` oder `YYYY-MM-DD`
- Separator: `;` oder `,` (auto-erkannt)
- Neue Patienten werden automatisch als „Probatorik" angelegt
- Status-Update (≥5 Sitzungen → Therapie laufend) läuft nach dem Import

### Supervisionen (`/api/import/supervisions`)
```
supervisor_name;datum;typ;dauer_min;kosten_eur;notizen;patient_chiffres
Dr. Müller;10.03.2024;Einzel;45;110.00;;AB-001
Dr. Müller;17.03.2024;Gruppe;90;0;;AB-001,AB-002
```
- `typ`: `Einzel` oder `Gruppe`
- `patient_chiffres`: komma-getrennte Chiffren (innerhalb des Semikolon-CSV)
- Neue Supervisoren und Patienten werden automatisch angelegt

---

## Bekannte offene Punkte
- GitHub-Deployment-Automatisierung (Webhook → NAS-Pull)
- Dark Mode
- Sitzungsnotizen-Vorschau in der Liste
