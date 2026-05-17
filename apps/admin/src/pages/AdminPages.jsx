import { useState } from 'react'
import { useAdmin } from '../context/AdminContext'

// ── 공통: 섹션 헤더 ────────────────────────────────────
function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{
      paddingBottom: '28px', marginBottom: '28px',
      borderBottom: '1px solid var(--color-border-soft)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px',
    }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 500, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>{title}</h2>
        {subtitle && <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '4px' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ── 공통: 모달 ─────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(23,26,32,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px' }}>
      <div style={{
        width: '100%', maxWidth: '460px',
        background: '#fff', borderRadius: '4px', padding: '28px',
      }} className="fade-up">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-ink)' }}>{title}</h3>
          <button onClick={onClose} style={{ fontSize: '18px', color: 'var(--color-muted)', lineHeight: 1, transition: 'color var(--transition)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-ink)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted)'}
          >×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const Label = ({ children }) => (
  <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: '6px', letterSpacing: '0.02em' }}>
    {children}
  </label>
)

// ── DashboardPage ───────────────────────────────────────
export function DashboardPage() {
  const { stats, posts, categories } = useAdmin()

  const statCards = [
    { label: '전체 사용자',  value: stats.totalUsers,           sub: `활성 ${stats.activeUsers}명` },
    { label: '전체 게시글',  value: stats.totalPosts,           sub: '공개 게시물' },
    { label: '총 조회수',    value: stats.totalViews.toLocaleString(), sub: '누적' },
    { label: '활성 소스',    value: stats.activeSources,        sub: '크롤링 소스' },
  ]

  return (
    <div className="fade-up">
      <PageHeader title="대시보드" subtitle="aha! 운영 현황 한눈에 보기" />

      {/* 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1px', background: 'var(--color-border-soft)', marginBottom: '32px', border: '1px solid var(--color-border-soft)' }}>
        {statCards.map(s => (
          <div key={s.label} style={{ padding: '24px', background: '#fff' }}>
            <p style={{ fontSize: '32px', fontWeight: 500, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>{s.value}</p>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', marginTop: '8px' }}>{s.label}</p>
            <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* 최근 게시글 */}
        <div style={{ border: '1px solid var(--color-border-soft)', borderRadius: '4px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-soft)' }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)' }}>최근 게시글</p>
          </div>
          <div>
            {posts.slice(0, 5).map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 20px',
                borderBottom: i < 4 ? '1px solid var(--color-border-soft)' : 'none',
              }}>
                <span style={{ fontSize: '13px', color: 'var(--color-body)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '12px' }}>{p.title}</span>
                <span style={{ fontSize: '12px', color: 'var(--color-placeholder)', flexShrink: 0 }}>{p.views}회</span>
              </div>
            ))}
          </div>
        </div>

        {/* 분야별 현황 */}
        <div style={{ border: '1px solid var(--color-border-soft)', borderRadius: '4px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-soft)' }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)' }}>분야별 게시글</p>
          </div>
          <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {categories.map(c => {
              const count = posts.filter(p => p.categoryId === c.id).length
              const max = Math.max(...categories.map(cat => posts.filter(p => p.categoryId === cat.id).length), 1)
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-muted)', width: '64px', flexShrink: 0 }}>{c.icon} {c.name}</span>
                  <div style={{ flex: 1, height: '4px', background: 'var(--color-surface)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${(count / max) * 100}%`, height: '100%', background: 'var(--color-ink)', borderRadius: '2px', transition: 'width 0.6s var(--ease)' }} />
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--color-muted)', width: '16px', textAlign: 'right', flexShrink: 0 }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── CategoryManager ─────────────────────────────────────
export function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory } = useAdmin()
  const [modal, setModal] = useState(null)
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
      <PageHeader
        title="분야 관리"
        subtitle={`${categories.length}개의 분야`}
        action={<button onClick={openAdd} className="btn btn-primary" style={{ height: '36px' }}>+ 분야 추가</button>}
      />

      <div style={{ border: '1px solid var(--color-border-soft)', borderRadius: '4px', overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr><th>아이콘</th><th>분야명</th><th>설명</th><th style={{ width: '120px' }}>작업</th></tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id}>
                <td style={{ fontSize: '20px', width: '56px' }}>{cat.icon}</td>
                <td style={{ fontWeight: 500, color: 'var(--color-ink)' }}>{cat.name}</td>
                <td style={{ color: 'var(--color-muted)' }}>{cat.description}</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => openEdit(cat)} className="btn btn-secondary btn-xs">수정</button>
                    <button onClick={() => deleteCategory(cat.id)} className="btn btn-xs" style={{ color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}>삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? '분야 추가' : '분야 수정'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { key: 'icon', label: '아이콘 (이모지)', placeholder: '예: 🔧' },
              { key: 'name', label: '분야명', placeholder: '분야명 입력' },
              { key: 'description', label: '설명', placeholder: '분야 설명' },
            ].map(f => (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <input className="input" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setModal(null)} className="btn btn-secondary" style={{ height: '36px' }}>취소</button>
              <button onClick={handleSave} className="btn btn-primary" style={{ height: '36px' }}>저장</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── TopicManager ────────────────────────────────────────
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
      <PageHeader
        title="주제 관리"
        subtitle={`${topics.length}개의 주제`}
        action={<button onClick={openAdd} className="btn btn-primary" style={{ height: '36px' }}>+ 주제 추가</button>}
      />

      <div style={{ border: '1px solid var(--color-border-soft)', borderRadius: '4px', overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>분야</th><th>주제명</th><th>설명</th><th style={{ width: '120px' }}>작업</th></tr></thead>
          <tbody>
            {topics.map(t => {
              const cat = categories.find(c => c.id === t.categoryId)
              return (
                <tr key={t.id}>
                  <td>
                    <span style={{ fontSize: '12px', color: 'var(--color-muted)', padding: '3px 8px', background: 'var(--color-surface)', borderRadius: '99px' }}>
                      {cat?.icon} {cat?.name}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, color: 'var(--color-ink)' }}>{t.name}</td>
                  <td style={{ color: 'var(--color-muted)' }}>{t.description}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => openEdit(t)} className="btn btn-secondary btn-xs">수정</button>
                      <button onClick={() => deleteTopic(t.id)} className="btn btn-xs" style={{ color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}>삭제</button>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <Label>분야</Label>
              <select className="input" value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}>
                <option value="">분야 선택</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            {[{ key: 'name', label: '주제명', placeholder: '주제명' }, { key: 'description', label: '설명', placeholder: '주제 설명' }].map(f => (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <input className="input" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setModal(null)} className="btn btn-secondary" style={{ height: '36px' }}>취소</button>
              <button onClick={handleSave} className="btn btn-primary" style={{ height: '36px' }}>저장</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── SourceManager ───────────────────────────────────────
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
      <PageHeader
        title="크롤링 소스 관리"
        subtitle={`${sources.filter(s => s.active).length}개 활성`}
        action={<button onClick={() => { setForm({ categoryId: '', label: '', url: '', active: true }); setModal(true) }} className="btn btn-primary" style={{ height: '36px' }}>+ 소스 추가</button>}
      />

      <div style={{ border: '1px solid var(--color-border-soft)', borderRadius: '4px', overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th style={{ width: '64px' }}>상태</th><th>소스명</th><th>분야</th><th>URL</th><th style={{ width: '140px' }}>작업</th></tr></thead>
          <tbody>
            {sources.map(s => {
              const cat = categories.find(c => c.id === s.categoryId)
              return (
                <tr key={s.id}>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', height: '20px', padding: '0 8px',
                      borderRadius: '99px', fontSize: '11px', fontWeight: 500,
                      background: s.active ? '#dcfce7' : '#f4f4f4',
                      color: s.active ? '#166534' : 'var(--color-muted)',
                    }}>{s.active ? '활성' : '비활성'}</span>
                  </td>
                  <td style={{ fontWeight: 500, color: 'var(--color-ink)' }}>{s.label}</td>
                  <td style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{cat?.icon} {cat?.name}</td>
                  <td style={{ fontSize: '12px', color: 'var(--color-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.url}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => toggleSource(s.id)} className="btn btn-secondary btn-xs">{s.active ? '비활성화' : '활성화'}</button>
                      <button onClick={() => deleteSource(s.id)} className="btn btn-xs" style={{ color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}>삭제</button>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <Label>분야</Label>
              <select className="input" value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}>
                <option value="">분야 선택</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            {[{ key: 'label', label: '소스명', placeholder: '예: Hacker News' }, { key: 'url', label: 'RSS / URL', placeholder: 'https://...' }].map(f => (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <input className="input" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setModal(false)} className="btn btn-secondary" style={{ height: '36px' }}>취소</button>
              <button onClick={handleSave} className="btn btn-primary" style={{ height: '36px' }}>추가</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── UserManager ─────────────────────────────────────────
export function UserManager() {
  const { users, toggleUserStatus } = useAdmin()

  return (
    <div className="fade-up">
      <PageHeader title="사용자 관리" subtitle={`전체 ${users.length}명`} />
      <div style={{ border: '1px solid var(--color-border-soft)', borderRadius: '4px', overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>닉네임</th><th>이메일</th><th>게시글</th><th>상태</th><th>가입일</th><th style={{ width: '80px' }}>작업</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500, color: 'var(--color-ink)' }}>{u.nickname}</td>
                <td style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{u.email}</td>
                <td style={{ color: 'var(--color-muted)' }}>{u.postCount}</td>
                <td>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', height: '20px', padding: '0 8px',
                    borderRadius: '99px', fontSize: '11px', fontWeight: 500,
                    background: u.status === 'active' ? '#dcfce7' : '#fee2e2',
                    color: u.status === 'active' ? '#166534' : '#991b1b',
                  }}>{u.status === 'active' ? '활성' : '정지'}</span>
                </td>
                <td style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{u.createdAt}</td>
                <td>
                  <button onClick={() => toggleUserStatus(u.id)} className="btn btn-xs" style={{
                    color: u.status === 'active' ? 'var(--color-danger)' : 'var(--color-success)',
                    border: '1px solid var(--color-border)',
                  }}>
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

// ── PostManager ─────────────────────────────────────────
export function PostManager() {
  const { posts, categories, hidePost, deletePost, restorePost } = useAdmin()

  return (
    <div className="fade-up">
      <PageHeader title="게시글 관리" subtitle={`전체 ${posts.length}개`} />
      <div style={{ border: '1px solid var(--color-border-soft)', borderRadius: '4px', overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>제목</th><th>분야</th><th>작성자</th><th>조회</th><th>상태</th><th style={{ width: '120px' }}>작업</th></tr></thead>
          <tbody>
            {posts.map(p => {
              const cat = categories.find(c => c.id === p.categoryId)
              return (
                <tr key={p.id}>
                  <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, color: 'var(--color-ink)' }}>{p.title}</td>
                  <td style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{cat?.icon} {cat?.name}</td>
                  <td style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{p.authorNickname}</td>
                  <td style={{ color: 'var(--color-muted)' }}>{p.views}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', height: '20px', padding: '0 8px',
                      borderRadius: '99px', fontSize: '11px', fontWeight: 500,
                      background: p.status === 'published' ? '#dcfce7' : '#fef3c7',
                      color: p.status === 'published' ? '#166534' : '#92400e',
                    }}>{p.status === 'published' ? '공개' : '숨김'}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {p.status === 'published' && (
                        <button onClick={() => hidePost(p.id)} className="btn btn-secondary btn-xs">숨김</button>
                      )}
                      {p.status !== 'hidden'
                        ? <button onClick={() => hidePost(p.id)} className="btn btn-xs" style={{ color: '#E08B00', border: '1px solid var(--color-border)' }}>숨김</button>
                        : <button onClick={() => restorePost(p.id)} className="btn btn-xs" style={{ color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}>복원</button>
                      }
                      <button onClick={() => { if (confirm('삭제하면 사용자 페이지에서 즉시 숨겨집니다. 삭제하시겠습니까?')) deletePost(p.id) }} className="btn btn-xs" style={{ color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}>삭제</button>
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
