import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

function timeAgo(dateString) {
  const diff = Date.now() - new Date(dateString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
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
    <section style={{ marginTop: '32px' }}>
      <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>
        댓글 <span style={{ color: 'var(--color-accent)' }}>{comments.length}</span>
      </h4>

      {/* 댓글 입력 */}
      {currentUser ? (
        <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
          <textarea
            className="input"
            style={{ minHeight: '80px', resize: 'vertical', marginBottom: '8px' }}
            placeholder="댓글을 입력하세요..."
            value={body}
            onChange={e => setBody(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={!body.trim()} style={{ opacity: body.trim() ? 1 : 0.4 }}>
              댓글 작성
            </button>
          </div>
        </form>
      ) : (
        <div style={{
          padding: '16px', background: 'var(--color-surface2)',
          borderRadius: 'var(--radius-sm)', marginBottom: '24px',
          textAlign: 'center', fontSize: '13px', color: 'var(--color-muted)',
        }}>
          댓글을 작성하려면{' '}
          <button onClick={() => navigate('login')} style={{ color: 'var(--color-accent)', fontWeight: 600 }}>로그인</button>이 필요합니다.
        </div>
      )}

      {/* 댓글 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {comments.length === 0 && (
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', textAlign: 'center', padding: '24px' }}>
            첫 번째 댓글을 남겨보세요!
          </p>
        )}
        {comments.map(comment => {
          const author = getUserById(comment.authorId)
          const isOwner = currentUser?.id === comment.authorId
          return (
            <div key={comment.id} style={{
              padding: '14px 16px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button onClick={() => navigate(`profile/${comment.authorId}`)} style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: 'var(--color-accent)', color: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700,
                  }}>{author?.nickname?.[0] ?? '?'}</button>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{author?.nickname ?? '알 수 없음'}</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{timeAgo(comment.createdAt)}</span>
                </div>
                {isOwner && (
                  <button
                    onClick={() => deleteComment(comment.id)}
                    style={{ fontSize: '11px', color: 'var(--color-danger)' }}
                  >삭제</button>
                )}
              </div>
              <p style={{ fontSize: '14px', lineHeight: 1.6 }}>{comment.body}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
