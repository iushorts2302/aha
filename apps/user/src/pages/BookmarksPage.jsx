import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import PostCard from '../components/PostCard'

export default function BookmarksPage({ navigate }) {
  const { currentUser } = useAuth()
  const { posts } = useApp()

  if (!currentUser) return (
    <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-muted)' }}>
      <p style={{ fontSize: '14px', marginBottom: '16px' }}>로그인이 필요합니다.</p>
      <button onClick={() => navigate('login')} className="btn btn-primary">로그인</button>
    </div>
  )

  const bookmarked = posts.filter(p => currentUser.bookmarks.includes(p.id))

  return (
    <div className="fade-up">
      <h2 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid var(--color-border-soft)' }}>
        즐겨찾기 <span style={{ color: 'var(--color-accent)', fontSize: '16px' }}>{bookmarked.length}</span>
      </h2>
      {bookmarked.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-muted)' }}>
          <p style={{ fontSize: '14px', marginBottom: '16px' }}>저장한 글이 없습니다.</p>
          <button onClick={() => navigate('board')} className="btn btn-secondary btn-sm">게시판 둘러보기</button>
        </div>
      ) : bookmarked.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}
    </div>
  )
}
