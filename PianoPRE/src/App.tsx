import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

function Placeholder({ name }: { name: string }) {
  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h2>{name}</h2>
      <p>Placeholder — not yet implemented.</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Placeholder name="Onboarding" />} />
        <Route path="/dashboard" element={<Placeholder name="Dashboard" />} />
        <Route path="/patients" element={<Placeholder name="Patients" />} />
        <Route path="/sessions" element={<Placeholder name="Sessions" />} />
        <Route path="/supervisions" element={<Placeholder name="Supervisions" />} />
        <Route path="/placements" element={<Placeholder name="Placements" />} />
        <Route path="/backup" element={<Placeholder name="Backup" />} />
        <Route path="/settings" element={<Placeholder name="Settings" />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
