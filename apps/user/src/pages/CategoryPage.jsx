import { useApp } from '../context/AppContext'
import PostCard from '../components/PostCard'

export default function CategoryPage({ categoryId, navigate }) {
  const { categories, getPostsByCategory } = useApp()
  const category = categories.find(c => c.id === categoryId)
  const posts = getPostsByCategory(categoryId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  if (!category) return (
    <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-muted)' }}>
      <p>분야를 찾을 수 없습니다.</p>
    </div>
  )

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <span style={{ fontSize: '32px' }}>{category.icon}</span>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>{category.name}</h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{category.description}</p>
      </div>

      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-muted)' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>📭</p>
          <p style={{ fontSize: '14px' }}>아직 게시글이 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {posts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}
        </div>
      )}
    </div>
  )
}
