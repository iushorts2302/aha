import { useState, useRef, useEffect } from 'react'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import Header from './components/Header'
import MobileTabBar from './components/MobileTabBar'

import PostDetailPage  from './pages/PostDetailPage'
import CrawlDetailPage from './pages/CrawlDetailPage'
import WritePage       from './pages/WritePage'
import ProfilePage     from './pages/ProfilePage'
import SearchPage      from './pages/SearchPage'
import { BookmarksPage, CategoryPage } from './pages/MiscPages'
import { LoginPage, SignupPage }       from './pages/AuthPages'
import MaintenancePage from './pages/MaintenancePage'
import { getState, onStateChange, CB_STATE } from './store/circuitBreaker.js'

import {
  HomePage, TrendingPage, FeedPage, BoardPageNew,
  AIPage, StartupPage, DevPage, OSSPage, DesignPage,
  ITNewsPage, GalleryPage, CommunityPage, KnowledgePage,
  MarketPage, GamePage, FinancePage, JobPage, LearnPage,
  ResearchPage, HumorPage, VideoPage, LivePage, AIHubPage,
  NotificationPage, MyPage,
} from './pages/SubPages'

const NAV_MAP = {
  home: HomePage, trending: TrendingPage, feed: FeedPage, board: BoardPageNew,
  ai: AIPage, startup: StartupPage, dev: DevPage, oss: OSSPage,
  design: DesignPage, itnews: ITNewsPage, gallery: GalleryPage,
  community: CommunityPage, knowledge: KnowledgePage, market: MarketPage,
  game: GamePage, finance: FinancePage, job: JobPage, learn: LearnPage,
  research: ResearchPage, humor: HumorPage, video: VideoPage, live: LivePage,
  aihub: AIHubPage, notification: NotificationPage, my: MyPage,
}

function parseRoute(route) {
  const [path, query = ''] = route.split('?')
  const parts = path.split('/')
  const params = {}
  query.split('&').filter(Boolean).forEach(s => {
    const i = s.indexOf('=')
    if (i > -1) params[s.slice(0, i)] = decodeURIComponent(s.slice(i + 1))
  })
  return { page: parts[0] || 'home', id: parts[1] || null, params }
}

function AppInner() {
  const [route, setRoute]       = useState('home')
  const [cbState, setCbState]   = useState(() => getState())
  const prevRouteRef = useRef('home')

  // 서킷브레이커 상태 구독
  useEffect(() => onStateChange(setCbState), [])

  // 앱 구동 시 /api/init 반복 호출 — 3개씩 순차 크롤링 (최대 7회)
  useEffect(() => {
    let round = 0
    async function triggerInit() {
      try {
        const r = await fetch('https://admin-vert-psi.vercel.app/api/init',
          { signal: AbortSignal.timeout(28000) })
        if (!r.ok) return
        const d = await r.json()
        // 아직 크롤링 필요한 토픽이 남아있으면 재호출
        if (d.topics_needed > 0 && round < 7) {
          round++
          setTimeout(triggerInit, 1000)
        }
      } catch {} // 실패해도 앱 동작에 영향 없음
    }
    triggerInit()
  }, [])

  // OPEN 상태 → 서버 점검 페이지
  if (cbState === CB_STATE.OPEN) return <MaintenancePage />

  function navigate(to) {
    prevRouteRef.current = route  // 이동 전 경로 즉시 기록
    setRoute(to)
    window.scrollTo(0, 0)
  }

  const { page, id, params } = parseRoute(route)
  const isAuth = page === 'login' || page === 'signup'

  function renderPage() {
    // 상세 페이지
    if (page === 'post')         return <PostDetailPage  postId={id} navigate={navigate} prevPage={prevRouteRef.current} />
    if (page === 'crawl-detail') return <CrawlDetailPage itemId={id} navigate={navigate} prevPage={prevRouteRef.current} />
    if (page === 'profile')      return <ProfilePage     userId={id} navigate={navigate} />
    if (page === 'category')     return <CategoryPage    categoryId={id} navigate={navigate} />
    // 특수 페이지
    if (page === 'write')        return <WritePage       navigate={navigate} />
    if (page === 'bookmarks')    return <BookmarksPage   navigate={navigate} />
    if (page === 'search')       return <SearchPage      query={params.q || ''} navigate={navigate} />
    if (page === 'login')        return <LoginPage       navigate={navigate} />
    if (page === 'signup')       return <SignupPage      navigate={navigate} />
    if (page === 'board')        return <BoardPageNew    navigate={navigate} searchQuery={params.q || ''} />
    const Component = NAV_MAP[page] || HomePage
    return <Component navigate={navigate} />
  }

  if (isAuth) {
    return <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>{renderPage()}</div>
  }

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
