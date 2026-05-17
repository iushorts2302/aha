/**
 * blockedStore.js
 * 관리자가 삭제/숨김 처리한 게시글 ID를 localStorage에 저장.
 * 사용자 앱과 관리자 앱이 같은 키를 공유해서 즉시 반영.
 */

export const BLOCKED_KEY = 'aha_blocked_posts'

/** 차단된 게시글 ID Set 반환 */
export function getBlockedIds() {
  try {
    const raw = localStorage.getItem(BLOCKED_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

/** ID 차단 추가 */
export function blockPost(id) {
  const ids = getBlockedIds()
  ids.add(id)
  localStorage.setItem(BLOCKED_KEY, JSON.stringify([...ids]))
}

/** ID 차단 해제 */
export function unblockPost(id) {
  const ids = getBlockedIds()
  ids.delete(id)
  localStorage.setItem(BLOCKED_KEY, JSON.stringify([...ids]))
}

/** 차단 여부 확인 */
export function isBlocked(id) {
  return getBlockedIds().has(id)
}
