import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

export default function WritePage({ navigate }) {
  const { currentUser } = useAuth()
  const { categories, addPost } = useApp()
  const [form, setForm] = useState({ title: '', body: '', categoryId: '', tags: '' })
  const [error, setError] = useState('')

  if (!currentUser) return (
    <div style={{ padding: '80px 0', textAlign: 'center' }}>
      <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '20px' }}>로그인이 필요합니다.</p>
      <button onClick={() => navigate('login')} className="btn btn-primary">로그인</button>
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

  const Label = ({ children }) => (
    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: '8px' }}>
      {children}
    </label>
  )

  return (
    <div className="fade-up" style={{ maxWidth: '680px' }}>
      {/* 헤더 */}
      <div style={{ padding: '40px 0 32px', borderBottom: '1px solid var(--color-border-soft)', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 500, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
          새 글 작성
        </h2>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <Label>분야</Label>
          <select className="input" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
            <option value="">분야를 선택하세요</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>

        <div>
          <Label>제목</Label>
          <input className="input" placeholder="제목을 입력하세요"
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>

        <div>
          <Label>내용</Label>
          <p style={{ fontSize: '12px', color: 'var(--color-placeholder)', marginBottom: '8px' }}>
            ## 제목, - 목록 형식을 지원합니다.
          </p>
          <textarea className="input" style={{ minHeight: '320px', lineHeight: 1.7 }}
            placeholder="내용을 입력하세요..."
            value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
        </div>

        <div>
          <Label>태그</Label>
          <input className="input" placeholder="쉼표로 구분 (예: DIY, 인테리어, 선반)"
            value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
        </div>

        {error && <p style={{ fontSize: '13px', color: 'var(--color-danger)' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px' }}>
          <button type="button" onClick={() => navigate('board')} className="btn btn-secondary">취소</button>
          <button type="submit" className="btn btn-primary">게시하기</button>
        </div>
      </form>
    </div>
  )
}
