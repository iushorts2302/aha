import { useApp } from '../context/AppContext'
import PostCard from '../components/PostCard'

export default function CategoryPage({ categoryId, navigate }) {
  const { categories, getPostsByCategory } = useApp()
  const category = categories.find(c => c.id === categoryId)
  const posts = getPostsByCategory(categoryId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  if (!category) return (
    <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-muted)' }}>
      <p style={{ fontSize: '14px' }}>분야를 찾을 수 없습니다.</p>
    </div>
  )

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid var(--color-border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <span style={{ fontSize: '28px' }}>{category.icon}</span>
          <h2 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--color-ink)' }}>{category.name}</h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{category.description}</p>
      </div>
      {posts.length === 0 ? (
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', textAlign: 'center', padding: '60px 0' }}>게시글이 없습니다.</p>
      ) : posts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}
    </div>
  )
}
