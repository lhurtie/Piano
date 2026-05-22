# Resume-Prompt — PianoPRE neue Session

Kopiere den Inhalt unten in den neuen Chat.

---

Du arbeitest an **PianoPRE** — einem neuen, eigenständigen Repo `lhurtie/PianoPRE`.
PianoPRE ist eine native Mobile-App (iOS + Android) für Psychotherapie-Trainees
(PiA + PiW), alle Daten on-device via lokalem SQLite, kein Server, kein Docker.
Piano (`lhurtie/piano`, NAS-Docker) bleibt vollständig unverändert.

## Was das ist

PianoPRE hat **zwei Schichten**:

1. **Bestehende Piano-Logik** (portieren): Sitzungserfassung mit Honorar, Phasen-Tracking
   (Probatorik→KZT1→KZT2→LZT), Auto-Status, Finanzmodul, Prognose.
2. **Neues PiA/PiW-Modell** (neu): Generische Tracking-Kategorien, Profil mit Verfahren/
   Bundesland, Onboarding-Wizard, Preset-JSONs, Placement-Zeitstrahl, Composite-Ring.

Beides ist vollständig in **CONCEPT.md** dokumentiert — lies sie als erstes.

## Was bereits angelegt ist

Scaffold-Dateien liegen im Branch `pianopre-scaffold` im Repo `lhurtie/piano`
unter dem Ordner `PianoPRE/`. Vor dem Entwickeln in ein eigenes Repo (`lhurtie/PianoPRE`)
ukopieren und dort als `main`-Branch pushen.

## Tech-Stack (festgelegt)

| Layer | Entscheidung |
|---|---|
| UI | React 18 + TypeScript |
| Build | Vite 5 |
| Mobile | Capacitor 6 (iOS + Android) |
| Lokale DB | `@capacitor-community/sqlite` |
| Dev-Fallback (Browser) | `sql.js` (kein nativer Build für `npm run dev` nötig) |
| Export-Format | `.piano`-Datei: AES-GCM-verschlüsselt, Key via PBKDF2-SHA256, WebCrypto.subtle |
| Auto-Backup | Täglich in App-Sandbox, Retention 14, + Hinweis-Banner |
| Auth | Lokale Passphrase (bcrypt-Hash in SQLite) + optional Face ID / Fingerabdruck via `@capacitor/biometric-auth` |
| Routing | react-router-dom |
| Datum | date-fns |
| Crypto | WebCrypto.subtle (kein extra Package) |

## Verhaltensregeln (aus CLAUDE.md)

- Keine Features über das Gefragte hinaus.
- Nur minimal ändern.
- Annahmen explizit benennen, bei Unklarheiten fragen.
- Verifikation pro Schritt.

## Nächste Schritte (in dieser Reihenfolge)

### Schritt 1 — Dateien ins eigene Repo übertragen
```bash
# Branch aus lhurtie/piano auschecken
git clone https://github.com/lhurtie/piano.git
cd piano && git checkout pianopre-scaffold
cp -r PianoPRE/ ../PianoPRE-app
cd ../PianoPRE-app
git init && git add . && git commit -m "initial: scaffold + concept"
git branch -M main
git remote add origin git@github.com:lhurtie/PianoPRE.git
git push -u origin main
```

### Schritt 2 — DB-Schema + Migrations-Engine
- `src/services/db/schema.sql` — DDL für alle Tabellen (CONCEPT.md §4.1 + §4.9)
- `src/services/db/client.ts` — Capacitor-SQLite-Wrapper mit sql.js-Fallback für Browser
- `src/services/db/migrations.ts` — Engine: Tabelle `_schema_version`, sequentielle Files
  `001_init.sql`, `002_…sql`, pre-Migration-Auto-Backup

### Schritt 3 — Repository-Layer
`src/services/repos/` — je `list / get / create / update / delete`:
- `PatientsRepo` (inkl. auto-Status-Promotion-Hook nach Session-Create)
- `SessionsRepo`
- `SupervisionsRepo` (inkl. Patient-Verlinkung)
- `SupervisorsRepo`
- `PlacementsRepo`
- `SettingsRepo`

### Schritt 4 — Business-Logic-Services
- `src/services/kpi/phases.ts` — `getPhase(sessionNumber, phaseOverride)` (Probatorik/KZT1/KZT2/LZT)
- `src/services/kpi/progress.ts` — Fortschritt pro Tracking-Kategorie
- `src/services/kpi/finance.ts` — Monats-/Quartalsbericht (Einnahmen vs. Ausgaben)
- `src/services/kpi/prognosis.ts` — Ø Sitzungen/Monat (letzte 3 Monate), Monate bis Ziel
- `src/services/kpi/composite.ts` — Composite-Ring-Berechnung

### Schritt 5 — Preset-JSONs
- `src/data/presets/index.json`
- `src/data/presets/pia/vt.json` (Referenz-Preset nach CONCEPT.md §4.4)
- `src/data/presets/pia/ap.json` (AP-Sonderfall)
- PiW initial: `src/data/presets/piw/hh_vt_erwachsene.json`

### Schritt 6 — Backup/Crypto-Service
- `src/services/backup/crypto.ts` — AES-GCM-Encrypt/Decrypt, PBKDF2-SHA256, WebCrypto.subtle
- `src/services/backup/exporter.ts` — erzeugt `.piano`-Datei (Header-JSON + Ciphertext)
- `src/services/backup/importer.ts` — entschlüsselt + validiert + spielt Schema-Migration
- `src/services/backup/snapshotJob.ts` — täglicher Trigger, Retention 14
- `src/services/backup/share.ts` — Capacitor-Share + Filesystem-Wrapper

### Schritt 7 — Onboarding
`src/pages/Onboarding.tsx`:
- Step 0: Passwort-Setup (lokal, Passphrase → PBKDF2-Hash → SettingsRepo)
- Step 0.5: „Backup von altem Gerät?“ → File-Picker → `.piano`-Import → Restore
- Step 1: PiA / PiW Auswahl
- Step 2-A: PiA-Verfahren + Kategorie-Karten (editierbare Defaults)
- Step 2-B/C: PiW-Stammdaten + Kammer-Preset-Karten
- Step 3: Zusammenfassung → Speichern → /dashboard

### Schritt 8 — Core-UI
Reihenfolge: Patients → Sessions (mit Phasen-Label + Honorar) → Supervisions
→ Dashboard → Finance → Placements → Backup-Tab → Settings
