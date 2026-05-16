/**
 * reactionStore.js — 이모지 반응 시스템
 * localStorage 기반으로 사용자별 반응 영속
 */

const KEY = 'aha_reactions'

export const REACTIONS = [
  { emoji: '🔥', label: '핫해',    key: 'fire'  },
  { emoji: '😂', label: '웃겨',    key: 'lol'   },
  { emoji: '👍', label: '좋아',    key: 'like'  },
  { emoji: '😮', label: '놀라워',  key: 'wow'   },
  { emoji: '😢', label: '슬퍼',    key: 'sad'   },
  { emoji: '😡', label: '화나',    key: 'angry' },
]

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
function write(data) { localStorage.setItem(KEY, JSON.stringify(data)) }

/** 게시글의 반응 집계 반환 */
export function getReactions(postId) {
  const data = read()
  return data[postId]?.counts || {}
}

/** 사용자가 특정 게시글에 남긴 반응 */
export function getUserReaction(postId, userId) {
  const data = read()
  return data[postId]?.userReactions?.[userId] || null
}

/** 반응 토글 */
export function toggleReaction(postId, userId, reactionKey) {
  const data = read()
  if (!data[postId]) data[postId] = { counts: {}, userReactions: {} }
  const current = data[postId].userReactions[userId]
  // 같은 반응이면 취소
  if (current === reactionKey) {
    data[postId].userReactions[userId] = null
    data[postId].counts[reactionKey] = Math.max(0, (data[postId].counts[reactionKey] || 1) - 1)
  } else {
    // 기존 반응 취소
    if (current) data[postId].counts[current] = Math.max(0, (data[postId].counts[current] || 1) - 1)
    // 새 반응 추가
    data[postId].userReactions[userId] = reactionKey
    data[postId].counts[reactionKey] = (data[postId].counts[reactionKey] || 0) + 1
  }
  write(data)
  return data[postId].counts
}

/** 게시글의 전체 반응 수 */
export function getTotalReactions(postId) {
  const counts = getReactions(postId)
  return Object.values(counts).reduce((s, v) => s + v, 0)
}
