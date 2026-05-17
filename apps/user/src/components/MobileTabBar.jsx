import { useAuth } from '../context/AuthContext'

const TABS = [
  { key: 'home',         icon: '⌂',  label: '홈' },
  { key: 'trending',     icon: '↑',  label: '인기' },
  { key: 'write',        icon: '+',  label: '작성', isAction: true },
  { key: 'notification', icon: '🔔', label: '알림' },
  { key: 'my',           icon: '👤', label: '마이' },
]

export default function MobileTabBar({ currentPage, navigate }) {
  const { currentUser } = useAuth()

  return (
    <nav className="mobile-tabbar d-lg-none">
      {TABS.map(tab => {
        const active = currentPage === tab.key
        if (tab.isAction) return (
          <button key={tab.key}
            className="flex-fill d-flex flex-column align-items-center justify-content-center border-0 bg-transparent"
            onClick={() => navigate(currentUser ? 'write' : 'login')}>
            <span className="d-flex align-items-center justify-content-center rounded-circle"
              style={{ width: 36, height: 36, background: 'var(--color-primary)', color: '#fff', fontSize: 22, fontWeight: 300, boxShadow: '0 2px 8px rgba(0,102,204,0.35)' }}>+</span>
          </button>
        )
        return (
          <button key={tab.key}
            className="flex-fill d-flex flex-column align-items-center justify-content-center border-0 bg-transparent gap-1"
            style={{ color: active ? 'var(--color-primary)' : 'var(--color-muted-48)', transition: 'color 0.2s' }}
            onClick={() => navigate(tab.key)}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
