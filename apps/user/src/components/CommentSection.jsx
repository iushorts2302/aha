import { useState } from 'react'
import ReportButton from './ReportButton.jsx'
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

  // 매 렌더마다 최신 댓글 목록 참조
  const comments = getCommentsByPostId(postId)

  function handleSubmit() {
    if (!body.trim() || !currentUser) return
    addComment(postId, currentUser.id, body.trim())
    setBody('')
  }

  return (
    <section style={{ marginTop: 40 }}>
      <h4 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 20 }}>
        댓글{' '}
        <span style={{ color: 'var(--color-muted-48)', fontWeight: 400, fontSize: 14 }}>
          {comments.length}
        </span>
      </h4>

      {/* 입력 영역 */}
      {currentUser ? (
        <div style={{ marginBottom: 28 }}>
          <textarea
            style={{
              width: '100%', minHeight: 88,
              padding: '12px 16px', marginBottom: 10,
              fontSize: 15, lineHeight: 1.6,
              border: '1px solid var(--color-hairline)',
              borderRadius: 16, outline: 'none',
              resize: 'vertical', boxSizing: 'border-box',
              fontFamily: 'inherit',
              background: '#fff', color: 'var(--color-ink)',
              transition: 'border-color 0.15s',
            }}
            placeholder="댓글을 입력하세요..."
            value={body}
            onChange={e => setBody(e.target.value)}
            onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--color-hairline)'}
            onKeyDown={e => {
              // Ctrl+Enter / Cmd+Enter 로 제출
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit()
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-muted-48)' }}>
              Ctrl+Enter
            </span>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!body.trim()}
              style={{
                background: body.trim() ? 'var(--color-primary)' : 'var(--color-hairline)',
                color: body.trim() ? '#fff' : 'var(--color-muted-48)',
                border: 'none',
                borderRadius: 'var(--r-pill)',
                padding: '8px 20px',
                fontSize: 14, fontWeight: 500,
                cursor: body.trim() ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.15s',
                outline: 'none',
              }}>
              댓글 작성
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          padding: 20, background: 'var(--color-parchment)',
          borderRadius: 'var(--r-lg)', marginBottom: 24,
          textAlign: 'center', fontSize: 15, color: 'var(--color-muted-48)',
        }}>
          <button
            type="button"
            onClick={() => navigate('login')}
            style={{ color: 'var(--color-primary)', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 15 }}>
            로그인
          </button>
          {' '}후 댓글을 작성할 수 있습니다.
        </div>
      )}

      {/* 댓글 목록 */}
      <div>
        {comments.length === 0 && (
          <p style={{ fontSize: 15, color: 'var(--color-muted-48)', padding: '20px 0' }}>
            첫 번째 댓글을 남겨보세요.
          </p>
        )}
        {comments.map(comment => {
          const author  = getUserById(comment.authorId)
          const isOwner = currentUser?.id === comment.authorId
          return (
            <div key={comment.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--color-divider)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => navigate(`profile/${comment.authorId}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      background: 'transparent', border: 'none', padding: 0,
                      fontSize: 14, fontWeight: 600, color: 'var(--color-ink)',
                      cursor: 'pointer', outline: 'none',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--color-ink)'}
                  >
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'var(--color-ink)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 600, flexShrink: 0,
                    }}>{author?.nickname?.[0] ?? '?'}</span>
                    {author?.nickname ?? '알 수 없음'}
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--color-muted-48)' }}>
                    {timeAgo(comment.createdAt)}
                  </span>
                </div>
                {isOwner ? (
                  <button
                    type="button"
                    onClick={() => deleteComment(comment.id)}
                    style={{
                      background: 'transparent', border: 'none', padding: 0,
                      fontSize: 12, color: 'var(--color-muted-48)', cursor: 'pointer', outline: 'none',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#dc3545'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted-48)'}
                  >삭제</button>
                ) : currentUser && (
                  <ReportButton targetType="comment" targetId={comment.id} compact />
                )}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-body)', margin: 0 }}>
                {comment.body}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
