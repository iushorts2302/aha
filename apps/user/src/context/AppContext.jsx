import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getBlockedIds, BLOCKED_KEY, setBlockedIds as saveBlockedIds } from '../store/blockedStore.js'
import { postAPI, commentAPI, categoryAPI } from '../api/client.js'
import { getConfig } from '../store/configStore.js'

const ADMIN_API    = 'https://admin-vert-psi.vercel.app'
// localStorage — 게시글/댓글 세션 폴백용 (DB 연결 실패 시)
const POSTS_KEY    = 'aha_posts_v1'
const COMMENTS_KEY = 'aha_comments_v1'

function readLS(key, fb) { try { return JSON.parse(localStorage.getItem(key)||'null')??fb } catch { return fb } }
function writeLS(key, v) { try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }

async function fetchServerBlocked() {
  try {
    const r = await fetch(`${ADMIN_API}/api/blocked`, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) return null
    return new Set((await r.json()).blocked || [])
  } catch { return null }
}

const AppContext = createContext(null)

// config.py DEFAULT_CONFIG 기반 기본 카테고리 (DB/API 실패 시 폴백)
function _defaultCategories() {
  const cfg = getConfig()
  if (cfg && cfg.categories && cfg.categories.length > 0) {
    return cfg.categories.map(c => ({
      id: c.category_id || c.id, name: c.label, icon: c.icon || '',
      seq_no: c.seq_no,
    }))
  }
  return [
    { id: 'home',    name: '홈',       icon: '🏠' },
    { id: 'ai',      name: 'AI 뉴스',  icon: '🤖' },
    { id: 'dev',     name: '개발',     icon: '💻' },
    { id: 'startup', name: '스타트업', icon: '🚀' },
    { id: 'game',    name: '게임',     icon: '🎮' },
    { id: 'finance', name: '주식/코인',icon: '💰' },
    { id: 'board',   name: '게시판',   icon: '📋' },
    { id: 'learn',   name: '학습',     icon: '📚' },
    { id: 'job',     name: '취업',     icon: '💼' },
  ]
}

export function AppProvider({ children }) {
  const [categories, setCategories] = useState(_defaultCategories)

  // categories를 API/config에서 동적 로드
  useEffect(() => {
    categoryAPI.list()
      .then(d => {
        if (d.db_down) return  // DB 실패 → _defaultCategories 유지
        const cats = (d.categories || [])
        if (cats.length > 0) {
          setCategories(cats.map(c => ({
            id: c.category_id || c.id, name: c.label, icon: c.icon || '',
            seq_no: c.seq_no,
          })))
        }
      })
      .catch(() => {})
  }, [])
  const [posts,    setPosts]    = useState(() => readLS(POSTS_KEY, []))
  const [comments, setComments] = useState(() => readLS(COMMENTS_KEY, []))
  const [blockedIds, setBlockedIds] = useState(() => getBlockedIds())
  const [dbAvailable, setDbAvailable] = useState(false)

  // localStorage 동기화
  useEffect(() => { writeLS(POSTS_KEY, posts) },    [posts])
  useEffect(() => { writeLS(COMMENTS_KEY, comments) }, [comments])

  // DB 연결 확인 + 게시글 로드 (실패 시 localStorage 유지)
  useEffect(() => {
    postAPI.list({ page: 1, limit: 50 })
      .then(data => {
        if (data.db_down) { setDbAvailable(false); return }
        const dbPosts = (data.posts || []).map(p => ({
          ...p,
          id:         String(p.seq_no),
          authorId:   String(p.author_seq_no),
          categoryId: p.category_id || null,
          likes:      [],
          views:      p.view_count || 0,
          body:       p.body || '',
          tags:       p.tags || [],
          createdAt:  p.created_at,
        }))
        if (dbPosts.length > 0) {
          setPosts(prev => {
            // DB 포스트 + localStorage 전용 포스트 (type='user', id가 'p'로 시작) 병합
            const localOnly = prev.filter(p => String(p.id).startsWith('p') && !p.seq_no)
            const merged = [...dbPosts, ...localOnly]
            writeLS(POSTS_KEY, merged)
            return merged
          })
          setDbAvailable(true)
        }
      })
      .catch(() => setDbAvailable(false))
  }, [])

  // 차단 목록 폴링 (10초)
  useEffect(() => {
    async function sync() {
      const srv = await fetchServerBlocked()
      if (srv) {
        const merged = new Set([...srv, ...getBlockedIds()])
        saveBlockedIds(merged); setBlockedIds(merged)
      }
    }
    sync()
    const t = setInterval(sync, 10000)
    const onStorage = e => { if (e.key === BLOCKED_KEY) setBlockedIds(getBlockedIds()) }
    window.addEventListener('storage', onStorage)
    return () => { clearInterval(t); window.removeEventListener('storage', onStorage) }
  }, [])

  const visiblePosts = posts.filter(p => !blockedIds.has(String(p.id || p.seq_no)))

  // ── 게시글 작성 ─────────────────────────────────────
  async function addPost(post) {
    const localPost = {
      ...post,
      id: `p${Date.now()}`, seq_no: null,
      likes: [], views: 0, view_count: 0, like_count: 0,
      type: 'user', post_type: 'user',
      createdAt: new Date().toISOString(), created_at: new Date().toISOString(),
    }
    if (dbAvailable) {
      try {
        const res = await postAPI.create({
          author_id:   post.authorId,
          category_id: post.categoryId,
          title: post.title, body: post.body,
          tags: post.tags || [], post_type: 'user',
        })
        localPost.seq_no = res.seq_no
        localPost.id = String(res.seq_no)
      } catch {}
    }
    setPosts(prev => { const n = [localPost, ...prev]; writeLS(POSTS_KEY, n); return n })
    return localPost
  }

  // ── 좋아요 토글 ─────────────────────────────────────
  const toggleLike = useCallback((postId, userId) => {
    setPosts(prev => {
      const n = prev.map(p => {
        const id = String(p.id || p.seq_no)
        if (id !== String(postId)) return p
        const likes = Array.isArray(p.likes) ? p.likes : []
        const liked = likes.includes(userId)
        return { ...p,
          likes:      liked ? likes.filter(i => i !== userId) : [...likes, userId],
          like_count: liked ? Math.max(0,(p.like_count||0)-1) : (p.like_count||0)+1 }
      })
      writeLS(POSTS_KEY, n); return n
    })
    if (dbAvailable) postAPI.toggleLike(postId, userId).catch(() => {})
  }, [dbAvailable])

  // ── 조회수 ─────────────────────────────────────────
  const incrementView = useCallback((postId) => {
    setPosts(prev => {
      const n = prev.map(p => {
        const id = String(p.id || p.seq_no)
        if (id !== String(postId)) return p
        return { ...p, views: (p.views||0)+1, view_count: (p.view_count||0)+1 }
      })
      writeLS(POSTS_KEY, n); return n
    })
  }, [])

  // ── 댓글 ──────────────────────────────────────────
  function addComment(postId, authorId, body) {
    const c = {
      id: `cm${Date.now()}`, postId: String(postId), authorId, body, likes: [],
      createdAt: new Date().toISOString(),
    }
    setComments(prev => { const n = [...prev, c]; writeLS(COMMENTS_KEY, n); return n })
    if (dbAvailable) commentAPI.create(postId, authorId, body).catch(() => {})
    return c
  }
  function deleteComment(id) {
    setComments(prev => { const n = prev.filter(c => c.id !== id); writeLS(COMMENTS_KEY, n); return n })
    if (dbAvailable) commentAPI.remove(id, null).catch(() => {})
  }

  return (
    <AppContext.Provider value={{
      categories, posts: visiblePosts, allPosts: posts, comments, blockedIds, dbAvailable,
      getCommentsByPostId: pid => comments.filter(c => c.postId === String(pid) || c.postId === pid),
      getPostsByCategory:  catId => visiblePosts.filter(p => p.categoryId === catId),
      getPostsByAuthor:    uid   => visiblePosts.filter(p => String(p.authorId||p.author_seq_no) === String(uid)),
      addPost, toggleLike, addComment, deleteComment, incrementView,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() { return useContext(AppContext) }
