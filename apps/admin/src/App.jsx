import { useState } from 'react'
import { AdminProvider, useAdmin } from './context/AdminContext'
import { AdminHeader, AdminSidebar, AdminOffcanvas } from './components/AdminLayout'
import AdminLoginPage from './pages/AdminLoginPage'
import { DashboardPage, UserManager, PostManager, CommentManager, ReportManager, LogPage} from './pages/AdminPages'
import { CategoryManager, TopicManager, SourceManager } from './pages/CrawlConfigManager'
import CrawlerDashboard from './pages/CrawlerDashboard'
import DataPreview from './pages/DataPreview'

function AdminApp() {
  const { admin } = useAdmin()
  const [page, setPage] = useState('dashboard')
  function navigate(to) { setPage(to) }
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
    <div className="admin-root">
      {/* 모바일 오프캔버스 사이드바 */}
      <AdminOffcanvas currentPage={page} navigate={navigate} />

      {/* 헤더 */}
      <AdminHeader navigate={navigate} />

      {/* 바디: 사이드바 + 컨텐츠 */}
      <div className="admin-body">
        <AdminSidebar currentPage={page} navigate={navigate} />
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
