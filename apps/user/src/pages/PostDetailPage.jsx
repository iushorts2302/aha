import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { ahaScore } from '../store/algorithm.js'
import ReactionBar from '../components/ReactionBar.jsx'
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
  if (!body) return null
  return body.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--color-ink)', margin: 'var(--space-8) 0 var(--space-4)', letterSpacing: '-0.01em' }}>{line.slice(3)}</h3>
    if (line.startsWith('# '))  return <h2 key={i} style={{ fontSize: 'var(--text-display-md)', fontWeight: 600, color: 'var(--color-ink)', margin: 'var(--space-8) 0 var(--space-5)' }}>{line.slice(2)}</h2>
    if (line.startsWith('- '))  return <li key={i} style={{ fontSize: 'var(--text-md)', lineHeight: 1.75, color: 'var(--color-body)', marginLeft: 'var(--space-5)', marginBottom: 'var(--space-2)' }}>{line.slice(2)}</li>
    if (line.match(/^\d+\./))  return <li key={i} style={{ fontSize: 'var(--text-md)', lineHeight: 1.75, color: 'var(--color-body)', marginLeft: 'var(--space-5)', marginBottom: 'var(--space-2)' }}>{line.replace(/^\d+\.\s/, '')}</li>
    if (line === '') return <div key={i} style={{ height: 'var(--space-4)' }} />
    return <p key={i} style={{ fontSize: 'var(--text-md)', lineHeight: 1.85, color: 'var(--color-body)' }}>{line}</p>
  })
}

export default function PostDetailPage({ postId, navigate }) {
  const { currentUser, toggleBookmark, getUserById, toggleFollow } = useAuth()
  const { getPostById, toggleLike, categories, comments, incrementView } = useApp()
  const post = getPostById(postId)
  const [copied, setCopied] = useState(false)

  useEffect(() => { if (post) incrementView(postId) }, [postId])

  if (!post) return (
    <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
      <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-muted)', marginBottom: 'var(--space-5)' }}>게시글을 찾을 수 없습니다.</p>
      <button onClick={() => navigate('board')} className="btn-secondary">게시판으로</button>
    </div>
  )

  const author = getUserById(post.authorId)
  const category = categories.find(c => c.id === post.categoryId)
  const commentCount = comments.filter(c => c.postId === post.id).length
  const isLiked = post.likes.includes(currentUser?.id)
  const isBookmarked = currentUser?.bookmarks?.includes(post.id)
  const isFollowing = currentUser?.following.includes(post.authorId)
  const isMe = currentUser?.id === post.authorId

  const score = ahaScore(post, commentCount)
  const isViral   = score > 8
  const isRising  = score > 3 && (Date.now() - new Date(post.createdAt).getTime()) < 3 * 3600000
  const isHot     = score > 5

  function handleShare() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <article className="fade-up" style={{ maxWidth: '720px', paddingTop: 'var(--space-6)' }}>

      {/* 뒤로 */}
      <button onClick={() => navigate('board')} style={{
        fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginBottom: 'var(--space-6)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)', transition: 'color var(--transition)',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-ink)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted)'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        게시판으로
      </button>

      {/* 배지 + 메타 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {isViral  && <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', background: '#FF4500', color: '#fff', borderRadius: '99px' }}>🔥 바이럴</span>}
        {!isViral && isRising && <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', background: 'var(--color-primary)', color: '#FFFFFF', borderRadius: '99px' }}>↑ 급상승</span>}
        {!isViral && !isRising && isHot && <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', background: '#FF4500', color: '#fff', borderRadius: '99px' }}>HOT</span>}
        {post.type === 'crawled' && <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', color: 'var(--color-primary)', border: '1px solid rgba(0,213,100,0.3)', borderRadius: '99px' }}>큐레이션</span>}
        {category && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)' }}>{category.icon} {category.name}</span>}
        <span style={{ fontSize: '12px', color: 'var(--color-placeholder)' }}>· {timeAgo(post.createdAt)}</span>
        <span style={{ fontSize: '12px', color: 'var(--color-placeholder)' }}>· 조회 {post.views}</span>
      </div>

      {/* 제목 */}
      <h1 style={{ fontSize: 'var(--text-display-lg)', fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.02em', lineHeight: 1.3, marginBottom: 'var(--space-6)' }}>
        {post.title}
      </h1>

      {/* 작성자 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-border-soft)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <button onClick={() => navigate(`profile/${post.authorId}`)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', transition: 'opacity var(--transition)' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <span style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-md)', fontWeight: 600, flexShrink: 0 }}>
            {author?.nickname?.[0] ?? '?'}
          </span>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-ink)' }}>{author?.nickname}</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>팔로워 {author?.followers?.length ?? 0}명</p>
          </div>
        </button>

        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* 팔로우 버튼 */}
          {!isMe && currentUser && (
            <button onClick={() => toggleFollow(post.authorId)} className={isFollowing ? 'btn btn-secondary' : 'btn btn-primary'}
              style={{ height: '34px', padding: '0 var(--space-4)', minWidth: 'unset', fontSize: 'var(--text-xs)' }}>
              {isFollowing ? '팔로잉' : '+ 팔로우'}
            </button>
          )}
          {/* 좋아요 */}
          <button onClick={() => currentUser && toggleLike(post.id, currentUser.id)} className="btn-secondary"
            style={{ height: '34px', padding: '0 var(--space-4)', minWidth: 'unset', color: isLiked ? 'var(--color-primary)' : undefined, borderColor: isLiked ? 'var(--color-primary)' : undefined }}>
            ♥ {post.likes.length}
          </button>
          {/* 저장 */}
          <button onClick={() => currentUser && toggleBookmark(post.id)} className="btn-secondary"
            style={{ height: '34px', padding: '0 var(--space-4)', minWidth: 'unset', color: isBookmarked ? 'var(--color-ink)' : undefined }}>
            {isBookmarked ? '★ 저장됨' : '☆ 저장'}
          </button>
          {/* 공유 */}
          <button onClick={handleShare} className="btn-secondary"
            style={{ height: '34px', padding: '0 var(--space-4)', minWidth: 'unset', color: copied ? 'var(--color-primary)' : undefined }}>
            {copied ? '✓ 복사됨' : '↗ 공유'}
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div style={{ padding: 'var(--space-8) 0 var(--space-6)' }}>
        {renderBody(post.body)}
      </div>

      {/* 태그 */}
      {post.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
          {post.tags.map(tag => (
            <span key={tag} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', background: 'var(--color-surface)', padding: 'var(--space-1) var(--space-4)', borderRadius: '99px', fontWeight: 700 }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 반응 바 (풀 사이즈) */}
      <div style={{ padding: 'var(--space-5) 0', borderTop: '1px solid var(--color-border-soft)', borderBottom: '1px solid var(--color-border-soft)', marginBottom: 'var(--space-6)' }}>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', marginBottom: 'var(--space-3)', fontWeight: 600 }}>이 글 어떠셨나요?</p>
        <ReactionBar postId={post.id} compact={false} />
      </div>

      {/* 댓글 */}
      <CommentSection postId={post.id} navigate={navigate} />
    </article>
  )
}
