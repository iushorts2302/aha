import { useState, useEffect, useRef } from 'react'
import { crawlTopics } from '../store/crawler.js'

const ADMIN_API  = 'https://admin-vert-psi.vercel.app'
const INTERVAL_MS = 10 * 60 * 1000

function timeAgo(iso) {
  if (!iso) return '미수집'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  return `${Math.floor(m / 60)}시간 전`
}

function isStale(iso) {
  if (!iso) return false   // lastCrawled 없음 → 만료 아님 (미수집으로 별도 표시)
  return Date.now() - new Date(iso).getTime() > INTERVAL_MS
}

async function apiGet(resource, params = '') {
  const r = await fetch(`${ADMIN_API}/api/v1?resource=${resource}${params}`)
  return r.json()
}

async function apiInit(force = false) {
  const r = await fetch(`${ADMIN_API}/api/init${force ? '?force=1' : ''}`,
    { signal: AbortSignal.timeout(30000) })
  return r.json()
}

export default function CrawlerDashboard() {
  const [categories, setCategories]   = useState([])
  const [topics,     setTopics]       = useState([])     // DB 토픽 목록
  const [crawlStats, setCrawlStats]   = useState({})     // topicKey → { count, lastCrawled }
  const [topicStatus, setTopicStatus] = useState({})     // topicKey → 'idle'|'loading'|'success'|'error'
  const [selectedCat, setSelectedCat] = useState('all')
  const [autoRunning, setAutoRunning] = useState(true)  // 페이지 로드 시 자동 ON
  const [countdown, setCountdown]     = useState(null)
  const [log, setLog]                 = useState([])
  const [loading, setLoading]         = useState(true)
  const timerRef    = useRef(null)
  const countdownRef = useRef(null)

  const [dbStatus, setDbStatus]     = useState('unknown')  // 'connected'|'disconnected'|'unknown'

  // ── DB에서 카테고리 + 토픽 로드 (DB 없으면 config 기본값) ──
  async function loadTopics() {
    setLoading(true)
    try {
      const [catData, topicData] = await Promise.all([
        apiGet('categories'),
        apiGet('topics'),
      ])
      // db_down 필드로 DB 연결 상태 판단
      setDbStatus(catData.db_down ? 'disconnected' : 'connected')

      const cats = catData.categories || []
      setCategories(cats)

      const tps = topicData.topics || []
      setTopics(tps)

      // 크롤링 아이템 수 조회 (tb_crawl_item에서 topicKey별)
      const stats = {}
      await Promise.all(tps.map(async t => {
        try {
          const r = await fetch(
            `${ADMIN_API}/api/v1?resource=crawl_items&topic_key=${encodeURIComponent(t.topic_key)}&count_only=1`
          )
          if (r.ok) {
            const d = await r.json()
            stats[t.topic_key] = { count: d.count || 0, lastCrawled: d.last_crawled || null }
          } else {
            stats[t.topic_key] = { count: 0, lastCrawled: null }
          }
        } catch {
          stats[t.topic_key] = { count: 0, lastCrawled: null }
        }
      }))
      setCrawlStats(stats)
    } catch (e) {
      addLog('DB 로드 실패: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTopics()
    // 자동 스케줄러 즉시 시작
    timerRef.current = setInterval(() => { runStale(); setCountdown(INTERVAL_MS) }, INTERVAL_MS)
    countdownRef.current = setInterval(() => setCountdown(p => Math.max(0, (p ?? INTERVAL_MS) - 1000)), 1000)
    setCountdown(INTERVAL_MS)
    addLog('자동 스케줄러 시작됨 (10분 간격)')
    return () => { clearInterval(timerRef.current); clearInterval(countdownRef.current) }
  }, [])

  function addLog(msg, type = 'info') {
    const ts = new Date().toLocaleTimeString('ko-KR')
    setLog(prev => [{ ts, msg, type, id: Date.now() + Math.random() }, ...prev].slice(0, 50))
  }

  // ── 크롤링 실행 ──────────────────────────────────────
  async function runCrawl(topicKeys, label = '') {
    const onProgress = (key, st, result) => {
      setTopicStatus(prev => ({ ...prev, [key]: st }))
      const t = topics.find(t => t.topic_key === key)
      if (st === 'success') {
        addLog(`✓ [${t?.label || key}] ${result}개 수집`, 'success')
        setCrawlStats(prev => ({
          ...prev,
          [key]: { count: (prev[key]?.count || 0) + (result || 0), lastCrawled: new Date().toISOString() }
        }))
      }
      if (st === 'error') addLog(`✗ [${t?.label || key}] ${result}`, 'error')
    }
    addLog(`${label || '크롤링'} 시작 (${topicKeys.length}개 토픽)`)
    await crawlTopics(topicKeys, onProgress)
    addLog(`${label || '크롤링'} 완료`, 'success')
    loadTopics()
  }

  async function runAll() {
    await runCrawl(topics.map(t => t.topic_key), '전체 크롤링')
  }

  async function runStale() {
    const keys = topics.filter(t => isStale(crawlStats[t.topic_key]?.lastCrawled)).map(t => t.topic_key)
    if (!keys.length) { addLog('모든 토픽이 최신 상태입니다.'); return }
    await runCrawl(keys, '만료 토픽 크롤링')
  }

  async function runSingle(key) {
    const t = topics.find(t => t.topic_key === key)
    await runCrawl([key], `[${t?.label || key}]`)
  }

  // ── 자동 스케줄러 토글 ──────────────────────────────
  function toggleAuto() {
    if (autoRunning) {
      clearInterval(timerRef.current)
      clearInterval(countdownRef.current)
      setAutoRunning(false); setCountdown(null)
      addLog('자동 스케줄러 중지됨')
    } else {
      setAutoRunning(true)
      addLog('자동 스케줄러 재시작 (10분 간격)')
      timerRef.current = setInterval(() => { runStale(); setCountdown(INTERVAL_MS) }, INTERVAL_MS)
      countdownRef.current = setInterval(() => setCountdown(p => Math.max(0, (p ?? INTERVAL_MS) - 1000)), 1000)
      setCountdown(INTERVAL_MS)
    }
  }

  // ── 파생 값 ──────────────────────────────────────────
  const totalItems  = Object.values(crawlStats).reduce((s, v) => s + (v.count || 0), 0)
  const activeCount = topics.filter(t => t.active_yn === 'Y').length
  const staleCount  = topics.filter(t => isStale(crawlStats[t.topic_key]?.lastCrawled)).length
  const countdownStr = countdown != null
    ? `${Math.floor(countdown / 60000)}:${String(Math.floor((countdown % 60000) / 1000)).padStart(2, '0')}`
    : null

  const filteredTopics = selectedCat === 'all'
    ? topics
    : topics.filter(t => {
        const cat = categories.find(c => c.seq_no === t.category_seq_no)
        return cat?.category_id === selectedCat
      })

  // ── 렌더 ─────────────────────────────────────────────
  return (
    <div className="fade-up">

      {/* 헤더 */}
      <div style={{ paddingBottom: 20, marginBottom: 20, borderBottom: '1px solid var(--color-border-soft)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-ink)' }}>크롤링 관리</h2>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>AI 콘텐츠 생성 및 10분 자동 스케줄 관리</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={runAll}   className="btn btn-secondary" style={{ height: 36 }}>전체 실행</button>
          <button onClick={runStale} className="btn btn-secondary" style={{ height: 36 }}>만료만 ({staleCount})</button>
          <button onClick={async () => {
            addLog('초기화 크롤링 시작 (빈 토픽만)...')
            const d = await apiInit(false)
            addLog(`초기화 완료: ${d.topics_crawled}개 토픽, DB ${d.total_in_db}개`, 'success')
            loadTopics()
          }} className="btn btn-secondary" style={{ height: 36 }}>초기화 크롤링</button>
          <button onClick={toggleAuto} className="btn btn-primary" style={{ height: 36, background: autoRunning ? '#E03131' : undefined }}>
            {autoRunning ? `⏹ 자동중지${countdownStr ? ` (${countdownStr})` : ''}` : '▶ 자동 시작'}
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--color-border-soft)', border: '1px solid var(--color-border-soft)', marginBottom: 20 }}>
        {[
          { label: '총 수집 콘텐츠', value: totalItems.toLocaleString(), unit: '개' },
          { label: '활성 토픽',      value: activeCount,                  unit: '개' },
          { label: '만료 토픽',      value: staleCount,                   unit: '개', warn: staleCount > 0 },
          { label: '자동 스케줄',    value: autoRunning ? 'ON' : 'OFF',   unit: '', ok: autoRunning },
        { label: 'DB 상태', value: dbStatus === 'connected' ? '연결됨' : dbStatus === 'disconnected' ? 'DB 없음' : '확인 중', unit: '', ok: dbStatus === 'connected', warn: dbStatus === 'disconnected' },
        ].map(s => (
          <div key={s.label} style={{ padding: 20, background: '#fff' }}>
            <p style={{ fontSize: 26, fontWeight: 800, color: s.warn ? '#E03131' : s.ok ? 'var(--color-accent)' : 'var(--color-ink)' }}>
              {s.value}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-muted)', marginLeft: 3 }}>{s.unit}</span>
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 6, fontWeight: 700 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Cron 상태 */}
      <div style={{ marginBottom: 20, padding: '12px 16px', background: '#f0f9f4', border: '1px solid rgba(0,180,100,0.25)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00B84F', display: 'inline-block', boxShadow: '0 0 6px rgba(0,184,79,0.6)' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#005C27' }}>Vercel Cron 활성</span>
        <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>10분마다 자동 크롤링 실행 중 (*/10 * * * *)</span>
        <div style={{ flex: 1 }} />
        <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 700 }}>
          Vercel 대시보드에서 확인 ↗
        </a>
      </div>

      {/* 메인 그리드: 왼쪽(토픽 테이블) + 오른쪽(로그) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

        {/* ── 왼쪽: 카테고리 필터 + 토픽 테이블 ── */}
        <div>
          {/* 카테고리 필터 탭 */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {[{ id: 'all', label: '전체' }, ...categories.map(c => ({ id: c.category_id, label: c.label }))].map(cat => (
              <button key={cat.id} onClick={() => setSelectedCat(cat.id)} style={{
                height: 28, padding: '0 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: selectedCat === cat.id ? 'var(--color-accent)' : 'var(--color-surface)',
                color:      selectedCat === cat.id ? 'var(--color-accent-text)' : 'var(--color-muted)',
                border: '1px solid var(--color-border-soft)',
              }}>{cat.label}</button>
            ))}
          </div>

          {/* 토픽 테이블 */}
          <div style={{ border: '1px solid var(--color-border-soft)', borderRadius: 8, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>
                DB에서 토픽 로딩 중...
              </div>
            ) : (
              <table className="table" style={{ marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th>토픽</th>
                    <th>카테고리</th>
                    <th>수집 수</th>
                    <th>마지막 수집</th>
                    <th>상태</th>
                    <th style={{ width: 80 }}>실행</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTopics.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-muted)', padding: 32 }}>토픽 없음</td></tr>
                  ) : filteredTopics.map(t => {
                    const cat      = categories.find(c => c.seq_no === t.category_seq_no)
                    const stats    = crawlStats[t.topic_key] || { count: 0, lastCrawled: null }
                    const st       = topicStatus[t.topic_key] || 'idle'
                    const stale    = isStale(stats.lastCrawled)
                    return (
                      <tr key={t.seq_no}>
                        <td style={{ fontWeight: 700, color: 'var(--color-ink)', fontSize: 13 }}>{t.label}</td>
                        <td>
                          <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--color-surface)', borderRadius: 99, color: 'var(--color-muted)', fontWeight: 700 }}>
                            {cat?.label || '-'}
                          </span>
                        </td>
                        <td style={{ color: stats.count > 0 ? 'var(--color-ink)' : 'var(--color-placeholder)', fontWeight: 700 }}>
                          {stats.count}
                        </td>
                        <td style={{ fontSize: 12, color: stale && stats.lastCrawled ? '#E03131' : 'var(--color-muted)' }}>
                          {stats.lastCrawled ? timeAgo(stats.lastCrawled)
                           : stats.count > 0 ? 'DB 저장됨'
                           : '없음'}
                        </td>
                        <td>
                          {st === 'loading' ? (
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, display:'inline-flex', alignItems:'center', gap:3 }}>
                              ⏳ 실행 중
                            </span>
                          ) : st === 'success' ? (
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#d4f9e6', color: '#005C27', fontWeight: 700 }}>
                              ✅ 완료
                            </span>
                          ) : st === 'error' ? (
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#fee2e2', color: '#9B1C1C', fontWeight: 700 }}>
                              ❌ 오류
                            </span>
                          ) : stats.count > 0 && stale ? (
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#fef3c7', color: '#78350F', fontWeight: 700 }}>
                              ⏰ 만료
                            </span>
                          ) : stats.count > 0 ? (
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#d4f9e6', color: '#005C27', fontWeight: 700 }}>
                              ✔ 정상
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#f3f4f6', color: '#6b7280', fontWeight: 700 }}>
                              — 미수집
                            </span>
                          )}
                        </td>
                        <td>
                          <button onClick={() => runSingle(t.topic_key)} disabled={st === 'loading'}
                            className="btn btn-xs" style={{
                              border: '1px solid var(--color-border)',
                              color: st === 'loading' ? 'var(--color-placeholder)' : 'var(--color-ink)',
                              opacity: st === 'loading' ? 0.5 : 1,
                            }}>
                            {st === 'loading' ? '실행 중' : '▶ 실행'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── 오른쪽: 로그 패널 ── */}
        <div style={{ border: '1px solid var(--color-border-soft)', borderRadius: 8, overflow: 'hidden', position: 'sticky', top: 72 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>실행 로그</p>
            <button onClick={() => setLog([])} style={{ fontSize: 12, color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>지우기</button>
          </div>
          <div style={{ height: 480, overflowY: 'auto', padding: 8 }}>
            {log.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--color-placeholder)', padding: 16 }}>로그가 없습니다.</p>
            )}
            {log.map(entry => (
              <div key={entry.id} style={{ padding: '4px 8px', marginBottom: 2, borderRadius: 4, background: entry.type === 'success' ? '#d4f9e610' : entry.type === 'error' ? '#fee2e210' : 'transparent' }}>
                <span style={{ fontSize: 10, color: 'var(--color-placeholder)', marginRight: 6 }}>{entry.ts}</span>
                <span style={{ fontSize: 12, color: entry.type === 'success' ? '#005C27' : entry.type === 'error' ? '#9B1C1C' : 'var(--color-body)' }}>{entry.msg}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: 12, borderTop: '1px solid var(--color-border-soft)' }}>
            <button onClick={loadTopics} className="btn btn-xs"
              style={{ width: '100%', justifyContent: 'center', marginBottom: 6 }}>
              DB 새로고침
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
