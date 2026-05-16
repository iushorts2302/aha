import { useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import HomePage from './pages/HomePage'
import BoardPage from './pages/BoardPage'
import PostDetailPage from './pages/PostDetailPage'
import WritePage from './pages/WritePage'
import ProfilePage from './pages/ProfilePage'
import BookmarksPage from './pages/BookmarksPage'
import CategoryPage from './pages/CategoryPage'
import { LoginPage, SignupPage } from './pages/AuthPages'

function parseRoute(route) {
  const [path, query] = route.split('?')
  const parts = path.split('/')
  const params = Object.fromEntries((query || '').split('&').filter(Boolean).map(s => s.split('=')))
  return { page: parts[0] || 'home', id: parts[1] || null, params }
}

function AppInner() {
  const [route, setRoute] = useState('home')
  const { page, id, params } = parseRoute(route)

  function navigate(to) { setRoute(to); window.scrollTo(0, 0) }

  // 현재 카테고리 ID (사이드바 하이라이트용)
  const currentCategory = page === 'category' ? id : null

  const renderPage = () => {
    switch (page) {
      case 'home':     return <HomePage navigate={navigate} />
      case 'board':    return <BoardPage navigate={navigate} searchQuery={params.q ? decodeURIComponent(params.q) : ''} />
      case 'post':     return <PostDetailPage postId={id} navigate={navigate} />
      case 'write':    return <WritePage navigate={navigate} />
      case 'profile':  return <ProfilePage userId={id} navigate={navigate} />
      case 'bookmarks':return <BookmarksPage navigate={navigate} />
      case 'category': return <CategoryPage categoryId={id} navigate={navigate} />
      case 'login':    return <LoginPage navigate={navigate} />
      case 'signup':   return <SignupPage navigate={navigate} />
      default:         return <HomePage navigate={navigate} />
    }
  }

  // 로그인/회원가입 페이지는 레이아웃 없이 렌더
  const isAuthPage = page === 'login' || page === 'signup'

  if (isAuthPage) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <Header currentPage={page} navigate={navigate} />
        <div style={{ padding: '0 24px' }}>{renderPage()}</div>
      </div>
    )
  }

  return (
    <div className="layout">
      <div className="layout-header">
        <Header currentPage={page} navigate={navigate} />
      </div>
      <div className="layout-sidebar">
        <Sidebar currentCategory={currentCategory} navigate={navigate} />
      </div>
      <main className="layout-main">
        {renderPage()}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppInner />
      </AppProvider>
    </AuthProvider>
  )
}
