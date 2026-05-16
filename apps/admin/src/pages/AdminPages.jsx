import { useState } from 'react'
import { useAdmin } from '../context/AdminContext'

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(23,26,32,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px' }}>
      <div className="card fade-up" style={{ width: '100%', maxWidth: '460px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-ink)' }}>{title}</h3>
          <button onClick={onClose} style={{ color: 'var(--color-muted)', fontSize: '16px', lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function PageHeader({ title, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border-soft)' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-ink)' }}>{title}</h2>
      {action}
    </div>
  )
}

export function DashboardPage() {
  const { stats, posts, categories } = useAdmin()
  const statCards = [
    { label: '전체 사용자', value: stats.totalUsers },
    { label: '활성 사용자', value: stats.activeUsers },
    { label: '전체 게시글', value: stats.totalPosts },
    { label: '총 조회수', value: stats.totalViews.toLocaleString() },
    { label: '활성 소스', value: stats.activeSources },
  ]

  return (
    <div className="fade-up">
      <PageHeader title="대시보드" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {statCards.map(s => (
          <div key={s.label} className="card" style={{ padding: '20px' }}>
            <p style={{ fontSize: '22px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '4px' }}>{s.value}</p>
            <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '16px' }}>최근 게시글</h3>
          {posts.slice(0, 5).map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border-soft)', fontSize: '13px' }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '12px', color: 'var(--color-body)' }}>{p.title}</span>
              <span style={{ color: 'var(--color-muted)', flexShrink: 0 }}>{p.views}</span>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '16px' }}>분야별 게시글</h3>
          {categories.map(c => {
            const count = posts.filter(p => p.categoryId === c.id).length
            const max = Math.max(...categories.map(cat => posts.filter(p => p.categoryId === cat.id).length), 1)
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '13px' }}>
                <span style={{ width: '56px', flexShrink: 0, color: 'var(--color-muted)' }}>{c.icon} {c.name}</span>
                <div style={{ flex: 1, height: '4px', background: 'var(--color-surface2)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ width: `${(count/max)*100}%`, height: '100%', background: 'var(--color-accent)', borderRadius: '99px', transition: 'width 0.6s var(--ease)' }} />
                </div>
                <span style={{ color: 'var(--color-muted)', width: '16px', textAlign: 'right' }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory } = useAdmin()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', icon: '', description: '' })

  function openAdd() { setForm({ name: '', icon: '', description: '' }); setModal('add') }
  function openEdit(cat) { setForm({ name: cat.name, icon: cat.icon, description: cat.description }); setModal({ edit: cat }) }
  function handleSave() {
    if (!form.name.trim()) return
    modal === 'add' ? addCategory(form) : updateCategory(modal.edit.id, form)
    setModal(null)
  }

  return (
    <div className="fade-up">
      <PageHeader title="분야 관리" action={<button onClick={openAdd} className="btn btn-primary">+ 분야 추가</button>} />
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>아이콘</th><th>분야명</th><th>설명</th><th>작업</th></tr></thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id}>
                <td style={{ fontSize: '18px' }}>{cat.icon}</td>
                <td style={{ fontWeight: 500, color: 'var(--color-ink)' }}>{cat.name}</td>
                <td style={{ color: 'var(--color-muted)' }}>{cat.description}</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => openEdit(cat)} className="btn btn-secondary btn-xs">수정</button>
                    <button onClick={() => deleteCategory(cat.id)} className="btn btn-danger btn-xs">삭제</button>
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
            {[{ k: 'icon', l: '아이콘', p: '예: 🔧' }, { k: 'name', l: '분야명', p: '분야명 입력' }, { k: 'description', l: '설명', p: '분야 설명' }].map(f => (
              <div key={f.k}>
                <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '5px', display: 'block', color: 'var(--color-muted)' }}>{f.l}</label>
                <input className="input" placeholder={f.p} value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setModal(null)} className="btn btn-secondary">취소</button>
              <button onClick={handleSave} className="btn btn-primary">저장</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export function TopicManager() {
  const { topics, categories, addTopic, updateTopic, deleteTopic } = useAdmin()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ categoryId: '', name: '', description: '' })

  function openAdd() { setForm({ categoryId: '', name: '', description: '' }); setModal('add') }
  function openEdit(t) { setForm({ categoryId: t.categoryId, name: t.name, description: t.description }); setModal({ edit: t }) }
  function handleSave() {
    if (!form.name.trim() || !form.categoryId) return
    modal === 'add' ? addTopic(form) : updateTopic(modal.edit.id, form)
    setModal(null)
  }

  return (
    <div className="fade-up">
      <PageHeader title="주제 관리" action={<button onClick={openAdd} className="btn btn-primary">+ 주제 추가</button>} />
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>분야</th><th>주제명</th><th>설명</th><th>작업</th></tr></thead>
          <tbody>
            {topics.map(t => {
              const cat = categories.find(c => c.id === t.categoryId)
              return (
                <tr key={t.id}>
                  <td><span style={{ padding: '2px 8px', background: 'var(--color-surface)', borderRadius: '99px', fontSize: '12px' }}>{cat?.icon} {cat?.name}</span></td>
                  <td style={{ fontWeight: 500, color: 'var(--color-ink)' }}>{t.name}</td>
                  <td style={{ color: 'var(--color-muted)' }}>{t.description}</td>
                  <td><div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => openEdit(t)} className="btn btn-secondary btn-xs">수정</button>
                    <button onClick={() => deleteTopic(t.id)} className="btn btn-danger btn-xs">삭제</button>
                  </div></td>
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
              <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '5px', display: 'block', color: 'var(--color-muted)' }}>분야</label>
              <select className="input" value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}>
                <option value="">분야 선택</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            {[{ k: 'name', l: '주제명', p: '주제명 입력' }, { k: 'description', l: '설명', p: '주제 설명' }].map(f => (
              <div key={f.k}>
                <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '5px', display: 'block', color: 'var(--color-muted)' }}>{f.l}</label>
                <input className="input" placeholder={f.p} value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setModal(null)} className="btn btn-secondary">취소</button>
              <button onClick={handleSave} className="btn btn-primary">저장</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export function SourceManager() {
  const { sources, categories, addSource, deleteSource, toggleSource } = useAdmin()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ categoryId: '', label: '', url: '', active: true })

  function handleSave() {
    if (!form.label.trim() || !form.url.trim() || !form.categoryId) return
    addSource(form); setModal(false)
  }

  return (
    <div className="fade-up">
      <PageHeader title="크롤링 소스" action={<button onClick={() => { setForm({ categoryId: '', label: '', url: '', active: true }); setModal(true) }} className="btn btn-primary">+ 소스 추가</button>} />
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>상태</th><th>소스명</th><th>분야</th><th>URL</th><th>작업</th></tr></thead>
          <tbody>
            {sources.map(s => {
              const cat = categories.find(c => c.id === s.categoryId)
              return (
                <tr key={s.id}>
                  <td><span className={`badge ${s.active ? 'badge-green' : 'badge-red'}`}>{s.active ? '활성' : '비활성'}</span></td>
                  <td style={{ fontWeight: 500, color: 'var(--color-ink)' }}>{s.label}</td>
                  <td style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{cat?.icon} {cat?.name}</td>
                  <td style={{ fontSize: '11px', color: 'var(--color-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.url}</td>
                  <td><div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => toggleSource(s.id)} className="btn btn-secondary btn-xs">{s.active ? '비활성화' : '활성화'}</button>
                    <button onClick={() => deleteSource(s.id)} className="btn btn-danger btn-xs">삭제</button>
                  </div></td>
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
              <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '5px', display: 'block', color: 'var(--color-muted)' }}>분야</label>
              <select className="input" value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}>
                <option value="">분야 선택</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            {[{ k: 'label', l: '소스명', p: '예: Hacker News' }, { k: 'url', l: 'URL', p: 'https://...' }].map(f => (
              <div key={f.k}>
                <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '5px', display: 'block', color: 'var(--color-muted)' }}>{f.l}</label>
                <input className="input" placeholder={f.p} value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setModal(false)} className="btn btn-secondary">취소</button>
              <button onClick={handleSave} className="btn btn-primary">추가</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export function UserManager() {
  const { users, toggleUserStatus } = useAdmin()
  return (
    <div className="fade-up">
      <PageHeader title="사용자 관리" />
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>닉네임</th><th>이메일</th><th>게시글</th><th>상태</th><th>가입일</th><th>작업</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500, color: 'var(--color-ink)' }}>{u.nickname}</td>
                <td style={{ color: 'var(--color-muted)' }}>{u.email}</td>
                <td>{u.postCount}</td>
                <td><span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-red'}`}>{u.status === 'active' ? '활성' : '정지'}</span></td>
                <td style={{ color: 'var(--color-muted)' }}>{u.createdAt}</td>
                <td>
                  <button onClick={() => toggleUserStatus(u.id)} className={`btn btn-xs ${u.status === 'active' ? 'btn-danger' : 'btn-success'}`}>
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

export function PostManager() {
  const { posts, categories, hidePost, deletePost } = useAdmin()
  return (
    <div className="fade-up">
      <PageHeader title="게시글 관리" />
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>제목</th><th>분야</th><th>작성자</th><th>조회</th><th>상태</th><th>작업</th></tr></thead>
          <tbody>
            {posts.map(p => {
              const cat = categories.find(c => c.id === p.categoryId)
              return (
                <tr key={p.id}>
                  <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-ink)', fontWeight: 400 }}>{p.title}</td>
                  <td style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{cat?.icon} {cat?.name}</td>
                  <td style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{p.authorNickname}</td>
                  <td style={{ color: 'var(--color-muted)' }}>{p.views}</td>
                  <td><span className={`badge ${p.status === 'published' ? 'badge-blue' : 'badge-yellow'}`}>{p.status === 'published' ? '공개' : '숨김'}</span></td>
                  <td><div style={{ display: 'flex', gap: '6px' }}>
                    {p.status === 'published' && <button onClick={() => hidePost(p.id)} className="btn btn-secondary btn-xs">숨김</button>}
                    <button onClick={() => deletePost(p.id)} className="btn btn-danger btn-xs">삭제</button>
                  </div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
