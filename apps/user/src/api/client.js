/**
 * api/client.js — MariaDB 연동 API 클라이언트
 * 엔드포인트: /api/v1?resource=<resource>
 */

const BASE = 'https://admin-vert-psi.vercel.app/api/v1'

async function req(resource, method = 'GET', body = null, params = {}) {
  const qs = new URLSearchParams({ resource, ...params }).toString()
  const res = await fetch(`${BASE}?${qs}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

// ── 인증 ────────────────────────────────────────────────
export const authAPI = {
  login:  (email, password) =>
    req('auth', 'POST', { email, password, type: 'user' }),
  signup: (email, password, nickname, bio = '', expertise = []) =>
    req('users', 'POST', { email, password, nickname, bio, expertise }),
}

// ── 사용자 ──────────────────────────────────────────────
export const userAPI = {
  get:    (id)       => req('users', 'GET', null, { id }),
  update: (id, data) => req('users', 'PATCH', { id, ...data }),
  delete: (id)       => req('users', 'DELETE', { id }),
  getBookmarks: (uid)         => req('bookmarks', 'GET', null, { user_id: uid }),
  toggleBookmark: (uid, postId) => req('bookmarks', 'POST', { user_id: uid, post_id: postId }),
  getFollowing: (uid)  => req('follows', 'GET', null, { user_id: uid, type: 'following' }),
  getFollowers: (uid)  => req('follows', 'GET', null, { user_id: uid, type: 'followers' }),
  toggleFollow: (fromId, toId) => req('follows', 'POST', { follower_id: fromId, followee_id: toId }),
}

// ── 게시글 ──────────────────────────────────────────────
export const postAPI = {
  list: (params = {}) => req('posts', 'GET', null, params),
  get:  (id)          => req('posts', 'GET', null, { id }),
  create: (data)      => req('posts', 'POST', data),
  update: (id, data)  => req('posts', 'PATCH', { id, ...data }),
  remove: (id)        => req('posts', 'DELETE', { id }),
  toggleLike: (postId, userId) =>
    req('likes', 'POST', { post_id: postId, user_id: userId }),
}

// ── 댓글 ────────────────────────────────────────────────
export const commentAPI = {
  list:   (postId) => req('comments', 'GET', null, { post_id: postId }),
  create: (postId, authorId, body, parentId = null) =>
    req('comments', 'POST', { post_id: postId, author_id: authorId, body, parent_id: parentId }),
  remove: (id, authorId) => req('comments', 'DELETE', { id, author_id: authorId }),
  toggleLike: (commentId, userId) =>
    req('comments', 'POST', { comment_id: commentId, user_id: userId, _action: 'like' }),
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
