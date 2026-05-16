import { useState } from 'react'
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
      <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '24px' }}>
        댓글 <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>{comments.length}</span>
      </h4>

      {/* 입력 */}
      {currentUser ? (
        <form onSubmit={handleSubmit} style={{ marginBottom: '32px' }}>
          <textarea
            className="input"
            style={{ minHeight: '88px', marginBottom: '10px', fontSize: '14px' }}
            placeholder="댓글을 입력하세요..."
            value={body}
            onChange={e => setBody(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" style={{ height: '36px', padding: '0 20px', opacity: body.trim() ? 1 : 0.4 }}>
              댓글 작성
            </button>
          </div>
        </form>
      ) : (
        <div style={{
          padding: '20px 0', borderTop: '1px solid var(--color-border-soft)',
          borderBottom: '1px solid var(--color-border-soft)', marginBottom: '24px',
          fontSize: '13px', color: 'var(--color-muted)', textAlign: 'center',
        }}>
          <button onClick={() => navigate('login')} style={{
            color: 'var(--color-ink)', fontWeight: 500, textDecoration: 'underline',
          }}>로그인</button>하면 댓글을 작성할 수 있습니다.
        </div>
      )}

      {/* 목록 */}
      <div>
        {comments.length === 0 && (
          <p style={{ fontSize: '14px', color: 'var(--color-placeholder)', padding: '24px 0' }}>
            첫 번째 댓글을 남겨보세요.
          </p>
        )}
        {comments.map(comment => {
          const author = getUserById(comment.authorId)
          const isOwner = currentUser?.id === comment.authorId
          return (
            <div key={comment.id} style={{
              padding: '20px 0',
              borderBottom: '1px solid var(--color-border-soft)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button onClick={() => navigate(`profile/${comment.authorId}`)} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)',
                  }}>
                    <span style={{
                      width: '22px', height: '22px', borderRadius: '50%',
                      background: 'var(--color-ink)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px', fontWeight: 600,
                    }}>{author?.nickname?.[0] ?? '?'}</span>
                    {author?.nickname ?? '알 수 없음'}
                  </button>
                  <span style={{ fontSize: '12px', color: 'var(--color-placeholder)' }}>
                    {timeAgo(comment.createdAt)}
                  </span>
                </div>
                {isOwner && (
                  <button onClick={() => deleteComment(comment.id)} style={{
                    fontSize: '12px', color: 'var(--color-placeholder)',
                    transition: 'color var(--transition)',
                  }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--color-placeholder)'}
                  >삭제</button>
                )}
              </div>
              <p style={{ fontSize: '14px', color: 'var(--color-body)', lineHeight: 1.65 }}>{comment.body}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
