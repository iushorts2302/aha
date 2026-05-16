import { useAdmin } from '../context/AdminContext'

const NAV_ITEMS = [
  { key: 'dashboard',  label: '대시보드',    icon: '↗' },
  { key: 'categories', label: '분야 관리',    icon: '⊞' },
  { key: 'topics',     label: '주제 관리',    icon: '≡' },
  { key: 'sources',    label: '크롤링 소스',  icon: '⊙' },
  { key: 'users',      label: '사용자 관리',  icon: '○' },
  { key: 'posts',      label: '게시글 관리',  icon: '□' },
]

export function AdminHeader({ navigate }) {
  const { admin, logout } = useAdmin()
  return (
    <header style={{
      height: 'var(--nav-height)',
      background: 'var(--color-ink)',
      display: 'flex', alignItems: 'center',
      padding: '0 40px', gap: '24px',
    }}>
      <button onClick={() => navigate('dashboard')} style={{
        fontSize: '14px', fontWeight: 500, letterSpacing: '0.22em',
        color: '#fff', textTransform: 'uppercase',
        transition: 'opacity var(--transition)',
      }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.6'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >AHA</button>
      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>admin</span>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{admin?.name}</span>
      <button onClick={() => { logout(); navigate('login') }} style={{
        height: '30px', padding: '0 16px',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 'var(--radius-btn)',
        fontSize: '13px', color: 'rgba(255,255,255,0.7)',
        transition: 'border-color var(--transition), color var(--transition)',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
      >로그아웃</button>
    </header>
  )
}

export function AdminSidebar({ currentPage, navigate }) {
  return (
    <aside style={{ padding: '24px 0', background: '#fff', borderRight: '1px solid var(--color-border-soft)' }}>
      <p style={{
        fontSize: '11px', fontWeight: 500,
        color: 'var(--color-placeholder)',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        padding: '0 24px', marginBottom: '8px',
      }}>메뉴</p>
      <nav style={{ display: 'flex', flexDirection: 'column' }}>
        {NAV_ITEMS.map(item => {
          const active = currentPage === item.key
          return (
            <button key={item.key} onClick={() => navigate(item.key)} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 24px', fontSize: '14px', fontWeight: 500,
              color: active ? 'var(--color-ink)' : 'var(--color-muted)',
              background: active ? 'var(--color-surface)' : 'transparent',
              borderLeft: `2px solid ${active ? 'var(--color-ink)' : 'transparent'}`,
              transition: 'color var(--transition), background-color var(--transition), border-color var(--transition)',
              textAlign: 'left',
            }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--color-ink)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--color-muted)' }}
            >
              <span style={{ fontSize: '13px', opacity: 0.5 }}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
