/**
 * api/client.js — MariaDB 연동 API 클라이언트
 * 모든 DB 작업은 이 모듈을 통해 수행
 */

const BASE = 'https://admin-vert-psi.vercel.app/api'

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

// ── 인증 ────────────────────────────────────────────────
export const authAPI = {
  login:  (email, password) =>
    req('/auth', { method: 'POST', body: JSON.stringify({ email, password, type: 'user' }) }),
  signup: (email, password, nickname, bio = '', expertise = []) =>
    req('/users', { method: 'POST', body: JSON.stringify({ email, password, nickname, bio, expertise }) }),
}

// ── 사용자 ──────────────────────────────────────────────
export const userAPI = {
  get:          (id)     => req(`/users?id=${id}`),
  update:       (id, data) => req('/users', { method: 'PATCH', body: JSON.stringify({ id, ...data }) }),
  getBookmarks: (uid)    => req(`/bookmarks?user_id=${uid}`),
  toggleBookmark: (uid, postId) =>
    req('/bookmarks', { method: 'POST', body: JSON.stringify({ user_id: uid, post_id: postId }) }),
  getFollowing: (uid)    => req(`/follows?user_id=${uid}&type=following`),
  getFollowers: (uid)    => req(`/follows?user_id=${uid}&type=followers`),
  toggleFollow: (fromId, toId) =>
    req('/follows', { method: 'POST', body: JSON.stringify({ follower_id: fromId, followee_id: toId }) }),
}

// ── 게시글 ──────────────────────────────────────────────
export const postAPI = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([,v]) => v != null))
    ).toString()
    return req(`/posts${qs ? '?'+qs : ''}`)
  },
  get:    (id)       => req(`/posts?id=${id}`),
  create: (data)     => req('/posts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => req('/posts', { method: 'PATCH', body: JSON.stringify({ id, ...data }) }),
  remove: (id)       => req('/posts', { method: 'DELETE', body: JSON.stringify({ id }) }),
  toggleLike: (postId, userId) =>
    req('/likes', { method: 'POST', body: JSON.stringify({ post_id: postId, user_id: userId }) }),
}

// ── 댓글 ────────────────────────────────────────────────
export const commentAPI = {
  list:   (postId) => req(`/comments?post_id=${postId}`),
  create: (postId, authorId, body, parentId = null) =>
    req('/comments', { method: 'POST', body: JSON.stringify({
      post_id: postId, author_id: authorId, body, parent_id: parentId
    }) }),
  remove: (id, authorId) =>
    req('/comments', { method: 'DELETE', body: JSON.stringify({ id, author_id: authorId }) }),
  toggleLike: (commentId, userId) =>
    req('/comments/like', { method: 'POST', body: JSON.stringify({ comment_id: commentId, user_id: userId }) }),
}

// ── 이모지 반응 ─────────────────────────────────────────
export const reactionAPI = {
  get: (targetType, targetId, userId) =>
    req(`/reactions?target_type=${targetType}&target_id=${targetId}${userId ? '&user_id='+userId : ''}`),
  toggle: (targetType, targetId, userId, reactionKey) =>
    req('/reactions', { method: 'POST', body: JSON.stringify({
      target_type: targetType, target_id: targetId,
      user_id: userId, reaction_key: reactionKey,
    }) }),
}

// ── 카테고리/토픽 ────────────────────────────────────────
export const categoryAPI = {
  list: () => req('/categories'),
}
