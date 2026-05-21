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

// ── 크롤링 소스 정보 (코드 기반 매핑) ────────────────────
export function SourceManager() {
  const [topicMap, setTopicMap] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 토픽 목록 조회 → 각 토픽이 어떤 외부 소스를 사용하는지 안내
    fetch('https://admin-vert-psi.vercel.app/api/v1?resource=topics')
      .then(r => r.json())
      .then(d => {
        setTopicMap(d.topics || [])
      })
      .catch(() => setTopicMap([]))
      .finally(() => setLoading(false))
  }, [])

  // 토픽 키 → 사용 중인 외부 데이터 소스 추론 (crawl.py와 동기화)
  const SOURCE_INFO = {
    // GitHub 계열
    home:     ['GitHub Trending', 'GitHub Search API', '한국 IT 기업 (Kakao/Naver/Toss/Daangn)'],
    dev:      ['GitHub Trending', 'NPM Registry', 'PyPI', 'dev.to API'],
    ai:       ['GitHub topic:llm/chatgpt', 'arxiv.org (논문)', 'Hacker News (AI 검색)', 'dev.to'],
    startup:  ['GitHub 한국 스타트업 조직', 'Disquiet (메이커)', 'Hacker News Show'],
    oss:      ['GitHub Trending Weekly', 'GitHub topic:awesome-list', 'PyPI/NPM 최신'],
    it:       ['Hacker News front_page', 'GitHub security/cloud-native', 'dev.to'],
    design:   ['Dribbble RSS (인기)', 'GitHub topic:ui-components', 'dev.to design'],
    game:     ['GitHub topic:game-engine', '한국 게임사 (NCSoft/Krafton/Nexon)'],
    finance:  ['CoinGecko API (실시간 시세)', 'GitHub topic:algorithmic-trading', 'PyPI'],
    market:   ['GitHub topic:ecommerce', 'Daangn 저장소', 'NPM'],
    job:      ['Hacker News job', 'GitHub coding-interview', 'StackOverflow API'],
    learn:    ['GitHub topic:tutorial/book', 'Velog (한국 개발자)', 'dev.to'],
    board:    ['Hacker News', 'StackOverflow', 'GitHub Trending'],
  }

  // 카테고리별 그룹핑
  const byCategory = {}
  ;(topicMap || []).forEach(t => {
    const cat = (t.topic_key || '').split('.')[0]
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(t)
  })

  return (
    <div className="fade-up">
      <div className="mb-4">
        <h4 className="fw-semibold mb-1">크롤링 소스</h4>
        <p className="text-muted small mb-0">
          토픽별 외부 데이터 소스 매핑 · 코드 기반 크롤러(apps/admin/api/crawl.py) 사용
        </p>
      </div>

      <div className="alert" style={{
        background:'#f0faf4', border:'1px solid rgba(0,180,80,0.2)',
        borderRadius:8, padding:'12px 16px', fontSize:13, marginBottom:16
      }}>
        💡 크롤링 소스는 코드(<code>crawl.py</code>)에서 정의됩니다. 외부 사이트 추가/변경은
        엔지니어가 코드를 수정해야 하며, 이 페이지는 현재 적용된 매핑을 확인하는 용도입니다.
      </div>

      {loading && <div className="text-muted">불러오는 중...</div>}

      {!loading && Object.keys(byCategory).sort().map(cat => (
        <div key={cat} className="card mb-3">
          <div className="card-header">
            <strong>{cat}</strong>
            <span className="text-muted ms-2 small">{byCategory[cat].length}개 토픽</span>
          </div>
          <div className="card-body">
            <div className="mb-2">
              <strong className="small">사용 중인 외부 소스:</strong>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6 }}>
                {(SOURCE_INFO[cat] || ['(코드 기반)']).map(src => (
                  <span key={src} className="badge bg-light text-dark border" style={{ fontSize:11 }}>
                    {src}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <strong className="small">포함 토픽:</strong>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6 }}>
                {byCategory[cat].map(t => (
                  <span key={t.topic_key} className="badge bg-primary" style={{ fontSize:11 }}>
                    {t.topic_key} · {t.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
