/**
 * reactionStore.js — 이모지 반응
 * DB API 우선, 메모리 캐시 폴백
 * localStorage 제거
 */

const ADMIN_API = 'https://admin-vert-psi.vercel.app'

export const REACTIONS = [
  { key: 'fire', emoji: '🔥', label: '핫해' },
  { key: 'lol',  emoji: '😂', label: '웃겨' },
  { key: 'like', emoji: '👍', label: '좋아' },
  { key: 'wow',  emoji: '😮', label: '놀라워' },
  { key: 'sad',  emoji: '😢', label: '슬퍼' },
  { key: 'angry',emoji: '😡', label: '화나' },
]

// 메모리 캐시
const _counts = new Map()   // `${targetType}_${targetId}` → { fire:0, ... }
const _mine   = new Map()   // `${targetType}_${targetId}_${userId}` → key|null

function _cacheKey(postId)          { return `post_${postId}` }
function _mineKey(postId, userId)   { return `post_${postId}_${userId}` }

// ── DB API 호출 ────────────────────────────────────────
async function fetchReactions(postId, userId) {
  try {
    const url = `${ADMIN_API}/api/v1?resource=reactions&target_type=post&target_id=${postId}${userId ? '&user_id='+userId : ''}`
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

async function saveReaction(postId, userId, reactionKey) {
  try {
    const r = await fetch(`${ADMIN_API}/api/v1?resource=reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_type: 'post', target_id: postId, user_id: userId, reaction_key: reactionKey }),
      signal: AbortSignal.timeout(5000),
    })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

// ── 공개 API ────────────────────────────────────────────
export function getReactions(postId) {
  const key = _cacheKey(postId)
  return _counts.get(key) || {}
}

export function getUserReaction(postId, userId) {
  return _mine.get(_mineKey(postId, userId)) || null
}

export async function loadReactions(postId, userId) {
  const data = await fetchReactions(postId, userId)
  if (!data) return
  const key = _cacheKey(postId)
  _counts.set(key, data.counts || {})
  if (userId) _mine.set(_mineKey(postId, userId), data.user_reaction || null)
}

export function toggleReaction(postId, userId, reactionKey) {
  const key     = _cacheKey(postId)
  const mineKey = _mineKey(postId, userId)
  const counts  = { ...(_counts.get(key) || {}) }
  const current = _mine.get(mineKey) || null

  // 기존 반응 취소
  if (current) {
    counts[current] = Math.max(0, (counts[current] || 1) - 1)
    if (counts[current] === 0) delete counts[current]
  }

  // 같은 키면 취소만, 다른 키면 새 반응 추가
  const newKey = current === reactionKey ? null : reactionKey
  if (newKey) counts[newKey] = (counts[newKey] || 0) + 1

  _counts.set(key, counts)
  _mine.set(mineKey, newKey)

  // DB 동기화 (백그라운드)
  if (userId) saveReaction(postId, userId, reactionKey).then(data => {
    if (data?.counts) { _counts.set(key, data.counts); _mine.set(mineKey, data.user_reaction) }
  }).catch(() => {})

  return counts
}

// 기존 localStorage 정리
try { localStorage.removeItem('aha_reactions') } catch {}
