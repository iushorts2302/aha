import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getBlockedIds, BLOCKED_KEY, setBlockedIds as saveBlockedIds } from '../store/blockedStore.js'

const ADMIN_API    = 'https://admin-vert-psi.vercel.app'
const POSTS_KEY    = 'aha_posts_v1'
const COMMENTS_KEY = 'aha_comments_v1'

function readPosts()     { try { return JSON.parse(localStorage.getItem(POSTS_KEY)    || '[]') } catch { return [] } }
function readComments()  { try { return JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]') } catch { return [] } }
function writePosts(p)   { try { localStorage.setItem(POSTS_KEY,    JSON.stringify(p)) } catch {} }
function writeComments(c){ try { localStorage.setItem(COMMENTS_KEY, JSON.stringify(c)) } catch {} }

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
  const [posts,     setPosts]     = useState(() => readPosts())
  const [comments,  setComments]  = useState(() => readComments())
  const [blockedIds, setBlockedIds] = useState(() => getBlockedIds())

  // localStorage 동기화 (posts/comments 변경 시)
  useEffect(() => { writePosts(posts) },    [posts])
  useEffect(() => { writeComments(comments) }, [comments])

  // 서버 차단 목록 폴링 (10초)
  useEffect(() => {
    async function syncBlocked() {
      const serverIds = await fetchServerBlocked()
      if (serverIds) {
        const merged = new Set([...serverIds, ...getBlockedIds()])
        saveBlockedIds(merged)
        setBlockedIds(merged)
      }
    }
    syncBlocked()
    const t = setInterval(syncBlocked, 10000)
    const onStorage = (e) => { if (e.key === BLOCKED_KEY) setBlockedIds(getBlockedIds()) }
    window.addEventListener('storage', onStorage)
    return () => { clearInterval(t); window.removeEventListener('storage', onStorage) }
  }, [])

  // 차단 제외 필터
  const visiblePosts = posts.filter(p => !blockedIds.has(p.id))

  // ── 쓰기 함수 — 함수형 업데이트 + 즉시 localStorage 동기화 ──

  function addPost(post) {
    const newPost = {
      ...post,
      id: `p${Date.now()}`,
      likes: [], views: 0,
      type: 'user',
      createdAt: new Date().toISOString(),
    }
    setPosts(prev => { const next = [newPost, ...prev]; writePosts(next); return next })
    return newPost
  }

  const toggleLike = useCallback((postId, userId) => {
    setPosts(prev => {
      const next = prev.map(p => {
        if (p.id !== postId) return p
        const likes = Array.isArray(p.likes) ? p.likes : []
        const liked = likes.includes(userId)
        return { ...p, likes: liked ? likes.filter(id => id !== userId) : [...likes, userId] }
      })
      writePosts(next)
      return next
    })
  }, [])

  const incrementView = useCallback((postId) => {
    setPosts(prev => {
      const next = prev.map(p =>
        p.id === postId ? { ...p, views: (p.views || 0) + 1 } : p
      )
      writePosts(next)
      return next
    })
  }, [])

  function addComment(postId, authorId, body) {
    const c = { id: `cm${Date.now()}`, postId, authorId, body, likes: [], createdAt: new Date().toISOString() }
    setComments(prev => { const next = [...prev, c]; writeComments(next); return next })
    return c
  }

  function deleteComment(commentId) {
    setComments(prev => { const next = prev.filter(c => c.id !== commentId); writeComments(next); return next })
  }

  return (
    <AppContext.Provider value={{
      categories,
      // posts: 원본 전체 공개 (PostDetailPage에서 실시간 참조용)
      // visiblePosts: 차단 제외 (목록에서 사용)
      allPosts: posts,
      posts: visiblePosts,
      comments,
      blockedIds,
      getPostsByCategory: (catId) => visiblePosts.filter(p => p.categoryId === catId),
      getPostsByAuthor:   (uid)   => visiblePosts.filter(p => p.authorId === uid),
      getCommentsByPostId:(postId)=> comments.filter(c => c.postId === postId),
      addPost, toggleLike, addComment, deleteComment, incrementView,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() { return useContext(AppContext) }
