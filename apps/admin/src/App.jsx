import { useState } from 'react'
import { AdminProvider, useAdmin } from './context/AdminContext'
import { AdminTopbar, AdminSidebar, AdminOffcanvas } from './components/AdminLayout'
import AdminLoginPage, { OAuthCallback } from './pages/AdminLoginPage'
import { DashboardPage, UserManager, PostManager, CommentManager, ReportManager, LogPage} from './pages/AdminPages'
import { CategoryManager, TopicManager, SourceManager } from './pages/CrawlConfigManager'
import CrawlerDashboard from './pages/CrawlerDashboard'
import DataPreview from './pages/DataPreview'

function AdminApp() {
  const { admin } = useAdmin()
  const [page, setPage] = useState('dashboard')
  function navigate(to) { setPage(to) }

  // OAuth 콜백 URL 처리 — /oauth/kakao, /oauth/google
  const oauthMatch = window.location.pathname.match(/^\/oauth\/(kakao|google)$/)
  if (oauthMatch) {
    return <OAuthCallback provider={oauthMatch[1]} navigate={navigate} />
  }

  if (!admin) return <AdminLoginPage navigate={navigate} />

  const renderPage = () => {
    switch (page) {
      case 'dashboard':  return <DashboardPage />
      case 'crawler':    return <CrawlerDashboard />
      case 'preview':    return <DataPreview />
      case 'categories': return <CategoryManager />
      case 'topics':     return <TopicManager />
      case 'sources':    return <SourceManager />
      case 'users':      return <UserManager />
      case 'posts':      return <PostManager />
      case 'comments':   return <CommentManager />
      case 'reports':    return <ReportManager />
      case 'logs':       return <LogPage />
      default:           return <DashboardPage />
    }
  }

  return (
    <div className="admin-shell">
      {/* 모바일 오프캔버스 사이드바 */}
      <AdminOffcanvas currentPage={page} navigate={navigate} />

      {/* 데스크톱 사이드바 (좌측 고정) */}
      <AdminSidebar currentPage={page} navigate={navigate} />

      {/* 메인: Topbar + Content */}
      <div className="admin-main">
        <AdminTopbar navigate={navigate} />
        <main className="admin-content fade-up">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return <AdminProvider><AdminApp /></AdminProvider>
}
