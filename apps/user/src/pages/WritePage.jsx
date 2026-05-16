import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

export default function WritePage({ navigate }) {
  const { currentUser } = useAuth()
  const { categories, addPost } = useApp()
  const [form, setForm] = useState({ title: '', body: '', categoryId: '', tags: '' })
  const [error, setError] = useState('')

  if (!currentUser) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-muted)' }}>
        <p style={{ fontSize: '32px' }}>🔒</p>
        <p style={{ marginTop: '12px', marginBottom: '16px' }}>로그인이 필요합니다.</p>
        <button onClick={() => navigate('login')} className="btn btn-primary">로그인</button>
      </div>
    )
  }

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

  return (
    <div className="fade-up" style={{ maxWidth: '680px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>새 글 작성</h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 분야 선택 */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>분야 *</label>
          <select
            className="input"
            value={form.categoryId}
            onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
          >
            <option value="">분야를 선택하세요</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>

        {/* 제목 */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>제목 *</label>
          <input
            className="input"
            placeholder="제목을 입력하세요"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
        </div>

        {/* 본문 */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>내용 *</label>
          <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginBottom: '6px' }}>## 제목, - 목록 형식의 마크다운을 지원합니다.</p>
          <textarea
            className="input"
            style={{ minHeight: '300px', resize: 'vertical', lineHeight: 1.7 }}
            placeholder="내용을 입력하세요..."
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
          />
        </div>

        {/* 태그 */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>태그</label>
          <input
            className="input"
            placeholder="태그를 쉼표로 구분하여 입력 (예: DIY, 인테리어, 선반)"
            value={form.tags}
            onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
          />
        </div>

        {error && <p style={{ fontSize: '13px', color: 'var(--color-danger)' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px' }}>
          <button type="button" onClick={() => navigate('board')} className="btn btn-ghost">취소</button>
          <button type="submit" className="btn btn-primary">게시하기</button>
        </div>
      </form>
    </div>
  )
}
