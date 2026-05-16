import { useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import Header from './components/Header'

import PostDetailPage from './pages/PostDetailPage'
import WritePage from './pages/WritePage'
import ProfilePage from './pages/ProfilePage'
import { BookmarksPage, CategoryPage } from './pages/MiscPages'
import { LoginPage, SignupPage } from './pages/AuthPages'

import HomePageNew from './pages/home/HomePageNew'
import TrendingPage from './pages/trending/TrendingPage'

import {
  FeedPage, BoardPageNew, GalleryPage, CommunityPage,
  KnowledgePage, MarketPage, LivePage, AIHubPage,
  NotificationPage, MyPage,
} from './pages/SubPages'

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
  const isAuthPage = page === 'login' || page === 'signup'

  const renderPage = () => {
    switch (page) {
      case 'home':         return <HomePageNew navigate={navigate} />
      case 'trending':     return <TrendingPage navigate={navigate} />
      case 'feed':         return <FeedPage navigate={navigate} />
      case 'board':        return <BoardPageNew navigate={navigate} searchQuery={params.q ? decodeURIComponent(params.q) : ''} />
      case 'gallery':      return <GalleryPage />
      case 'community':    return <CommunityPage />
      case 'knowledge':    return <KnowledgePage />
      case 'market':       return <MarketPage />
      case 'live':         return <LivePage />
      case 'aihub':        return <AIHubPage />
      case 'notification': return <NotificationPage navigate={navigate} />
      case 'my':           return <MyPage navigate={navigate} />
      case 'post':         return <PostDetailPage postId={id} navigate={navigate} />
      case 'write':        return <WritePage navigate={navigate} />
      case 'profile':      return <ProfilePage userId={id} navigate={navigate} />
      case 'bookmarks':    return <BookmarksPage navigate={navigate} />
      case 'category':     return <CategoryPage categoryId={id} navigate={navigate} />
      case 'login':        return <LoginPage navigate={navigate} />
      case 'signup':       return <SignupPage navigate={navigate} />
      default:             return <HomePageNew navigate={navigate} />
    }
  }

  if (isAuthPage) return <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>{renderPage()}</div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header currentPage={page} navigate={navigate} />
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '0 var(--space-6)' }}>
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
