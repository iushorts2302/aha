import { createContext, useContext, useState, useEffect } from 'react'
import { getBlockedIds, BLOCKED_KEY, setBlockedIds as saveBlockedIds } from '../store/blockedStore.js'

const ADMIN_API = 'https://admin-vert-psi.vercel.app'
async function fetchServerBlocked() {
  try {
    const res = await fetch(`${ADMIN_API}/api/blocked`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json()
    return new Set(data.blocked || [])
  } catch { return null }
}

const AppContext = createContext(null)

const MOCK_CATEGORIES = [
  { id: 'c1', name: 'DIY', icon: '🔧', description: '직접 만들고 고치는 모든 것' },
  { id: 'c2', name: '테크', icon: '💻', description: '최신 기술 트렌드와 리뷰' },
  { id: 'c3', name: '요리', icon: '🍳', description: '레시피와 맛집 정보' },
  { id: 'c4', name: '여행', icon: '✈️', description: '국내외 여행 정보와 경험담' },
  { id: 'c5', name: '운동', icon: '💪', description: '헬스, 러닝, 스포츠 정보' },
]

const MOCK_POSTS = []

const MOCK_COMMENTS = []

export function AppProvider({ children }) {
  const [categories] = useState(MOCK_CATEGORIES)
  const [posts, setPosts] = useState(MOCK_POSTS)
  const [comments, setComments] = useState(MOCK_COMMENTS)
  const [blockedIds, setBlockedIds] = useState(() => getBlockedIds())

  // 서버 차단 목록 폴링 (크로스 도메인 동기화 — 10초마다)
  useEffect(() => {
    async function syncBlocked() {
      const serverIds = await fetchServerBlocked()
      if (serverIds) {
        // 서버 + localStorage 합집합 적용
        const localIds = getBlockedIds()
        const merged = new Set([...serverIds, ...localIds])
        setBlockedIds(merged)
      }
    }
    syncBlocked()  // 마운트 즉시
    const t = setInterval(syncBlocked, 10000)  // 10초마다

    // 같은 도메인 탭 간 storage 이벤트도 유지
    function onStorage(e) {
      if (e.key === BLOCKED_KEY) setBlockedIds(getBlockedIds())
    }
    window.addEventListener('storage', onStorage)
    return () => { clearInterval(t); window.removeEventListener('storage', onStorage) }
  }, [])

  // 차단되지 않은 게시글만 노출
  const visiblePosts = posts.filter(p => !blockedIds.has(p.id))

  function getPostById(id) {
    if (blockedIds.has(id)) return null   // 차단된 게시글은 상세도 안 보임
    return posts.find(p => p.id === id)
  }
  function getCommentsByPostId(postId) { return comments.filter(c => c.postId === postId) }
  function getPostsByCategory(categoryId) { return visiblePosts.filter(p => p.categoryId === categoryId) }
  function getPostsByAuthor(authorId) { return visiblePosts.filter(p => p.authorId === authorId) }

  function addPost(post) {
    const newPost = {
      ...post,
      id: `p${Date.now()}`,
      likes: [],
      views: 0,
      type: 'user',
      createdAt: new Date().toISOString(),
    }
    setPosts(prev => [newPost, ...prev])
    return newPost
  }

  function toggleLike(postId, userId) {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const liked = p.likes.includes(userId)
      return { ...p, likes: liked ? p.likes.filter(id => id !== userId) : [...p.likes, userId] }
    }))
  }

  function addComment(postId, authorId, body) {
    const newComment = {
      id: `cm${Date.now()}`,
      postId, authorId, body,
      likes: [],
      createdAt: new Date().toISOString(),
    }
    setComments(prev => [...prev, newComment])
    return newComment
  }

  function deleteComment(commentId) {
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  function incrementView(postId) {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, views: p.views + 1 } : p))
  }

  return (
    <AppContext.Provider value={{
      categories, posts: visiblePosts, comments,
      getPostById, getCommentsByPostId, getPostsByCategory, getPostsByAuthor,
      addPost, toggleLike, addComment, deleteComment, incrementView,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() { return useContext(AppContext) }
