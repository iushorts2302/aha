import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

export default function PostCard({ post, navigate }) {
  const { currentUser, toggleBookmark, getUserById } = useAuth()
  const { toggleLike, categories, comments } = useApp()
  const author = getUserById(post.authorId)
  const category = categories.find(c => c.id === post.categoryId)
  const commentCount = comments.filter(c => c.postId === post.id).length
  const isLiked = currentUser?.likes?.includes(post.id) || post.likes.includes(currentUser?.id)
  const isBookmarked = currentUser?.bookmarks?.includes(post.id)

  return (
    <article className="fade-up" style={{
      padding: '24px 0',
      borderBottom: '1px solid var(--color-border-soft)',
      cursor: 'pointer',
    }} onClick={() => navigate(`post/${post.id}`)}>

      {/* 메타 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        {post.type === 'crawled' && (
          <span style={{
            fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
            background: 'rgba(62,106,225,0.08)', color: 'var(--color-accent)',
            fontWeight: 500,
          }}>큐레이션</span>
        )}
        {category && (
          <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
            {category.icon} {category.name}
          </span>
        )}
        <span style={{ fontSize: '13px', color: 'var(--color-placeholder)' }}>·</span>
        <span style={{ fontSize: '13px', color: 'var(--color-placeholder)' }}>{timeAgo(post.createdAt)}</span>
      </div>

      {/* 제목 */}
      <h3 style={{
        fontSize: '16px', fontWeight: 500, lineHeight: 1.45,
        color: 'var(--color-ink)', marginBottom: '8px',
        letterSpacing: '-0.01em',
      }}>{post.title}</h3>

      {/* 미리보기 */}
      <p style={{
        fontSize: '14px', color: 'var(--color-muted)', lineHeight: 1.6,
        marginBottom: '14px',
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>{post.body.replace(/#+\s/g, '').replace(/\n/g, ' ')}</p>

      {/* 태그 */}
      {post.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {post.tags.slice(0, 4).map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      )}

      {/* 하단 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={e => { e.stopPropagation(); navigate(`profile/${post.authorId}`) }} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '13px', color: 'var(--color-muted)',
          transition: 'color var(--transition)',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-ink)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted)'}
        >
          <span style={{
            width: '20px', height: '20px', borderRadius: '50%',
            background: 'var(--color-accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', fontWeight: 600, flexShrink: 0,
          }}>{author?.nickname?.[0] ?? '?'}</span>
          {author?.nickname ?? '알 수 없음'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-placeholder)' }}>
            조회 {post.views}
          </span>
          <button onClick={e => { e.stopPropagation(); if (currentUser) toggleLike(post.id, currentUser.id) }} style={{
            fontSize: '13px', color: isLiked ? 'var(--color-accent)' : 'var(--color-placeholder)',
            display: 'flex', alignItems: 'center', gap: '4px',
            transition: 'color var(--transition)',
          }}>
            ♥ {post.likes.length}
          </button>
          <span style={{ fontSize: '13px', color: 'var(--color-placeholder)' }}>
            댓글 {commentCount}
          </span>
          <button onClick={e => { e.stopPropagation(); if (currentUser) toggleBookmark(post.id) }} style={{
            fontSize: '14px',
            color: isBookmarked ? 'var(--color-accent)' : 'var(--color-placeholder)',
            transition: 'color var(--transition)',
          }}>
            {isBookmarked ? '★' : '☆'}
          </button>
        </div>
      </div>
    </article>
  )
}
