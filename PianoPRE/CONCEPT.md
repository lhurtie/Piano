# PianoPRE — Produktkonzept

Stand: 2026-05-22. Dieser Inhalt ist das inhaltliche Fundament der App und wird im Lauf der Entwicklung aktuell gehalten.

---

## §1 Hintergrund

Bisherige Tools für angehende Psychotherapeut:innen sind auf das alte PiA-Modell zugeschnitten: feste Stunden-Targets in sechs Settings-Keys, kein Profilkonzept, kein Bundesland, kein Verfahren, keine Onboarding-Logik, kein Phasen-Tracking über Zeit.

Die Reform 2020 löst die PiA-Ausbildung durch die PiW-Weiterbildung ab. PiW ist *modular*, *bundeslandabhängig* (16 Kammer-WBOs), *kompetenzbasiert*, ersetzt feste Stunden-Targets in Klinikphasen durch **Monate**, in der Theorie durch **UE-Einheiten** mit kammerspezifischem Zielwert und in den Behandlungen durch **Fälle inkl. Supervisionsquote**. Beides — PiA und PiW — muss parallel abgebildet werden, weil PiAs noch jahrelang in Restzeiten ihre Ausbildung beenden.

PianoPRE ist die Antwort darauf: ein modernes, lokal laufendes Tool (alle Daten on-device, kein Server), das **beide Systeme** kennt, die Targets generisch verwaltet, profilabhängige Defaults aus Bundesland/Verfahren ableitet und Kammeränderungen ohne Code-Änderung durch Preset-Updates abfedert.

## §2 Kernidee in drei Sätzen

1. Hardcodierte Targets werden durch eine generische Liste **Tracking-Kategorien** ersetzt, in der jede Kategorie ihren eigenen Metrik-Typ (`hours` | `months` | `units` | `hours_with_ratio` | `cases_and_hours`) und ihre Datenquelle (`manual` | `sessions` | `supervision_records` | `placements`) deklariert.
2. Profil-Stammdaten (Typ, Verfahren, bei PiW zusätzlich Bundesland/Schwerpunkt/Beschäftigungsumfang) und die Tracking-Kategorien liegen als **versionierte JSON-Strukturen** in einer `Setting`-Tabelle; Presets sind statische JSONs im Repo unter `src/data/presets/` und damit ohne Code-Änderung pflegbar.
3. Das **Verfahren** (VT/TP/AP/ST) ist in **beiden** Systemen ein Pflicht-Profilfeld, weil Selbsterfahrungs-Aufteilung, Supervisions-Bedarf, Fallzahl, Behandlungs-Stundenziel und das Setting-Repertoire (insb. ST) verfahrensabhängig sind.

## §3 Onboarding-Flow

State: lokaler React-State, finaler Submit setzt `onboarding_complete=true` in `Settings`.

```
Step 0     Passwort-Setup (lokal, einmalig)
   │
   ▼
Step 0.5   (nur bei frischer Installation, vor Schritt 1)
           „Hast du ein Backup von einem alten Gerät?“
           Ja → File-Picker → ZIP-Validierung → Restore → fertig
           Nein → weiter zu Step 1
   │
   ▼
Step 1     „Welches System trifft auf dich zu?“
           [PiA]  Altes System (Ausbildung vor Reform 2020)
           [PiW]  Neues System (Weiterbildung nach Reform 2020)
   │
   ├──── PiA ───►  Step 2-A-0  Verfahren (VT / TP / AP / ST)
   │               Step 2-A-1  „Deine Ziele“ — Kategorie-Karten mit
   │                            Defaults aus dem Verfahrens-Preset.
   │                            Jeder Wert editierbar.
   │                            „Stunden bereits absolviert?“ pro Karte.
   │
   └──── PiW ───►  Step 2-B  Stammdaten
                   2-B-1  Bundesland (16 Länder)
                   2-B-2  Schwerpunkt (Erwachsene / KJP)
                   2-B-3  Verfahren (VT / TP / AP / ST)
                   2-B-4  Weiterbildungsstart (Monat/Jahr)
                   2-B-5  Beschäftigungsumfang (% Vollzeit, Default 100)
                  ▼
                   Step 2-C  „Deine Kammer-Presets“
                   Auto-geladenes Preset basierend auf 2-B + Disclaimer
                   „Richtwerte – mit deiner WBO abgleichen“.
                   Karten: Stationär, Ambulant, Marginal, Theorie,
                   Supervision, Selbsterfahrung Einzel/Gruppe,
                   Behandlung. Jede Kategorie disable-bar.
   │
   ▼
Step 3     Zusammenfassung → „Speichern & loslegen“ → /dashboard
```

UX-Prinzipien:

- Pro Step max. eine Entscheidung (Ausnahme: Step 2-C als Liste editierbarer Defaults).
- Presets sind Vorschläge, keine Sperren — jeder Wert immer editierbar, Toggle „Diese Kategorie tracken: an/aus“.
- Hinweis „Einstellungen später anpassbar“ auf Step 3.

## §4 Datenmodell

### §4.1 Tabellen

| Tabelle | Zweck |
|---|---|
| `setting` (key, value) | Profil, Tracking-Kategorien, `onboarding_complete`, Schema-Version |
| `patient` | Patientenstammdaten (Chiffre, Status, Antrags-Tracking, phase_override) |
| `session` | Sitzungen, inkl. Spalte `setting_type` und `revenue_amount` |
| `supervisor` | Supervisor:innen-Stammdaten |
| `supervision` | Supervisionstermine |
| `supervision_patients` | n:m-Zuordnung Supervision ↔ Patient |
| `placement` | Klinikstellen mit Start/Ende, Stunden/Woche, Status |
| `_schema_version` | aktuelle DB-Version für Migrations-Engine |

### §4.2 Setting-Keys (JSON-serialisiert)

- `profile` — Stammdaten
- `tracking_categories` — Array der Kategorien
- `onboarding_complete` — `"true"` / `"false"`
- `pianopre_schema` — `"v1"`
- `auth_hash` — PBKDF2-Hash der Passphrase

### §4.3 `profile`-Beispiele

PiW (Hamburg, VT, Erwachsene, Vollzeit):

```json
{
  "schema_version": 1,
  "type": "piw",
  "verfahren": "vt",
  "bundesland": "HH",
  "kammer": "PTK Hamburg",
  "schwerpunkt": "erwachsene",
  "weiterbildungsstart": "2024-09",
  "weiterbildung_dauer_monate": 60,
  "beschaeftigungsumfang_pct": 100,
  "preset_id": "piw_hh_vt_erw_2025-01",
  "created_at": "2026-05-22"
}
```

PiA (AP-Sonderfall):

```json
{
  "schema_version": 1,
  "type": "pia",
  "verfahren": "ap",
  "preset_id": "pia_ap_v1",
  "created_at": "2026-05-22"
}
```

### §4.4 `tracking_categories` — PiA-Preset (VT/TP/ST-Standard)

```json
[
  { "id": "pt1",                    "label": "PT 1 – Psychiatrisches Jahr",
    "metric": "hours", "target": 1200, "source": "manual",
    "current_manual": 0, "enabled": true, "order": 1 },

  { "id": "pt2",                    "label": "PT 2 – Psychosomatischer Teil",
    "metric": "hours", "target": 600,  "source": "manual",
    "current_manual": 0, "enabled": true, "order": 2 },

  { "id": "theorie",                "label": "Theorie",
    "metric": "hours", "target": 600,  "source": "manual",
    "current_manual": 0, "enabled": true, "order": 3 },

  { "id": "supervision_einzel",     "label": "Einzelsupervision",
    "metric": "hours", "target": 50,   "source": "supervision_records",
    "filter": { "kind": "einzel" }, "enabled": true, "order": 4 },

  { "id": "supervision_gruppe",     "label": "Gruppensupervision",
    "metric": "hours", "target": 100,  "source": "supervision_records",
    "filter": { "kind": "gruppe" }, "enabled": true, "order": 5 },

  { "id": "selbsterfahrung_einzel", "label": "Selbsterfahrung Einzel",
    "metric": "hours", "target": 0,    "source": "manual",
    "current_manual": 0, "enabled": false, "order": 6,
    "hint": "VT: i.d.R. nicht erforderlich." },

  { "id": "selbsterfahrung_gruppe", "label": "Selbsterfahrung Gruppe",
    "metric": "hours", "target": 120,  "source": "manual",
    "current_manual": 0, "enabled": true, "order": 7 },

  { "id": "behandlungsstunden",     "label": "Ambulante Behandlungsstunden",
    "metric": "cases_and_hours",
    "target_hours": 600, "target_cases_completed": 6,
    "source": "sessions", "enabled": true, "order": 8 },

  { "id": "freie_spitze",           "label": "Freie Spitze",
    "metric": "hours", "target": 930,  "source": "manual",
    "current_manual": 0, "enabled": true, "order": 9 }
]
```

Abweichungen pro Verfahren:

| Kategorie | VT | TP | AP | ST |
|---|---|---|---|---|
| `selbsterfahrung_einzel` | 0 (off) | 50 | **250** (Lehranalyse) | 0 (off) |
| `selbsterfahrung_gruppe` | 120 | 100 | 0 (off) | 120 |
| `supervision_einzel` + `_gruppe` (Σ) | 150 | 150 | **250** | 150 |
| `behandlungsstunden.target_hours` | 600 | 600 | **1000** | 600 |
| `behandlungsstunden.target_cases_completed` | 6 | 6 | **3** | 6 |

Für ST zusätzlich `session.setting_type`-Erfassung (Einzel/Paar/Familie/Mehrpersonen).

### §4.5 `tracking_categories` — PiW-Preset (Hamburg, VT, Erwachsene)

```json
[
  { "id": "gebiet_1_stationaer",   "label": "Gebiet I – Stationär",
    "metric": "months", "target": 24, "source": "placements",
    "enabled": true, "order": 1 },

  { "id": "gebiet_2_ambulant",     "label": "Gebiet II – Ambulant",
    "metric": "months", "target": 24, "source": "placements",
    "enabled": true, "order": 2 },

  { "id": "marginaler_bereich",    "label": "Marginaler/Freier Bereich",
    "metric": "months", "target": 12, "source": "placements",
    "enabled": true, "order": 3 },

  { "id": "theorie",               "label": "Theoretische Weiterbildung",
    "metric": "units", "unit_label": "UE", "target": 480,
    "source": "manual", "current_manual": 0,
    "enabled": true, "order": 4,
    "editable_in_onboarding": true,
    "hint": "Hamburg/VT: ca. 480 UE. Mit deiner WBO abgleichen." },

  { "id": "supervision",           "label": "Supervision",
    "metric": "hours_with_ratio", "target": 150,
    "ratio_per_n_sessions": 4, "source": "supervision_records",
    "enabled": true, "order": 5 },

  { "id": "selbsterfahrung_einzel","label": "Selbsterfahrung Einzel",
    "metric": "hours", "target": 0,   "source": "manual",
    "current_manual": 0, "enabled": false, "order": 6,
    "editable_in_onboarding": true },

  { "id": "selbsterfahrung_gruppe","label": "Selbsterfahrung Gruppe",
    "metric": "hours", "target": 120, "source": "manual",
    "current_manual": 0, "enabled": true, "order": 7,
    "editable_in_onboarding": true },

  { "id": "behandlungsstunden",    "label": "Behandlungsstunden",
    "metric": "cases_and_hours",
    "target_hours": 600, "target_cases_completed": 10,
    "supervision_ratio_required": true,
    "source": "sessions", "enabled": true, "order": 8 },

  { "id": "weiterbildungsdauer",   "label": "Gesamtdauer Weiterbildung",
    "metric": "months", "target": 60, "source": "profile_derived",
    "enabled": true, "order": 9 }
]
```

### §4.6 `Placement`-Tabelle

```
placement(id, category_id, label, employer, start_date,
          end_date | null, hours_per_week, status, notes)
```

`status ∈ { 'aktiv', 'abgeschlossen', 'geplant', 'pausiert' }`

### §4.7 `session.setting_type`

```
session.setting_type ∈ { 'einzel', 'gruppe', 'paar', 'familie', 'mehrpersonen' }
```

Default `'einzel'`. UI zeigt nur die für das Verfahren erlaubten Werte:

| Verfahren | Erlaubte Werte |
|---|---|
| VT  | einzel, gruppe |
| TP  | einzel, gruppe |
| AP  | einzel (Couch) |
| ST  | einzel, paar, familie, mehrpersonen |

### §4.8 Preset-Quelle

Statische JSONs im Repo unter `src/data/presets/`:

```
presets/
  pia/  vt.json  tp.json  ap.json  st.json
  piw/  hh_vt_erwachsene.json  nrw_vt_erwachsene.json  ...
  index.json
```

Initial-Set: PiA komplett (4 Verfahren), PiW: `HH-VT-Erw`, `NRW-VT-Erw`, `BY-VT-Erw`, `BW-VT-Erw` + `HH-AP-Erw`. Rest iterativ.

### §4.9 Bestehende Piano-Logik (portieren, nicht neu erfinden)

Diese Logik existiert in Piano (`backend/crud.py`) und wird 1:1 in TypeScript-Services übernommen:

#### Phasen-Tracking pro Patient

Wird bei jeder Sitzungs-Abfrage on-the-fly berechnet (nicht gespeichert):

```
Session-Nummer 1–4   → Phase: Probatorik
Session-Nummer 5–16  → Phase: KZT 1
Session-Nummer 17–28 → Phase: KZT 2
Session-Nummer 29+   → Phase: LZT
```

Überschreibbar per `patient.phase_override`.

#### Auto-Status-Promotion

Beim Anlegen einer neuen Sitzung: Falls Patient `status = PROBATORIK` und hat danach ≥ 5 Sitzungen → automatisch `status = LAUFEND`. Kein Auto-ABSCHLUSS — nur manuell.

#### Session-Felder

```
session(id, patient_id, date, duration_minutes, setting_type,
        revenue_amount, notes)
```

`revenue_amount`: Honorar in EUR, Default €45,80 (konfigurierbar in Settings).

#### Patienten-Felder (vollständig)

```
patient(id, chiffre, status, antrag_gesendet_datum,
        antrag_genehmigt_datum, phase_override, notes)
```

`status ∈ { 'probatorik', 'laufend', 'abgeschlossen' }`

#### Finanzmodul

- **Monatsansicht**: Σ `session.revenue_amount` als Einnahmen, Σ `supervision.cost` als Ausgaben, Netto pro Kalendermonat.
- **Quartalsansicht**: Sitzungszahl + Umsatz pro Quartal.
- Implementierung: `src/services/kpi/finance.ts`

#### Prognose

- Ø Sitzungen/Monat der **letzten 3 Monate** (nur aktive Patienten).
- Hochrechnung: „Monate bis `behandlungsstunden.target_hours`“.
- Widget: „bei aktuellem Tempo fertig in X Monaten (ca. MM/YYYY)“.
- Implementierung: `src/services/kpi/prognosis.ts`

## §5 KPI-Logik

### §5.1 Generischer Renderer

`Dashboard.tsx` rendert pro Kategorie ein Widget abhängig vom `metric`-Feld:

| `metric` | Widget | Berechnung |
|---|---|---|
| `hours` | Fortschrittsbalken `X / Target Std.` | `current_manual` ODER Aggregat aus `source` |
| `units` | wie `hours`, Label „UE“ | identisch |
| `months` | Zeitstrahl + Balken | Σ überlappungsfreier `placement`-Spannen in Monaten |
| `hours_with_ratio` | Hauptbalken + KPI-Chip „Quote erfüllt?“ | Stunden + Quotenprüfung |
| `cases_and_hours` | Doppel-KPI: Fälle / Stunden | Patient-/Session-Aggregat |

### §5.2 PiW-Spezial-Widgets

- **Zeitstrahl** für Gebiet I/II/Marginal: horizontale Balken, lückenlose Monate grün, Lücken hellgrau, geplante Spannen blau.
- **Supervisions-Quote pro Patient**: Chip „1:4 ✓“ / „1:6 (Soll 1:4) ⚠“ in der Patientenliste.
- **5-Jahres-Restzeit-Prognose**: „Monat 18 von 60 – Ende 09/2029“. Bei Teilzeit zusätzlich „bei 50 % → Ende 09/2034“.

### §5.3 Verfahrens-Spezial-Widgets

- **ST – Setting-Mix-Donut**: Anteil Einzel/Paar/Familie/Mehrpersonen pro Patient und global.
- **AP – Lehranalyse-Tracker**: prominenter Balken `selbsterfahrung_einzel`.
- **AP – Fall-Tiefen-Anzeige**: kumulierte Stunden pro Fall.

### §5.4 Composite-Ring

Gewichteter Durchschnitt aller `enabled` Kategorien. Label: PiA „Ausbildungsfortschritt“, PiW „Weiterbildungsfortschritt“. Gewichtung im Preset (`weight`, Default 1).

## §6 Backup, Datensicherheit & Geräte-/Update-Migration

### §6.1 `.piano`-Dateiformat (verschlüsselt)

```
.piano-Datei = JSON-Header + AES-GCM-Ciphertext

Header (Klartext):
  { "algo": "AES-GCM", "kdf": "PBKDF2-SHA256",
    "iterations": 600000, "salt": "<base64>",
    "iv": "<base64>", "pianopre_schema": "v1",
    "exported_at": "2026-05-22T14:23:00Z", "app_version": "0.1.0" }

Ciphertext: AES-GCM-Verschlüsselung des ZIP-Inhalts
  (profile.json, tracking_categories.json,
   patients.csv, sessions.csv, supervisions.csv,
   supervisors.csv, placements.csv, optional pianopre.db)
```

Key-Ableitung: PBKDF2-SHA256, 600.000 Iterationen aus App-Passphrase via `WebCrypto.subtle`.

### §6.2 Survival-Matrix

| Szenario | Mechanismus |
|---|---|
| App-Update (Store) | App-Sandbox bleibt — Default-Verhalten iOS/Android |
| OS-Update | App-Daten bleiben |
| Versehentliches Löschen in App | App-interner Auto-Snapshot |
| App-Uninstall | Externes Backup via Share-Sheet |
| Phone-Wechsel | OS-Cloud-Backup + `.piano`-Share + Onboarding-Step 0.5 |
| Crash / DB-Korruption | letzter Snapshot |

### §6.3 Drei redundante Backup-Pfade

1. **OS-Cloud-Backup-Inclusion** (passiv)
   - iOS: `Documents/`-Ordner → iCloud Backup. Kein `NSURLIsExcludedFromBackupKey`.
   - Android: `android:allowBackup="true"` + `data_extraction_rules.xml` → Google Drive.

2. **Manueller Export `.piano`** (aktiv)
   - „Backup teilen“ → `.piano`-Datei erstellen → System-Share-Sheet → iCloud Drive / Google Drive / Mail / AirDrop.
   - Symmetrischer Import: File-Picker → Passphrase eingeben → Entschlüsseln → Restore.
   - Monatliche lokale Erinnerungs-Notification.

3. **App-interner Auto-Snapshot** (passiv, lokal)
   - Täglich beim Foreground-Trigger, verschlüsselt mit App-Passphrase, Retention 14.
   - Im Backup-Tab als Liste sichtbar; pro Eintrag „Wiederherstellen“ + „Teilen“.
   - Pre-Migration-Backup vor jedem Schema-Upgrade.

### §6.4 Phone-Wechsel-Flow

```
App installieren → Onboarding Step 0.5:
 ├── Ja, ich habe ein Backup → File-Picker → .piano → Passphrase → Restore → fertig
 └── Nein → normales Onboarding (Passwort → PiA/PiW-Wizard)
```

### §6.5 Auth

- Kein JWT, kein Server.
- Passphrase → PBKDF2-SHA256-Hash → gespeichert in `setting.auth_hash`.
- Optional: `@capacitor/biometric-auth` als Convenience-Layer (Face ID / Fingerabdruck) über der Passphrase.
- Lock-Screen: bei App-Wechsel / Inaktivität > 5 Min Passphrase oder Biometrie erforderlich.

### §6.6 Schema-Versionierung

`pianopre_schema`-Key in `Setting` und in `.piano`-Header. Pro Versionssprung eine `migrateVxToVy(payload)`-Funktion in `src/services/db/migrations.ts`. Ältere Backups importierbar ohne Datenverlust.
