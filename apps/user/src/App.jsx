import { useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import Header from './components/Header'
import MobileTabBar from './components/MobileTabBar'

import PostDetailPage, { incNavCount } from './pages/PostDetailPage'
import CrawlDetailPage from './pages/CrawlDetailPage'
import WritePage from './pages/WritePage'
import ProfilePage from './pages/ProfilePage'
import SearchPage from './pages/SearchPage'
import { BookmarksPage, CategoryPage } from './pages/MiscPages'
import { LoginPage, SignupPage } from './pages/AuthPages'

import {
  HomePage, TrendingPage, FeedPage, BoardPageNew,
  AIPage, StartupPage, DevPage, OSSPage, DesignPage,
  ITNewsPage, GalleryPage, CommunityPage, KnowledgePage,
  MarketPage, GamePage, FinancePage, JobPage, LearnPage,
  ResearchPage, HumorPage, VideoPage, LivePage, AIHubPage,
  NotificationPage, MyPage,
} from './pages/SubPages'

const NAV_MAP = {
  home:         HomePage,
  trending:     TrendingPage,
  feed:         FeedPage,
  board:        BoardPageNew,
  ai:           AIPage,
  startup:      StartupPage,
  dev:          DevPage,
  oss:          OSSPage,
  design:       DesignPage,
  itnews:       ITNewsPage,
  gallery:      GalleryPage,
  community:    CommunityPage,
  knowledge:    KnowledgePage,
  market:       MarketPage,
  game:         GamePage,
  finance:      FinancePage,
  job:          JobPage,
  learn:        LearnPage,
  research:     ResearchPage,
  humor:        HumorPage,
  video:        VideoPage,
  live:         LivePage,
  aihub:        AIHubPage,
  notification: NotificationPage,
  my:           MyPage,
}

function parseRoute(route) {
  const [path, query] = route.split('?')
  const parts = path.split('/')
  const params = {}
  ;(query || '').split('&').filter(Boolean).forEach(s => {
    const idx = s.indexOf('=')
    if (idx > -1) params[s.slice(0, idx)] = decodeURIComponent(s.slice(idx + 1))
  })
  return { page: parts[0] || 'home', id: parts[1] || null, params }
}

function AppInner() {
  const [route, setRoute] = useState('home')
  const { page, id, params } = parseRoute(route)
  function navigate(to) { incNavCount(); setRoute(to); window.scrollTo(0, 0) }

  const isAuth = page === 'login' || page === 'signup'

  const renderPage = () => {
    // 동적 페이지 (id 필요)
    if (page === 'post')     return <PostDetailPage postId={id} navigate={navigate} />
    if (page === 'crawl-detail') return <CrawlDetailPage itemId={id} navigate={navigate} />
    if (page === 'profile')  return <ProfilePage userId={id} navigate={navigate} />
    if (page === 'category') return <CategoryPage categoryId={id} navigate={navigate} />
    // 특수 페이지
    if (page === 'write')     return <WritePage navigate={navigate} />
    if (page === 'bookmarks') return <BookmarksPage navigate={navigate} />
    if (page === 'search')    return <SearchPage query={params.q || ''} navigate={navigate} />
    if (page === 'login')     return <LoginPage navigate={navigate} />
    if (page === 'signup')    return <SignupPage navigate={navigate} />
    // board — searchQuery 전달
    if (page === 'board')     return <BoardPageNew navigate={navigate} searchQuery={params.q || ''} />
    // 나머지 메뉴 — NAV_MAP
    const Component = NAV_MAP[page] || HomePage
    return <Component navigate={navigate} />
  }

  if (isAuth) return <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>{renderPage()}</div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header currentPage={page} navigate={navigate} />
      <main className="container" style={{ maxWidth: '960px', paddingTop: '8px', paddingBottom: '80px' }}>
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
