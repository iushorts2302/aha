import { useAdmin } from '../context/AdminContext'

// ── AdminHeader ──────────────────────────────────────────
export function AdminHeader({ navigate }) {
  const { admin, logout } = useAdmin()
  return (
    <header style={{
      background: 'var(--color-accent)',
      height: 'var(--header-height)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: '16px',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
    }}>
      <button onClick={() => navigate('dashboard')} style={{
        fontFamily: 'var(--font-display)',
        fontSize: '22px', color: 'var(--color-accent2)',
        letterSpacing: '2px',
      }}>aha! <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontFamily: 'var(--font-body)', letterSpacing: 0 }}>admin</span></button>

      <div style={{ flex: 1 }} />

      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{admin?.name}</span>
      <button
        onClick={() => { logout(); navigate('login') }}
        style={{
          padding: '5px 14px', borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(255,255,255,0.3)', color: '#fff',
          fontSize: '12px', transition: 'var(--transition)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >로그아웃</button>
    </header>
  )
}

// ── AdminSidebar ─────────────────────────────────────────
const NAV_ITEMS = [
  { key: 'dashboard', label: '대시보드', icon: '📊' },
  { key: 'categories', label: '분야 관리', icon: '🗂️' },
  { key: 'topics', label: '주제 관리', icon: '🏷️' },
  { key: 'sources', label: '크롤링 소스', icon: '🔗' },
  { key: 'users', label: '사용자 관리', icon: '👥' },
  { key: 'posts', label: '게시글 관리', icon: '📝' },
]

export function AdminSidebar({ currentPage, navigate }) {
  return (
    <aside style={{ padding: '16px 12px' }}>
      <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '1px', textTransform: 'uppercase', padding: '8px 8px 10px' }}>메뉴</p>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV_ITEMS.map(item => {
          const active = currentPage === item.key
          return (
            <button key={item.key} onClick={() => navigate(item.key)} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', borderRadius: 'var(--radius-sm)',
              fontSize: '13px', fontWeight: active ? 600 : 400,
              color: active ? 'var(--color-accent)' : 'var(--color-muted)',
              background: active ? 'rgba(26,26,46,0.07)' : 'transparent',
              borderLeft: active ? '3px solid var(--color-accent)' : '3px solid transparent',
              transition: 'var(--transition)',
              textAlign: 'left',
            }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--color-bg)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
