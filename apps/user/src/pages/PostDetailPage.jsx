import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { ahaScore } from '../store/algorithm.js'
import ReactionBar from '../components/ReactionBar.jsx'
import CommentSection from '../components/CommentSection'

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

function renderBody(body) {
  if (!body) return null
  return body.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: 'var(--text-display)', fontWeight: 600, color: 'var(--color-ink)', margin: '32px 0 12px' }}>{line.slice(3)}</h3>
    if (line.startsWith('# '))  return <h2 key={i} style={{ fontSize: 'var(--text-display-lg)', fontWeight: 600, color: 'var(--color-ink)', margin: '40px 0 16px' }}>{line.slice(2)}</h2>
    if (line.startsWith('- '))  return <li key={i} style={{ fontSize: 'var(--text-body)', lineHeight: 1.75, color: 'var(--color-body)', marginLeft: 20, marginBottom: 4 }}>{line.slice(2)}</li>
    if (/^\d+\./.test(line))    return <li key={i} style={{ fontSize: 'var(--text-body)', lineHeight: 1.75, color: 'var(--color-body)', marginLeft: 20, marginBottom: 4 }}>{line.replace(/^\d+\.\s/, '')}</li>
    if (!line.trim())            return <div key={i} style={{ height: 12 }} />
    return <p key={i} style={{ fontSize: 'var(--text-body)', lineHeight: 1.85, color: 'var(--color-body)', marginBottom: 4 }}>{line}</p>
  })
}

export default function PostDetailPage({ postId, navigate, prevPage }) {
  const { currentUser, toggleBookmark, getUserById, toggleFollow } = useAuth()
  const { allPosts, blockedIds, toggleLike, categories, getCommentsByPostId, incrementView } = useApp()
  const [copied, setCopied] = useState(false)
  const hasViewed = useRef(false)

  // allPosts에서 직접 find → toggleLike/incrementView 후 즉시 반영
  const post = blockedIds?.has(postId) ? null : (allPosts || []).find(p => p.id === postId) ?? null

  // 조회수: 이 인스턴스 마운트 시 1회만
  useEffect(() => {
    if (!hasViewed.current && postId) {
      hasViewed.current = true
      incrementView(postId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function goBack() {
    // prevPage는 ref에서 읽은 값이라 항상 정확
    navigate(prevPage || 'board')
  }

  if (!post) return (
    <div className="text-center py-5">
      <p className="text-muted mb-3">게시글을 찾을 수 없습니다.</p>
      <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => navigate('board')}>
        게시판으로
      </button>
    </div>
  )

  const likes        = Array.isArray(post.likes) ? post.likes : []
  const comments     = getCommentsByPostId(post.id)
  const author       = getUserById(post.authorId)
  const category     = categories.find(c => c.id === post.categoryId)
  const isLiked      = !!currentUser && likes.includes(currentUser.id)
  const isBookmarked = currentUser?.bookmarks?.includes(post.id) ?? false
  const isFollowing  = currentUser?.following?.includes(post.authorId) ?? false
  const isMe         = currentUser?.id === post.authorId
  const score        = ahaScore(post, comments.length)

  function handleShare() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  // 투명 아웃라인 버튼 (Bootstrap 간섭 없는 순수 인라인)
  const ghostBtn = (active, danger) => ({
    background: 'transparent',
    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-hairline)'}`,
    borderRadius: 'var(--r-pill)',
    padding: '6px 14px',
    fontSize: 14,
    color: danger ? '#dc3545' : active ? 'var(--color-primary)' : 'var(--color-muted-48)',
    cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 5,
    transition: 'all 0.15s',
    userSelect: 'none',
    outline: 'none',
    boxShadow: 'none',
    lineHeight: 1.4,
  })

  return (
    <article className="fade-up" style={{ maxWidth: 720, paddingTop: 24 }}>

      {/* 뒤로가기 */}
      <button type="button" onClick={goBack} style={{
        background: 'transparent', border: 'none', padding: 0,
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 14, color: 'var(--color-muted-48)',
        marginBottom: 24, cursor: 'pointer',
        outline: 'none', boxShadow: 'none',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted-48)'}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        뒤로
      </button>

      {/* 배지 */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {score > 8  && <span className="badge badge-hot">🔥 바이럴</span>}
        {score > 5 && score <= 8 && <span className="badge badge-hot">HOT</span>}
        {category   && <small style={{ color: 'var(--color-muted-48)' }}>{category.icon} {category.name}</small>}
        <small style={{ color: 'var(--color-muted-48)' }}>· {timeAgo(post.createdAt)}</small>
        <small style={{ color: 'var(--color-muted-48)' }}>· 조회 {post.views ?? 0}</small>
      </div>

      {/* 제목 */}
      <h1 style={{ fontSize: 'clamp(22px,5vw,38px)', fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.02em', color: 'var(--color-ink)', marginBottom: 20 }}>
        {post.title}
      </h1>

      {/* 작성자 + 액션 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingBottom: 20, borderBottom: '1px solid var(--color-divider)', marginBottom: 28 }}>
        <button type="button" onClick={() => navigate(`profile/${post.authorId}`)}
          style={{ background: 'transparent', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', outline: 'none' }}>
          <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
            {author?.nickname?.[0] ?? '?'}
          </span>
          <div style={{ textAlign: 'left' }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-ink)' }}>{author?.nickname}</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted-48)' }}>팔로워 {author?.followers?.length ?? 0}명</p>
          </div>
        </button>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!isMe && currentUser && (
            <button type="button" onClick={() => toggleFollow(post.authorId)} style={ghostBtn(isFollowing)}>
              {isFollowing ? '✓ 팔로잉' : '+ 팔로우'}
            </button>
          )}
          <button type="button"
            onClick={() => currentUser ? toggleLike(post.id, currentUser.id) : navigate('login')}
            style={ghostBtn(isLiked)}
            title={currentUser ? '좋아요' : '로그인 후 이용 가능'}>
            ♥ {likes.length}
          </button>
          <button type="button"
            onClick={() => currentUser ? toggleBookmark(post.id) : navigate('login')}
            style={ghostBtn(isBookmarked)}>
            {isBookmarked ? '★ 저장됨' : '☆ 저장'}
          </button>
          <button type="button" onClick={handleShare} style={ghostBtn(copied)}>
            {copied ? '✓ 복사됨' : '↗ 공유'}
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div style={{ paddingBottom: 28 }}>{renderBody(post.body)}</div>

      {/* 태그 */}
      {post.tags?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
          {post.tags.map(tag => (
            <span key={tag} style={{ fontSize: 13, padding: '4px 12px', borderRadius: 'var(--r-pill)', background: 'var(--color-parchment)', color: 'var(--color-muted-80)' }}>#{tag}</span>
          ))}
        </div>
      )}

      {/* 이모지 반응 */}
      <div style={{ padding: '18px 0', borderTop: '1px solid var(--color-divider)', borderBottom: '1px solid var(--color-divider)', marginBottom: 36 }}>
        <p style={{ fontSize: 13, color: 'var(--color-muted-48)', marginBottom: 12, fontWeight: 600 }}>이 글 어떠셨나요?</p>
        <ReactionBar postId={post.id} compact={false} />
      </div>

      {/* 댓글 */}
      <CommentSection postId={post.id} navigate={navigate} />
    </article>
  )
}
