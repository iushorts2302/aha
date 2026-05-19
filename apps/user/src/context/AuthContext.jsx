import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI, userAPI } from '../api/client.js'

const AuthContext = createContext(null)
const LS_USER_KEY  = 'aha_user_v2'   // 로그인 유저 세션
const LS_USERS_KEY = 'aha_users_cache' // 유저 목록 캐시

function readLS(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
function writeLS(key, val) {
  try {
    if (val == null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(val))
  } catch {}
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
  // ── 초기화: localStorage에서 세션 복원 ───────────────
  const [currentUser, setCurrentUser] = useState(() => readLS(LS_USER_KEY))

  // users 캐시: localStorage → MOCK_USERS 순으로 초기화
  const [users, setUsers] = useState(() => {
    const cached = readLS(LS_USERS_KEY, [])
    // MOCK_USERS와 합치되 중복 제거 (cached 우선)
    const merged = [...cached]
    MOCK_USERS.forEach(m => {
      if (!merged.find(u => u.email === m.email)) merged.push(m)
    })
    return merged
  })

  // ── currentUser가 users에 없으면 추가 (새로고침 후 복원) ─
  useEffect(() => {
    if (!currentUser) return
    setUsers(prev => {
      const exists = prev.find(u =>
        String(u.seq_no) === String(currentUser.seq_no) || u.email === currentUser.email
      )
      if (exists) return prev
      const next = [...prev, currentUser]
      writeLS(LS_USERS_KEY, next.filter(u => !u.password)) // 비밀번호 제외 저장
      return next
    })
  }, [currentUser])

  // ── 세션 영속 헬퍼 ──────────────────────────────────
  function _persist(user) {
    setCurrentUser(user)
    writeLS(LS_USER_KEY, user)
    if (user) {
      // users 캐시에도 반영
      setUsers(prev => {
        const next = prev.find(u =>
          String(u.seq_no) === String(user.seq_no) || u.email === user.email
        )
          ? prev.map(u => (u.email === user.email ? { ...u, ...user } : u))
          : [...prev, user]
        writeLS(LS_USERS_KEY, next.filter(u => !u.password))
        return next
      })
    }
  }

  // ── 로그인 (DB 우선, 실패 시 Mock) ──────────────────
  async function login(email, password) {
    try {
      const data = await authAPI.login(email, password)
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
    } catch {
      // DB 실패 → Mock 폴백
      const user = users.find(u => u.email === email && u.password === password)
      if (!user) throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
      _persist(user)
      return user
    }
  }

  // ── 회원가입 (DB 우선, 실패 시 Mock) ────────────────
  async function signup(email, password, nickname, bio = '', expertise = []) {
    try {
      const data = await authAPI.signup(email, password, nickname, bio, expertise)
      const user = {
        seq_no: data.seq_no, id: String(data.seq_no),
        email, nickname, bio, avatar: '', role: 'user',
        expertise, bookmarks: [], following: [], followers: [],
      }
      _persist(user)
      return user
    } catch {
      if (users.find(u => u.email === email)) throw new Error('이미 사용 중인 이메일입니다.')
      if (password.length < 6) throw new Error('비밀번호는 6자 이상이어야 합니다.')
      const user = {
        seq_no: Date.now(), id: `u${Date.now()}`,
        email, password, nickname, bio, avatar: '', role: 'user',
        expertise, bookmarks: [], following: [], followers: [],
      }
      _persist(user)
      return user
    }
  }

  function logout() { _persist(null) }

  // ── 유저 조회: users 캐시 → currentUser → null ──────
  function getUserById(id) {
    if (!id) return null
    const sid = String(id)
    // users 캐시에서 먼저 검색
    const found = users.find(u =>
      String(u.seq_no) === sid || u.id === sid
    )
    if (found) return found
    // currentUser와 일치하면 반환
    if (currentUser && (String(currentUser.seq_no) === sid || currentUser.id === sid)) {
      return currentUser
    }
    return null
  }

  // ── 북마크 토글 ─────────────────────────────────────
  async function toggleBookmark(postId) {
    if (!currentUser) return
    const pid = String(postId)
    const bookmarks = currentUser.bookmarks || []
    const has = bookmarks.includes(pid)
    const next = has ? bookmarks.filter(b => b !== pid) : [...bookmarks, pid]
    _persist({ ...currentUser, bookmarks: next })
    try {
      await userAPI.toggleBookmark(currentUser.seq_no || currentUser.id, postId)
    } catch {}
  }

  // ── 팔로우 토글 ─────────────────────────────────────
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
