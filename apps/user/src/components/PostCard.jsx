import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

function timeAgo(dateString) {
  const diff = Date.now() - new Date(dateString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

export default function PostCard({ post, navigate }) {
  const { currentUser, toggleBookmark, getUserById } = useAuth()
  const { toggleLike, categories, comments } = useApp()
  const author = getUserById(post.authorId)
  const category = categories.find(c => c.id === post.categoryId)
  const commentCount = comments.filter(c => c.postId === post.id).length
  const isLiked = currentUser && post.likes.includes(currentUser.id)
  const isBookmarked = currentUser && currentUser.bookmarks.includes(post.id)

  return (
    <article
      className="card fade-up"
      style={{ padding: '20px 24px', cursor: 'pointer' }}
      onClick={() => navigate(`post/${post.id}`)}
    >
      {/* 메타 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {post.type === 'crawled' && (
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(255,107,53,0.15)', color: 'var(--color-accent2)', border: '1px solid rgba(255,107,53,0.3)' }}>
            큐레이션
          </span>
        )}
        {category && (
          <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
            {category.icon} {category.name}
          </span>
        )}
        <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>·</span>
        <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{timeAgo(post.createdAt)}</span>
      </div>

      {/* 제목 */}
      <h3 style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.4, marginBottom: '8px' }}>
        {post.title}
      </h3>

      {/* 본문 미리보기 */}
      <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: 1.6, marginBottom: '14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {post.body.replace(/#+\s/g, '').replace(/\n/g, ' ')}
      </p>

      {/* 태그 */}
      {post.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {post.tags.slice(0, 4).map(tag => (
            <span key={tag} className="tag"># {tag}</span>
          ))}
        </div>
      )}

      {/* 하단 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '22px', height: '22px', borderRadius: '50%',
            background: 'var(--color-accent)', color: '#000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 700, flexShrink: 0,
          }}>{author?.nickname?.[0] ?? '?'}</span>
          <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{author?.nickname ?? '알 수 없음'}</span>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>👁 {post.views}</span>
          <button
            onClick={e => { e.stopPropagation(); if (currentUser) toggleLike(post.id, currentUser.id) }}
            style={{ fontSize: '12px', color: isLiked ? 'var(--color-accent2)' : 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '4px', transition: 'var(--transition)' }}
          >
            {isLiked ? '🧡' : '🤍'} {post.likes.length}
          </button>
          <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>💬 {commentCount}</span>
          <button
            onClick={e => { e.stopPropagation(); if (currentUser) toggleBookmark(post.id) }}
            style={{ fontSize: '14px', color: isBookmarked ? 'var(--color-accent)' : 'var(--color-muted)', transition: 'var(--transition)' }}
          >
            {isBookmarked ? '★' : '☆'}
          </button>
        </div>
      </div>
    </article>
  )
}
