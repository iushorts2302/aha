import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

// Mock 사용자 데이터
const MOCK_USERS = [
  {
    id: 'u1',
    email: 'demo@aha.com',
    password: 'demo1234',
    nickname: '김민준',
    bio: 'DIY & 테크 enthusiast',
    avatar: '',
    expertise: ['DIY', '전자공학'],
    following: ['u2'],
    followers: ['u2'],
    bookmarks: ['p2', 'p3'],
    role: 'user',
    createdAt: '2024-01-15',
  },
  {
    id: 'u2',
    email: 'jane@aha.com',
    password: 'jane1234',
    nickname: '이지은',
    bio: '요리 & 라이프스타일 크리에이터',
    avatar: '',
    expertise: ['요리', '인테리어'],
    following: ['u1'],
    followers: ['u1'],
    bookmarks: ['p1'],
    role: 'user',
    createdAt: '2024-02-01',
  },
]

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [users, setUsers] = useState(MOCK_USERS)

  function login(email, password) {
    const user = users.find(u => u.email === email && u.password === password)
    if (!user) throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
    setCurrentUser(user)
    return user
  }

  function signup({ email, password, nickname, expertise }) {
    if (users.find(u => u.email === email)) throw new Error('이미 사용 중인 이메일입니다.')
    const newUser = {
      id: `u${Date.now()}`,
      email, password, nickname,
      bio: '',
      avatar: '',
      expertise: expertise || [],
      following: [],
      followers: [],
      bookmarks: [],
      role: 'user',
      createdAt: new Date().toISOString().slice(0, 10),
    }
    setUsers(prev => [...prev, newUser])
    setCurrentUser(newUser)
    return newUser
  }

  function logout() { setCurrentUser(null) }

  function toggleBookmark(postId) {
    if (!currentUser) return
    setCurrentUser(prev => {
      const has = prev.bookmarks.includes(postId)
      const bookmarks = has
        ? prev.bookmarks.filter(id => id !== postId)
        : [...prev.bookmarks, postId]
      const updated = { ...prev, bookmarks }
      setUsers(us => us.map(u => u.id === prev.id ? updated : u))
      return updated
    })
  }

  function toggleFollow(targetId) {
    if (!currentUser || currentUser.id === targetId) return
    setCurrentUser(prev => {
      const isFollowing = prev.following.includes(targetId)
      const following = isFollowing
        ? prev.following.filter(id => id !== targetId)
        : [...prev.following, targetId]
      const updated = { ...prev, following }
      setUsers(us => us.map(u => {
        if (u.id === prev.id) return updated
        if (u.id === targetId) {
          const followers = isFollowing
            ? u.followers.filter(id => id !== prev.id)
            : [...u.followers, prev.id]
          return { ...u, followers }
        }
        return u
      }))
      return updated
    })
  }

  function getUserById(id) { return users.find(u => u.id === id) }

  return (
    <AuthContext.Provider value={{
      currentUser, users,
      login, signup, logout,
      toggleBookmark, toggleFollow,
      getUserById,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
