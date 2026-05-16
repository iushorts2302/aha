import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import PostCard from '../components/PostCard'

export function BookmarksPage({ navigate }) {
  const { currentUser } = useAuth()
  const { posts } = useApp()

  if (!currentUser) return (
    <div style={{ padding: '80px 0', textAlign: 'center' }}>
      <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '20px' }}>로그인이 필요합니다.</p>
      <button onClick={() => navigate('login')} className="btn-primary">로그인</button>
    </div>
  )

  const bookmarked = posts.filter(p => currentUser.bookmarks.includes(p.id))

  return (
    <div className="fade-up">
      <div style={{ padding: '40px 0 32px', borderBottom: '1px solid var(--color-border-soft)' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 500, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
          즐겨찾기
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '6px' }}>
          {bookmarked.length}개의 저장된 글
        </p>
      </div>
      {bookmarked.length === 0 ? (
        <div style={{ padding: '80px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '20px' }}>
            저장한 글이 없습니다.
          </p>
          <button onClick={() => navigate('board')} className="btn-secondary">
            게시판 둘러보기
          </button>
        </div>
      ) : (
        <div>{bookmarked.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div>
      )}
    </div>
  )
}

export function CategoryPage({ categoryId, navigate }) {
  const { categories, getPostsByCategory } = useApp()
  const category = categories.find(c => c.id === categoryId)
  const posts = (getPostsByCategory(categoryId) || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  if (!category) return (
    <div style={{ padding: '80px 0', textAlign: 'center' }}>
      <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>분야를 찾을 수 없습니다.</p>
    </div>
  )

  return (
    <div className="fade-up">
      <div style={{ padding: '40px 0 32px', borderBottom: '1px solid var(--color-border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '32px' }}>{category.icon}</span>
          <h2 style={{ fontSize: '28px', fontWeight: 500, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            {category.name}
          </h2>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>{category.description}</p>
      </div>
      {posts.length === 0 ? (
        <div style={{ padding: '80px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>아직 게시글이 없습니다.</p>
        </div>
      ) : (
        <div>{posts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div>
      )}
    </div>
  )
}
