import { createContext, useContext, useState } from 'react'
import { authAPI, userAPI } from '../api/client.js'

const AuthContext = createContext(null)
const LS_KEY = 'aha_user_v2'

function readUser() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) } catch { return null }
}

// localStorage 기반 Mock 사용자 (DB 연결 실패 시 폴백)
const MOCK_USERS = [
  {
    seq_no: 1, id: 'u1', email: 'demo@aha.com', password: 'demo1234',
    nickname: '김민준', bio: 'DIY & 테크 enthusiast', avatar: '',
    expertise: ['DIY', '전자공학'], following: [], followers: [], bookmarks: [], role: 'user',
  },
  {
    seq_no: 2, id: 'u2', email: 'jane@aha.com', password: 'jane1234',
    nickname: '이지은', bio: '요리 & 라이프스타일 크리에이터', avatar: '',
    expertise: ['요리', '라이프스타일'], following: [], followers: [], bookmarks: [], role: 'user',
  },
]

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => readUser())
  const [users, setUsers] = useState(MOCK_USERS)

  function _persist(user) {
    setCurrentUser(user)
    if (user) localStorage.setItem(LS_KEY, JSON.stringify(user))
    else      localStorage.removeItem(LS_KEY)
  }

  // ── 로그인 (DB 우선, 실패 시 Mock) ─────────────────
  async function login(email, password) {
    try {
      const data = await authAPI.login(email, password)
      // DB 응답 → 통일 형식으로 변환
      const user = {
        seq_no: data.seq_no, id: String(data.seq_no),
        email: data.email, nickname: data.nickname,
        bio: data.bio || '', avatar: data.avatar_url || '',
        role: data.role || 'user',
        expertise: data.expertise || [],
        bookmarks: (data.bookmarks || []).map(String),
        following: (data.following || []).map(String),
        followers: [],
      }
      _persist(user)
      return user
    } catch (e) {
      // DB 실패 → Mock 폴백
      const user = users.find(u => u.email === email && u.password === password)
      if (!user) throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
      _persist(user); return user
    }
  }

  // ── 회원가입 (DB 우선, 실패 시 Mock) ─────────────
  async function signup(email, password, nickname, bio = '', expertise = []) {
    try {
      const data = await authAPI.signup(email, password, nickname, bio, expertise)
      const user = {
        seq_no: data.seq_no, id: String(data.seq_no),
        email, nickname, bio, avatar: '', role: 'user',
        expertise, bookmarks: [], following: [], followers: [],
      }
      _persist(user); return user
    } catch (e) {
      // Mock 폴백
      if (users.find(u => u.email === email)) throw new Error('이미 사용 중인 이메일입니다.')
      if (password.length < 6) throw new Error('비밀번호는 6자 이상이어야 합니다.')
      const user = {
        seq_no: Date.now(), id: `u${Date.now()}`,
        email, password, nickname, bio, avatar: '', role: 'user',
        expertise, bookmarks: [], following: [], followers: [],
      }
      setUsers(prev => [...prev, user])
      _persist(user); return user
    }
  }

  function logout() { _persist(null) }

  function getUserById(id) {
    if (!id) return null
    return users.find(u => String(u.seq_no) === String(id) || u.id === String(id)) || null
  }

  // ── 북마크 토글 ────────────────────────────────────
  async function toggleBookmark(postId) {
    if (!currentUser) return
    const pid = String(postId)
    const bookmarks = currentUser.bookmarks || []
    const has = bookmarks.includes(pid)
    const next = has ? bookmarks.filter(b => b !== pid) : [...bookmarks, pid]
    const updated = { ...currentUser, bookmarks: next }
    _persist(updated)
    try {
      await userAPI.toggleBookmark(currentUser.seq_no || currentUser.id, postId)
    } catch {}
  }

  // ── 팔로우 토글 ────────────────────────────────────
  async function toggleFollow(targetId) {
    if (!currentUser) return
    const tid = String(targetId)
    const following = currentUser.following || []
    const has = following.includes(tid)
    const next = has ? following.filter(f => f !== tid) : [...following, tid]
    _persist({ ...currentUser, following: next })
    try {
      await userAPI.toggleFollow(currentUser.seq_no || currentUser.id, targetId)
    } catch {}
  }

  return (
    <AuthContext.Provider value={{
      currentUser, users, login, signup, logout,
      getUserById, toggleBookmark, toggleFollow,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
