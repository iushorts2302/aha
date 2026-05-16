import { useState } from 'react'
import { useAdmin } from '../context/AdminContext'

// ── 공통: 모달 ──────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px' }}>
      <div className="card fade-up" style={{ width: '100%', maxWidth: '480px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ color: 'var(--color-muted)', fontSize: '18px' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── DashboardPage ────────────────────────────────────────
export function DashboardPage() {
  const { stats, posts, categories } = useAdmin()
  const statCards = [
    { label: '전체 사용자', value: stats.totalUsers, icon: '👥', color: '#3b82f6' },
    { label: '활성 사용자', value: stats.activeUsers, icon: '✅', color: '#22c55e' },
    { label: '전체 게시글', value: stats.totalPosts, icon: '📝', color: '#f59e0b' },
    { label: '총 조회수', value: stats.totalViews.toLocaleString(), icon: '👁', color: '#8b5cf6' },
    { label: '활성 소스', value: stats.activeSources, icon: '🔗', color: '#06b6d4' },
  ]
  return (
    <div className="fade-up">
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>대시보드</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px', marginBottom: '32px' }}>
        {statCards.map(s => (
          <div key={s.label} className="card" style={{ padding: '18px' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>{s.icon}</div>
            <p style={{ fontSize: '26px', fontWeight: 700, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>{s.label}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px' }}>최근 게시글</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {posts.slice(0, 5).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>{p.title}</span>
                <span style={{ color: 'var(--color-muted)', flexShrink: 0 }}>{p.views}회</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px' }}>분야별 게시글 수</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categories.map(c => {
              const count = posts.filter(p => p.categoryId === c.id).length
              const max = Math.max(...categories.map(cat => posts.filter(p => p.categoryId === cat.id).length), 1)
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                  <span style={{ width: '60px', flexShrink: 0 }}>{c.icon} {c.name}</span>
                  <div style={{ flex: 1, height: '6px', background: 'var(--color-bg)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ width: `${(count / max) * 100}%`, height: '100%', background: 'var(--color-accent)', borderRadius: '99px' }} />
                  </div>
                  <span style={{ color: 'var(--color-muted)', width: '20px', textAlign: 'right' }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── CategoryManager ──────────────────────────────────────
export function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory } = useAdmin()
  const [modal, setModal] = useState(null) // null | 'add' | {edit: cat}
  const [form, setForm] = useState({ name: '', icon: '', description: '' })

  function openAdd() { setForm({ name: '', icon: '', description: '' }); setModal('add') }
  function openEdit(cat) { setForm({ name: cat.name, icon: cat.icon, description: cat.description }); setModal({ edit: cat }) }

  function handleSave() {
    if (!form.name.trim()) return
    if (modal === 'add') addCategory(form)
    else updateCategory(modal.edit.id, form)
    setModal(null)
  }

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>분야 관리</h2>
        <button onClick={openAdd} className="btn btn-primary">+ 분야 추가</button>
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>아이콘</th><th>분야명</th><th>설명</th><th>작업</th></tr></thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id}>
                <td style={{ fontSize: '20px' }}>{cat.icon}</td>
                <td style={{ fontWeight: 600 }}>{cat.name}</td>
                <td style={{ color: 'var(--color-muted)' }}>{cat.description}</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => openEdit(cat)} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }}>수정</button>
                    <button onClick={() => deleteCategory(cat.id)} className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '12px' }}>삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={modal === 'add' ? '분야 추가' : '분야 수정'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { key: 'icon', label: '아이콘 (이모지)', placeholder: '예: 🔧' },
              { key: 'name', label: '분야명', placeholder: '분야명 입력' },
              { key: 'description', label: '설명', placeholder: '분야 설명' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>{f.label}</label>
                <input className="input" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setModal(null)} className="btn btn-ghost">취소</button>
              <button onClick={handleSave} className="btn btn-primary">저장</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── TopicManager ─────────────────────────────────────────
export function TopicManager() {
  const { topics, categories, addTopic, updateTopic, deleteTopic } = useAdmin()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ categoryId: '', name: '', description: '' })

  function openAdd() { setForm({ categoryId: '', name: '', description: '' }); setModal('add') }
  function openEdit(t) { setForm({ categoryId: t.categoryId, name: t.name, description: t.description }); setModal({ edit: t }) }
  function handleSave() {
    if (!form.name.trim() || !form.categoryId) return
    if (modal === 'add') addTopic(form)
    else updateTopic(modal.edit.id, form)
    setModal(null)
  }

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>주제 관리</h2>
        <button onClick={openAdd} className="btn btn-primary">+ 주제 추가</button>
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>분야</th><th>주제명</th><th>설명</th><th>작업</th></tr></thead>
          <tbody>
            {topics.map(t => {
              const cat = categories.find(c => c.id === t.categoryId)
              return (
                <tr key={t.id}>
                  <td><span style={{ fontSize: '12px', padding: '2px 8px', background: 'var(--color-bg)', borderRadius: '99px' }}>{cat?.icon} {cat?.name}</span></td>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td style={{ color: 'var(--color-muted)' }}>{t.description}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => openEdit(t)} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }}>수정</button>
                      <button onClick={() => deleteTopic(t.id)} className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '12px' }}>삭제</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={modal === 'add' ? '주제 추가' : '주제 수정'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>분야</label>
              <select className="input" value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}>
                <option value="">분야 선택</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            {[{ key: 'name', label: '주제명', placeholder: '주제명 입력' }, { key: 'description', label: '설명', placeholder: '주제 설명' }].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>{f.label}</label>
                <input className="input" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setModal(null)} className="btn btn-ghost">취소</button>
              <button onClick={handleSave} className="btn btn-primary">저장</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── SourceManager ────────────────────────────────────────
export function SourceManager() {
  const { sources, categories, addSource, deleteSource, toggleSource } = useAdmin()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ categoryId: '', label: '', url: '', active: true })

  function handleSave() {
    if (!form.label.trim() || !form.url.trim() || !form.categoryId) return
    addSource(form)
    setModal(false)
  }

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>크롤링 소스 관리</h2>
        <button onClick={() => { setForm({ categoryId: '', label: '', url: '', active: true }); setModal(true) }} className="btn btn-primary">+ 소스 추가</button>
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>상태</th><th>소스명</th><th>분야</th><th>URL</th><th>작업</th></tr></thead>
          <tbody>
            {sources.map(s => {
              const cat = categories.find(c => c.id === s.categoryId)
              return (
                <tr key={s.id}>
                  <td>
                    <span className={`badge ${s.active ? 'badge-green' : 'badge-red'}`}>{s.active ? '활성' : '비활성'}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{s.label}</td>
                  <td style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{cat?.icon} {cat?.name}</td>
                  <td style={{ fontSize: '11px', color: 'var(--color-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.url}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => toggleSource(s.id)} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }}>{s.active ? '비활성화' : '활성화'}</button>
                      <button onClick={() => deleteSource(s.id)} className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '12px' }}>삭제</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="소스 추가" onClose={() => setModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>분야</label>
              <select className="input" value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}>
                <option value="">분야 선택</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            {[{ key: 'label', label: '소스명', placeholder: '예: Hacker News' }, { key: 'url', label: 'RSS/URL', placeholder: 'https://...' }].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>{f.label}</label>
                <input className="input" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setModal(false)} className="btn btn-ghost">취소</button>
              <button onClick={handleSave} className="btn btn-primary">추가</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── UserManager ──────────────────────────────────────────
export function UserManager() {
  const { users, toggleUserStatus } = useAdmin()
  return (
    <div className="fade-up">
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>사용자 관리</h2>
      <div className="card">
        <table className="table">
          <thead><tr><th>닉네임</th><th>이메일</th><th>게시글</th><th>상태</th><th>가입일</th><th>작업</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.nickname}</td>
                <td style={{ color: 'var(--color-muted)', fontSize: '12px' }}>{u.email}</td>
                <td>{u.postCount}</td>
                <td><span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-red'}`}>{u.status === 'active' ? '활성' : '정지'}</span></td>
                <td style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{u.createdAt}</td>
                <td>
                  <button onClick={() => toggleUserStatus(u.id)} className={`btn ${u.status === 'active' ? 'btn-danger' : 'btn-success'}`} style={{ padding: '4px 10px', fontSize: '12px' }}>
                    {u.status === 'active' ? '정지' : '해제'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── PostManager ──────────────────────────────────────────
export function PostManager() {
  const { posts, categories, hidePost, deletePost } = useAdmin()
  return (
    <div className="fade-up">
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>게시글 관리</h2>
      <div className="card">
        <table className="table">
          <thead><tr><th>제목</th><th>분야</th><th>작성자</th><th>조회</th><th>좋아요</th><th>상태</th><th>작업</th></tr></thead>
          <tbody>
            {posts.map(p => {
              const cat = categories.find(c => c.id === p.categoryId)
              return (
                <tr key={p.id}>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{p.title}</td>
                  <td style={{ fontSize: '12px' }}>{cat?.icon} {cat?.name}</td>
                  <td style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{p.authorNickname}</td>
                  <td>{p.views}</td>
                  <td>{p.likes}</td>
                  <td><span className={`badge ${p.status === 'published' ? 'badge-green' : 'badge-yellow'}`}>{p.status === 'published' ? '공개' : '숨김'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {p.status === 'published' && (
                        <button onClick={() => hidePost(p.id)} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }}>숨김</button>
                      )}
                      <button onClick={() => deletePost(p.id)} className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '12px' }}>삭제</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
