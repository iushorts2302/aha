import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

function renderPreview(body) {
  if (!body) return <p style={{ color: 'var(--color-placeholder)', fontSize: 'var(--text-sm)' }}>미리보기...</p>
  return body.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: 'var(--text-xl)', fontWeight: 600, margin: '16px 0 8px', color: 'var(--color-ink)' }}>{line.slice(3)}</h3>
    if (line.startsWith('# '))  return <h2 key={i} style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, margin: '20px 0 10px', color: 'var(--color-ink)' }}>{line.slice(2)}</h2>
    if (line.startsWith('- '))  return <li key={i} style={{ fontSize: 'var(--text-md)', lineHeight: 1.75, marginLeft: '20px', marginBottom: '4px', color: 'var(--color-body)' }}>{line.slice(2)}</li>
    if (line.match(/^\d+\./))  return <li key={i} style={{ fontSize: 'var(--text-md)', lineHeight: 1.75, marginLeft: '20px', marginBottom: '4px', color: 'var(--color-body)' }}>{line.replace(/^\d+\.\s/, '')}</li>
    if (line === '') return <div key={i} style={{ height: '10px' }} />
    return <p key={i} style={{ fontSize: 'var(--text-md)', lineHeight: 1.8, color: 'var(--color-body)', marginBottom: '2px' }}>{line}</p>
  })
}

const LABEL_STYLE = { fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-ink)', display: 'block', marginBottom: 'var(--space-2)' }

export default function WritePage({ navigate }) {
  const { currentUser } = useAuth()
  const { categories, addPost } = useApp()
  const [form, setForm] = useState({ title: '', body: '', categoryId: '', tags: '' })
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)

  if (!currentUser) return (
    <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
      <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-muted)', marginBottom: 'var(--space-5)' }}>로그인이 필요합니다.</p>
      <button onClick={() => navigate('login')} className="btn-primary">로그인</button>
    </div>
  )

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim() || !form.categoryId) {
      setError('제목, 내용, 분야를 모두 입력해주세요.')
      return
    }
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const post = addPost({ ...form, tags, authorId: currentUser.id })
    navigate(`post/${post.id}`)
  }

  const charCount = form.body.length
  const wordCount = form.body.trim() ? form.body.trim().split(/\s+/).length : 0

  return (
    <div className="fade-up">
      {/* 헤더 */}
      <div style={{ padding: 'var(--space-8) 0 var(--space-6)', borderBottom: '1px solid var(--color-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 'var(--text-display-md)', fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>새 글 작성</h1>
        <button onClick={() => navigate('board')} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', transition: 'color var(--transition)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-ink)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted)'}
        >✕ 취소</button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingTop: 'var(--space-6)', maxWidth: '720px' }}>
        {/* 분야 */}
        <div>
          <label style={LABEL_STYLE}>분야 *</label>
          <select className="input" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
            <option value="">분야를 선택하세요</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>

        {/* 제목 */}
        <div>
          <label style={LABEL_STYLE}>제목 *</label>
          <input className="input" style={{ height: '48px', fontSize: 'var(--text-lg)' }}
            placeholder="제목을 입력하세요" maxLength={100}
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-placeholder)', marginTop: 'var(--space-1)', textAlign: 'right' }}>
            {form.title.length}/100
          </p>
        </div>

        {/* 본문 + 프리뷰 토글 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
            <label style={LABEL_STYLE}>내용 *</label>
            <div style={{ display: 'flex', gap: 'var(--space-1)', background: 'var(--color-surface)', borderRadius: 'var(--radius-btn)', padding: '3px' }}>
              {[{ key: false, label: '작성' }, { key: true, label: '미리보기' }].map(v => (
                <button key={String(v.key)} type="button" onClick={() => setPreview(v.key)} style={{
                  padding: 'var(--space-1) var(--space-4)', borderRadius: 'var(--radius-btn)',
                  fontSize: 'var(--text-xs)', fontWeight: 600,
                  background: preview === v.key ? '#fff' : 'transparent',
                  color: preview === v.key ? 'var(--color-ink)' : 'var(--color-muted)',
                  border: preview === v.key ? '1px solid var(--color-border-soft)' : 'none',
                  transition: 'all var(--transition)',
                }}>{v.label}</button>
              ))}
            </div>
          </div>

          {!preview ? (
            <>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-placeholder)', marginBottom: 'var(--space-2)' }}>
                # 제목 &nbsp;## 소제목 &nbsp;- 목록 &nbsp;1. 번호 목록 지원
              </p>
              <textarea
                placeholder="내용을 입력하세요..."
                value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                style={{
                  width: '100%', minHeight: '360px',
                  padding: '14px 16px',
                  border: '1px solid var(--color-border, #e0e0e0)',
                  borderRadius: '10px',
                  fontSize: 'var(--text-sm)', lineHeight: 1.7,
                  color: 'var(--color-ink)', outline: 'none',
                  fontFamily: 'inherit', resize: 'vertical',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--color-primary, #0066CC)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-border, #e0e0e0)'}
              />
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-placeholder)', marginTop: 'var(--space-1)', textAlign: 'right' }}>
                {charCount}자 · {wordCount}단어
              </p>
            </>
          ) : (
            <div style={{
              minHeight: '360px',
              padding: '20px 24px',
              border: '1px solid var(--color-border, #e0e0e0)',
              borderRadius: '10px',
              background: '#fafafa',
              overflowY: 'auto',
            }}>
              {renderPreview(form.body)}
            </div>
          )}
        </div>

        {/* 태그 */}
        <div>
          <label style={LABEL_STYLE}>태그</label>
          <input className="input" placeholder="쉼표로 구분 (예: DIY, 인테리어, 선반)"
            value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
          {form.tags && (
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
              {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                <span key={tag} style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)', borderRadius: '99px', background: 'var(--color-surface)', color: 'var(--color-muted)', fontWeight: 700 }}>#{tag}</span>
              ))}
            </div>
          )}
        </div>

        {error && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-danger)', fontWeight: 700 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', paddingBottom: 'var(--space-8)' }}>
          <button type="button" onClick={() => navigate('board')} className="btn-secondary">취소</button>
          <button type="submit" className="btn-primary">게시하기</button>
        </div>
      </form>
    </div>
  )
}
