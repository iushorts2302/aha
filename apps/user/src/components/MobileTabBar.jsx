import { useAuth } from '../context/AuthContext'

const TABS = [
  { key: 'home',        icon: '🏠', label: '홈' },
  { key: 'trending',    icon: '🔥', label: '인기' },
  { key: 'write',       icon: '✏️', label: '작성', isAction: true },
  { key: 'notification',icon: '🔔', label: '알림' },
  { key: 'my',          icon: '👤', label: '마이' },
]

export default function MobileTabBar({ currentPage, navigate }) {
  const { currentUser } = useAuth()

  return (
    <nav className="mobile-tabbar">
      {TABS.map(tab => {
        const active = currentPage === tab.key
        if (tab.isAction) {
          return (
            <button key={tab.key} onClick={() => navigate(currentUser ? 'write' : 'login')} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
            }}>
              <span style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'var(--color-accent)', color: 'var(--color-accent-text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', fontWeight: 800,
                boxShadow: '0 2px 8px rgba(0,213,100,0.4)',
              }}>+</span>
            </button>
          )
        }
        return (
          <button key={tab.key} onClick={() => navigate(tab.key)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
            color: active ? 'var(--color-ink)' : 'var(--color-placeholder)',
            transition: 'color var(--transition)',
          }}>
            <span style={{ fontSize: '20px', lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: active ? 800 : 400 }}>{tab.label}</span>
            {active && (
              <span style={{ position: 'absolute', bottom: '2px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--color-accent)' }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
