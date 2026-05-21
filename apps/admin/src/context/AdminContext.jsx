import { createContext, useContext, useState, useEffect } from 'react'
import { blockPost, unblockPost, getBlockedIds } from '../store/blockedStore.js'

const ADMIN_API    = 'https://admin-vert-psi.vercel.app'
const LS_ADMIN_KEY = 'aha_admin_session'

async function api(path, options = {}) {
  // /xxx  → /api/v1?resource=xxx  (통합 라우터)
  // /xxx?a=b → /api/v1?resource=xxx&a=b
  let url
  if (path.startsWith('/v1') || path.startsWith('/auth') ||
      path.startsWith('/config') || path.startsWith('/blocked') ||
      path.startsWith('/data') || path.startsWith('/init') ||
      path.startsWith('/setup') || path.startsWith('/cron')) {
    url = `${ADMIN_API}/api${path}`
  } else {
    // /categories → /v1?resource=categories
    // /posts?status=all&limit=50 → /v1?resource=posts&status=all&limit=50
    const [base, qs] = path.replace(/^\//, '').split('?')
    url = `${ADMIN_API}/api/v1?resource=${base}${qs ? '&' + qs : ''}`
  }
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

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

// DB 연결 실패 시 사용할 기본 데이터
const DEFAULT_CATEGORIES = [
  { seq_no: 1, category_id: 'c1', name: 'DIY',  icon: '🔧', description: '직접 만들고 고치는 모든 것' },
  { seq_no: 2, category_id: 'c2', name: '테크', icon: '💻', description: '최신 기술 트렌드와 리뷰' },
]
const DEFAULT_TOPICS  = []
const DEFAULT_SOURCES = []
const DEFAULT_USERS   = [
  { id: 'u1', seq_no: 1, email: 'demo@aha.com', nickname: '김민준', role: 'user', status: 'active', postCount: 0, createdAt: '2024-01-15' },
]

export function AdminProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_ADMIN_KEY)) } catch { return null }
  })
  const [dbAvailable, setDbAvailable] = useState(false)
  const [categories, setCategories]   = useState(DEFAULT_CATEGORIES)
  const [topics, setTopics]           = useState(DEFAULT_TOPICS)
  const [sources, setSources]         = useState(DEFAULT_SOURCES)
  const [users, setUsers]             = useState(DEFAULT_USERS)
  const [posts, setPosts]             = useState(() => {
    const blocked = getBlockedIds()
    return [].map(p => blocked.has(p.id) ? { ...p, status: 'hidden' } : p)
  })
  const [comments, setComments]       = useState([])
  const [stats, setStats] = useState({
    totalUsers: 0, activeUsers: 0, totalPosts: 0, totalViews: 0, activeSources: 0
  })

  // DB 데이터 로드
  async function loadAll() {
    try {
      const [catData, topicData, srcData, userData, postData, cmtData] = await Promise.all([
        api('/categories'),
        api('/topics').catch(() => ({ topics: [] })),
        api('/sources').catch(() => ({ sources: [] })),
        api('/users').catch(() => ({ users: [] })),
        api('/posts?limit=50').catch(() => ({ posts: [] })),
        api('/comments?limit=100&status=all').catch(() => ({ comments: [] })),
      ])
      const cats = catData.categories || []
      setCategories(cats.map(c => ({ ...c, id: String(c.seq_no || c.category_id), name: c.label })))
      // topics: /v1?resource=topics 결과 사용
      const allTopics = topicData.topics || []
      setTopics(allTopics.map(t => ({
        ...t, id: String(t.seq_no), categoryId: String(t.category_seq_no)
      })))
      setSources((srcData.sources || []).map(s => ({
        ...s, id: String(s.seq_no), active: s.active_yn === 'Y'
      })))
      const rawUsers = userData.users || []
      setUsers(rawUsers.map(u => ({
        ...u, id: String(u.seq_no), status: u.status || 'active',
        postCount: u.post_count || 0, createdAt: u.created_at || ''
      })))
      const rawPosts = postData.posts || []
      const blockedIds = getBlockedIds()
      setPosts(rawPosts.map(p => ({
        ...p, id: String(p.seq_no),
        authorNickname: p.author_nickname || '',
        status: blockedIds.has(String(p.seq_no)) ? 'hidden' : (p.status || 'published'),
      })))
      // 통계
      const activeUsers = rawUsers.filter(u => (u.status||'active') === 'active').length
      const totalViews  = rawPosts.reduce((s, p) => s + (p.view_count || 0), 0)
      const activeSrcs  = (srcData.sources||[]).filter(s => s.active_yn !== 'N').length
      const totalCrawled = 0  // crawl_items는 별도 API로 조회
      setStats({ totalUsers: rawUsers.length, activeUsers, totalPosts: rawPosts.length, totalViews, activeSources: activeSrcs })
      // 댓글 매핑
      const rawComments = cmtData.comments || []
      setComments(rawComments.map(c => ({
        ...c, id: String(c.seq_no),
        postId: String(c.post_seq_no),
        authorId: String(c.author_seq_no),
        authorNickname: c.author_nickname || '',
        postTitle: c.post_title || '',
        createdAt: c.created_at || '',
      })))
      setDbAvailable(true)
    } catch (e) {
      console.warn('DB 로드 실패, 기본 데이터 사용:', e)
      setDbAvailable(false)
    }
  }

  useEffect(() => {
    if (!admin) return
    // 1. 관리자 데이터 로드
    loadAll()
    // 2. /api/init 반복 호출 — 3개씩 순차 크롤링
    let round = 0
    async function triggerInit() {
      try {
        const r = await fetch('https://admin-vert-psi.vercel.app/api/init',
          { signal: AbortSignal.timeout(28000) })
        if (!r.ok) return
        const d = await r.json()
        if (d.topics_crawled > 0) loadAll()   // 크롤링 있으면 즉시 갱신
        if (d.topics_needed > 0 && round < 7) {
          round++
          setTimeout(triggerInit, 2000)
        }
      } catch {}
    }
    triggerInit()
  }, [admin])

  // ── 로그인 ───────────────────────────────────────────
  async function login(email, password) {
    // DB 관리자 인증 시도
    try {
      await api('/auth', { method: 'POST', body: JSON.stringify({ email, password, type: 'admin' }) })
      const adminData = { email, name: '관리자', role: 'admin' }
      setAdmin(adminData)
      localStorage.setItem(LS_ADMIN_KEY, JSON.stringify(adminData))
      return
    } catch {}
    // Mock 폴백
    if (email !== ADMIN_CREDENTIALS.email || password !== ADMIN_CREDENTIALS.password)
      throw new Error('관리자 계정 정보가 올바르지 않습니다.')
    const adminData = { email, name: '관리자', role: 'admin' }
    setAdmin(adminData)
    localStorage.setItem(LS_ADMIN_KEY, JSON.stringify(adminData))
  }
  function logout() { setAdmin(null); localStorage.removeItem(LS_ADMIN_KEY) }

  // ── 카테고리 CRUD ────────────────────────────────────
  async function addCategory(cat) {
    if (dbAvailable) {
      try {
        const res = await api('/categories', { method: 'POST', body: JSON.stringify({
          category_id: cat.name.toLowerCase().replace(/\s/g,'_'), label: cat.name,
          icon: cat.icon, sort_order: categories.length
        }) })
        await loadAll(); return
      } catch {}
    }
    setCategories(p => [...p, { ...cat, id: `c${Date.now()}`, seq_no: Date.now() }])
  }
  async function updateCategory(id, data) {
    if (dbAvailable) {
      try { await api('/categories', { method: 'PATCH', body: JSON.stringify({ id, label: data.name, icon: data.icon }) }); await loadAll(); return } catch {}
    }
    setCategories(p => p.map(c => c.id === id ? { ...c, ...data } : c))
  }
  async function deleteCategory(id) {
    if (dbAvailable) {
      try { await api('/categories', { method: 'DELETE', body: JSON.stringify({ id }) }); await loadAll(); return } catch {}
    }
    setCategories(p => p.filter(c => c.id !== id))
  }

  // ── 주제 CRUD ────────────────────────────────────────
  async function addTopic(t) {
    if (dbAvailable) {
      try {
        await api('/topics', { method: 'POST', body: JSON.stringify({
          topic_key: `${t.categoryId}.${t.name.toLowerCase().replace(/\s/g,'_')}`,
          category_id: t.categoryId, label: t.name,
        }) }); await loadAll(); return
      } catch {}
    }
    setTopics(p => [...p, { ...t, id: `t${Date.now()}` }])
  }
  async function updateTopic(id, data) {
    if (dbAvailable) {
      try { await api('/topics', { method: 'PATCH', body: JSON.stringify({ id, label: data.name, active_yn: data.active ? 'Y' : 'N' }) }); await loadAll(); return } catch {}
    }
    setTopics(p => p.map(t => t.id === id ? { ...t, ...data } : t))
  }
  async function deleteTopic(id) {
    if (dbAvailable) {
      try { await api('/topics', { method: 'DELETE', body: JSON.stringify({ id }) }); await loadAll(); return } catch {}
    }
    setTopics(p => p.filter(t => t.id !== id))
  }

  // ── 소스 CRUD ────────────────────────────────────────
  async function addSource(s) {
    if (dbAvailable) {
      try {
        await api('/sources', { method: 'POST', body: JSON.stringify({
          source_id: `src_${Date.now()}`, label: s.label,
          source_type: 'github_org', source_value: s.url || s.label,
          topic_keys: []
        }) }); await loadAll(); return
      } catch {}
    }
    setSources(p => [...p, { ...s, id: `s${Date.now()}`, active: true }])
  }
  async function updateSource(id, data) {
    if (dbAvailable) {
      try { await api('/sources', { method: 'PATCH', body: JSON.stringify({ id, ...data }) }); await loadAll(); return } catch {}
    }
    setSources(p => p.map(s => s.id === id ? { ...s, ...data } : s))
  }
  async function deleteSource(id) {
    if (dbAvailable) {
      try { await api('/sources', { method: 'DELETE', body: JSON.stringify({ id }) }); await loadAll(); return } catch {}
    }
    setSources(p => p.filter(s => s.id !== id))
  }
  async function toggleSource(id) {
    const src = sources.find(s => s.id === id)
    if (!src) return
    if (dbAvailable) {
      try { await api('/sources', { method: 'PATCH', body: JSON.stringify({ id, active_yn: src.active ? 'N' : 'Y' }) }); await loadAll(); return } catch {}
    }
    setSources(p => p.map(s => s.id === id ? { ...s, active: !s.active } : s))
  }

  // ── 사용자 관리 ──────────────────────────────────────
  async function toggleUserStatus(id) {
    const user = users.find(u => u.id === id)
    if (!user) return
    const newStatus = user.status === 'active' ? 'suspended' : 'active'
    if (dbAvailable) {
      try { await api('/users', { method: 'PATCH', body: JSON.stringify({ id, status: newStatus }) }); await loadAll(); return } catch {}
    }
    setUsers(p => p.map(u => u.id === id ? { ...u, status: newStatus } : u))
  }

  // ── 게시글 관리 ──────────────────────────────────────
  async function hidePost(id) {
    if (dbAvailable) {
      try { await api('/posts', { method: 'PATCH', body: JSON.stringify({ id, status: 'hidden' }) }) } catch {}
    }
    blockPost(id); await syncBlock(id, 'block')
    setPosts(p => p.map(post => post.id === id ? { ...post, status: 'hidden' } : post))
  }
  async function deletePost(id) {
    if (dbAvailable) {
      try { await api('/posts', { method: 'DELETE', body: JSON.stringify({ id }) }) } catch {}
    }
    blockPost(id); await syncBlock(id, 'block')
    setPosts(p => p.filter(post => post.id !== id))
  }
  async function restorePost(id) {
    if (dbAvailable) {
      try { await api('/posts', { method: 'PATCH', body: JSON.stringify({ id, status: 'published' }) }) } catch {}
    }
    unblockPost(id); await syncBlock(id, 'unblock')
    setPosts(p => p.map(post => post.id === id ? { ...post, status: 'published' } : post))
  }

  // ── 댓글 관리 ────────────────────────────────────────
  async function deleteComment(id) {
    if (dbAvailable) {
      try { await api('/comments', { method: 'DELETE', body: JSON.stringify({ id }) }) } catch {}
    }
    setComments(cs => cs.map(c => c.id === id ? { ...c, status: 'deleted' } : c))
  }
  async function refreshComments() {
    if (!dbAvailable) return
    try {
      const d = await api('/comments?limit=100&status=all')
      setComments((d.comments || []).map(c => ({
        ...c, id: String(c.seq_no),
        postId: String(c.post_seq_no),
        authorId: String(c.author_seq_no),
        authorNickname: c.author_nickname || '',
        postTitle: c.post_title || '',
        createdAt: c.created_at || '',
      })))
    } catch {}
  }

  return (
    <AdminContext.Provider value={{
      admin, dbAvailable, stats, categories, topics, sources, users, posts, comments,
      login, logout, loadAll,
      addCategory, updateCategory, deleteCategory,
      addTopic, updateTopic, deleteTopic,
      addSource, updateSource, deleteSource, toggleSource,
      toggleUserStatus, hidePost, deletePost, restorePost,
      deleteComment, refreshComments,
    }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() { return useContext(AdminContext) }
