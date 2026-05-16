/**
 * ReactionBar — 이모지 반응 시스템 (FM코리아/페이스북 스타일)
 */
import { useState, useEffect } from 'react'
import { REACTIONS, getReactions, getUserReaction, toggleReaction, getTotalReactions } from '../store/reactionStore.js'
import { useAuth } from '../context/AuthContext'

export default function ReactionBar({ postId, compact = false }) {
  const { currentUser } = useAuth()
  const [counts, setCounts]     = useState({})
  const [userReact, setUserReact] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [animated, setAnimated] = useState(null)

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
    setTimeout(() => setAnimated(null), 600)
  }

  const total = Object.values(counts).reduce((s, v) => s + v, 0)
  const topReactions = REACTIONS.filter(r => counts[r.key] > 0).slice(0, 3)

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', position: 'relative' }}>
        {/* 상위 반응 표시 */}
        {topReactions.length > 0 && (
          <div style={{ display: 'flex', gap: '2px' }}>
            {topReactions.map(r => (
              <span key={r.key} style={{ fontSize: '14px' }}>{r.emoji}</span>
            ))}
          </div>
        )}
        {total > 0 && (
          <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{total}</span>
        )}
        {/* 반응 추가 버튼 */}
        <button
          onClick={e => { e.stopPropagation(); setShowPicker(v => !v) }}
          style={{
            fontSize: '14px', padding: '2px 6px',
            borderRadius: '99px',
            border: '1px solid var(--color-border-soft)',
            color: 'var(--color-muted)',
            background: showPicker ? 'var(--color-surface)' : 'transparent',
            transition: 'background-color var(--transition)',
            lineHeight: 1,
          }}
        >＋😊</button>

        {showPicker && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowPicker(false)} />
            <div style={{
              position: 'absolute', bottom: '32px', left: 0,
              background: '#fff', border: '1px solid var(--color-border-soft)',
              borderRadius: 'var(--radius-card)', padding: 'var(--space-2)',
              display: 'flex', gap: 'var(--space-1)', zIndex: 50,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}>
              {REACTIONS.map(r => (
                <button key={r.key} onClick={() => handleReact(r.key)}
                  title={r.label}
                  style={{
                    fontSize: '20px', padding: 'var(--space-1)', borderRadius: 'var(--radius-btn)',
                    background: userReact === r.key ? 'var(--color-surface)' : 'transparent',
                    transform: animated === r.key ? 'scale(1.4)' : 'scale(1)',
                    transition: 'transform 0.15s, background-color var(--transition)',
                    lineHeight: 1,
                  }}>
                  {r.emoji}
                  {counts[r.key] > 0 && (
                    <span style={{ fontSize: '9px', display: 'block', color: 'var(--color-muted)', lineHeight: 1 }}>
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
  }

  // 풀 사이즈
  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
      {REACTIONS.map(r => {
        const count = counts[r.key] || 0
        const active = userReact === r.key
        return (
          <button key={r.key} onClick={() => handleReact(r.key)} style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
            padding: 'var(--space-1) var(--space-3)',
            borderRadius: '99px',
            border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border-soft)'}`,
            background: active ? 'rgba(0,213,100,0.08)' : 'var(--color-surface)',
            fontSize: '14px',
            transform: animated === r.key ? 'scale(1.15)' : 'scale(1)',
            transition: 'transform 0.15s, border-color var(--transition), background-color var(--transition)',
          }}>
            <span>{r.emoji}</span>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: active ? 'var(--color-accent)' : 'var(--color-muted)', minWidth: '8px' }}>
              {count > 0 ? count : r.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
