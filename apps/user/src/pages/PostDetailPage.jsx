import { useEffect, useState, useRef } from 'react'
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
    if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: 'var(--text-display)', fontWeight: 600, color: 'var(--color-ink)', margin: '32px 0 12px', letterSpacing: '-0.374px' }}>{line.slice(3)}</h3>
    if (line.startsWith('# '))  return <h2 key={i} style={{ fontSize: 'var(--text-display-lg)', fontWeight: 600, color: 'var(--color-ink)', margin: '40px 0 16px', letterSpacing: '-0.374px' }}>{line.slice(2)}</h2>
    if (line.startsWith('- '))  return <li key={i} style={{ fontSize: 'var(--text-body)', lineHeight: 1.75, color: 'var(--color-body)', marginLeft: 20, marginBottom: 4 }}>{line.slice(2)}</li>
    if (/^\d+\./.test(line))    return <li key={i} style={{ fontSize: 'var(--text-body)', lineHeight: 1.75, color: 'var(--color-body)', marginLeft: 20, marginBottom: 4 }}>{line.replace(/^\d+\.\s/, '')}</li>
    if (line === '')             return <div key={i} style={{ height: 12 }} />
    return <p key={i} style={{ fontSize: 'var(--text-body)', lineHeight: 1.85, color: 'var(--color-body)', marginBottom: 4 }}>{line}</p>
  })
}

export default function PostDetailPage({ postId, navigate }) {
  const { currentUser, toggleBookmark, getUserById, toggleFollow } = useAuth()
  const { getPostById, toggleLike, categories, comments, incrementView } = useApp()
  const [copied, setCopied] = useState(false)
  const hasViewed = useRef(false)

  const post = getPostById(postId)

  useEffect(() => {
    if (post && !hasViewed.current) {
      hasViewed.current = true
      incrementView(postId)
    }
  }, [postId, post])

  if (!post) return (
    <div className="text-center py-5">
      <p className="text-muted mb-3">게시글을 찾을 수 없습니다.</p>
      <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('board')}>게시판으로</button>
    </div>
  )

  const author        = getUserById(post.authorId)
  const category      = categories.find(c => c.id === post.categoryId)
  const commentCount  = comments.filter(c => c.postId === post.id).length
  const isLiked       = post.likes.includes(currentUser?.id)
  const isBookmarked  = currentUser?.bookmarks?.includes(post.id)
  const isFollowing   = currentUser?.following?.includes(post.authorId)
  const isMe          = currentUser?.id === post.authorId
  const score         = ahaScore(post, commentCount)
  const isViral       = score > 8
  const isRising      = score > 3 && (Date.now() - new Date(post.createdAt).getTime()) < 3 * 3600000
  const isHot         = score > 5

  function handleShare() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  // 공통 고스트 버튼 스타일 (배경 투명)
  const ghostBtn = {
    background: 'transparent',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--r-pill)',
    padding: '7px 16px',
    fontSize: 'var(--text-caption)',
    cursor: 'pointer',
    transition: 'background-color 0.15s, border-color 0.15s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
  }

  return (
    <article className="fade-up" style={{ maxWidth: 720, paddingTop: 24 }}>

      {/* ── 뒤로가기 ── */}
      <button
        onClick={() => window.history.length > 1 ? window.history.back() : navigate('board')}
        style={{
          background: 'transparent', border: 'none', padding: 0,
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)',
          marginBottom: 24, cursor: 'pointer',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted-48)'}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        뒤로
      </button>

      {/* ── 배지 + 메타 ── */}
      <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
        {isViral  && <span className="badge badge-hot">🔥 바이럴</span>}
        {!isViral && isRising && <span className="badge badge-rising">↑ 급상승</span>}
        {!isViral && !isRising && isHot && <span className="badge badge-hot">HOT</span>}
        {post.type === 'crawled' && (
          <span className="badge rounded-pill fw-normal"
            style={{ fontSize: 10, color: 'var(--color-primary)', border: '1px solid rgba(0,102,204,0.25)', background: 'transparent' }}>
            큐레이션
          </span>
        )}
        {category && <small className="text-muted">{category.icon} {category.name}</small>}
        <small className="text-muted">· {timeAgo(post.createdAt)}</small>
        <small className="text-muted">· 조회 {post.views}</small>
      </div>

      {/* ── 제목 ── */}
      <h1 style={{ fontSize: 'clamp(24px,5vw,40px)', fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.02em', color: 'var(--color-ink)', marginBottom: 20 }}>
        {post.title}
      </h1>

      {/* ── 작성자 + 액션 ── */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 pb-4"
        style={{ borderBottom: '1px solid var(--color-divider)', marginBottom: 32 }}>
        {/* 작성자 */}
        <button
          onClick={() => navigate(`profile/${post.authorId}`)}
          style={{ background: 'transparent', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
            {author?.nickname?.[0] ?? '?'}
          </span>
          <div style={{ textAlign: 'left' }}>
            <p style={{ margin: 0, fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-ink)' }}>{author?.nickname}</p>
            <p style={{ margin: 0, fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)' }}>팔로워 {author?.followers?.length ?? 0}명</p>
          </div>
        </button>

        {/* 액션 버튼 */}
        <div className="d-flex gap-2 flex-wrap">
          {/* 팔로우 */}
          {!isMe && currentUser && (
            <button
              onClick={() => toggleFollow(post.authorId)}
              style={{
                ...ghostBtn,
                background: isFollowing ? 'var(--color-parchment)' : 'var(--color-primary)',
                border: isFollowing ? '1px solid var(--color-hairline)' : '1px solid var(--color-primary)',
                color: isFollowing ? 'var(--color-ink)' : '#fff',
              }}>
              {isFollowing ? '✓ 팔로잉' : '+ 팔로우'}
            </button>
          )}
          {/* 좋아요 */}
          <button
            onClick={() => currentUser && toggleLike(post.id, currentUser.id)}
            style={{
              ...ghostBtn,
              color: isLiked ? 'var(--color-primary)' : 'var(--color-muted-48)',
              borderColor: isLiked ? 'var(--color-primary)' : 'var(--color-hairline)',
            }}>
            ♥ {post.likes.length}
          </button>
          {/* 저장 */}
          <button
            onClick={() => currentUser && toggleBookmark(post.id)}
            style={{
              ...ghostBtn,
              color: isBookmarked ? 'var(--color-primary)' : 'var(--color-muted-48)',
              borderColor: isBookmarked ? 'var(--color-primary)' : 'var(--color-hairline)',
            }}>
            {isBookmarked ? '★ 저장됨' : '☆ 저장'}
          </button>
          {/* 공유 */}
          <button
            onClick={handleShare}
            style={{
              ...ghostBtn,
              color: copied ? 'var(--color-primary)' : 'var(--color-muted-48)',
            }}>
            {copied ? '✓ 복사됨' : '↗ 공유'}
          </button>
        </div>
      </div>

      {/* ── 본문 ── */}
      <div style={{ paddingBottom: 32 }}>
        {renderBody(post.body)}
      </div>

      {/* ── 태그 ── */}
      {post.tags?.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-4">
          {post.tags.map(tag => (
            <span key={tag} style={{ fontSize: 'var(--text-caption)', padding: '4px 14px', borderRadius: 'var(--r-pill)', background: 'var(--color-parchment)', color: 'var(--color-muted-80)' }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* ── 이모지 반응 ── */}
      <div style={{ padding: '20px 0', borderTop: '1px solid var(--color-divider)', borderBottom: '1px solid var(--color-divider)', marginBottom: 40 }}>
        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)', marginBottom: 12, fontWeight: 600 }}>
          이 글 어떠셨나요?
        </p>
        <ReactionBar postId={post.id} compact={false} />
      </div>

      {/* ── 댓글 ── */}
      <CommentSection postId={post.id} navigate={navigate} />
    </article>
  )
}
