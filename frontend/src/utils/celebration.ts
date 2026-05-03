import confetti from 'canvas-confetti'

const PSYCH_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16']
const PSYCH_EMOJIS = ['🧠', '💙', '🌱', '✨', '💬', '🔍']
const MILESTONE_EMOJIS: Record<number, string> = { 25: '🌱', 50: '💙', 75: '🔥', 100: '🏆' }

function showToast(emoji: string, message: string, gradient = false, durationMs = 2800) {
  const el = document.createElement('div')
  const bg = gradient
    ? 'background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:white;'
    : 'background:white;color:#1e293b;'
  el.style.cssText = `
    position:fixed;top:50%;left:50%;
    ${bg}
    border-radius:20px;padding:28px 36px;
    box-shadow:0 20px 60px rgba(0,0,0,0.3);z-index:9999;
    text-align:center;font-family:-apple-system,system-ui,sans-serif;
    max-width:300px;width:88%;
    opacity:0;transform:translate(-50%,-50%) scale(0.75);
    transition:opacity 0.35s ease,transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
  `
  el.innerHTML = `
    <div style="font-size:2.8rem;margin-bottom:10px;line-height:1">${emoji}</div>
    <div style="font-size:1.05rem;font-weight:600;line-height:1.4">${message}</div>
  `
  document.body.appendChild(el)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.opacity = '1'
      el.style.transform = 'translate(-50%,-50%) scale(1)'
    })
  })
  setTimeout(() => {
    el.style.opacity = '0'
    el.style.transform = 'translate(-50%,-50%) scale(0.85)'
    setTimeout(() => el.remove(), 350)
  }, durationMs)
}

export function triggerCelebration(message: string) {
  const emoji = PSYCH_EMOJIS[Math.floor(Math.random() * PSYCH_EMOJIS.length)]

  confetti({ particleCount: 80, spread: 70, origin: { y: 0.55 }, colors: PSYCH_COLORS })
  setTimeout(() => {
    confetti({ particleCount: 35, spread: 50, origin: { y: 0.6, x: 0.25 }, colors: PSYCH_COLORS, startVelocity: 22 })
    confetti({ particleCount: 35, spread: 50, origin: { y: 0.6, x: 0.75 }, colors: PSYCH_COLORS, startVelocity: 22 })
  }, 200)

  showToast(emoji, message, false)
}

export function triggerMilestone(area: string, percent: number) {
  const emoji = MILESTONE_EMOJIS[percent] ?? '🎯'
  const msgs: Record<number, string> = {
    25: 'Erster Meilenstein! 25% erreicht.',
    50: 'Halbzeit! Du machst das großartig.',
    75: 'Fast da! 75% geschafft.',
    100: 'Ziel erreicht! Außergewöhnlich.',
  }

  const count = percent === 100 ? 250 : percent >= 75 ? 180 : 120
  confetti({ particleCount: count, spread: 100, origin: { y: 0.5 }, colors: PSYCH_COLORS })
  setTimeout(() => {
    confetti({ particleCount: count / 2, spread: 80, angle: 60, origin: { x: 0 }, colors: PSYCH_COLORS })
    confetti({ particleCount: count / 2, spread: 80, angle: 120, origin: { x: 1 }, colors: PSYCH_COLORS })
  }, 280)

  showToast(emoji, `${msgs[percent] ?? `${percent}% erreicht`}\n${area}`, true, 4000)
}
