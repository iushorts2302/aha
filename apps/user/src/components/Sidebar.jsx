import { useApp } from '../context/AppContext'

export default function Sidebar({ currentCategory, navigate }) {
  const { categories, posts } = useApp()

  const Item = ({ icon, label, active, count, onClick }) => (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 12px', borderRadius: 'var(--radius-btn)',
      fontSize: '14px', fontWeight: active ? 500 : 400,
      color: active ? 'var(--color-ink)' : 'var(--color-muted)',
      background: active ? 'var(--color-surface)' : 'transparent',
      transition: 'color var(--transition), background-color var(--transition)',
      textAlign: 'left',
    }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.color = 'var(--color-ink)'; e.currentTarget.style.background = 'var(--color-surface)' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.color = 'var(--color-muted)'; e.currentTarget.style.background = 'transparent' } }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span>{icon}</span>
        <span>{label}</span>
      </span>
      {count !== undefined && (
        <span style={{ fontSize: '12px', color: 'var(--color-placeholder)' }}>{count}</span>
      )}
    </button>
  )

  return (
    <aside style={{ padding: '20px 12px' }}>
      <p style={{
        fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--color-placeholder)',
        padding: '4px 12px 10px',
      }}>분야</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        <Item icon="○" label="전체" active={!currentCategory} onClick={() => navigate('home')} />
        {categories.map(cat => (
          <Item
            key={cat.id}
            icon={cat.icon}
            label={cat.name}
            active={currentCategory === cat.id}
            count={posts.filter(p => p.categoryId === cat.id).length}
            onClick={() => navigate(`category/${cat.id}`)}
          />
        ))}
      </div>
    </aside>
  )
}
