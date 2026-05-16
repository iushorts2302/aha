import { useApp } from '../context/AppContext'

export default function Sidebar({ currentCategory, navigate }) {
  const { categories, posts } = useApp()

  return (
    <aside style={{ padding: '32px 0', borderRight: '1px solid var(--color-border-soft)' }}>
      <p style={{
        fontSize: '11px', fontWeight: 500,
        color: 'var(--color-placeholder)',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        padding: '0 24px', marginBottom: '8px',
      }}>분야</p>

      <nav style={{ display: 'flex', flexDirection: 'column' }}>
        {/* 전체 */}
        <button onClick={() => navigate('home')} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 24px', fontSize: '14px', fontWeight: 500,
          color: !currentCategory ? 'var(--color-ink)' : 'var(--color-muted)',
          transition: 'color var(--transition)',
          textAlign: 'left',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-ink)'}
          onMouseLeave={e => { if (currentCategory) e.currentTarget.style.color = 'var(--color-muted)' }}
        >
          <span>전체</span>
          <span style={{ fontSize: '12px', color: 'var(--color-placeholder)', fontWeight: 400 }}>{posts.length}</span>
        </button>

        {categories.map(cat => {
          const count = posts.filter(p => p.categoryId === cat.id).length
          const active = currentCategory === cat.id
          return (
            <button key={cat.id} onClick={() => navigate(`category/${cat.id}`)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 24px', fontSize: '14px', fontWeight: 500,
              color: active ? 'var(--color-ink)' : 'var(--color-muted)',
              background: active ? 'var(--color-surface)' : 'transparent',
              transition: 'color var(--transition), background-color var(--transition)',
              textAlign: 'left',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-ink)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--color-muted)' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '15px' }}>{cat.icon}</span>
                {cat.name}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-placeholder)', fontWeight: 400 }}>{count}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
