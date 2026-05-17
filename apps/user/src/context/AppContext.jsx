import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getBlockedIds, BLOCKED_KEY, setBlockedIds as saveBlockedIds } from '../store/blockedStore.js'

const ADMIN_API    = 'https://admin-vert-psi.vercel.app'
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

  // posts ref — 함수 내부에서 항상 최신값 참조
  const postsRef = useRef(posts)
  useEffect(() => { postsRef.current = posts }, [posts])

  // localStorage 동기화
  useEffect(() => { writeLS(POSTS_KEY, posts) }, [posts])
  useEffect(() => { writeLS(COMMENTS_KEY, comments) }, [comments])

  // 서버 차단 목록 폴링
  useEffect(() => {
    async function sync() {
      const srv = await fetchServerBlocked()
      if (srv) {
        const merged = new Set([...srv, ...getBlockedIds()])
        saveBlockedIds(merged)
        setBlockedIds(merged)
      }
    }
    sync()
    const t = setInterval(sync, 10000)
    const onStorage = e => { if (e.key === BLOCKED_KEY) setBlockedIds(getBlockedIds()) }
    window.addEventListener('storage', onStorage)
    return () => { clearInterval(t); window.removeEventListener('storage', onStorage) }
  }, [])

  // ── helpers ────────────────────────────────────────────
  const isBlocked = id => blockedIds.has(id)
  const visiblePosts = posts.filter(p => !isBlocked(p.id))

  // ── 쓰기 (함수형 업데이트 + ref로 최신값 보장) ─────────

  function addPost(post) {
    const np = { ...post, id: `p${Date.now()}`, likes: [], views: 0, type: 'user', createdAt: new Date().toISOString() }
    setPosts(prev => { const n = [np, ...prev]; writeLS(POSTS_KEY, n); return n })
    return np
  }

  const toggleLike = useCallback((postId, userId) => {
    setPosts(prev => {
      const n = prev.map(p => {
        if (p.id !== postId) return p
        const likes = Array.isArray(p.likes) ? p.likes : []
        return { ...p, likes: likes.includes(userId) ? likes.filter(id => id !== userId) : [...likes, userId] }
      })
      writeLS(POSTS_KEY, n)
      return n
    })
  }, [])

  const incrementView = useCallback((postId) => {
    setPosts(prev => {
      // 이미 이 세션에서 조회했으면 skip (ref 체크)
      const n = prev.map(p => p.id === postId ? { ...p, views: (p.views || 0) + 1 } : p)
      writeLS(POSTS_KEY, n)
      return n
    })
  }, [])

  function addComment(postId, authorId, body) {
    const c = { id: `cm${Date.now()}`, postId, authorId, body, likes: [], createdAt: new Date().toISOString() }
    setComments(prev => { const n = [...prev, c]; writeLS(COMMENTS_KEY, n); return n })
    return c
  }
  function deleteComment(id) {
    setComments(prev => { const n = prev.filter(c => c.id !== id); writeLS(COMMENTS_KEY, n); return n })
  }

  return (
    <AppContext.Provider value={{
      categories,
      posts: visiblePosts,        // 목록용 (차단 제외)
      allPosts: posts,            // 상세용 (원본 전체)
      comments,
      blockedIds,
      getCommentsByPostId: postId => comments.filter(c => c.postId === postId),
      getPostsByCategory:  catId  => visiblePosts.filter(p => p.categoryId === catId),
      getPostsByAuthor:    uid    => visiblePosts.filter(p => p.authorId === uid),
      addPost, toggleLike, addComment, deleteComment, incrementView,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() { return useContext(AppContext) }
