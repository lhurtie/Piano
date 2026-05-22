# PianoPRE

Native mobile app for psychotherapy trainees (PiA) and postgraduate psychotherapy residents (PiW) in Germany.

Tracks clinical hours, placements, supervision, and training progress — all data stored locally on-device (no server, no Docker).

**Status: Work in Progress**

See [CONCEPT.md](./CONCEPT.md) for the full product concept and data model.

## Tech Stack

- React 18 + TypeScript
- Vite 5
- Capacitor 6 (iOS + Android)
- SQLite via `@capacitor-community/sqlite`

## Local Dev

```bash
npm install
npm run dev        # browser preview
```

## Mobile Build

```bash
npm run build
npx cap sync
npx cap open ios        # requires Xcode
npx cap open android    # requires Android Studio
```
