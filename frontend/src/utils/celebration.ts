import confetti from 'canvas-confetti';

export function triggerCelebration(message: string) {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  });

  const el = document.createElement('div');
  el.innerHTML = `<div style="
    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    background:white;border-radius:16px;padding:24px 32px;
    box-shadow:0 20px 60px rgba(0,0,0,0.3);z-index:9999;
    text-align:center;font-family:system-ui;max-width:300px;
  ">
    <div style="font-size:2rem;margin-bottom:8px">🎉</div>
    <div style="font-size:1.1rem;font-weight:600;color:#1e293b">${message}</div>
  </div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

export function triggerMilestone(area: string, percent: number) {
  const emojis: Record<number, string> = { 25: '🌱', 50: '⚡', 75: '🔥', 100: '🏆' };
  const emoji = emojis[percent] || '🎯';
  confetti({
    particleCount: percent === 100 ? 300 : 180,
    spread: 120,
    origin: { y: 0.5 },
  });
  const el = document.createElement('div');
  el.innerHTML = `<div style="
    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    background:linear-gradient(135deg,#667eea,#764ba2);border-radius:20px;
    padding:32px 40px;box-shadow:0 20px 60px rgba(0,0,0,0.4);z-index:9999;
    text-align:center;font-family:system-ui;max-width:320px;color:white;
  ">
    <div style="font-size:3rem;margin-bottom:12px">${emoji}</div>
    <div style="font-size:1.3rem;font-weight:700;margin-bottom:4px">${percent}% erreicht!</div>
    <div style="font-size:0.95rem;opacity:0.9">${area}</div>
  </div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
