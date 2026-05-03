import React from 'react'

// Add ripple effect to any button element
export function addRipple(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const ripple = document.createElement('span');
  ripple.className = 'ripple-effect';
  const rect = el.getBoundingClientRect();
  ripple.style.left = `${e.clientX - rect.left}px`;
  ripple.style.top = `${e.clientY - rect.top}px`;
  el.appendChild(ripple);
  setTimeout(() => ripple.remove(), 500);
}

// Delay promise helper for deliberate pauses
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Apply stagger animation to list items
export function getStaggerStyle(index: number): React.CSSProperties {
  return {
    animationDelay: `${index * 60}ms`,
  };
}

// Number formatting with animation trigger
export function formatEuro(amount: number): string {
  return `${amount.toFixed(2)} €`;
}
