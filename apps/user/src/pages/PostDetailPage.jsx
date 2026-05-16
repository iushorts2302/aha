import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import CommentSection from '../components/CommentSection'

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${Math.max(1, m)}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

function renderBody(body) {
  return body.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return (
      <h3 key={i} style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-ink)', margin: '28px 0 12px', letterSpacing: '-0.01em' }}>
        {line.slice(3)}
      </h3>
    )
    if (line.startsWith('# ')) return (
      <h2 key={i} style={{ fontSize: '22px', fontWeight: 500, color: 'var(--color-ink)', margin: '32px 0 14px' }}>
        {line.slice(2)}
      </h2>
    )
    if (line.startsWith('- ')) return (
      <li key={i} style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--color-body)', marginLeft: '20px', marginBottom: '4px' }}>
        {line.slice(2)}
      </li>
    )
    if (line.match(/^\d+\./)) return (
      <li key={i} style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--color-body)', marginLeft: '20px', marginBottom: '4px' }}>
        {line.replace(/^\d+\.\s/, '')}
      </li>
    )
    if (line === '') return <div key={i} style={{ height: '12px' }} />
    return (
      <p key={i} style={{ fontSize: '15px', lineHeight: 1.8, color: 'var(--color-body)', marginBottom: '2px' }}>
        {line}
      </p>
    )
  })
}

export default function PostDetailPage({ postId, navigate }) {
  const { currentUser, toggleBookmark, getUserById } = useAuth()
  const { getPostById, toggleLike, categories, incrementView } = useApp()
  const post = getPostById(postId)

  useEffect(() => { if (post) incrementView(postId) }, [postId])

  if (!post) return (
    <div style={{ padding: '80px 0', textAlign: 'center' }}>
      <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '20px' }}>게시글을 찾을 수 없습니다.</p>
      <button onClick={() => navigate('board')} className="btn btn-secondary">게시판으로</button>
    </div>
  )

  const author = getUserById(post.authorId)
  const category = categories.find(c => c.id === post.categoryId)
  const isLiked = post.likes.includes(currentUser?.id)
  const isBookmarked = currentUser?.bookmarks?.includes(post.id)

  return (
    <article className="fade-up" style={{ maxWidth: '720px' }}>
      {/* 뒤로 */}
      <button onClick={() => navigate('board')} style={{
        fontSize: '13px', color: 'var(--color-muted)', marginBottom: '32px',
        display: 'flex', alignItems: 'center', gap: '6px',
        transition: 'color var(--transition)',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-ink)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted)'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        게시판으로
      </button>

      {/* 메타 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        {post.type === 'crawled' && (
          <span style={{
            fontSize: '11px', fontWeight: 500, padding: '2px 8px',
            color: 'var(--color-accent)', border: '1px solid rgba(62,106,225,0.25)', borderRadius: '99px',
          }}>큐레이션</span>
        )}
        {category && <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{category.icon} {category.name}</span>}
        <span style={{ fontSize: '12px', color: 'var(--color-placeholder)' }}>· {timeAgo(post.createdAt)}</span>
      </div>

      {/* 제목 */}
      <h1 style={{
        fontSize: '28px', fontWeight: 500, color: 'var(--color-ink)',
        letterSpacing: '-0.02em', lineHeight: 1.35, marginBottom: '24px',
      }}>{post.title}</h1>

      {/* 작성자 + 액션 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: '28px', borderBottom: '1px solid var(--color-border-soft)',
        flexWrap: 'wrap', gap: '12px',
      }}>
        <button onClick={() => navigate(`profile/${post.authorId}`)} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          transition: 'opacity var(--transition)',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <span style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'var(--color-ink)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 600,
          }}>{author?.nickname?.[0] ?? '?'}</span>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-ink)' }}>{author?.nickname}</p>
            <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>팔로워 {author?.followers?.length ?? 0}명</p>
          </div>
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => currentUser && toggleLike(post.id, currentUser.id)} className="btn btn-secondary" style={{
            height: '36px', padding: '0 16px',
            color: isLiked ? 'var(--color-accent)' : undefined,
            borderColor: isLiked ? 'var(--color-accent)' : undefined,
          }}>
            ♥ {post.likes.length}
          </button>
          <button onClick={() => currentUser && toggleBookmark(post.id)} className="btn btn-secondary" style={{
            height: '36px', padding: '0 16px',
            color: isBookmarked ? 'var(--color-ink)' : undefined,
          }}>
            {isBookmarked ? '★ 저장됨' : '☆ 저장'}
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div style={{ padding: '32px 0' }}>
        {renderBody(post.body)}
      </div>

      {/* 태그 */}
      {post.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingBottom: '28px', borderBottom: '1px solid var(--color-border-soft)' }}>
          {post.tags.map(tag => (
            <span key={tag} style={{ fontSize: '12px', color: 'var(--color-muted)', background: 'var(--color-surface)', padding: '4px 12px', borderRadius: '99px' }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <CommentSection postId={post.id} navigate={navigate} />
    </article>
  )
}
