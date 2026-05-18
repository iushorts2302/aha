import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getBlockedIds, BLOCKED_KEY, setBlockedIds as saveBlockedIds } from '../store/blockedStore.js'
import { postAPI, commentAPI, reactionAPI } from '../api/client.js'

const ADMIN_API    = 'https://admin-vert-psi.vercel.app'
// localStorage fallback keys (오프라인/비로그인 시 사용)
const POSTS_KEY    = 'aha_posts_v1'
const COMMENTS_KEY = 'aha_comments_v1'

function readLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}
function writeLS(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

async function fetchServerBlocked() {
  try {
    const res = await fetch(`${ADMIN_API}/api/blocked`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    return new Set((await res.json()).blocked || [])
  } catch { return null }
}

const AppContext = createContext(null)

const CATEGORIES = [
  { id: 'c1', name: 'DIY',  icon: '🔧', description: '직접 만들고 고치는 모든 것' },
  { id: 'c2', name: '테크', icon: '💻', description: '최신 기술 트렌드와 리뷰' },
  { id: 'c3', name: '요리', icon: '🍳', description: '레시피와 맛집 정보' },
  { id: 'c4', name: '여행', icon: '✈️', description: '국내외 여행 정보와 경험담' },
  { id: 'c5', name: '운동', icon: '💪', description: '헬스, 러닝, 스포츠 정보' },
]

export function AppProvider({ children }) {
  const [categories] = useState(CATEGORIES)
  const [posts,    setPosts]    = useState(() => readLS(POSTS_KEY, []))
  const [comments, setComments] = useState(() => readLS(COMMENTS_KEY, []))
  const [blockedIds, setBlockedIds] = useState(() => getBlockedIds())
  const [dbAvailable, setDbAvailable] = useState(false) // DB 연결 가능 여부

  useEffect(() => { writeLS(POSTS_KEY, posts) },    [posts])
  useEffect(() => { writeLS(COMMENTS_KEY, comments) }, [comments])

  // DB 연결 가능 여부 체크
  useEffect(() => {
    fetch(`${ADMIN_API}/api/categories`)
      .then(r => { if (r.ok) setDbAvailable(true) })
      .catch(() => setDbAvailable(false))
  }, [])

  // 차단 목록 폴링
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
    const newPost = {
      ...post,
      id: `p${Date.now()}`, seq_no: null,
      likes: [], views: 0, view_count: 0, like_count: 0,
      type: 'user', post_type: 'user',
      createdAt: new Date().toISOString(), created_at: new Date().toISOString(),
    }
    // DB 저장 시도
    if (dbAvailable) {
      try {
        const res = await postAPI.create({
          author_id: post.authorId || post.author_seq_no,
          category_id: post.categoryId,
          title: post.title, body: post.body,
          tags: post.tags || [],
          post_type: 'user',
        })
        newPost.seq_no = res.seq_no
        newPost.id = String(res.seq_no)
      } catch (e) { console.warn('DB 게시글 저장 실패, localStorage 사용:', e) }
    }
    setPosts(prev => { const n = [newPost, ...prev]; writeLS(POSTS_KEY, n); return n })
    return newPost
  }

  // ── 좋아요 토글 ─────────────────────────────────────
  const toggleLike = useCallback((postId, userId) => {
    setPosts(prev => {
      const n = prev.map(p => {
        const id = String(p.id || p.seq_no)
        if (id !== String(postId)) return p
        const likes = Array.isArray(p.likes) ? p.likes : []
        const liked = likes.includes(userId)
        return { ...p, likes: liked ? likes.filter(i => i !== userId) : [...likes, userId],
                 like_count: liked ? Math.max(0, (p.like_count||0)-1) : (p.like_count||0)+1 }
      })
      writeLS(POSTS_KEY, n); return n
    })
    // DB 동기화 (백그라운드)
    if (dbAvailable) {
      postAPI.toggleLike(postId, userId).catch(() => {})
    }
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
      id: `cm${Date.now()}`, postId, authorId, body, likes: [],
      createdAt: new Date().toISOString(),
    }
    setComments(prev => { const n = [...prev, c]; writeLS(COMMENTS_KEY, n); return n })
    // DB 동기화 (백그라운드)
    if (dbAvailable) {
      commentAPI.create(postId, authorId, body).catch(() => {})
    }
    return c
  }
  function deleteComment(id) {
    setComments(prev => { const n = prev.filter(c => c.id !== id); writeLS(COMMENTS_KEY, n); return n })
    if (dbAvailable) {
      commentAPI.remove(id, null).catch(() => {})
    }
  }

  return (
    <AppContext.Provider value={{
      categories, posts: visiblePosts, allPosts: posts, comments, blockedIds, dbAvailable,
      getCommentsByPostId: pid => comments.filter(c => c.postId === String(pid) || c.postId === pid),
      getPostsByCategory:  catId => visiblePosts.filter(p => p.categoryId === catId),
      getPostsByAuthor:    uid   => visiblePosts.filter(p => p.authorId === uid || p.author_seq_no === uid),
      addPost, toggleLike, addComment, deleteComment, incrementView,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() { return useContext(AppContext) }
