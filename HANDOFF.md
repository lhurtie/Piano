# Piano — Handoff-Dokument (Sprint 2)

Stand: 2026-05-03

---

## Offene Änderungen (implementiert in diesem Commit)

### 1. Sprache
- Durchgehend „du" in allen UI-Texten (war teilweise „Sie")

### 2. Dashboard — Layout & Inhalte
- **Bug:** Text in Tiles war nach rechts verschoben → behoben
- **Neue Zielwerte (Defaults in Settings):**
  - Therapiesitzungen: 600
  - Supervision Einzel: 50
  - Supervision Gruppe: 100
  - Selbsterfahrung: 120
  - Theorie: 600 Stunden
  - PT1: 1200 Stunden
  - PT2: 600 Stunden
- **Neue Fortschrittsbereiche:**
  - Theorie (manuell eingetragene Stunden in Settings)
  - PT1 (manuell)
  - PT2 (manuell)
  - Supervision Einzel und Gruppe getrennt angezeigt
- **Gesamtfortschritt mit Toggle:**
  - „Ambulanz" = Therapiesitzungen + Supervision (Einzel + Gruppe)
  - „Gesamtausbildung" = Alles inkl. Selbsterfahrung, Theorie, PT1, PT2
- **Gamification:** Konfetti + Motivationsmeldung beim Hinzufügen von Sitzungen, Supervisions, Stunden; Meilensteinanimation bei 25 %, 50 %, 75 %, 100 %

### 3. Sitzungstyp
- Beim Anlegen einer Sitzung: Pflichtfeld „Typ" (Probatorik / Einzelsitzung)
- Unterschiedliche Default-Vergütungen je Typ (einstellbar in Settings):
  - Probatorik: 33,57 €
  - Einzelsitzung: 45,80 €
- Datenmodell: Feld `session_type` in Tabelle `sessions` (Enum: Probatorik / Einzelsitzung)
- Phase (Probatorik / KZT1 / KZT2 / LZT) bleibt auto-berechnet nach Sitzungsnummer

### 4. Mobile-Optimierung
- Supervision-Tab: Buttons vollständig sichtbar ohne Herauszoomen
- Gesamte App vollständig ohne Zoom bedienbar auf iPhone

### 5. Default-Supervisionskosten
- Einzel: 110 € (war falsch)
- Gruppe: 0 € (war falsch)

### 6. Bearbeiten & Löschen
- Therapiesitzungen: Bearbeiten-Button + Löschen mit doppelter Bestätigung
- Supervisionen: Bearbeiten-Button + Löschen mit doppelter Bestätigung

### 7. Patientenliste
- Fixierte Zusammenfassung oben: Aktive Patienten, Abgeschlossene, Gesamtsitzungen
- Kein Scrollen nötig um Überblick zu sehen

### 8. Prognose
- Berechnung: pro Monat wird geprüft, welche Patienten in dem Monat Sitzungen hatten (aktiv = nicht abgeschlossen UND hatte Sitzungen in dem Monat)

---

## Datenmodell-Änderungen

### sessions
- Neues Feld: `session_type` TEXT NOT NULL DEFAULT 'Einzelsitzung'
- Enum-Werte: `Probatorik`, `Einzelsitzung`

### settings (neue Keys)
| Key | Default |
|-----|---------|
| target_therapy_sessions | 600 |
| target_supervision_einzel | 50 |
| target_supervision_gruppe | 100 |
| target_self_experience | 120 |
| target_theorie | 600 |
| target_pt1 | 1200 |
| target_pt2 | 600 |
| default_revenue_probatorik | 33.57 |
| default_revenue_einzel | 45.80 |
| default_cost_einzel | 110 |
| default_cost_gruppe | 0 |
| theorie_hours | 0 |
| pt1_hours | 0 |
| pt2_hours | 0 |

---

## Bekannte offene Punkte (nächster Sprint)
- GitHub-Deployment-Automatisierung (Webhook → NAS-Pull)
- Dark Mode
- Sitzungsnotizen-Vorschau in der Liste
