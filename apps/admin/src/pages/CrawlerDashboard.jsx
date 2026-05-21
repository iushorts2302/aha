/**
 * CrawlerDashboard — 크롤링 관리
 *
 * [원칙] DB가 없어도 정상 작동하는 항목만 유지
 *
 * 유지:
 *  - DB 연결 상태 (아코디언, 오류 시 로그)
 *  - 활성 토픽 수 (config 폴백)
 *  - 카테고리 필터 탭
 *  - 토픽 테이블: 토픽 / 카테고리 / ▶실행
 *  - 단일 토픽 실행 (직접 /api/crawl 호출)
 *  - 초기화 크롤링 (빈 토픽 채우기)
 *  - 실시간 로그 패널
 *
 * 제거:
 *  - 총 수집 콘텐츠 (DB 다운 시 0 고정)
 *  - 만료 토픽 수 (수집 수 0 → 의미 없음)
 *  - 자동 스케줄 ON/OFF (클라이언트 폴링은 무의미, 진짜 cron은 Vercel)
 *  - Cron 상태 박스 (하드코딩)
 *  - 전체 실행 / 만료만 버튼 (의존 데이터 없음)
 *  - 수집 수 / 마지막 수집 / 상태 컬럼 (DB 의존)
 */
import { useState, useEffect } from 'react'
import { crawlTopics } from '../store/crawler.js'

const ADMIN_API = 'https://admin-vert-psi.vercel.app'

async function apiGet(resource) {
  const r = await fetch(`${ADMIN_API}/api/v1?resource=${resource}`)
  return r.json()
}

async function apiInit() {
  const r = await fetch(`${ADMIN_API}/api/init`, { signal: AbortSignal.timeout(30000) })
  return r.json()
}

export default function CrawlerDashboard() {
  const [categories,  setCategories]  = useState([])
  const [topics,      setTopics]      = useState([])
  const [topicStatus, setTopicStatus] = useState({})  // topicKey → 'idle'|'loading'|'success'|'error'
  const [selectedCat, setSelectedCat] = useState('all')
  const [log,         setLog]         = useState([])
  const [loading,     setLoading]     = useState(true)
  const [dbStatus,    setDbStatus]    = useState('unknown')  // connected|disconnected|unknown

  // ── 초기 로드 ────────────────────────────────────────
  useEffect(() => {
    loadTopics()
    addLog('크롤링 관리 페이지 로드됨')
  }, [])

  async function loadTopics() {
    setLoading(true)
    try {
      const [catData, topicData] = await Promise.all([apiGet('categories'), apiGet('topics')])
      setDbStatus(catData.db_down ? 'disconnected' : 'connected')
      setCategories(catData.categories || [])
      setTopics(topicData.topics || [])
    } catch (e) {
      addLog('토픽 로드 실패: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function addLog(msg, type = 'info') {
    const ts = new Date().toLocaleTimeString('ko-KR')
    setLog(prev => [{ ts, msg, type, id: Date.now() + Math.random() }, ...prev].slice(0, 50))
  }

  // ── 단일 토픽 실행 ────────────────────────────────────
  async function runSingle(key) {
    const t = topics.find(t => t.topic_key === key)
    const onProgress = (k, st, result) => {
      setTopicStatus(prev => ({ ...prev, [k]: st }))
      if (st === 'success') addLog(`✓ [${t?.label || k}] ${result}개 수집`, 'success')
      if (st === 'error')   addLog(`✗ [${t?.label || k}] ${result}`, 'error')
    }
    await crawlTopics([key], onProgress)
  }

  // ── 초기화 크롤링 (빈 토픽만) ─────────────────────────
  async function runInit() {
    addLog('초기화 크롤링 시작 (빈 토픽만)...')
    try {
      const d = await apiInit()
      addLog(`초기화 완료: ${d.topics_crawled || 0}개 토픽 처리`, 'success')
    } catch (e) {
      addLog('초기화 실패: ' + e.message, 'error')
    }
  }

  // ── 필터링 ─────────────────────────────────────────
  const activeCount    = topics.filter(t => t.active_yn !== 'N').length
  const filteredTopics = selectedCat === 'all'
    ? topics
    : topics.filter(t => {
        const cat = categories.find(c => c.seq_no === t.category_seq_no)
        return cat?.category_id === selectedCat
      })

  return (
    <div style={{ padding: '24px' }}>
      {/* 헤더 */}
      <div style={{
        paddingBottom: 20, marginBottom: 20,
        borderBottom: '1px solid var(--color-border-soft)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-ink)' }}>크롤링 관리</h2>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>
            토픽별 수동 크롤링 · 자동 크롤링은 Vercel Cron(10분 간격)이 처리
          </p>
        </div>
        <button
          onClick={runInit}
          className="btn btn-primary"
          style={{ height: 36 }}>
          빈 토픽 일괄 채우기
        </button>
      </div>

      {/* DB 연결 상태 — 아코디언 */}
      <DbStatusBar dbStatus={dbStatus} log={log} />

      {/* 활성 토픽 수 — 단일 카드 */}
      <div style={{
        marginBottom: 20, padding: '14px 20px',
        background: '#fff', border: '1px solid var(--color-border-soft)',
        borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-ink)' }}>
          {activeCount}
        </span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
            활성 토픽
          </p>
          <p style={{ fontSize: 11, color: 'var(--color-muted)', margin: 0 }}>
            크롤링 대상으로 등록된 토픽 수
          </p>
        </div>
      </div>

      {/* 메인 그리드: 왼쪽(토픽 테이블) + 오른쪽(로그) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        {/* ── 왼쪽: 카테고리 필터 + 토픽 테이블 ── */}
        <div>
          {/* 카테고리 필터 탭 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {[{ id: 'all', label: '전체' }, ...categories.map(c => ({ id: c.category_id, label: c.label }))].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                style={{
                  padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                  border: '1px solid var(--color-border-soft)',
                  background: selectedCat === cat.id ? 'var(--color-ink)' : '#fff',
                  color: selectedCat === cat.id ? '#fff' : 'var(--color-ink)',
                  cursor: 'pointer',
                }}>
                {cat.label}
              </button>
            ))}
          </div>

          {/* 토픽 테이블 */}
          <div style={{
            border: '1px solid var(--color-border-soft)',
            borderRadius: 8, overflow: 'hidden',
          }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>
                토픽 로딩 중...
              </div>
            ) : (
              <table className="table" style={{ marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th>토픽</th>
                    <th>카테고리</th>
                    <th style={{ width: 110 }}>실행</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTopics.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-muted)', padding: 32 }}>
                        토픽 없음
                      </td>
                    </tr>
                  ) : filteredTopics.map(t => {
                    const cat = categories.find(c => c.seq_no === t.category_seq_no)
                    const st  = topicStatus[t.topic_key] || 'idle'
                    return (
                      <tr key={t.seq_no}>
                        <td style={{ fontWeight: 700, color: 'var(--color-ink)', fontSize: 13 }}>{t.label}</td>
                        <td>
                          <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 99,
                            background: 'var(--color-surface)', color: 'var(--color-muted)', fontWeight: 700,
                          }}>
                            {cat?.label || '-'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => runSingle(t.topic_key)}
                            disabled={st === 'loading'}
                            className="btn btn-xs"
                            style={{
                              border: '1px solid var(--color-border)',
                              color: st === 'loading' ? 'var(--color-placeholder)' : 'var(--color-ink)',
                              opacity: st === 'loading' ? 0.5 : 1,
                            }}>
                            {st === 'loading' ? '⏳ 실행 중' :
                             st === 'success' ? '✅ 완료' :
                             st === 'error'   ? '❌ 재시도' : '▶ 실행'}
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
        <div style={{
          border: '1px solid var(--color-border-soft)', borderRadius: 8,
          background: '#fff', overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--color-border-soft)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>실시간 로그</span>
            <button
              onClick={() => setLog([])}
              style={{
                fontSize: 12, color: 'var(--color-muted)',
                background: 'none', border: 'none', cursor: 'pointer',
              }}>
              지우기
            </button>
          </div>
          <div style={{ padding: '8px 12px', maxHeight: 480, overflowY: 'auto' }}>
            {log.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: 0, padding: '12px 0' }}>
                로그가 없습니다. ▶ 실행을 눌러 보세요.
              </p>
            )}
            {log.map(entry => (
              <div
                key={entry.id}
                style={{
                  fontSize: 11, padding: '4px 0', borderBottom: '1px solid #f5f5f5',
                  color: entry.type === 'error' ? '#C92A2A' :
                         entry.type === 'success' ? '#005C27' : 'var(--color-muted)',
                  fontFamily: 'monospace',
                }}>
                <span style={{ color: '#999', marginRight: 6 }}>{entry.ts}</span>
                {entry.msg}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── DB 연결 상태 표시줄 ─────────────────────────────────
 * 정상: 한 줄로 표시 (녹색 점 + 'DB 연결됨')
 * 오류: 빨간 점 + 클릭 가능 ▾, 펼치면 최근 오류 로그
 */
function DbStatusBar({ dbStatus, log }) {
  const [open, setOpen] = useState(false)

  const isConnected = dbStatus === 'connected'
  const isError     = dbStatus === 'disconnected'

  const color  = isConnected ? '#00B84F' : isError ? '#E03131' : '#FAB005'
  const label  = isConnected ? 'DB 연결됨' : isError ? 'DB 연결 오류' : 'DB 상태 확인 중'
  const bg     = isConnected ? '#f0faf4' : isError ? '#fff5f5' : '#fffaf0'
  const border = isConnected ? 'rgba(0,184,79,0.25)' : isError ? 'rgba(224,49,49,0.25)' : 'rgba(250,176,5,0.25)'

  const errorLogs = log.filter(l => l.type === 'error' || l.type === 'warn').slice(0, 20)

  return (
    <div style={{
      marginBottom: 20, background: bg, border: `1px solid ${border}`,
      borderRadius: 8, overflow: 'hidden',
    }}>
      <div
        onClick={() => isError && setOpen(o => !o)}
        style={{
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
          cursor: isError ? 'pointer' : 'default', userSelect: 'none',
        }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: color,
          display: 'inline-block',
          boxShadow: isConnected ? `0 0 6px ${color}99` : 'none',
        }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>{label}</span>
        {isError && (
          <>
            <span style={{ fontSize: 11, color: 'var(--color-muted)', marginLeft: 'auto' }}>
              로그 {errorLogs.length}건
            </span>
            <span style={{
              fontSize: 14, color: 'var(--color-muted)',
              transition: 'transform 0.2s',
              transform: open ? 'rotate(180deg)' : 'rotate(0)',
            }}>▾</span>
          </>
        )}
      </div>

      {isError && open && (
        <div style={{
          borderTop: `1px solid ${border}`, padding: '12px 16px',
          background: '#fff', maxHeight: 240, overflowY: 'auto',
        }}>
          {errorLogs.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: 0 }}>
              아직 기록된 오류 로그가 없습니다.
            </p>
          ) : (
            errorLogs.map(entry => (
              <div key={entry.id} style={{
                fontSize: 12, padding: '6px 0', borderBottom: '1px solid #f5f5f5',
                color: entry.type === 'error' ? '#C92A2A' : '#5C3A00',
                fontFamily: 'monospace',
              }}>
                <span style={{ color: '#999', marginRight: 8 }}>{entry.ts}</span>
                {entry.msg}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
