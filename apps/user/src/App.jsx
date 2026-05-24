import {
  useState,
  useRef,
  useEffect } from 'react'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import MobileTabBar from './components/MobileTabBar'

import PostDetailPage  from './pages/PostDetailPage'
import CrawlDetailPage from './pages/CrawlDetailPage'
import WritePage       from './pages/WritePage'
import ProfilePage     from './pages/ProfilePage'
import SearchPage      from './pages/SearchPage'
import { BookmarksPage,
  CategoryPage } from './pages/MiscPages'
import { LoginPage,
  SignupPage }       from './pages/AuthPages'
import MaintenancePage from './pages/MaintenancePage'
import { getState,
  onStateChange,
  CB_STATE } from './store/circuitBreaker.js'
import { prefetchTopics } from './store/crawlStore.js'

import {
  HomePage,
  BoardPageNew,
  AIPage,
  StartupPage,
  DevPage,
  DesignPage,
  GamePage,
  FinancePage,
  LearnPage,
  NotificationPage,
  MyPage,
} from './pages/SubPages'

const NAV_MAP = {
  home: HomePage, board: BoardPageNew,
  ai: AIPage, startup: StartupPage, dev: DevPage,
  design: DesignPage, game: GamePage, finance: FinancePage, learn: LearnPage,
  notification: NotificationPage, my: MyPage,
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

  // 방안 3: 주요 토픽 프리페치 — 앱 시작 2초 후 자동 실행
  useEffect(() => {
    const t = setTimeout(() => {
      prefetchTopics([
        // AI 최상단 섹션 — 가장 먼저 캐시 워밍
        'ai.agents', 'ai.trend', 'ai.tools', 'ai.research',
        // 그 외 홈 큐레이션 섹션
        'home.trending', 'ai.news', 'startup.new',
        'dev.trending', 'finance.crypto', 'learn.korean',
      ])
    }, 2000)
    return () => clearTimeout(t)
  }, [])

  // 앱 구동 3초 후 /api/init 백그라운드 호출 (초기 렌더링 블로킹 방지)
  useEffect(() => {
    let round = 0
    async function triggerInit() {
      try {
        const r = await fetch('https://admin-vert-psi.vercel.app/api/init',
          { signal: AbortSignal.timeout(28000) })
        if (!r.ok) return
        const d = await r.json()
        if (d.topics_needed > 0 && round < 7) {
          round++
          setTimeout(triggerInit, 3000)  // 3초 간격으로 재호출
        }
      } catch {}
    }
    const t = setTimeout(triggerInit, 3000)  // 초기 3초 지연
    return () => clearTimeout(t)
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

  // 사이드바가 자연스러운 페이지(메인 카테고리/홈/게시판)에만 노출
  // 상세/검색/작성/마이페이지 등은 1-column 유지 → 콘텐츠 집중
  const SIDEBAR_PAGES = ['home', 'ai', 'dev', 'startup', 'design', 'game', 'finance', 'learn', 'board']
  const showSidebar = SIDEBAR_PAGES.includes(page)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header currentPage={page} navigate={navigate} />
      <div className="aha-main-grid">
        <main style={{ minWidth: 0 }}>
          {renderPage()}
        </main>
        {showSidebar && <Sidebar navigate={navigate} />}
      </div>
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
