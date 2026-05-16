import { useState } from 'react'
import { AdminProvider, useAdmin } from './context/AdminContext'
import { AdminHeader, AdminSidebar } from './components/AdminLayout'
import AdminLoginPage from './pages/AdminLoginPage'
import { DashboardPage, CategoryManager, TopicManager, SourceManager, UserManager, PostManager } from './pages/AdminPages'
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
      default:           return <DashboardPage />
    }
  }

  return (
    <div className="admin-layout">
      <div className="admin-header"><AdminHeader navigate={navigate} /></div>
      <div className="admin-sidebar"><AdminSidebar currentPage={page} navigate={navigate} /></div>
      <main className="admin-main">{renderPage()}</main>
    </div>
  )
}

export default function App() {
  return <AdminProvider><AdminApp /></AdminProvider>
}
