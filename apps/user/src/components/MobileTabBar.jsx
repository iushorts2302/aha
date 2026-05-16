import { useAuth } from '../context/AuthContext'

const TABS = [
  { key: 'home',         icon: '⌂',  label: '홈' },
  { key: 'trending',     icon: '↑',  label: '인기' },
  { key: 'write',        icon: '+',  label: '작성', isAction: true },
  { key: 'notification', icon: '◯',  label: '알림' },
  { key: 'my',           icon: '⊙',  label: '마이' },
]

export default function MobileTabBar({ currentPage, navigate }) {
  const { currentUser } = useAuth()

  return (
    <nav className="mobile-tabbar">
      {TABS.map(tab => {
        const active = currentPage === tab.key

        if (tab.isAction) return (
          <button key={tab.key} onClick={() => navigate(currentUser ? 'write' : 'login')} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
          }}>
            <span style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'var(--color-primary)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', fontWeight: 300,
              boxShadow: '0 2px 8px rgba(0,102,204,0.35)',
            }}>+</span>
          </button>
        )

        return (
          <button key={tab.key} onClick={() => navigate(tab.key)} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '3px',
            color: active ? 'var(--color-primary)' : 'var(--color-muted-48)',
            transition: 'color var(--transition)',
            position: 'relative',
          }}>
            <span style={{ fontSize: '18px', lineHeight: 1, fontWeight: active ? 600 : 400 }}>{tab.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: active ? 600 : 400, letterSpacing: '-0.12px' }}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
