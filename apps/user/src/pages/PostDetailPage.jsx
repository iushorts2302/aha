import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { postAPI } from '../api/client.js'
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
  const [dbPost, setDbPost] = useState(null)  // DB 직접 조회 폴백
  const [loadingDb, setLoadingDb] = useState(false)
  const hasViewed = useRef(false)

  // 1단계: allPosts(localStorage + DB 머지)에서 검색 — 안전한 String 비교
  const localPost = blockedIds?.has(String(postId)) ? null
    : (allPosts || []).find(p => String(p.id) === String(postId)) ?? null

  // 2단계: localStorage에 없으면 DB에서 직접 조회 (딥링크/새로고침 대응)
  useEffect(() => {
    if (localPost || !postId) return
    // postId가 숫자 형식이면 DB seq_no로 조회 시도
    if (!/^\d+$/.test(String(postId))) return  // 'p123456...' 형식은 localStorage 전용
    setLoadingDb(true)
    postAPI.get(postId)
      .then(d => {
        if (!d || d.error) { setDbPost(null); return }
        // DB 응답 → PostCard에서 쓰는 형식으로 정규화
        setDbPost({
          id:         String(d.seq_no),
          seq_no:     d.seq_no,
          authorId:   String(d.author_seq_no),
          authorNickname: d.author_nickname || '',
          categoryId: d.category_id || null,
          title:      d.title || '',
          body:       d.body || '',
          tags:       d.tags || [],
          likes:      [],
          views:      d.view_count || 0,
          view_count: d.view_count || 0,
          like_count: d.like_count || 0,
          comment_count: d.comment_count || 0,
          createdAt:  d.created_at,
          created_at: d.created_at,
          status:     d.status,
          type:       d.post_type || 'user',
        })
      })
      .catch(() => setDbPost(null))
      .finally(() => setLoadingDb(false))
  }, [postId, localPost])

  const post = localPost || dbPost

  // 조회수: 이 인스턴스 마운트 시 1회만
  useEffect(() => {
    if (!hasViewed.current && postId && post) {
      hasViewed.current = true
      incrementView(postId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post])

  function goBack() {
    navigate(prevPage || 'board')
  }

  // DB 조회 중 → 로딩 표시
  if (!post && loadingDb) return (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status" style={{ width: 32, height: 32 }}>
        <span className="visually-hidden">불러오는 중...</span>
      </div>
      <p className="text-muted mt-3" style={{ fontSize: 13 }}>게시글을 불러오는 중...</p>
    </div>
  )

  if (!post) return (
    <div className="text-center py-5">
      <p className="text-muted mb-3">게시글을 찾을 수 없습니다.</p>
      <p className="text-muted small mb-3">이미 삭제되었거나 비공개 처리되었을 수 있습니다.</p>
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
  const isBookmarked = currentUser?.bookmarks?.includes(String(post.id)) ?? false
  const isFollowing  = currentUser?.following?.includes(String(post.authorId)) ?? false
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
