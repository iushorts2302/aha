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

  const author = getUserById(post.authorId)
  const category = categories.find(c => c.id === post.categoryId)
  const commentCount = comments.filter(c => c.postId === post.id).length
  const isLiked = post.likes.includes(currentUser?.id)
  const isBookmarked = currentUser?.bookmarks?.includes(post.id)

  const score = ahaScore(post, commentCount)
  const isViral  = score > 8
  const isRising = score > 3 && (Date.now() - new Date(post.createdAt).getTime()) < 3 * 3600000
  const isHot    = score > 5

  return (
    <article style={{
      padding: '20px 0',
      borderBottom: '1px solid var(--color-divider)',
      cursor: 'pointer',
    }} onClick={() => navigate(`post/${post.id}`)}>

      {/* 메타 행 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        {/* 알고리즘 배지 */}
        {isViral  && <span className="badge-hot">🔥 바이럴</span>}
        {!isViral && isRising && <span className="badge-rising">↑ 급상승</span>}
        {!isViral && !isRising && isHot && <span className="badge-hot">HOT</span>}

        {post.type === 'crawled' && (
          <span style={{
            fontSize: '10px', fontWeight: 600, padding: '2px 8px',
            color: 'var(--color-primary)',
            border: '1px solid rgba(0,102,204,0.25)',
            borderRadius: 'var(--r-pill)',
          }}>큐레이션</span>
        )}
        {category && (
          <span style={{ fontSize: 'var(--text-fine)', color: 'var(--color-muted-48)' }}>
            {category.icon} {category.name}
          </span>
        )}
        <span style={{ fontSize: 'var(--text-fine)', color: 'var(--color-muted-48)' }}>·</span>
        <span style={{ fontSize: 'var(--text-fine)', color: 'var(--color-muted-48)' }}>{timeAgo(post.createdAt)}</span>
      </div>

      {/* 제목 — Apple body-strong (17px/600) */}
      <h3 style={{
        fontSize: 'var(--text-body)',   /* 17px */
        fontWeight: 600,
        lineHeight: 1.24,
        letterSpacing: '-0.374px',
        color: 'var(--color-ink)',
        marginBottom: '6px',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-ink)'}
      >{post.title}</h3>

      {/* 미리보기 — Apple body (17px/400) */}
      <p style={{
        fontSize: 'var(--text-body)',
        fontWeight: 400,
        lineHeight: 1.47,
        letterSpacing: '-0.374px',
        color: 'var(--color-muted-48)',
        marginBottom: '12px',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>{post.body?.replace(/#+\s/g, '').replace(/\n/g, ' ')}</p>

      {/* 태그 — Apple chip */}
      {post.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {post.tags.slice(0, 4).map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      )}

      {/* 하단 바 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        {/* 작성자 */}
        <button onClick={e => { e.stopPropagation(); navigate(`profile/${post.authorId}`) }} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: 'var(--text-caption)',
          color: 'var(--color-muted-48)',
          transition: 'color var(--transition)',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted-48)'}
        >
          <span style={{
            width: '18px', height: '18px', borderRadius: '50%',
            background: 'var(--color-ink)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '9px', fontWeight: 600,
          }}>{author?.nickname?.[0] ?? '?'}</span>
          {author?.nickname ?? '알 수 없음'}
        </button>

        {/* 액션 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div onClick={e => e.stopPropagation()}>
            <ReactionBar postId={post.id} compact />
          </div>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)' }}>
            👁 {post.views}
          </span>
          <button onClick={e => { e.stopPropagation(); if (currentUser) toggleLike(post.id, currentUser.id) }} style={{
            fontSize: 'var(--text-caption)',
            color: isLiked ? 'var(--color-primary)' : 'var(--color-muted-48)',
            display: 'flex', alignItems: 'center', gap: '3px',
            transition: 'color var(--transition)',
          }}>♥ {post.likes.length}</button>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)' }}>
            💬 {commentCount}
          </span>
          <button onClick={e => { e.stopPropagation(); if (currentUser) toggleBookmark(post.id) }} style={{
            fontSize: '14px',
            color: isBookmarked ? 'var(--color-primary)' : 'var(--color-muted-48)',
            transition: 'color var(--transition)',
          }}>{isBookmarked ? '★' : '☆'}</button>
        </div>
      </div>
    </article>
  )
}
