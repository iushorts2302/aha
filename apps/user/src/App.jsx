import { useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import Header from './components/Header'
import MobileTabBar from './components/MobileTabBar'

import PostDetailPage from './pages/PostDetailPage'
import WritePage from './pages/WritePage'
import ProfilePage from './pages/ProfilePage'
import SearchPage from './pages/SearchPage'
import { BookmarksPage, CategoryPage } from './pages/MiscPages'
import { LoginPage, SignupPage } from './pages/AuthPages'
import {
  HomePage, TrendingPage, FeedPage, BoardPageNew,
  GalleryPage, CommunityPage, KnowledgePage, MarketPage,
  LivePage, AIHubPage, NotificationPage, MyPage,
} from './pages/SubPages'

function parseRoute(route) {
  const [path, query] = route.split('?')
  const parts = path.split('/')
  const params = {}
  ;(query || '').split('&').filter(Boolean).forEach(s => {
    const idx = s.indexOf('=')
    if (idx > -1) params[s.slice(0, idx)] = decodeURIComponent(s.slice(idx + 1))
    else params[s] = ''
  })
  return { page: parts[0] || 'home', id: parts[1] || null, params }
}

const AUTH_PAGES = new Set(['login', 'signup'])

function AppInner() {
  const [route, setRoute] = useState('home')
  const { page, id, params } = parseRoute(route)

  function navigate(to) { setRoute(to); window.scrollTo(0, 0) }

  const renderPage = () => {
    switch (page) {
      case 'home':         return <HomePage navigate={navigate} />
      case 'trending':     return <TrendingPage navigate={navigate} />
      case 'feed':         return <FeedPage navigate={navigate} />
      case 'board':        return <BoardPageNew navigate={navigate} searchQuery={params.q || ''} />
      case 'gallery':      return <GalleryPage navigate={navigate} />
      case 'community':    return <CommunityPage navigate={navigate} />
      case 'knowledge':    return <KnowledgePage navigate={navigate} />
      case 'market':       return <MarketPage navigate={navigate} />
      case 'live':         return <LivePage navigate={navigate} />
      case 'aihub':        return <AIHubPage navigate={navigate} />
      case 'notification': return <NotificationPage navigate={navigate} />
      case 'my':           return <MyPage navigate={navigate} />
      case 'search':       return <SearchPage query={params.q || ''} navigate={navigate} />
      case 'post':         return <PostDetailPage postId={id} navigate={navigate} />
      case 'write':        return <WritePage navigate={navigate} />
      case 'profile':      return <ProfilePage userId={id} navigate={navigate} />
      case 'bookmarks':    return <BookmarksPage navigate={navigate} />
      case 'category':     return <CategoryPage categoryId={id} navigate={navigate} />
      case 'login':        return <LoginPage navigate={navigate} />
      case 'signup':       return <SignupPage navigate={navigate} />
      default:             return <HomePage navigate={navigate} />
    }
  }

  if (AUTH_PAGES.has(page)) {
    return <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>{renderPage()}</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header currentPage={page} navigate={navigate} />
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '0 var(--space-6) var(--space-8)' }}>
        {renderPage()}
      </main>
      <MobileTabBar currentPage={page} navigate={navigate} />
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
