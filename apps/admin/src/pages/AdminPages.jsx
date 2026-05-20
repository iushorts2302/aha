import React, { useState } from 'react'
import { useAdmin } from '../context/AdminContext'

function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h4 className="fw-semibold mb-1">{title}</h4>
      {subtitle && <p className="text-muted small mb-0">{subtitle}</p>}
    </div>
  )
}

/* ── 대시보드 ──────────────────────────────────────────── */
export function DashboardPage() {
  const { stats, posts, categories } = useAdmin()
  const [dbSetupStatus, setDbSetupStatus] = useState(null) // null|'loading'|'done'|'error'
  const [dbCheck, setDbCheck] = useState(null)

  // DB 상태 확인
  React.useEffect(() => {
    fetch('https://admin-vert-psi.vercel.app/api/setup?check=1')
      .then(r => r.json())
      .then(d => setDbCheck(d.tables || {}))
      .catch(() => {})
  }, [])

  async function handleSetup() {
    setDbSetupStatus('loading')
    try {
      const r = await fetch('https://admin-vert-psi.vercel.app/api/setup')
      const d = await r.json()
      setDbSetupStatus(d.ok ? 'done' : 'error')
      // 완료 후 현황 갱신
      const r2 = await fetch('https://admin-vert-psi.vercel.app/api/setup?check=1')
      setDbCheck((await r2.json()).tables || {})
    } catch {
      setDbSetupStatus('error')
    }
  }

  const catCount = dbCheck?.tb_category
  const needsSetup = catCount === 0 || catCount === 'ERROR: ...'

  const statCards = [
    { label: '총 사용자',    value: stats.totalUsers,    color: 'primary', icon: '👥' },
    { label: '활성 사용자',  value: stats.activeUsers,   color: 'success', icon: '✅' },
    { label: '총 게시글',    value: stats.totalPosts,    color: 'info',    icon: '📝' },
    { label: '총 조회수',    value: stats.totalViews?.toLocaleString(), color: 'warning', icon: '👁' },
    { label: '활성 소스',    value: stats.activeSources, color: 'secondary',icon: '🔗' },
  ]
  return (
    <div className="fade-up">
      <PageHeader title="대시보드" subtitle="aha! 플랫폼 현황" />

      {/* DB 초기화 배너 */}
      {dbCheck !== null && (
        <div style={{
          marginBottom: 20, padding: '12px 16px',
          background: needsSetup ? '#fff8e0' : '#f0faf4',
          border: `1px solid ${needsSetup ? 'rgba(255,180,0,0.3)' : 'rgba(0,180,80,0.2)'}`,
          borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 16 }}>{needsSetup ? '⚠️' : '✅'}</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1D1D1F' }}>
              {needsSetup ? 'DB 초기화 필요' : 'DB 정상 연결'}
            </span>
            <span style={{ fontSize: 12, color: '#777', marginLeft: 8 }}>
              {`카테고리 ${dbCheck.tb_category ?? '-'}개 · 토픽 ${dbCheck.tb_topic ?? '-'}개 · 크롤링 ${dbCheck.tb_crawl_item ?? '-'}개`}
            </span>
          </div>
          {needsSetup && (
            <button onClick={handleSetup} disabled={dbSetupStatus === 'loading'}
              className="btn btn-primary" style={{ height: 32, fontSize: 13 }}>
              {dbSetupStatus === 'loading' ? '초기화 중...' :
               dbSetupStatus === 'done'    ? '✅ 완료' :
               dbSetupStatus === 'error'   ? '❌ 오류' : 'DB 초기화 실행'}
            </button>
          )}
        </div>
      )}
      <div className="row g-3 mb-4">
        {statCards.map(s => (
          <div key={s.label} className="col-6 col-md-4 col-xl-2-4">
            <div className="card h-100">
              <div className="card-body">
                <div className="fs-4 mb-1">{s.icon}</div>
                <div className="fw-bold fs-4">{s.value}</div>
                <div className="text-muted small">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">최근 게시글</div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead><tr><th>제목</th><th>작성자</th><th>조회</th><th>상태</th></tr></thead>
                <tbody>
                  {posts.slice(0, 5).map(p => (
                    <tr key={p.id}>
                      <td className="fw-medium" style={{ maxWidth: 200 }}><span className="text-truncate d-inline-block" style={{ maxWidth: 180 }}>{p.title}</span></td>
                      <td>{p.authorNickname}</td>
                      <td>{p.views?.toLocaleString()}</td>
                      <td><span className={`badge ${p.status === 'published' ? 'bg-success' : 'bg-warning text-dark'}`}>{p.status === 'published' ? '게시중' : '숨김'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">카테고리 분포</div>
            <div className="card-body">
              {categories.map(c => {
                const count = posts.filter(p => p.categoryId === c.id).length
                const max = Math.max(...categories.map(cat => posts.filter(p => p.categoryId === cat.id).length), 1)
                return (
                  <div key={c.id} className="mb-2">
                    <div className="d-flex justify-content-between small mb-1">
                      <span>{c.icon} {c.name}</span><span className="text-muted">{count}</span>
                    </div>
                    <div className="progress" style={{ height: 4 }}>
                      <div className="progress-bar" style={{ width: `${(count / max) * 100}%`, background: 'var(--color-accent)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── 분야 관리 ─────────────────────────────────────────── */
export function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory } = useAdmin()
  const [form, setForm] = useState({ name: '', icon: '', description: '' })
  const [editing, setEditing] = useState(null)

  function handleSubmit(e) {
    e.preventDefault()
    if (editing) { updateCategory(editing, form); setEditing(null) }
    else addCategory(form)
    setForm({ name: '', icon: '', description: '' })
  }

  return (
    <div className="fade-up">
      <PageHeader title="분야 관리" subtitle={`총 ${categories.length}개`} />
      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">{editing ? '분야 수정' : '분야 추가'}</div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {[{ key: 'name', label: '이름', ph: '분야명' }, { key: 'icon', label: '아이콘', ph: '🔧' }, { key: 'description', label: '설명', ph: '설명' }].map(f => (
                  <div className="mb-3" key={f.key}>
                    <label className="form-label small fw-semibold">{f.label}</label>
                    <input className="form-control form-control-sm" placeholder={f.ph}
                      value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary btn-sm flex-fill">{editing ? '수정' : '추가'}</button>
                  {editing && <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setEditing(null); setForm({ name: '', icon: '', description: '' }) }}>취소</button>}
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="col-lg-8">
          <div className="card">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead><tr><th>아이콘</th><th>이름</th><th>설명</th><th>작업</th></tr></thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat.id}>
                      <td>{cat.icon}</td>
                      <td className="fw-medium">{cat.name}</td>
                      <td className="text-muted">{cat.description}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn btn-xs btn-outline-primary" onClick={() => { setEditing(cat.id); setForm({ name: cat.name, icon: cat.icon, description: cat.description }) }}>수정</button>
                          <button className="btn btn-xs btn-outline-danger" onClick={() => deleteCategory(cat.id)}>삭제</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── 주제 관리 ─────────────────────────────────────────── */
export function TopicManager() {
  const { topics, categories, addTopic, updateTopic, deleteTopic } = useAdmin()
  const [form, setForm] = useState({ categoryId: '', name: '', description: '' })
  const [editing, setEditing] = useState(null)

  function handleSubmit(e) {
    e.preventDefault()
    if (editing) { updateTopic(editing, form); setEditing(null) }
    else addTopic(form)
    setForm({ categoryId: '', name: '', description: '' })
  }

  return (
    <div className="fade-up">
      <PageHeader title="주제 관리" subtitle={`총 ${topics.length}개`} />
      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">{editing ? '주제 수정' : '주제 추가'}</div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">분야</label>
                  <select className="form-select form-select-sm" value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}>
                    <option value="">선택</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                {[{ key: 'name', label: '이름', ph: '주제명' }, { key: 'description', label: '설명', ph: '설명' }].map(f => (
                  <div className="mb-3" key={f.key}>
                    <label className="form-label small fw-semibold">{f.label}</label>
                    <input className="form-control form-control-sm" placeholder={f.ph}
                      value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary btn-sm flex-fill">{editing ? '수정' : '추가'}</button>
                  {editing && <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setEditing(null); setForm({ categoryId: '', name: '', description: '' }) }}>취소</button>}
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="col-lg-8">
          <div className="card">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead><tr><th>분야</th><th>이름</th><th>설명</th><th>작업</th></tr></thead>
                <tbody>
                  {topics.map(t => {
                    const cat = categories.find(c => c.id === t.categoryId)
                    return (
                      <tr key={t.id}>
                        <td>{cat?.icon} {cat?.name}</td>
                        <td className="fw-medium">{t.name}</td>
                        <td className="text-muted">{t.description}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <button className="btn btn-xs btn-outline-primary" onClick={() => { setEditing(t.id); setForm({ categoryId: t.categoryId, name: t.name, description: t.description }) }}>수정</button>
                            <button className="btn btn-xs btn-outline-danger" onClick={() => deleteTopic(t.id)}>삭제</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── 소스 관리 ─────────────────────────────────────────── */
export function SourceManager() {
  const { sources, categories, addSource, deleteSource, toggleSource } = useAdmin()
  const [form, setForm] = useState({ categoryId: '', label: '', url: '' })

  function handleSubmit(e) {
    e.preventDefault()
    addSource(form)
    setForm({ categoryId: '', label: '', url: '' })
  }

  return (
    <div className="fade-up">
      <PageHeader title="크롤링 소스" subtitle={`총 ${sources.length}개`} />
      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">소스 추가</div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">분야</label>
                  <select className="form-select form-select-sm" value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}>
                    <option value="">선택</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {[{ key: 'label', label: '소스명', ph: 'Hacker News' }, { key: 'url', label: 'RSS URL', ph: 'https://...' }].map(f => (
                  <div className="mb-3" key={f.key}>
                    <label className="form-label small fw-semibold">{f.label}</label>
                    <input className="form-control form-control-sm" placeholder={f.ph}
                      value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <button type="submit" className="btn btn-primary btn-sm w-100">추가</button>
              </form>
            </div>
          </div>
        </div>
        <div className="col-lg-8">
          <div className="card">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead><tr><th>소스명</th><th>URL</th><th>분야</th><th>상태</th><th>작업</th></tr></thead>
                <tbody>
                  {sources.map(s => {
                    const cat = categories.find(c => c.id === s.categoryId)
                    return (
                      <tr key={s.id}>
                        <td className="fw-medium">{s.label}</td>
                        <td><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary small text-truncate d-inline-block" style={{ maxWidth: 150 }}>{s.url}</a></td>
                        <td>{cat?.name}</td>
                        <td>
                          <div className="form-check form-switch mb-0">
                            <input className="form-check-input" type="checkbox" checked={s.active} onChange={() => toggleSource(s.id)} />
                          </div>
                        </td>
                        <td><button className="btn btn-xs btn-outline-danger" onClick={() => deleteSource(s.id)}>삭제</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── 사용자 관리 ────────────────────────────────────────── */
export function UserManager() {
  const { users, toggleUserStatus } = useAdmin()
  return (
    <div className="fade-up">
      <PageHeader title="사용자 관리" subtitle={`총 ${users.length}명`} />
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead><tr><th>이메일</th><th>닉네임</th><th>역할</th><th>게시글</th><th>가입일</th><th>상태</th><th>작업</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="small">{u.email}</td>
                  <td className="fw-medium">{u.nickname}</td>
                  <td><span className="badge bg-secondary">{u.role}</span></td>
                  <td>{u.postCount}</td>
                  <td className="small text-muted">{u.createdAt}</td>
                  <td><span className={`badge ${u.status === 'active' ? 'bg-success' : 'bg-danger'}`}>{u.status === 'active' ? '활성' : '정지'}</span></td>
                  <td><button className={`btn btn-xs ${u.status === 'active' ? 'btn-outline-danger' : 'btn-outline-success'}`} onClick={() => toggleUserStatus(u.id)}>{u.status === 'active' ? '정지' : '복원'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ── 게시글 관리 ────────────────────────────────────────── */
export function PostManager() {
  const { posts, categories, hidePost, deletePost, restorePost } = useAdmin()
  return (
    <div className="fade-up">
      <PageHeader title="게시글 관리" subtitle={`총 ${posts.length}개`} />
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead><tr><th>제목</th><th>작성자</th><th>분야</th><th>조회</th><th>상태</th><th>작업</th></tr></thead>
            <tbody>
              {posts.map(p => {
                const cat = categories.find(c => c.id === p.categoryId)
                return (
                  <tr key={p.id} style={{ opacity: p.status === 'hidden' ? 0.6 : 1 }}>
                    <td style={{ maxWidth: 220 }}><span className="text-truncate d-inline-block fw-medium" style={{ maxWidth: 200 }}>{p.title}</span></td>
                    <td>{p.authorNickname}</td>
                    <td>{cat?.name}</td>
                    <td>{p.views?.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${p.status === 'published' ? 'bg-success' : 'bg-warning text-dark'}`}>
                        {p.status === 'published' ? '게시중' : '숨김'}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        {p.status !== 'hidden'
                          ? <button className="btn btn-xs btn-outline-warning" onClick={() => hidePost(p.id)}>숨김</button>
                          : <button className="btn btn-xs btn-outline-success" onClick={() => restorePost(p.id)}>복원</button>
                        }
                        <button className="btn btn-xs btn-outline-danger"
                          onClick={() => { if (confirm('삭제하면 사용자 페이지에서 즉시 숨겨집니다. 삭제하시겠습니까?')) deletePost(p.id) }}>
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
