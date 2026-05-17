/**
 * CrawlConfigManager.jsx
 * 크롤링 분야/주제/소스 관리 — /api/config 연동
 * 변경 → POST /api/config → 사용자웹 30초 내 반영
 */
import { useState, useEffect, useCallback } from 'react'

const ADMIN_API = 'https://admin-vert-psi.vercel.app'

const SOURCE_TYPES = [
  { value: 'github_org',   label: 'GitHub 기업',  ph: 'kakao, naver, toss ...' },
  { value: 'github_topic', label: 'GitHub 토픽',  ph: 'llm, blockchain, korean ...' },
  { value: 'npm',          label: 'NPM 키워드',  ph: 'korean, react, typescript ...' },
  { value: 'pypi',         label: 'PyPI 키워드', ph: 'machine-learning, nlp ...' },
]

function useConfig() {
  const [cfg, setCfg]       = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${ADMIN_API}/api/config`)
      setCfg(await r.json())
    } catch { setMsg({ type: 'error', text: 'API 연결 실패' }) }
  }, [])

  useEffect(() => { load() }, [load])

  async function save(next) {
    setSaving(true); setMsg(null)
    try {
      const r = await fetch(`${ADMIN_API}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (!r.ok) throw new Error(await r.text())
      setCfg(next)
      setMsg({ type: 'success', text: '저장 완료 — 사용자웹에 30초 내 반영됩니다' })
      setTimeout(() => setMsg(null), 4000)
    } catch(e) {
      setMsg({ type: 'error', text: e.message })
    } finally { setSaving(false) }
  }

  return { cfg, saving, msg, save, reload: load }
}

function Toast({ msg }) {
  if (!msg) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      padding: '12px 20px', borderRadius: 10,
      background: msg.type === 'success' ? '#d4f9e6' : '#fee2e2',
      color: msg.type === 'success' ? '#005C27' : '#9B1C1C',
      fontWeight: 600, fontSize: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    }}>
      {msg.type === 'success' ? '✓ ' : '✗ '}{msg.text}
    </div>
  )
}

// ── 분야 관리 ────────────────────────────────────────────
export function CategoryManager() {
  const { cfg, saving, msg, save } = useConfig()
  const [form, setForm] = useState({ id: '', label: '', icon: '' })
  const [editing, setEditing] = useState(null)

  if (!cfg) return <div className="text-muted p-4">로딩 중...</div>

  function handleSave(e) {
    e.preventDefault()
    if (!form.id.trim() || !form.label.trim()) return
    let cats
    if (editing) {
      cats = cfg.categories.map(c => c.id === editing ? { ...c, ...form } : c)
    } else {
      if (cfg.categories.find(c => c.id === form.id)) {
        alert('이미 존재하는 ID입니다.')
        return
      }
      cats = [...cfg.categories, { ...form }]
    }
    save({ ...cfg, categories: cats, version: (cfg.version || 1) + 1 })
    setForm({ id: '', label: '', icon: '' }); setEditing(null)
  }

  function handleDelete(id) {
    if (!confirm(`분야 "${id}"를 삭제하면 연결된 주제/소스도 영향받습니다. 삭제하시겠습니까?`)) return
    save({ ...cfg, categories: cfg.categories.filter(c => c.id !== id), version: (cfg.version || 1) + 1 })
  }

  return (
    <div className="fade-up">
      <Toast msg={msg} />
      <div className="mb-4">
        <h4 className="fw-semibold mb-1">분야 관리</h4>
        <p className="text-muted small">사용자웹 메뉴 카테고리 관리 · 현재 {cfg.categories.length}개</p>
      </div>
      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header fw-semibold">{editing ? '분야 수정' : '분야 추가'}</div>
            <div className="card-body">
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">ID <span className="text-muted">(영문, 고정)</span></label>
                  <input className="form-control form-control-sm" placeholder="dev, ai, game ..."
                    value={form.id} onChange={e => setForm(p => ({ ...p, id: e.target.value.toLowerCase().replace(/\s/g,'') }))}
                    disabled={!!editing} required />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">표시 이름</label>
                  <input className="form-control form-control-sm" placeholder="개발, AI 뉴스 ..."
                    value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} required />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">아이콘 (이모지)</label>
                  <input className="form-control form-control-sm" placeholder="💻"
                    value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} />
                </div>
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary btn-sm flex-fill" disabled={saving}>
                    {saving ? '저장 중...' : editing ? '수정' : '추가'}
                  </button>
                  {editing && (
                    <button type="button" className="btn btn-outline-secondary btn-sm"
                      onClick={() => { setEditing(null); setForm({ id: '', label: '', icon: '' }) }}>취소</button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="col-lg-8">
          <div className="card">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead><tr><th>아이콘</th><th>ID</th><th>표시 이름</th><th>주제 수</th><th>작업</th></tr></thead>
                <tbody>
                  {cfg.categories.map(cat => {
                    const topicCount = cfg.topics.filter(t => t.catId === cat.id).length
                    return (
                      <tr key={cat.id}>
                        <td style={{ fontSize: 20 }}>{cat.icon}</td>
                        <td><code className="small">{cat.id}</code></td>
                        <td className="fw-medium">{cat.label}</td>
                        <td><span className="badge bg-secondary">{topicCount}</span></td>
                        <td>
                          <div className="d-flex gap-1">
                            <button className="btn btn-xs btn-outline-primary"
                              onClick={() => { setEditing(cat.id); setForm({ id: cat.id, label: cat.label, icon: cat.icon }) }}>수정</button>
                            <button className="btn btn-xs btn-outline-danger" onClick={() => handleDelete(cat.id)}>삭제</button>
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

// ── 주제 관리 ────────────────────────────────────────────
export function TopicManager() {
  const { cfg, saving, msg, save } = useConfig()
  const [form, setForm] = useState({ key: '', catId: '', label: '', active: true })
  const [editing, setEditing] = useState(null)
  const [filterCat, setFilterCat] = useState('all')

  if (!cfg) return <div className="text-muted p-4">로딩 중...</div>

  const filtered = cfg.topics.filter(t => filterCat === 'all' || t.catId === filterCat)

  function handleSave(e) {
    e.preventDefault()
    if (!form.key.trim() || !form.catId || !form.label.trim()) return
    let topics
    if (editing) {
      topics = cfg.topics.map(t => t.key === editing ? { ...t, ...form } : t)
    } else {
      if (cfg.topics.find(t => t.key === form.key)) { alert('이미 존재하는 키입니다.'); return }
      topics = [...cfg.topics, { ...form }]
    }
    save({ ...cfg, topics, version: (cfg.version || 1) + 1 })
    setForm({ key: '', catId: '', label: '', active: true }); setEditing(null)
  }

  function toggleActive(key) {
    const topics = cfg.topics.map(t => t.key === key ? { ...t, active: !t.active } : t)
    save({ ...cfg, topics, version: (cfg.version || 1) + 1 })
  }

  function handleDelete(key) {
    if (!confirm(`주제 "${key}"를 삭제하시겠습니까?`)) return
    save({ ...cfg, topics: cfg.topics.filter(t => t.key !== key), version: (cfg.version || 1) + 1 })
  }

  return (
    <div className="fade-up">
      <Toast msg={msg} />
      <div className="mb-4">
        <h4 className="fw-semibold mb-1">주제 관리</h4>
        <p className="text-muted small">사용자웹 서브탭(topicKey) 관리 · 현재 {cfg.topics.length}개</p>
      </div>
      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header fw-semibold">{editing ? '주제 수정' : '주제 추가'}</div>
            <div className="card-body">
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">분야</label>
                  <select className="form-select form-select-sm" value={form.catId}
                    onChange={e => setForm(p => ({ ...p, catId: e.target.value }))} required>
                    <option value="">선택</option>
                    {cfg.categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">토픽 키 <span className="text-muted">(분야.이름)</span></label>
                  <input className="form-control form-control-sm" placeholder="dev.typescript"
                    value={form.key} onChange={e => setForm(p => ({ ...p, key: e.target.value.toLowerCase().replace(/\s/g,'') }))}
                    disabled={!!editing} required />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">표시 이름</label>
                  <input className="form-control form-control-sm" placeholder="TypeScript"
                    value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} required />
                </div>
                <div className="mb-3 form-check">
                  <input type="checkbox" className="form-check-input" id="activeChk"
                    checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} />
                  <label className="form-check-label small" htmlFor="activeChk">활성화</label>
                </div>
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary btn-sm flex-fill" disabled={saving}>
                    {saving ? '저장 중...' : editing ? '수정' : '추가'}
                  </button>
                  {editing && (
                    <button type="button" className="btn btn-outline-secondary btn-sm"
                      onClick={() => { setEditing(null); setForm({ key: '', catId: '', label: '', active: true }) }}>취소</button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="col-lg-8">
          {/* 카테고리 필터 */}
          <div className="d-flex gap-2 flex-wrap mb-3">
            {['all', ...cfg.categories.map(c => c.id)].map(id => {
              const cat = cfg.categories.find(c => c.id === id)
              return (
                <button key={id} onClick={() => setFilterCat(id)}
                  className={`btn btn-xs ${filterCat === id ? 'btn-primary' : 'btn-outline-secondary'}`}>
                  {id === 'all' ? '전체' : `${cat?.icon} ${cat?.label}`}
                </button>
              )
            })}
          </div>
          <div className="card">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead><tr><th>토픽 키</th><th>분야</th><th>표시 이름</th><th>활성</th><th>작업</th></tr></thead>
                <tbody>
                  {filtered.map(t => {
                    const cat = cfg.categories.find(c => c.id === t.catId)
                    return (
                      <tr key={t.key} style={{ opacity: t.active ? 1 : 0.5 }}>
                        <td><code className="small">{t.key}</code></td>
                        <td><span className="badge bg-light text-dark border">{cat?.icon} {cat?.label}</span></td>
                        <td className="fw-medium">{t.label}</td>
                        <td>
                          <div className="form-check form-switch mb-0">
                            <input className="form-check-input" type="checkbox" checked={t.active}
                              onChange={() => toggleActive(t.key)} />
                          </div>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button className="btn btn-xs btn-outline-primary"
                              onClick={() => { setEditing(t.key); setForm({ key: t.key, catId: t.catId, label: t.label, active: t.active }) }}>수정</button>
                            <button className="btn btn-xs btn-outline-danger" onClick={() => handleDelete(t.key)}>삭제</button>
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

// ── 크롤링 소스 관리 ─────────────────────────────────────
export function SourceManager() {
  const { cfg, saving, msg, save } = useConfig()
  const [form, setForm] = useState({ id: '', label: '', type: 'github_org', value: '', topicKeys: [], active: true })
  const [editing, setEditing] = useState(null)
  const [filterCat, setFilterCat] = useState('all')

  if (!cfg) return <div className="text-muted p-4">로딩 중...</div>

  // 카테고리별 필터
  const filtered = cfg.sources.filter(s => {
    if (filterCat === 'all') return true
    return s.topicKeys.some(k => k.startsWith(filterCat + '.'))
  })

  function handleSave(e) {
    e.preventDefault()
    if (!form.label.trim() || !form.value.trim()) return
    const newSrc = { ...form, id: editing || `src_${Date.now()}` }
    const sources = editing
      ? cfg.sources.map(s => s.id === editing ? newSrc : s)
      : [...cfg.sources, newSrc]
    save({ ...cfg, sources, version: (cfg.version || 1) + 1 })
    setForm({ id: '', label: '', type: 'github_org', value: '', topicKeys: [], active: true })
    setEditing(null)
  }

  function toggleActive(id) {
    const sources = cfg.sources.map(s => s.id === id ? { ...s, active: !s.active } : s)
    save({ ...cfg, sources, version: (cfg.version || 1) + 1 })
  }

  function handleDelete(id) {
    if (!confirm('소스를 삭제하시겠습니까?')) return
    save({ ...cfg, sources: cfg.sources.filter(s => s.id !== id), version: (cfg.version || 1) + 1 })
  }

  function toggleTopicKey(key) {
    setForm(p => ({
      ...p,
      topicKeys: p.topicKeys.includes(key) ? p.topicKeys.filter(k => k !== key) : [...p.topicKeys, key],
    }))
  }

  const srcType = SOURCE_TYPES.find(t => t.value === form.type)

  return (
    <div className="fade-up">
      <Toast msg={msg} />
      <div className="mb-4">
        <h4 className="fw-semibold mb-1">크롤링 소스</h4>
        <p className="text-muted small">topicKey별 크롤링 소스 관리 · 현재 {cfg.sources.length}개</p>
      </div>
      <div className="row g-4">
        {/* 소스 추가/수정 폼 */}
        <div className="col-lg-5">
          <div className="card">
            <div className="card-header fw-semibold">{editing ? '소스 수정' : '소스 추가'}</div>
            <div className="card-body" style={{ maxHeight: 560, overflowY: 'auto' }}>
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">소스 이름</label>
                  <input className="form-control form-control-sm" placeholder="카카오 GitHub"
                    value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} required />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">소스 유형</label>
                  <select className="form-select form-select-sm" value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value, value: '' }))}>
                    {SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">
                    {srcType?.label} 값
                  </label>
                  <input className="form-control form-control-sm" placeholder={srcType?.ph || ''}
                    value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} required />
                  <div className="form-text">
                    {form.type === 'github_org'   && 'GitHub 조직명 (예: kakao, naver, toss)'}
                    {form.type === 'github_topic' && 'GitHub 토픽 슬러그 (예: llm, blockchain)'}
                    {form.type === 'npm'          && 'NPM 검색 키워드 (예: korean, react)'}
                    {form.type === 'pypi'         && 'PyPI 검색 키워드 (비우면 RSS 최신 목록)'}
                  </div>
                </div>

                {/* 연결 토픽 선택 */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold">연결 토픽 <span className="text-muted">(다중 선택)</span></label>
                  <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: 6, padding: '8px' }}>
                    {cfg.categories.map(cat => (
                      <div key={cat.id}>
                        <div className="fw-semibold small text-muted mb-1 mt-2">{cat.icon} {cat.label}</div>
                        <div className="d-flex flex-wrap gap-1 mb-1">
                          {cfg.topics.filter(t => t.catId === cat.id).map(t => (
                            <button key={t.key} type="button"
                              onClick={() => toggleTopicKey(t.key)}
                              className={`btn btn-xs ${form.topicKeys.includes(t.key) ? 'btn-primary' : 'btn-outline-secondary'}`}>
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="form-text">선택된 토픽: {form.topicKeys.length}개</div>
                </div>

                <div className="mb-3 form-check">
                  <input type="checkbox" className="form-check-input" id="srcActiveChk"
                    checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} />
                  <label className="form-check-label small" htmlFor="srcActiveChk">활성화</label>
                </div>
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary btn-sm flex-fill" disabled={saving}>
                    {saving ? '저장 중...' : editing ? '수정' : '추가'}
                  </button>
                  {editing && (
                    <button type="button" className="btn btn-outline-secondary btn-sm"
                      onClick={() => { setEditing(null); setForm({ id: '', label: '', type: 'github_org', value: '', topicKeys: [], active: true }) }}>취소</button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* 소스 목록 */}
        <div className="col-lg-7">
          <div className="d-flex gap-2 flex-wrap mb-3">
            <button onClick={() => setFilterCat('all')}
              className={`btn btn-xs ${filterCat === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}>전체</button>
            {cfg.categories.map(c => (
              <button key={c.id} onClick={() => setFilterCat(c.id)}
                className={`btn btn-xs ${filterCat === c.id ? 'btn-primary' : 'btn-outline-secondary'}`}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
          <div className="card">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead><tr><th>소스명</th><th>유형</th><th>값</th><th>연결 토픽</th><th>활성</th><th>작업</th></tr></thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id} style={{ opacity: s.active ? 1 : 0.5 }}>
                      <td className="fw-medium small">{s.label}</td>
                      <td>
                        <span className="badge bg-light text-dark border" style={{ fontSize: 10 }}>
                          {SOURCE_TYPES.find(t => t.value === s.type)?.label || s.type}
                        </span>
                      </td>
                      <td><code className="small">{s.value || '-'}</code></td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                          {(s.topicKeys || []).slice(0, 3).map(k => (
                            <span key={k} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: '#e9ecef', color: '#495057' }}>{k}</span>
                          ))}
                          {(s.topicKeys || []).length > 3 && (
                            <span style={{ fontSize: 10, color: '#6c757d' }}>+{s.topicKeys.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="form-check form-switch mb-0">
                          <input className="form-check-input" type="checkbox" checked={s.active}
                            onChange={() => toggleActive(s.id)} />
                        </div>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn btn-xs btn-outline-primary"
                            onClick={() => {
                              setEditing(s.id)
                              setForm({ id: s.id, label: s.label, type: s.type, value: s.value, topicKeys: s.topicKeys || [], active: s.active })
                            }}>수정</button>
                          <button className="btn btn-xs btn-outline-danger" onClick={() => handleDelete(s.id)}>삭제</button>
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
