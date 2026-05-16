import { useState, useEffect, useRef } from 'react'
import { MENU_TOPICS, getLastCrawled, getStoreStats, clearStore, readStore } from '../store/crawlStore.js'
import { crawlTopics, crawlStale } from '../store/crawler.js'

const INTERVAL_MS = 10 * 60 * 1000 // 10분

function timeAgo(iso) {
  if (!iso) return '미수집'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  return `${Math.floor(m / 60)}시간 전`
}

function isStale(iso) {
  if (!iso) return true
  return Date.now() - new Date(iso).getTime() > INTERVAL_MS
}

// 카테고리별 그룹핑
const CATEGORIES = ['home', 'trending', 'feed', 'board', 'gallery', 'community', 'knowledge', 'market', 'aihub']
const CAT_LABELS = {
  home: '홈', trending: '인기', feed: '피드', board: '게시판',
  gallery: '갤러리', community: '커뮤니티', knowledge: '정보',
  market: '마켓', aihub: 'AI 허브',
}

export default function CrawlerDashboard() {
  const [status, setStatus] = useState({}) // topicKey → 'idle'|'loading'|'success'|'error'
  const [stats, setStats] = useState({ total: 0, topics: 0, lastUpdate: null })
  const [autoRunning, setAutoRunning] = useState(false)
  const [nextRun, setNextRun] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(Date.now())
  const [selectedCat, setSelectedCat] = useState('all')
  const [log, setLog] = useState([])
  const timerRef = useRef(null)
  const countdownRef = useRef(null)
  const [countdown, setCountdown] = useState(null)

  // 스토어 통계 주기적 업데이트
  useEffect(() => {
    const refresh = () => setStats(getStoreStats())
    refresh()
    const t = setInterval(refresh, 3000)
    return () => clearInterval(t)
  }, [lastUpdated])

  function addLog(msg, type = 'info') {
    const ts = new Date().toLocaleTimeString('ko-KR')
    setLog(prev => [{ ts, msg, type, id: Date.now() }, ...prev].slice(0, 50))
  }

  // 특정 토픽 크롤링
  async function runCrawl(keys, label = '') {
    const onProgress = (key, st, result) => {
      setStatus(prev => ({ ...prev, [key]: st }))
      if (st === 'success') addLog(`✓ [${MENU_TOPICS[key]?.label}] ${result}개 수집`, 'success')
      if (st === 'error')   addLog(`✗ [${MENU_TOPICS[key]?.label}] ${result}`, 'error')
    }
    addLog(`${label || '크롤링'} 시작 (${keys.length}개 토픽)`)
    await crawlTopics(keys, onProgress)
    setLastUpdated(Date.now())
    addLog(`${label || '크롤링'} 완료`, 'success')
  }

  // 단일 토픽
  async function runSingle(key) {
    await runCrawl([key], `[${MENU_TOPICS[key]?.label}]`)
  }

  // 전체 크롤링
  async function runAll() {
    const keys = Object.keys(MENU_TOPICS)
    await runCrawl(keys, '전체 크롤링')
  }

  // 만료된 토픽만
  async function runStale() {
    const keys = Object.keys(MENU_TOPICS).filter(k => isStale(getLastCrawled(k)))
    if (keys.length === 0) { addLog('모든 토픽이 최신 상태입니다.', 'info'); return }
    await runCrawl(keys, '만료 토픽 크롤링')
  }

  // 자동 스케줄러 시작/중지
  function toggleAuto() {
    if (autoRunning) {
      clearInterval(timerRef.current)
      clearInterval(countdownRef.current)
      timerRef.current = null
      setAutoRunning(false)
      setNextRun(null)
      setCountdown(null)
      addLog('자동 스케줄러 중지됨')
    } else {
      setAutoRunning(true)
      addLog('자동 스케줄러 시작 (10분 간격)')
      const start = Date.now() + INTERVAL_MS
      setNextRun(start)
      // 10분마다 실행
      timerRef.current = setInterval(() => {
        runStale()
        setNextRun(Date.now() + INTERVAL_MS)
      }, INTERVAL_MS)
      // 카운트다운
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          const next = Math.max(0, (prev ?? INTERVAL_MS) - 1000)
          return next
        })
      }, 1000)
      setCountdown(INTERVAL_MS)
    }
  }

  useEffect(() => () => {
    clearInterval(timerRef.current)
    clearInterval(countdownRef.current)
  }, [])

  const filteredTopics = Object.entries(MENU_TOPICS).filter(([, v]) =>
    selectedCat === 'all' || v.category === selectedCat
  )

  const countdownStr = countdown != null
    ? `${Math.floor(countdown / 60000)}:${String(Math.floor((countdown % 60000) / 1000)).padStart(2, '0')}`
    : null

  const staleCount = Object.keys(MENU_TOPICS).filter(k => isStale(getLastCrawled(k))).length

  return (
    <div className="fade-up">
      {/* 페이지 헤더 */}
      <div style={{ paddingBottom: 'var(--space-7)', marginBottom: 'var(--space-7)', borderBottom: '1px solid var(--color-border-soft)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-ink)' }}>크롤링 관리</h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginTop: 'var(--space-1)' }}>
            AI 콘텐츠 생성 및 10분 자동 스케줄 관리
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <button onClick={runAll} className="btn btn-secondary" style={{ height: '36px' }}>전체 실행</button>
          <button onClick={runStale} className="btn btn-secondary" style={{ height: '36px' }}>
            만료만 ({staleCount})
          </button>
          <button onClick={toggleAuto} className="btn btn-primary" style={{ height: '36px', background: autoRunning ? '#E03131' : 'var(--color-accent)', color: autoRunning ? '#fff' : 'var(--color-accent-text)' }}>
            {autoRunning ? `⏹ 자동중지 ${countdownStr ? `(${countdownStr})` : ''}` : '▶ 자동 시작'}
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1px', background: 'var(--color-border-soft)', border: '1px solid var(--color-border-soft)', marginBottom: 'var(--space-6)' }}>
        {[
          { label: '총 수집 콘텐츠', value: stats.total.toLocaleString(), unit: '개' },
          { label: '활성 토픽',      value: stats.topics,                 unit: '개' },
          { label: '만료 토픽',      value: staleCount,                   unit: '개', warn: staleCount > 0 },
          { label: '자동 스케줄',    value: autoRunning ? 'ON' : 'OFF',   unit: '', ok: autoRunning },
        ].map(s => (
          <div key={s.label} style={{ padding: 'var(--space-6)', background: '#fff' }}>
            <p style={{ fontSize: '26px', fontWeight: 800, color: s.warn ? '#E03131' : s.ok ? 'var(--color-accent)' : 'var(--color-ink)' }}>
              {s.value}<span style={{ fontSize: 'var(--text-xs)', fontWeight: 400, color: 'var(--color-muted)', marginLeft: '3px' }}>{s.unit}</span>
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', marginTop: 'var(--space-2)', fontWeight: 700 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* 토픽 목록 */}
        <div>
          {/* 카테고리 필터 */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
            <button onClick={() => setSelectedCat('all')} style={{
              height: '28px', padding: '0 var(--space-3)', borderRadius: '99px', fontSize: 'var(--text-xs)', fontWeight: 700,
              background: selectedCat === 'all' ? 'var(--color-accent)' : 'var(--color-surface)',
              color: selectedCat === 'all' ? 'var(--color-accent-text)' : 'var(--color-muted)',
              border: '1px solid var(--color-border-soft)',
            }}>전체</button>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setSelectedCat(cat)} style={{
                height: '28px', padding: '0 var(--space-3)', borderRadius: '99px', fontSize: 'var(--text-xs)', fontWeight: 700,
                background: selectedCat === cat ? 'var(--color-accent)' : 'var(--color-surface)',
                color: selectedCat === cat ? 'var(--color-accent-text)' : 'var(--color-muted)',
                border: '1px solid var(--color-border-soft)',
              }}>{CAT_LABELS[cat]}</button>
            ))}
          </div>

          <div style={{ border: '1px solid var(--color-border-soft)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>토픽</th><th>카테고리</th><th>수집 수</th><th>마지막 수집</th><th>상태</th><th style={{ width: '80px' }}>실행</th>
                </tr>
              </thead>
              <tbody>
                {filteredTopics.map(([key, topic]) => {
                  const lastCrawled = getLastCrawled(key)
                  const store = readStore()
                  const count = (store[key] || []).length
                  const st = status[key] || 'idle'
                  const stale = isStale(lastCrawled)
                  return (
                    <tr key={key}>
                      <td style={{ fontWeight: 700, color: 'var(--color-ink)', fontSize: 'var(--text-sm)' }}>{topic.label}</td>
                      <td>
                        <span style={{ fontSize: 'var(--text-xs)', padding: '2px 8px', background: 'var(--color-surface)', borderRadius: '99px', color: 'var(--color-muted)', fontWeight: 700 }}>
                          {CAT_LABELS[topic.category]}
                        </span>
                      </td>
                      <td style={{ color: count > 0 ? 'var(--color-ink)' : 'var(--color-placeholder)', fontWeight: 700 }}>
                        {count}
                      </td>
                      <td style={{ fontSize: 'var(--text-xs)', color: stale && lastCrawled ? '#E03131' : 'var(--color-muted)' }}>
                        {timeAgo(lastCrawled)}
                      </td>
                      <td>
                        {st === 'loading' ? (
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', fontWeight: 700 }}>수집중...</span>
                        ) : st === 'success' ? (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: '#d4f9e6', color: '#005C27', fontWeight: 700 }}>완료</span>
                        ) : st === 'error' ? (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: '#fee2e2', color: '#9B1C1C', fontWeight: 700 }}>오류</span>
                        ) : stale ? (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: '#fef3c7', color: '#78350F', fontWeight: 700 }}>만료</span>
                        ) : (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: '#d4f9e6', color: '#005C27', fontWeight: 700 }}>최신</span>
                        )}
                      </td>
                      <td>
                        <button onClick={() => runSingle(key)} disabled={st === 'loading'} className="btn btn-xs"
                          style={{ border: '1px solid var(--color-border)', color: st === 'loading' ? 'var(--color-placeholder)' : 'var(--color-ink)' }}>
                          {st === 'loading' ? '...' : '실행'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 로그 패널 */}
        <div style={{ border: '1px solid var(--color-border-soft)', borderRadius: 'var(--radius-card)', overflow: 'hidden', position: 'sticky', top: '72px' }}>
          <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-ink)' }}>실행 로그</p>
            <button onClick={() => setLog([])} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>지우기</button>
          </div>
          <div style={{ height: '480px', overflowY: 'auto', padding: 'var(--space-3)' }}>
            {log.length === 0 && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-placeholder)', padding: 'var(--space-4)' }}>로그가 없습니다.</p>
            )}
            {log.map(entry => (
              <div key={entry.id} style={{ padding: 'var(--space-2) var(--space-3)', marginBottom: '2px', borderRadius: 'var(--radius-btn)', background: entry.type === 'success' ? '#d4f9e610' : entry.type === 'error' ? '#fee2e210' : 'transparent' }}>
                <span style={{ fontSize: '10px', color: 'var(--color-placeholder)', marginRight: 'var(--space-2)' }}>{entry.ts}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: entry.type === 'success' ? '#005C27' : entry.type === 'error' ? '#9B1C1C' : 'var(--color-body)' }}>{entry.msg}</span>
              </div>
            ))}
          </div>

          {/* 데이터 초기화 */}
          <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--color-border-soft)' }}>
            <button onClick={() => { if (confirm('수집된 모든 데이터를 삭제하시겠습니까?')) { clearStore(); setLastUpdated(Date.now()); addLog('데이터 초기화 완료', 'error') } }}
              className="btn btn-xs" style={{ width: '100%', justifyContent: 'center', color: '#E03131', border: '1px solid var(--color-border)' }}>
              전체 데이터 초기화
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
