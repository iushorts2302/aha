import { useAdmin } from '../context/AdminContext'

const NAV_ITEMS = [
  { key: 'dashboard',  label: '대시보드',        icon: '📊' },
  { key: 'crawler',    label: '크롤링 관리',     icon: '🔄' },
  { key: 'preview',    label: '데이터 미리보기', icon: '👁' },
  { key: 'categories', label: '분야 관리',        icon: '📂' },
  { key: 'topics',     label: '주제 관리',        icon: '🏷' },
  { key: 'sources',    label: '크롤링 소스',      icon: '🔗' },
  { key: 'users',      label: '사용자 관리',      icon: '👥' },
  { key: 'posts',      label: '게시글 관리',      icon: '📝' },
  { key: 'comments',   label: '댓글 관리',        icon: '💬' },
  { key: 'reports',    label: '신고 처리',        icon: '🚩' },
  { key: 'logs',       label: '활동 로그',        icon: '📜' },
]

/* 사이드바 내용 (데스크톱 + 오프캔버스 공용) */
function SidebarContent({ currentPage, navigate, onClose }) {
  return (
    <>
      <div className="p-3 border-bottom">
        <p className="text-uppercase fw-semibold mb-0" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--color-muted)' }}>메뉴</p>
      </div>
      <nav className="py-2 flex-grow-1">
        {NAV_ITEMS.map(item => (
          <button key={item.key}
            className={`sidebar-link${currentPage === item.key ? ' active' : ''}`}
            onClick={() => { navigate(item.key); onClose?.() }}>
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </>
  )
}

export function AdminHeader({ navigate }) {
  const { admin, logout } = useAdmin()
  return (
    <header className="d-flex align-items-center px-3 px-lg-4"
      style={{ height: 'var(--nav-height)', background: '#1D1D1F', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
      {/* 모바일 메뉴 토글 */}
      <button className="btn btn-link p-1 me-2 d-lg-none text-white"
        data-bs-toggle="offcanvas" data-bs-target="#adminSidebar" aria-controls="adminSidebar">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M3 6h18M3 12h18M3 18h18"/>
        </svg>
      </button>

      <span className="fw-semibold" style={{ color: 'var(--color-accent)', letterSpacing: '-0.374px', fontSize: 15 }}>aha!</span>
      <span className="ms-1 text-white-50" style={{ fontSize: 11 }}>admin</span>

      <div className="ms-auto d-flex align-items-center gap-3">
        <span className="text-white-50 small d-none d-sm-inline">{admin?.name}</span>
        <button className="btn btn-sm btn-outline-secondary text-white border-secondary"
          style={{ fontSize: 12 }}
          onClick={() => logout()}>
          로그아웃
        </button>
      </div>
    </header>
  )
}

/* 데스크톱 사이드바 */
export function AdminSidebar({ currentPage, navigate }) {
  return (
    <aside className="admin-sidebar d-none d-lg-flex flex-column">
      <SidebarContent currentPage={currentPage} navigate={navigate} />
    </aside>
  )
}

/* 모바일 오프캔버스 사이드바 */
export function AdminOffcanvas({ currentPage, navigate }) {
  return (
    <div className="offcanvas offcanvas-start d-lg-none"
      style={{ width: 'var(--sidebar-width)' }}
      tabIndex="-1" id="adminSidebar" aria-labelledby="adminSidebarLabel">
      <div className="offcanvas-header border-bottom">
        <h6 className="offcanvas-title fw-semibold mb-0" id="adminSidebarLabel">aha! admin</h6>
        <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="닫기" />
      </div>
      <div className="offcanvas-body p-0 d-flex flex-column">
        <SidebarContent currentPage={currentPage} navigate={navigate}
          onClose={() => document.getElementById('adminSidebar')?.querySelector('[data-bs-dismiss]')?.click()} />
      </div>
    </div>
  )
}
