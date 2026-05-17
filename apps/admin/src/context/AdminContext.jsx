import { createContext, useContext, useState } from 'react'
import { blockPost, unblockPost, getBlockedIds } from '../store/blockedStore.js'

const ADMIN_API = 'https://admin-vert-psi.vercel.app'
async function syncBlock(id, action) {
  try {
    await fetch(`${ADMIN_API}/api/blocked`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
  } catch {}
}

const AdminContext = createContext(null)

const ADMIN_CREDENTIALS = { email: 'admin@aha.com', password: 'admin1234' }

const INIT_CATEGORIES = [
  { id: 'c1', name: 'DIY',  icon: '🔧', description: '직접 만들고 고치는 모든 것' },
  { id: 'c2', name: '테크', icon: '💻', description: '최신 기술 트렌드와 리뷰' },
  { id: 'c3', name: '요리', icon: '🍳', description: '레시피와 맛집 정보' },
  { id: 'c4', name: '여행', icon: '✈️', description: '국내외 여행 정보와 경험담' },
  { id: 'c5', name: '운동', icon: '💪', description: '헬스, 러닝, 스포츠 정보' },
]

const INIT_TOPICS = [
  { id: 't1', categoryId: 'c1', name: '목공',     description: '나무를 이용한 DIY' },
  { id: 't2', categoryId: 'c1', name: '전기/전자', description: '전기 및 전자 DIY' },
  { id: 't3', categoryId: 'c2', name: '모바일',   description: '스마트폰 관련' },
  { id: 't4', categoryId: 'c2', name: '개발',     description: '소프트웨어 개발' },
  { id: 't5', categoryId: 'c3', name: '한식',     description: '한국 요리' },
]

const INIT_SOURCES = [
  { id: 's1', categoryId: 'c2', label: 'Hacker News',  url: 'https://news.ycombinator.com/rss',    active: true },
  { id: 's2', categoryId: 'c2', label: 'Dev.to',       url: 'https://dev.to/feed',                  active: true },
  { id: 's3', categoryId: 'c1', label: 'Instructables', url: 'https://www.instructables.com/feed/', active: false },
]

const INIT_USERS = [
  { id: 'u1', email: 'demo@aha.com', nickname: '김민준', role: 'user', status: 'active', postCount: 2, createdAt: '2024-01-15' },
  { id: 'u2', email: 'jane@aha.com', nickname: '이지은', role: 'user', status: 'active', postCount: 3, createdAt: '2024-02-01' },
]

const INIT_POSTS = []

export function AdminProvider({ children }) {
  const [admin, setAdmin]           = useState(null)
  const [categories, setCategories] = useState(INIT_CATEGORIES)
  const [topics, setTopics]         = useState(INIT_TOPICS)
  const [sources, setSources]       = useState(INIT_SOURCES)
  const [users, setUsers]           = useState(INIT_USERS)
  const [posts, setPosts]           = useState(() => {
    // 초기 로드 시 이미 차단된 게시글은 hidden 상태로 표시
    const blocked = getBlockedIds()
    return INIT_POSTS.map(p => blocked.has(p.id) ? { ...p, status: 'hidden' } : p)
  })

  function login(email, password) {
    if (email !== ADMIN_CREDENTIALS.email || password !== ADMIN_CREDENTIALS.password)
      throw new Error('관리자 계정 정보가 올바르지 않습니다.')
    setAdmin({ email, name: '관리자' })
  }
  function logout() { setAdmin(null) }

  // Categories CRUD
  function addCategory(cat)          { setCategories(p => [...p, { ...cat, id: `c${Date.now()}` }]) }
  function updateCategory(id, data)  { setCategories(p => p.map(c => c.id === id ? { ...c, ...data } : c)) }
  function deleteCategory(id)        { setCategories(p => p.filter(c => c.id !== id)) }

  // Topics CRUD
  function addTopic(t)               { setTopics(p => [...p, { ...t, id: `t${Date.now()}` }]) }
  function updateTopic(id, data)     { setTopics(p => p.map(t => t.id === id ? { ...t, ...data } : t)) }
  function deleteTopic(id)           { setTopics(p => p.filter(t => t.id !== id)) }

  // Sources CRUD
  function addSource(s)              { setSources(p => [...p, { ...s, id: `s${Date.now()}` }]) }
  function updateSource(id, data)    { setSources(p => p.map(s => s.id === id ? { ...s, ...data } : s)) }
  function deleteSource(id)          { setSources(p => p.filter(s => s.id !== id)) }
  function toggleSource(id)          { setSources(p => p.map(s => s.id === id ? { ...s, active: !s.active } : s)) }

  // Users
  function toggleUserStatus(id)      { setUsers(p => p.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u)) }

  // Posts — 삭제/숨김 시 localStorage 차단 목록에 등록
  function hidePost(id) {
    blockPost(id)
    syncBlock(id, 'block')  // ← 서버 API 동기화 (크로스 도메인)
    setPosts(p => p.map(post => post.id === id ? { ...post, status: 'hidden' } : post))
  }

  function deletePost(id) {
    blockPost(id)
    syncBlock(id, 'block')  // ← 서버 API 동기화 (크로스 도메인)
    setPosts(p => p.filter(post => post.id !== id))
  }

  function restorePost(id) {
    unblockPost(id)
    syncBlock(id, 'unblock')  // ← 서버 API 동기화
    setPosts(p => p.map(post => post.id === id ? { ...post, status: 'published' } : post))
  }

  const stats = {
    totalUsers:    users.length,
    activeUsers:   users.filter(u => u.status === 'active').length,
    totalPosts:    posts.length,
    hiddenPosts:   posts.filter(p => p.status === 'hidden').length,
    totalViews:    posts.reduce((sum, p) => sum + p.views, 0),
    activeSources: sources.filter(s => s.active).length,
  }

  return (
    <AdminContext.Provider value={{
      admin, login, logout,
      categories, addCategory, updateCategory, deleteCategory,
      topics, addTopic, updateTopic, deleteTopic,
      sources, addSource, updateSource, deleteSource, toggleSource,
      users, toggleUserStatus,
      posts, hidePost, deletePost, restorePost,
      stats,
    }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() { return useContext(AdminContext) }
