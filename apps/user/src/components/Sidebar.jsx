import { useApp } from '../context/AppContext'

export default function Sidebar({ currentCategory, navigate }) {
  const { categories, posts } = useApp()

  return (
    <aside style={{
      padding: '24px 16px',
      borderRight: '1px solid var(--color-border)',
    }}>
      <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px', paddingLeft: '8px' }}>
        분야
      </p>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <button
          onClick={() => navigate('home')}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 12px', borderRadius: 'var(--radius-sm)',
            fontSize: '13px', fontWeight: 500,
            color: !currentCategory ? 'var(--color-accent)' : 'var(--color-text)',
            background: !currentCategory ? 'rgba(232,255,71,0.08)' : 'transparent',
            transition: 'var(--transition)',
            textAlign: 'left',
          }}
          onMouseEnter={e => { if (currentCategory) e.currentTarget.style.background = 'var(--color-surface2)' }}
          onMouseLeave={e => { if (currentCategory) e.currentTarget.style.background = 'transparent' }}
        >
          <span>🏠</span> 전체
        </button>
        {categories.map(cat => {
          const count = posts.filter(p => p.categoryId === cat.id).length
          const active = currentCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => navigate(`category/${cat.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                fontSize: '13px', fontWeight: 500,
                color: active ? 'var(--color-accent)' : 'var(--color-text)',
                background: active ? 'rgba(232,255,71,0.08)' : 'transparent',
                transition: 'var(--transition)',
                textAlign: 'left',
                justifyContent: 'space-between',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--color-surface2)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>{cat.icon}</span> {cat.name}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{count}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
