import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { ahaScore } from '../store/algorithm.js'
import ReactionBar from './ReactionBar.jsx'

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
  const author       = getUserById(post.authorId)
  const category     = categories.find(c => c.id === post.categoryId)
  const commentCount = comments.filter(c => c.postId === post.id).length
  const isLiked      = post.likes.includes(currentUser?.id)
  const isBookmarked = currentUser?.bookmarks?.includes(post.id)
  const score        = ahaScore(post, commentCount)
  const isViral      = score > 8
  const isRising     = score > 3 && (Date.now() - new Date(post.createdAt).getTime()) < 3 * 3600000
  const isHot        = score > 5

  return (
    <article className="py-3 border-bottom" style={{ cursor: 'pointer' }} onClick={() => navigate(`post/${post.id}`)}>
      {/* 메타 */}
      <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
        {isViral  && <span className="badge badge-hot">🔥 바이럴</span>}
        {!isViral && isRising && <span className="badge badge-rising">↑ 급상승</span>}
        {!isViral && !isRising && isHot && <span className="badge badge-hot">HOT</span>}
        {post.type === 'crawled' && (
          <span className="badge rounded-pill fw-normal" style={{ fontSize: 10, color: 'var(--color-primary)', border: '1px solid rgba(0,102,204,0.25)', background: 'transparent' }}>큐레이션</span>
        )}
        {category && <small className="text-muted">{category.icon} {category.name}</small>}
        <small className="text-muted">· {timeAgo(post.createdAt)}</small>
      </div>

      {/* 제목 */}
      <h6 className="fw-semibold mb-1"
        style={{ letterSpacing: '-0.374px', transition: 'color 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = ''}>
        {post.title}
      </h6>

      {/* 미리보기 */}
      <p className="text-muted small mb-2"
        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.55 }}>
        {post.body?.replace(/#+\s/g, '').replace(/\n/g, ' ')}
      </p>

      {/* 태그 */}
      {post.tags?.length > 0 && (
        <div className="d-flex gap-1 flex-wrap mb-2">
          {post.tags.slice(0, 4).map(tag => <span key={tag} className="tag">{tag}</span>)}
        </div>
      )}

      {/* 하단 */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <button className="d-flex align-items-center gap-1 border-0 bg-transparent p-0 small text-muted"
          onClick={e => { e.stopPropagation(); navigate(`profile/${post.authorId}`) }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = ''}>
          <span className="rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 18, height: 18, background: 'var(--color-ink)', color: '#fff', fontSize: 9, fontWeight: 600 }}>
            {author?.nickname?.[0] ?? '?'}
          </span>
          {author?.nickname ?? '알 수 없음'}
        </button>
        <div className="d-flex align-items-center gap-3">
          <div onClick={e => e.stopPropagation()}>
            <ReactionBar postId={post.id} compact />
          </div>
          <small className="text-muted">👁 {post.views}</small>
          <button className="border-0 bg-transparent p-0 small"
            style={{ color: isLiked ? 'var(--color-primary)' : '#aaa', transition: 'color 0.2s' }}
            onClick={e => { e.stopPropagation(); if (currentUser) toggleLike(post.id, currentUser.id) }}>
            ♥ {post.likes.length}
          </button>
          <small className="text-muted">💬 {commentCount}</small>
          <button className="border-0 bg-transparent p-0"
            style={{ color: isBookmarked ? 'var(--color-primary)' : '#aaa', transition: 'color 0.2s' }}
            onClick={e => { e.stopPropagation(); if (currentUser) toggleBookmark(post.id) }}>
            {isBookmarked ? '★' : '☆'}
          </button>
        </div>
      </div>
    </article>
  )
}
