import { useState, useEffect } from 'react'
import { REACTIONS, getReactions, getUserReaction, toggleReaction, loadReactions } from '../store/reactionStore.js'
import { useAuth } from '../context/AuthContext'

export default function ReactionBar({ postId, compact = false }) {
  const { currentUser } = useAuth()
  const [counts, setCounts]     = useState(() => getReactions(postId))
  const [userReact, setUserReact] = useState(() => currentUser ? getUserReaction(postId, currentUser.id) : null)
  const [showPicker, setShowPicker] = useState(false)
  const [bumped, setBumped] = useState(null)

  // currentUser/postId 변경 시 동기화
  useEffect(() => {
    setCounts(getReactions(postId))
    setUserReact(currentUser ? getUserReaction(postId, currentUser.id) : null)
    // DB에서 최신 반응 로드 (백그라운드)
    loadReactions(postId, currentUser?.id || currentUser?.seq_no).then(() => {
      setCounts(getReactions(postId))
      if (currentUser) setUserReact(getUserReaction(postId, currentUser.id || currentUser.seq_no))
    }).catch(() => {})
  }, [postId, currentUser])

  function handleReact(key) {
    if (!currentUser) return
    const newCounts = toggleReaction(postId, currentUser.id, key)
    setCounts({ ...newCounts })
    setUserReact(getUserReaction(postId, currentUser.id))
    setShowPicker(false)
    setBumped(key)
    setTimeout(() => setBumped(null), 400)
  }

  const total = Object.values(counts).reduce((s, v) => s + (v || 0), 0)
  const topReactions = REACTIONS.filter(r => (counts[r.key] || 0) > 0).slice(0, 3)

  // ── compact (카드 목록용) ───────────────────────────────
  if (compact) {
    const btnStyle = {
      background: 'transparent', border: '1px solid var(--color-hairline)',
      borderRadius: 'var(--r-pill)', padding: '2px 8px', fontSize: 12,
      color: 'var(--color-muted-48)', cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 3,
      outline: 'none', boxShadow: 'none', position: 'relative',
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, position: 'relative' }}>
        {topReactions.length > 0 && (
          <span style={{ display: 'flex', gap: 1 }}>
            {topReactions.map(r => <span key={r.key} style={{ fontSize: 13 }}>{r.emoji}</span>)}
          </span>
        )}
        {total > 0 && <span style={{ fontSize: 12, color: 'var(--color-muted-48)' }}>{total}</span>}
        <button type="button" style={btnStyle} onClick={e => { e.stopPropagation(); setShowPicker(v => !v) }}>＋</button>

        {showPicker && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setShowPicker(false)} />
            <div style={{
              position: 'absolute', bottom: 32, left: 0, zIndex: 201,
              background: '#fff', border: '1px solid var(--color-hairline)',
              borderRadius: 16, padding: 8, display: 'flex', gap: 4,
              boxShadow: '0 8px 28px rgba(0,0,0,0.14)',
            }}>
              {REACTIONS.map(r => (
                <button key={r.key} type="button" onClick={() => handleReact(r.key)}
                  style={{
                    fontSize: 20, padding: 6, borderRadius: 10, cursor: 'pointer',
                    background: userReact === r.key ? 'rgba(0,102,204,0.08)' : 'transparent',
                    border: userReact === r.key ? '1px solid rgba(0,102,204,0.3)' : '1px solid transparent',
                    transform: bumped === r.key ? 'scale(1.3)' : 'scale(1)',
                    transition: 'transform 0.15s', outline: 'none', display: 'flex',
                    flexDirection: 'column', alignItems: 'center', lineHeight: 1,
                  }} title={r.label}>
                  {r.emoji}
                  {(counts[r.key] || 0) > 0 && (
                    <span style={{ fontSize: 9, color: 'var(--color-muted-48)', marginTop: 2 }}>
                      {counts[r.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </span>
    )
  }

  // ── 풀사이즈 (게시글 상세) ────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {REACTIONS.map(r => {
          const cnt    = counts[r.key] || 0
          const active = userReact === r.key
          return (
            <button key={r.key} type="button" onClick={() => handleReact(r.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 16px', borderRadius: 'var(--r-pill)',
                border: `${active ? 2 : 1}px solid ${active ? 'var(--color-primary)' : 'var(--color-hairline)'}`,
                background: active ? 'rgba(0,102,204,0.06)' : '#fff',
                fontSize: 18, cursor: 'pointer',
                transform: bumped === r.key ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.15s, border-color 0.15s, background-color 0.15s',
                outline: 'none', boxShadow: 'none', userSelect: 'none',
              }}>
              <span style={{ lineHeight: 1 }}>{r.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--color-primary)' : 'var(--color-muted-48)', minWidth: 16, textAlign: 'center' }}>
                {cnt > 0 ? cnt : r.label}
              </span>
            </button>
          )
        })}
      </div>
      {!currentUser && (
        <p style={{ fontSize: 13, color: 'var(--color-muted-48)', marginTop: 10 }}>
          로그인 후 반응을 남길 수 있습니다.
        </p>
      )}
    </div>
  )
}
