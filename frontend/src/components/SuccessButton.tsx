import React, { useState } from 'react';
import { delay } from '../utils/juice';

interface Props {
  onClick: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export default function SuccessButton({ onClick, children, className = '' }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleClick = async () => {
    if (state !== 'idle') return;
    setState('loading');
    try {
      await onClick();
      setState('success');
      await delay(1200);
      setState('idle');
    } catch {
      setState('idle');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={state !== 'idle'}
      className={`btn-juice ripple-container relative flex items-center justify-center gap-2 ${className}`}
    >
      {state === 'loading' && <span className="spinner" />}
      {state === 'success' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" className="check-draw" />
        </svg>
      )}
      {state === 'idle' && children}
      {state === 'loading' && 'Speichern...'}
      {state === 'success' && 'Gespeichert!'}
    </button>
  );
}
