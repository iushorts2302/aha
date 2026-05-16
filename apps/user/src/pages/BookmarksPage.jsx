import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import PostCard from '../components/PostCard'

export default function BookmarksPage({ navigate }) {
  const { currentUser } = useAuth()
  const { posts } = useApp()

  if (!currentUser) return (
    <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-muted)' }}>
      <p style={{ fontSize: '32px' }}>🔒</p>
      <p style={{ marginTop: '12px', marginBottom: '16px' }}>로그인이 필요합니다.</p>
      <button onClick={() => navigate('login')} className="btn btn-primary">로그인</button>
    </div>
  )

  const bookmarked = posts.filter(p => currentUser.bookmarks.includes(p.id))

  return (
    <div className="fade-up">
      <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>
        즐겨찾기 <span style={{ color: 'var(--color-accent)' }}>{bookmarked.length}</span>
      </h2>
      {bookmarked.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-muted)' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>☆</p>
          <p style={{ fontSize: '14px' }}>아직 저장한 글이 없습니다.</p>
          <button onClick={() => navigate('board')} className="btn btn-ghost" style={{ marginTop: '16px' }}>게시판 둘러보기</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {bookmarked.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}
        </div>
      )}
    </div>
  )
}
