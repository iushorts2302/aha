import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import CommentSection from '../components/CommentSection'

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${Math.max(1,m)}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h/24)}일 전`
}

function renderBody(body) {
  return body.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-ink)', margin: '20px 0 8px' }}>{line.slice(3)}</h3>
    if (line.startsWith('# ')) return <h2 key={i} style={{ fontSize: '18px', fontWeight: 500, margin: '24px 0 10px', color: 'var(--color-ink)' }}>{line.slice(2)}</h2>
    if (line.startsWith('- ')) return <li key={i} style={{ fontSize: '14px', lineHeight: 1.75, marginLeft: '20px', color: 'var(--color-body)' }}>{line.slice(2)}</li>
    if (line.match(/^\d+\./)) return <li key={i} style={{ fontSize: '14px', lineHeight: 1.75, marginLeft: '20px', color: 'var(--color-body)' }}>{line.replace(/^\d+\.\s/, '')}</li>
    if (line === '') return <div key={i} style={{ height: '10px' }} />
    return <p key={i} style={{ fontSize: '14px', lineHeight: 1.8, color: 'var(--color-body)' }}>{line}</p>
  })
}

export default function PostDetailPage({ postId, navigate }) {
  const { currentUser, toggleBookmark, getUserById } = useAuth()
  const { getPostById, toggleLike, categories, incrementView } = useApp()
  const post = getPostById(postId)

  useEffect(() => { if (post) incrementView(postId) }, [postId])

  if (!post) return (
    <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-muted)' }}>
      <p style={{ fontSize: '14px', marginBottom: '16px' }}>게시글을 찾을 수 없습니다.</p>
      <button onClick={() => navigate('board')} className="btn btn-secondary btn-sm">게시판으로</button>
    </div>
  )

  const author = getUserById(post.authorId)
  const category = categories.find(c => c.id === post.categoryId)
  const isLiked = currentUser && post.likes.includes(currentUser.id)
  const isBookmarked = currentUser && currentUser.bookmarks.includes(post.id)

  return (
    <article className="fade-up">
      <button onClick={() => navigate('board')} style={{
        fontSize: '13px', color: 'var(--color-muted)', marginBottom: '24px',
        display: 'flex', alignItems: 'center', gap: '6px',
        transition: 'color var(--transition)',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-ink)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted)'}
      >← 게시판</button>

      {/* 카테고리 & 날짜 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        {post.type === 'crawled' && (
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(62,106,225,0.08)', color: 'var(--color-accent)', fontWeight: 500 }}>큐레이션</span>
        )}
        {category && <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{category.icon} {category.name}</span>}
        <span style={{ fontSize: '13px', color: 'var(--color-placeholder)' }}>· {timeAgo(post.createdAt)}</span>
      </div>

      {/* 제목 */}
      <h1 style={{ fontSize: '24px', fontWeight: 500, lineHeight: 1.45, color: 'var(--color-ink)', letterSpacing: '-0.02em', marginBottom: '20px' }}>{post.title}</h1>

      {/* 작성자 & 액션 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid var(--color-border-soft)', flexWrap: 'wrap', gap: '12px' }}>
        <button onClick={() => navigate(`profile/${post.authorId}`)} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          transition: 'opacity var(--transition)',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600 }}>{author?.nickname?.[0] ?? '?'}</span>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-ink)' }}>{author?.nickname}</p>
            <p style={{ fontSize: '12px', color: 'var(--color-placeholder)' }}>팔로워 {author?.followers?.length ?? 0}명</p>
          </div>
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => currentUser && toggleLike(post.id, currentUser.id)}
            className="btn btn-secondary btn-sm"
            style={{ minWidth: 'unset', color: isLiked ? 'var(--color-accent)' : undefined, borderColor: isLiked ? 'var(--color-accent)' : undefined }}>
            ♥ {post.likes.length}
          </button>
          <button onClick={() => currentUser && toggleBookmark(post.id)}
            className="btn btn-secondary btn-sm"
            style={{ minWidth: 'unset', color: isBookmarked ? 'var(--color-accent)' : undefined, borderColor: isBookmarked ? 'var(--color-accent)' : undefined }}>
            {isBookmarked ? '★ 저장됨' : '☆ 저장'}
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div style={{ paddingBottom: '24px' }}>{renderBody(post.body)}</div>

      {/* 태그 */}
      {post.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '20px', borderTop: '1px solid var(--color-border-soft)' }}>
          {post.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
        </div>
      )}

      <CommentSection postId={post.id} navigate={navigate} />
    </article>
  )
}
