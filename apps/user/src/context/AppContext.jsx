import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getBlockedIds, BLOCKED_KEY, setBlockedIds as saveBlockedIds } from '../store/blockedStore.js'

const ADMIN_API    = 'https://admin-vert-psi.vercel.app'
const POSTS_KEY    = 'aha_posts_v1'
const COMMENTS_KEY = 'aha_comments_v1'

function readPosts()    { try { return JSON.parse(localStorage.getItem(POSTS_KEY)    || '[]') } catch { return [] } }
function readComments() { try { return JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]') } catch { return [] } }
function writePosts(p)  { try { localStorage.setItem(POSTS_KEY,    JSON.stringify(p)) } catch {} }
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
  const [posts,    setPosts]    = useState(() => readPosts())
  const [comments, setComments] = useState(() => readComments())
  const [blockedIds, setBlockedIds] = useState(() => getBlockedIds())

  // posts/comments 변경 → localStorage 즉시 동기화
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
    function onStorage(e) {
      if (e.key === BLOCKED_KEY) setBlockedIds(getBlockedIds())
    }
    window.addEventListener('storage', onStorage)
    return () => { clearInterval(t); window.removeEventListener('storage', onStorage) }
  }, [])

  // ── 조회 함수 (원본 posts 참조, 차단 필터 적용) ──────
  const visiblePosts = posts.filter(p => !blockedIds.has(p.id))

  function getPostById(id) {
    if (blockedIds.has(id)) return null
    // visiblePosts 아닌 원본 posts에서 찾아야 삭제 게시글도 null 처리 가능
    return posts.find(p => p.id === id && !blockedIds.has(p.id)) || null
  }
  function getCommentsByPostId(postId) {
    return comments.filter(c => c.postId === postId)
  }
  function getPostsByCategory(categoryId) {
    return visiblePosts.filter(p => p.categoryId === categoryId)
  }
  function getPostsByAuthor(authorId) {
    return visiblePosts.filter(p => p.authorId === authorId)
  }

  // ── 쓰기 함수 ────────────────────────────────────────

  function addPost(post) {
    const newPost = {
      ...post,
      id:        `p${Date.now()}`,
      likes:     [],
      views:     0,
      type:      'user',
      createdAt: new Date().toISOString(),
    }
    setPosts(prev => [newPost, ...prev])
    return newPost
  }

  // 좋아요 토글 — setState 함수형 업데이트로 최신 상태 보장
  const toggleLike = useCallback((postId, userId) => {
    setPosts(prev => {
      const next = prev.map(p => {
        if (p.id !== postId) return p
        const liked = Array.isArray(p.likes) && p.likes.includes(userId)
        return { ...p, likes: liked ? p.likes.filter(id => id !== userId) : [...(p.likes || []), userId] }
      })
      writePosts(next)   // useEffect 의존 없이 즉시 반영
      return next
    })
  }, [])

  // 조회수 — 함수형 업데이트
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
    const newComment = {
      id:        `cm${Date.now()}`,
      postId, authorId, body,
      likes:     [],
      createdAt: new Date().toISOString(),
    }
    setComments(prev => {
      const next = [...prev, newComment]
      writeComments(next)
      return next
    })
    return newComment
  }

  function deleteComment(commentId) {
    setComments(prev => {
      const next = prev.filter(c => c.id !== commentId)
      writeComments(next)
      return next
    })
  }

  return (
    <AppContext.Provider value={{
      categories,
      posts: visiblePosts,
      comments,
      getPostById,
      getCommentsByPostId,
      getPostsByCategory,
      getPostsByAuthor,
      addPost,
      toggleLike,
      addComment,
      deleteComment,
      incrementView,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() { return useContext(AppContext) }
