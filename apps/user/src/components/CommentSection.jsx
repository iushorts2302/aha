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
    <section style={{ marginTop: '40px' }}>
      <h4 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '20px' }}>
        댓글 <span style={{ color: 'var(--color-accent)' }}>{comments.length}</span>
      </h4>

      {currentUser ? (
        <form onSubmit={handleSubmit} style={{ marginBottom: '28px' }}>
          <textarea className="input" style={{ minHeight: '80px', marginBottom: '10px' }}
            placeholder="댓글을 입력하세요..." value={body} onChange={e => setBody(e.target.value)} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary btn-sm" style={{ opacity: body.trim() ? 1 : 0.4, minWidth: '80px' }}
              disabled={!body.trim()}>등록</button>
          </div>
        </form>
      ) : (
        <div style={{
          padding: '16px', background: 'var(--color-surface)',
          borderRadius: 'var(--radius-btn)', marginBottom: '28px',
          fontSize: '14px', color: 'var(--color-muted)', textAlign: 'center',
        }}>
          댓글을 작성하려면{' '}
          <button onClick={() => navigate('login')} style={{ color: 'var(--color-accent)', fontWeight: 500 }}>로그인</button>
          이 필요합니다.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {comments.length === 0 ? (
          <p style={{ fontSize: '14px', color: 'var(--color-placeholder)', textAlign: 'center', padding: '32px 0' }}>
            첫 번째 댓글을 남겨보세요.
          </p>
        ) : comments.map(comment => {
          const author = getUserById(comment.authorId)
          const isOwner = currentUser?.id === comment.authorId
          return (
            <div key={comment.id} style={{
              padding: '16px 0', borderBottom: '1px solid var(--color-border-soft)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button onClick={() => navigate(`profile/${comment.authorId}`)} style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: 'var(--color-accent)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 600, flexShrink: 0,
                  }}>{author?.nickname?.[0] ?? '?'}</button>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)' }}>{author?.nickname}</span>
                  <span style={{ fontSize: '12px', color: 'var(--color-placeholder)' }}>{timeAgo(comment.createdAt)}</span>
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
              <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--color-body)', paddingLeft: '30px' }}>
                {comment.body}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
