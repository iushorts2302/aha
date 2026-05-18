/**
 * crawlInteractionStore.js
 * 크롤링 아이템 조회수 / 좋아요 — DB API 우선, 메모리 폴백
 * localStorage 제거
 */

const ADMIN_API = 'https://admin-vert-psi.vercel.app'

// 메모리 캐시
const _views = new Map()  // itemId → count
const _likes = new Map()  // itemId → { count, liked }

async function dbReaction(targetId, userId, key) {
  try {
    const r = await fetch(`${ADMIN_API}/api/v1?resource=reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_type: 'crawl_item', target_id: targetId, user_id: userId, reaction_key: key }),
    })
    return r.ok ? await r.json() : null
  } catch { return null }
}

// ── 조회수 ────────────────────────────────────────────────
export function getCrawlViews(itemId) {
  return _views.get(String(itemId)) || 0
}

export function incrementCrawlView(itemId) {
  const id = String(itemId)
  const next = (_views.get(id) || 0) + 1
  _views.set(id, next)
  // 기존 localStorage 키 정리
  try { localStorage.removeItem('aha_crawl_views') } catch {}
  return next
}

// ── 좋아요 ────────────────────────────────────────────────
export function getCrawlLikes(itemId) {
  return _likes.get(String(itemId)) || { count: 0, liked: false }
}

export function toggleCrawlLike(itemId, userId) {
  const id  = String(itemId)
  const cur = _likes.get(id) || { count: 0, liked: false }
  const next = { liked: !cur.liked, count: cur.liked ? Math.max(0, cur.count - 1) : cur.count + 1 }
  _likes.set(id, next)
  // DB 동기화 (백그라운드)
  if (userId) dbReaction(itemId, userId, 'like').catch(() => {})
  // 기존 localStorage 키 정리
  try { localStorage.removeItem('aha_crawl_likes') } catch {}
  return next
}

// 기존 localStorage 자동 정리
try {
  localStorage.removeItem('aha_crawl_views')
  localStorage.removeItem('aha_crawl_likes')
} catch {}
