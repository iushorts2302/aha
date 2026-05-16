import { useAdmin } from '../context/AdminContext'

const NAV_ITEMS = [
  { key: 'dashboard', label: '대시보드', icon: '▣' },
  { key: 'categories', label: '분야 관리', icon: '◈' },
  { key: 'topics', label: '주제 관리', icon: '◇' },
  { key: 'sources', label: '크롤링 소스', icon: '◎' },
  { key: 'users', label: '사용자 관리', icon: '○' },
  { key: 'posts', label: '게시글 관리', icon: '▭' },
]

export function AdminHeader({ navigate }) {
  const { admin, logout } = useAdmin()
  return (
    <header style={{
      height: 'var(--nav-height)',
      background: 'var(--color-ink)',
      display: 'flex', alignItems: 'center',
      padding: '0 32px', gap: '20px',
    }}>
      <button onClick={() => navigate('dashboard')} style={{
        fontSize: '14px', fontWeight: 600, letterSpacing: '0.18em',
        color: '#fff', textTransform: 'uppercase',
      }}>AHA <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400, fontSize: '12px', letterSpacing: '0.06em' }}>admin</span></button>

      <div style={{ flex: 1 }} />

      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{admin?.name}</span>
      <button onClick={() => { logout(); navigate('login') }} style={{
        height: '28px', padding: '0 12px', borderRadius: 'var(--radius-btn)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: 'rgba(255,255,255,0.7)', fontSize: '12px',
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
    <aside style={{ padding: '16px 10px' }}>
      <p style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-placeholder)', padding: '6px 10px 10px' }}>메뉴</p>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {NAV_ITEMS.map(item => {
          const active = currentPage === item.key
          return (
            <button key={item.key} onClick={() => navigate(item.key)} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 10px', borderRadius: 'var(--radius-btn)',
              fontSize: '13px', fontWeight: active ? 500 : 400,
              color: active ? 'var(--color-ink)' : 'var(--color-muted)',
              background: active ? 'var(--color-surface)' : 'transparent',
              transition: 'color var(--transition), background-color var(--transition)',
              textAlign: 'left',
            }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.color = 'var(--color-ink)'; e.currentTarget.style.background = 'var(--color-surface)' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.color = 'var(--color-muted)'; e.currentTarget.style.background = 'transparent' } }}
            >
              <span style={{ fontSize: '12px', color: active ? 'var(--color-accent)' : 'var(--color-placeholder)' }}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
