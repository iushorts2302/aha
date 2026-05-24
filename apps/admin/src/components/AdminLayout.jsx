/**
 * AdminLayout — Tabler 스타일
 *
 * 레이아웃:
 *   [Sidebar 220px] | [Topbar 56px + Content]
 *
 * 모바일에서는 사이드바가 오프캔버스로 슬라이드 인.
 */
import { useAdmin } from '../context/AdminContext'

const NAV_ITEMS = [
  { key: 'dashboard',  label: '대시보드',        icon: 'dashboard' },
  { key: 'crawler',    label: '크롤링 관리',     icon: 'refresh'   },
  { key: 'preview',    label: '데이터 미리보기', icon: 'eye'       },
  { key: 'categories', label: '분야 관리',       icon: 'folder'    },
  { key: 'topics',     label: '주제 관리',       icon: 'tag'       },
  { key: 'sources',    label: '크롤링 소스',     icon: 'link'      },
  { key: 'users',      label: '사용자 관리',     icon: 'users'     },
  { key: 'posts',      label: '게시글 관리',     icon: 'file-text' },
  { key: 'comments',   label: '댓글 관리',       icon: 'message'   },
  { key: 'reports',    label: '신고 처리',       icon: 'flag'      },
  { key: 'logs',       label: '활동 로그',       icon: 'history'   },
]

/**
 * Tabler 스타일 SVG 아이콘 모음 (Tabler Icons 기반, 단순화)
 * 모두 24x24 viewBox + stroke 기반 아웃라인
 */
function Icon({ name }) {
  const paths = {
    dashboard: <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
    refresh:   <><path d="M20 11a8 8 0 1 0-1.7 6.4l1.7 1.6"/><path d="M20 4v5h-5"/></>,
    eye:       <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></>,
    folder:    <><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/></>,
    tag:       <><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9z"/><circle cx="9" cy="9" r="1.5"/></>,
    link:      <><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>,
    users:     <><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M21 19c0-2-2-3.5-4-3.5"/></>,
    'file-text': <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/></>,
    message:   <><path d="M21 12a8 8 0 0 1-12 7l-5 2 2-5a8 8 0 1 1 15-4z"/></>,
    flag:      <><path d="M4 21V4"/><path d="M4 4h13l-2 4 2 4H4"/></>,
    history:   <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    logout:    <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></>,
    search:    <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
    menu:      <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  }
  return (
    <span className="sidebar-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeLinecap="round" strokeLinejoin="round">
        {paths[name] || null}
      </svg>
    </span>
  )
}

/* ── 사이드바 컨텐츠 — 데스크톱 + 모바일 공용 ───── */
function SidebarContent({ currentPage, navigate, onClose }) {
  return (
    <>
      <div className="sidebar-brand">
        <span style={{ fontWeight: 800 }}>aha!</span>
        <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--tblr-secondary)' }}>admin</span>
      </div>

      <div className="sidebar-section">메인</div>
      <nav style={{ display: 'flex', flexDirection: 'column' }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            className={`sidebar-link${currentPage === item.key ? ' active' : ''}`}
            onClick={() => { navigate(item.key); onClose?.() }}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}

/* ── 데스크톱 사이드바 ───────────────────────────── */
export function AdminSidebar({ currentPage, navigate }) {
  return (
    <aside className="admin-sidebar d-none d-lg-flex">
      <SidebarContent currentPage={currentPage} navigate={navigate} />
    </aside>
  )
}

/* ── 모바일 오프캔버스 사이드바 ─────────────────── */
export function AdminOffcanvas({ currentPage, navigate }) {
  return (
    <div className="offcanvas offcanvas-start d-lg-none"
      style={{ width: 'var(--sidebar-width)' }}
      tabIndex="-1" id="adminSidebar" aria-labelledby="adminSidebarLabel">
      <div className="offcanvas-body p-0 d-flex flex-column"
        style={{ background: '#FBFCFD' }}>
        <SidebarContent currentPage={currentPage} navigate={navigate}
          onClose={() => document.getElementById('adminSidebar')?.querySelector('[data-bs-dismiss]')?.click()} />
      </div>
    </div>
  )
}

/* ── 상단 Topbar ─────────────────────────────────── */
export function AdminTopbar({ navigate }) {
  const { admin, logout } = useAdmin()
  const initial = (admin?.name || admin?.email || 'A').charAt(0).toUpperCase()

  return (
    <header className="admin-topbar">
      {/* 모바일 메뉴 토글 */}
      <button
        className="btn btn-sm d-lg-none"
        style={{ padding: 6, background: 'transparent', border: 'none' }}
        data-bs-toggle="offcanvas" data-bs-target="#adminSidebar">
        <Icon name="menu" />
      </button>

      {/* 검색창 */}
      <div style={{ flex: 1, maxWidth: 360, position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--tblr-muted)', pointerEvents: 'none'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7"/>
            <path d="M21 21l-4.3-4.3"/>
          </svg>
        </span>
        <input
          type="search"
          placeholder="검색..."
          className="topbar-search"
          style={{ width: '100%', paddingLeft: 32 }}
        />
      </div>

      {/* 우측 사용자 */}
      <div className="topbar-user">
        <span className="d-none d-md-inline">{admin?.name || admin?.email}</span>
        <span className="topbar-avatar">{initial}</span>
        <button
          onClick={() => logout()}
          className="btn btn-sm"
          style={{ background: 'transparent', border: '1px solid var(--tblr-border)', color: 'var(--tblr-secondary)' }}>
          로그아웃
        </button>
      </div>
    </header>
  )
}

/* 호환: 기존 AdminHeader 이름도 export */
export const AdminHeader = AdminTopbar
