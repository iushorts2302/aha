import { useState, useEffect } from 'react'
import { REACTIONS, getReactions, getUserReaction, toggleReaction } from '../store/reactionStore.js'
import { useAuth } from '../context/AuthContext'

export default function ReactionBar({ postId, compact = false }) {
  const { currentUser } = useAuth()
  const [counts, setCounts]     = useState({})
  const [userReact, setUserReact] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [animated, setAnimated]   = useState(null)

  useEffect(() => {
    setCounts(getReactions(postId))
    if (currentUser) setUserReact(getUserReaction(postId, currentUser.id))
  }, [postId, currentUser])

  function handleReact(key) {
    if (!currentUser) return
    const newCounts = toggleReaction(postId, currentUser.id, key)
    setCounts({ ...newCounts })
    setUserReact(getUserReaction(postId, currentUser.id))
    setAnimated(key)
    setShowPicker(false)
    setTimeout(() => setAnimated(null), 500)
  }

  const total = Object.values(counts).reduce((s, v) => s + v, 0)
  const topReactions = REACTIONS.filter(r => counts[r.key] > 0).slice(0, 3)

  if (compact) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
      {topReactions.length > 0 && (
        <div style={{ display: 'flex', gap: '1px' }}>
          {topReactions.map(r => <span key={r.key} style={{ fontSize: '13px' }}>{r.emoji}</span>)}
        </div>
      )}
      {total > 0 && <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)' }}>{total}</span>}
      <button onClick={e => { e.stopPropagation(); setShowPicker(v => !v) }} style={{
        fontSize: '12px', padding: '2px 7px',
        borderRadius: 'var(--r-pill)',
        border: '1px solid var(--color-hairline)',
        color: 'var(--color-muted-48)',
        background: showPicker ? 'var(--color-parchment)' : 'transparent',
        transition: 'background-color var(--transition)',
        lineHeight: 1,
      }}>＋</button>

      {showPicker && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowPicker(false)} />
          <div style={{
            position: 'absolute', bottom: '32px', left: 0,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--color-hairline)',
            borderRadius: '16px', padding: '8px',
            display: 'flex', gap: '4px', zIndex: 50,
            boxShadow: 'rgba(0,0,0,0.14) 0 8px 28px',
          }}>
            {REACTIONS.map(r => (
              <button key={r.key} onClick={() => handleReact(r.key)} title={r.label} style={{
                fontSize: '20px', padding: '6px',
                borderRadius: '10px',
                background: userReact === r.key ? 'rgba(0,102,204,0.08)' : 'transparent',
                border: userReact === r.key ? '1px solid rgba(0,102,204,0.25)' : '1px solid transparent',
                transform: animated === r.key ? 'scale(1.35)' : 'scale(1)',
                transition: 'transform 0.15s, background-color var(--transition)',
                lineHeight: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                {r.emoji}
                {counts[r.key] > 0 && (
                  <span style={{ fontSize: '9px', color: 'var(--color-muted-48)', lineHeight: 1, marginTop: '2px' }}>
                    {counts[r.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )

  /* 풀사이즈 — Apple configurator chip 스타일 */
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {REACTIONS.map(r => {
        const count = counts[r.key] || 0
        const active = userReact === r.key
        return (
          <button key={r.key} onClick={() => handleReact(r.key)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 16px',
            borderRadius: 'var(--r-pill)',
            border: `${active ? 2 : 1}px solid ${active ? 'var(--color-primary-focus)' : 'var(--color-hairline)'}`,
            background: active ? 'rgba(0,102,204,0.06)' : 'var(--color-canvas)',
            fontSize: '15px',
            transform: animated === r.key ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.15s, border-color var(--transition), background-color var(--transition)',
            cursor: 'pointer',
          }}>
            <span>{r.emoji}</span>
            <span style={{
              fontSize: 'var(--text-caption)', fontWeight: active ? 600 : 400,
              letterSpacing: '-0.224px',
              color: active ? 'var(--color-primary)' : 'var(--color-muted-48)',
            }}>
              {count > 0 ? count : r.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
