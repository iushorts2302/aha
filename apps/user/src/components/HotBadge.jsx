/**
 * HotBadge — HOT 게시글 자동 부상 배지 + 점수 표시
 */
export function HotBadge({ score, isViral, isRising }) {
  if (isViral) return (
    <span style={{
      fontSize: '10px', fontWeight: 800, padding: '2px 8px',
      background: '#FF4500', color: '#fff', borderRadius: '99px',
      letterSpacing: '0.04em', animation: 'pulse 1.5s infinite',
    }}>🔥 바이럴</span>
  )
  if (isRising) return (
    <span style={{
      fontSize: '10px', fontWeight: 800, padding: '2px 8px',
      background: 'var(--color-accent)', color: 'var(--color-accent-text)', borderRadius: '99px',
    }}>↑ 급상승</span>
  )
  if (score > 5) return (
    <span style={{
      fontSize: '10px', fontWeight: 800, padding: '2px 8px',
      background: '#FF4500', color: '#fff', borderRadius: '99px',
    }}>HOT</span>
  )
  return null
}

export function ScoreBar({ score, maxScore = 10 }) {
  const pct = Math.min((score / maxScore) * 100, 100)
  return (
    <div style={{ height: '2px', background: 'var(--color-border-soft)', borderRadius: '99px', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: pct > 70 ? '#FF4500' : pct > 40 ? 'var(--color-accent)' : 'var(--color-border)', borderRadius: '99px', transition: 'width 0.5s ease' }} />
    </div>
  )
}
