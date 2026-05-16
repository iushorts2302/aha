import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import CommentSection from '../components/CommentSection'

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${Math.max(1, mins)}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

// 간단한 마크다운 렌더러
function renderBody(body) {
  return body.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: '17px', fontWeight: 700, margin: '18px 0 8px', color: 'var(--color-accent)' }}>{line.slice(3)}</h3>
    if (line.startsWith('# ')) return <h2 key={i} style={{ fontSize: '20px', fontWeight: 700, margin: '20px 0 10px' }}>{line.slice(2)}</h2>
    if (line.startsWith('- ')) return <li key={i} style={{ fontSize: '14px', lineHeight: 1.7, marginLeft: '20px', color: 'var(--color-text)' }}>{line.slice(2)}</li>
    if (line.match(/^\d+\./)) return <li key={i} style={{ fontSize: '14px', lineHeight: 1.7, marginLeft: '20px' }}>{line.replace(/^\d+\.\s/, '')}</li>
    if (line === '') return <div key={i} style={{ height: '8px' }} />
    return <p key={i} style={{ fontSize: '14px', lineHeight: 1.8, color: 'var(--color-text)' }}>{line}</p>
  })
}

export default function PostDetailPage({ postId, navigate }) {
  const { currentUser, toggleBookmark, getUserById } = useAuth()
  const { getPostById, toggleLike, categories, incrementView } = useApp()
  const post = getPostById(postId)

  useEffect(() => { if (post) incrementView(postId) }, [postId])

  if (!post) return (
    <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-muted)' }}>
      <p style={{ fontSize: '32px' }}>😕</p>
      <p style={{ marginTop: '12px' }}>게시글을 찾을 수 없습니다.</p>
      <button onClick={() => navigate('board')} className="btn btn-ghost" style={{ marginTop: '16px' }}>게시판으로</button>
    </div>
  )

  const author = getUserById(post.authorId)
  const category = categories.find(c => c.id === post.categoryId)
  const isLiked = currentUser && post.likes.includes(currentUser.id)
  const isBookmarked = currentUser && currentUser.bookmarks.includes(post.id)

  return (
    <article className="fade-up">
      {/* 뒤로 */}
      <button onClick={() => navigate('board')} style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        ← 게시판으로
      </button>

      {/* 헤더 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {post.type === 'crawled' && (
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(255,107,53,0.15)', color: 'var(--color-accent2)', border: '1px solid rgba(255,107,53,0.3)' }}>큐레이션</span>
          )}
          {category && <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{category.icon} {category.name}</span>}
          <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>· {timeAgo(post.createdAt)}</span>
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 700, lineHeight: 1.4, marginBottom: '16px' }}>{post.title}</h1>

        {/* 작성자 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={() => navigate(`profile/${post.authorId}`)} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'var(--color-accent)', color: '#000',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '15px', fontWeight: 700,
            }}>{author?.nickname?.[0] ?? '?'}</span>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '14px', fontWeight: 600 }}>{author?.nickname}</p>
              <p style={{ fontSize: '11px', color: 'var(--color-muted)' }}>팔로워 {author?.followers?.length ?? 0}명</p>
            </div>
          </button>

          {/* 액션 버튼 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => currentUser && toggleLike(post.id, currentUser.id)}
              className="btn btn-ghost"
              style={{ color: isLiked ? 'var(--color-accent2)' : undefined, borderColor: isLiked ? 'var(--color-accent2)' : undefined }}
            >
              {isLiked ? '🧡' : '🤍'} {post.likes.length}
            </button>
            <button
              onClick={() => currentUser && toggleBookmark(post.id)}
              className="btn btn-ghost"
              style={{ color: isBookmarked ? 'var(--color-accent)' : undefined, borderColor: isBookmarked ? 'var(--color-accent)' : undefined }}
            >
              {isBookmarked ? '★ 저장됨' : '☆ 저장'}
            </button>
          </div>
        </div>
      </div>

      <div className="divider" />

      {/* 본문 */}
      <div style={{ padding: '8px 0 24px' }}>
        {renderBody(post.body)}
      </div>

      {/* 태그 */}
      {post.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {post.tags.map(tag => <span key={tag} className="tag"># {tag}</span>)}
        </div>
      )}

      <div className="divider" />

      {/* 댓글 */}
      <CommentSection postId={post.id} navigate={navigate} />
    </article>
  )
}
