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

  // 사용자 게시글 즐겨찾기
  const bookmarkedPosts = posts.filter(p => currentUser.bookmarks?.includes(String(p.id)))

  // 외부 크롤링 아이템 즐겨찾기 — bookmarksRaw에서 crawl_item만 추출
  const bookmarkedCrawl = (currentUser.bookmarksRaw || []).filter(b => b.target_type === 'crawl_item')

  const total = bookmarkedPosts.length + bookmarkedCrawl.length

  return (
    <div className="fade-up">
      <div style={{ padding: '40px 0 32px', borderBottom: '1px solid var(--color-border-soft)' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 500, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
          즐겨찾기
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '6px' }}>
          {total}개 저장됨 · 게시글 {bookmarkedPosts.length} · 외부 콘텐츠 {bookmarkedCrawl.length}
        </p>
      </div>
      {total === 0 ? (
        <div style={{ padding: '80px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '20px' }}>
            저장한 항목이 없습니다.
          </p>
          <button onClick={() => navigate('board')} className="btn-secondary">
            게시판 둘러보기
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 20 }}>
          {bookmarkedPosts.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: 'var(--color-muted)' }}>
                📝 게시글 ({bookmarkedPosts.length})
              </h3>
              {bookmarkedPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}
            </div>
          )}
          {bookmarkedCrawl.length > 0 && (
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: 'var(--color-muted)' }}>
                🔗 외부 콘텐츠 ({bookmarkedCrawl.length})
              </h3>
              {bookmarkedCrawl.map(b => (
                <a
                  key={b.target_key}
                  href={b.target_key.startsWith('http') ? b.target_key : `https://${b.target_key}`}
                  target="_blank" rel="noopener noreferrer"
                  className="py-4 border-bottom d-flex"
                  style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
                      {b.target_title || '(제목 없음)'}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4, marginBottom: 0,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      ↗ {b.target_key}
                    </p>
                  </div>
                  <span style={{ color: 'var(--color-primary)', fontSize: 18, paddingLeft: 12 }}>★</span>
                </a>
              ))}
            </div>
          )}
        </div>
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
