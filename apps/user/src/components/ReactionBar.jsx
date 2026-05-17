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

  /* ── compact (카드 목록용) ── */
  if (compact) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
      {topReactions.length > 0 && (
        <div style={{ display: 'flex', gap: 1 }}>
          {topReactions.map(r => <span key={r.key} style={{ fontSize: 13 }}>{r.emoji}</span>)}
        </div>
      )}
      {total > 0 && <span style={{ fontSize: 12, color: 'var(--color-muted-48)' }}>{total}</span>}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setShowPicker(v => !v) }}
        style={{
          fontSize: 12, padding: '2px 7px',
          borderRadius: 'var(--r-pill)',
          border: '1px solid var(--color-hairline)',
          color: 'var(--color-muted-48)',
          background: showPicker ? 'var(--color-parchment)' : 'transparent',
          cursor: 'pointer', lineHeight: 1,
        }}>＋</button>

      {showPicker && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowPicker(false)} />
          <div style={{
            position: 'absolute', bottom: 32, left: 0, zIndex: 50,
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--color-hairline)',
            borderRadius: 16, padding: 8,
            display: 'flex', gap: 4,
            boxShadow: '0 8px 28px rgba(0,0,0,0.14)',
          }}>
            {REACTIONS.map(r => (
              <button key={r.key} type="button" onClick={() => handleReact(r.key)} title={r.label}
                style={{
                  fontSize: 20, padding: 6, borderRadius: 10, cursor: 'pointer',
                  background: userReact === r.key ? 'rgba(0,102,204,0.08)' : 'transparent',
                  border: userReact === r.key ? '1px solid rgba(0,102,204,0.25)' : '1px solid transparent',
                  transform: animated === r.key ? 'scale(1.35)' : 'scale(1)',
                  transition: 'transform 0.15s, background-color 0.15s',
                  lineHeight: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}>
                {r.emoji}
                {counts[r.key] > 0 && (
                  <span style={{ fontSize: 9, color: 'var(--color-muted-48)', lineHeight: 1, marginTop: 2 }}>
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

  /* ── 풀사이즈 (게시글 상세용) ── */
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {REACTIONS.map(r => {
        const count  = counts[r.key] || 0
        const active = userReact === r.key
        return (
          <button
            key={r.key}
            type="button"
            onClick={() => handleReact(r.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px',
              borderRadius: 'var(--r-pill)',
              border: `${active ? 2 : 1}px solid ${active ? 'var(--color-primary)' : 'var(--color-hairline)'}`,
              background: active ? 'rgba(0,102,204,0.07)' : '#fff',
              fontSize: 18,
              cursor: 'pointer',
              transform: animated === r.key ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 0.15s, border-color 0.15s, background-color 0.15s',
              // Bootstrap 간섭 방지
              outline: 'none',
              boxShadow: 'none',
              userSelect: 'none',
            }}>
            <span style={{ lineHeight: 1 }}>{r.emoji}</span>
            <span style={{
              fontSize: 'var(--text-caption)', fontWeight: active ? 600 : 400,
              color: active ? 'var(--color-primary)' : 'var(--color-muted-48)',
              minWidth: 16, textAlign: 'center',
            }}>
              {count > 0 ? count : r.label}
            </span>
          </button>
        )
      })}
      {!currentUser && (
        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)', alignSelf: 'center', margin: 0 }}>
          로그인 후 반응을 남길 수 있습니다.
        </p>
      )}
    </div>
  )
}
