/**
 * crawlInteractionStore.js
 * 크롤링 아이템의 조회수 / 좋아요 / 이모지반응을 localStorage에 영속 저장
 */

const VIEWS_KEY = 'aha_crawl_views'
const LIKES_KEY = 'aha_crawl_likes'

function read(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} }
}
function write(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

// ── 조회수 ────────────────────────────────────────────────
export function getCrawlViews(itemId) {
  return read(VIEWS_KEY)[itemId] || 0
}
export function incrementCrawlView(itemId) {
  const data = read(VIEWS_KEY)
  data[itemId] = (data[itemId] || 0) + 1
  write(VIEWS_KEY, data)
  return data[itemId]
}

// ── 좋아요 ────────────────────────────────────────────────
export function getCrawlLikes(itemId) {
  const data = read(LIKES_KEY)
  return { count: data[itemId]?.count || 0, liked: data[itemId]?.liked || false }
}
export function toggleCrawlLike(itemId) {
  const data = read(LIKES_KEY)
  if (!data[itemId]) data[itemId] = { count: 0, liked: false }
  const cur = data[itemId]
  cur.liked = !cur.liked
  cur.count = cur.liked ? cur.count + 1 : Math.max(0, cur.count - 1)
  write(LIKES_KEY, data)
  return data[itemId]
}
