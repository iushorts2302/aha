import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  return `${Math.floor(m / 60 < 24 ? m / 60 : m / 1440)}${m / 60 < 24 ? '시간' : '일'} 전`
}

export default function CommentSection({ postId, navigate }) {
  const { currentUser, getUserById } = useAuth()
  const { getCommentsByPostId, addComment, deleteComment } = useApp()
  const [body, setBody] = useState('')
  const comments = getCommentsByPostId(postId)

  function handleSubmit(e) {
    e.preventDefault()
    if (!body.trim() || !currentUser) return
    addComment(postId, currentUser.id, body.trim())
    setBody('')
  }

  return (
    <section style={{ marginTop: '48px' }}>
      {/* 헤더 */}
      <h4 style={{
        fontSize: 'var(--text-tagline)',   /* 21px */
        fontWeight: 600, lineHeight: 1.19, letterSpacing: '0.231px',
        color: 'var(--color-ink)', marginBottom: '20px',
      }}>
        댓글 <span style={{ color: 'var(--color-muted-48)', fontWeight: 400, fontSize: 'var(--text-body)' }}>{comments.length}</span>
      </h4>

      {/* 입력 */}
      {currentUser ? (
        <form onSubmit={handleSubmit} style={{ marginBottom: '32px' }}>
          <textarea className="input" style={{
            minHeight: '88px', marginBottom: '10px',
            fontSize: 'var(--text-body)', borderRadius: '18px',
          }}
            placeholder="댓글을 입력하세요..."
            value={body} onChange={e => setBody(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary btn-sm" disabled={!body.trim()} style={{ opacity: body.trim() ? 1 : 0.4 }}>
              댓글 작성
            </button>
          </div>
        </form>
      ) : (
        <div style={{
          padding: '20px', background: 'var(--color-parchment)',
          borderRadius: 'var(--r-lg)', marginBottom: '24px',
          textAlign: 'center', fontSize: 'var(--text-body)', color: 'var(--color-muted-48)',
        }}>
          <button onClick={() => navigate('login')} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>로그인</button>하면 댓글을 작성할 수 있습니다.
        </div>
      )}

      {/* 목록 */}
      <div>
        {comments.length === 0 && (
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-muted-48)', padding: '24px 0', fontWeight: 400 }}>
            첫 번째 댓글을 남겨보세요.
          </p>
        )}
        {comments.map(comment => {
          const author = getUserById(comment.authorId)
          const isOwner = currentUser?.id === comment.authorId
          return (
            <div key={comment.id} style={{ padding: '20px 0', borderBottom: '1px solid var(--color-divider)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button onClick={() => navigate(`profile/${comment.authorId}`)} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: 'var(--text-body)', fontWeight: 600,
                    letterSpacing: '-0.374px', color: 'var(--color-ink)',
                    transition: 'color var(--transition)',
                  }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--color-ink)'}
                  >
                    <span style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: 'var(--color-ink)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 600,
                    }}>{author?.nickname?.[0] ?? '?'}</span>
                    {author?.nickname ?? '알 수 없음'}
                  </button>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)' }}>
                    {timeAgo(comment.createdAt)}
                  </span>
                </div>
                {isOwner && (
                  <button onClick={() => deleteComment(comment.id)} style={{
                    fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)',
                    transition: 'color var(--transition)',
                  }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted-48)'}
                  >삭제</button>
                )}
              </div>
              <p style={{ fontSize: 'var(--text-body)', fontWeight: 400, lineHeight: 1.47, letterSpacing: '-0.374px', color: 'var(--color-body)' }}>
                {comment.body}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
