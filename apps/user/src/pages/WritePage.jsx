import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

export default function WritePage({ navigate }) {
  const { currentUser } = useAuth()
  const { categories, addPost } = useApp()
  const [form, setForm] = useState({ title: '', body: '', categoryId: '', tags: '' })
  const [error, setError] = useState('')

  if (!currentUser) return (
    <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-muted)' }}>
      <p style={{ fontSize: '14px', marginBottom: '16px' }}>로그인이 필요합니다.</p>
      <button onClick={() => navigate('login')} className="btn btn-primary">로그인</button>
    </div>
  )

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim() || !form.categoryId) {
      setError('제목, 내용, 분야를 모두 입력해주세요.'); return
    }
    const post = addPost({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), authorId: currentUser.id })
    navigate(`post/${post.id}`)
  }

  const Field = ({ label, children }) => (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  )

  return (
    <div className="fade-up" style={{ maxWidth: '680px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid var(--color-border-soft)' }}>새 글 작성</h2>

      <form onSubmit={handleSubmit}>
        <Field label="분야">
          <select className="input" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
            <option value="">분야를 선택하세요</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </Field>

        <Field label="제목">
          <input className="input" placeholder="제목을 입력하세요" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </Field>

        <Field label="내용">
          <p style={{ fontSize: '12px', color: 'var(--color-placeholder)', marginBottom: '6px' }}>## 소제목, - 목록 마크다운 지원</p>
          <textarea className="input" style={{ minHeight: '280px' }} placeholder="내용을 입력하세요..." value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
        </Field>

        <Field label="태그">
          <input className="input" placeholder="쉼표로 구분 (예: DIY, 인테리어, 선반)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
        </Field>

        {error && <p style={{ fontSize: '13px', color: 'var(--color-danger)', marginBottom: '16px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => navigate('board')} className="btn btn-secondary btn-sm">취소</button>
          <button type="submit" className="btn btn-primary btn-sm">게시하기</button>
        </div>
      </form>
    </div>
  )
}
