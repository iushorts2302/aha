/**
 * api/client.js — DB API 클라이언트
 * 엔드포인트: /api/v1?resource=<resource>
 * DB 연결 실패 시 빈 기본값 반환 (서비스 무중단)
 */

const BASE = 'https://admin-vert-psi.vercel.app/api/v1'

// resource별 DB 실패 시 기본값
const FALLBACKS = {
  auth:       null,
  users:      { users: [], count: 0 },
  posts:      { posts: [], total: 0, page: 1, limit: 20 },
  comments:   { comments: [], count: 0 },
  likes:      { liked: false, like_count: 0 },
  bookmarks:  { bookmarks: [] },
  reactions:  { counts: {}, user_reaction: null },
  follows:    { users: [], count: 0 },
  categories: { categories: [] },
  topics:     { topics: [] },
  sources:    { sources: [] },
  crawl_items:{ items: [], total: 0, count: 0 },
}

async function req(resource, method = 'GET', body = null, params = {}) {
  try {
    const qs = new URLSearchParams({ resource, ...params }).toString()
    const res = await fetch(`${BASE}?${qs}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json()
    // DB down 플래그 — 쓰기 작업(POST/PATCH/DELETE)만 에러 throw
    if (!res.ok && method !== 'GET') {
      if (data.db_down) return FALLBACKS[resource] ?? { ok: false, db_down: true }
      throw new Error(data.error || `HTTP ${res.status}`)
    }
    return data
  } catch (e) {
    // 네트워크/타임아웃 실패 → 기본값 반환 (GET) / throw (쓰기)
    if (method !== 'GET') throw e
    return FALLBACKS[resource] ?? {}
  }
}

// ── 인증 ────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) =>
    req('auth', 'POST', { email, password, type: 'user' }),
  signup: (email, password, nickname, bio = '', expertise = []) =>
    req('users', 'POST', { email, password, nickname, bio, expertise }),
}

// ── 사용자 ──────────────────────────────────────────────
export const userAPI = {
  get:    (id)     => req('users', 'GET', null, { id }),
  update: (id, d)  => req('users', 'PATCH', { id, ...d }),
  delete: (id)     => req('users', 'DELETE', { id }),
  getBookmarks:   (uid)         => req('bookmarks', 'GET', null, { user_id: uid }),
  toggleBookmark: (uid, postId) => req('bookmarks', 'POST', { user_id: uid, post_id: postId }),
  getFollowing: (uid)            => req('follows', 'GET', null, { user_id: uid, type: 'following' }),
  getFollowers: (uid)            => req('follows', 'GET', null, { user_id: uid, type: 'followers' }),
  toggleFollow: (fromId, toId)   => req('follows', 'POST', { follower_id: fromId, followee_id: toId }),
}

// ── 게시글 ──────────────────────────────────────────────
export const postAPI = {
  list: (params = {}) => req('posts', 'GET', null,
    Object.fromEntries(Object.entries(params).filter(([,v]) => v != null))),
  get:    (id)       => req('posts', 'GET', null, { id }),
  create: (data)     => req('posts', 'POST', data),
  update: (id, data) => req('posts', 'PATCH', { id, ...data }),
  remove: (id)       => req('posts', 'DELETE', { id }),
  toggleLike: (postId, userId) =>
    req('likes', 'POST', { post_id: postId, user_id: userId }),
}

// ── 댓글 ────────────────────────────────────────────────
export const commentAPI = {
  list: (postId) => req('comments', 'GET', null, { post_id: postId }),
  create: (postId, authorId, body, parentId = null) =>
    req('comments', 'POST', { post_id: postId, author_id: authorId, body, parent_id: parentId }),
  remove: (id, authorId) =>
    req('comments', 'DELETE', { id, author_id: authorId }),
}

// ── 이모지 반응 ─────────────────────────────────────────
export const reactionAPI = {
  get: (targetType, targetId, userId) =>
    req('reactions', 'GET', null, {
      target_type: targetType, target_id: targetId,
      ...(userId ? { user_id: userId } : {}),
    }),
  toggle: (targetType, targetId, userId, reactionKey) =>
    req('reactions', 'POST', {
      target_type: targetType, target_id: targetId,
      user_id: userId, reaction_key: reactionKey,
    }),
}

// ── 카테고리/토픽 ────────────────────────────────────────
export const categoryAPI = {
  list: () => req('categories', 'GET'),
}
