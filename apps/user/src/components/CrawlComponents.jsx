import { useState, useEffect, useCallback } from 'react'

// 스피너 keyframes — 한 번만 주입
if (typeof document !== 'undefined' && !document.getElementById('aha-spin-style')) {
  const s = document.createElement('style')
  s.id = 'aha-spin-style'
  s.textContent = '@keyframes spin { to { transform: rotate(360deg) } }'
  document.head.appendChild(s)
}
import { getItems } from '../store/crawlStore.js'
import { saveDetail } from '../store/crawlDetailStore.js'
import { getCrawlViews, getCrawlLikes } from '../store/crawlInteractionStore.js'

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  return `${Math.floor(m / 60)}시간 전`
}

/** 크롤링 카드 */
export function CrawlCard({ item, onClick, rank, navigate }) {
  const [liveViews, setLiveViews] = useState(() => getCrawlViews(item.id))
  const [liveLikes, setLiveLikes] = useState(() => getCrawlLikes(item.id))

  // localStorage 변경 감지 (다른 탭/상세 진입 후 복귀)
  useEffect(() => {
    function onStorage() {
      setLiveViews(getCrawlViews(item.id))
      setLiveLikes(getCrawlLikes(item.id))
    }
    window.addEventListener('storage', onStorage)
    // 포커스 복귀 시에도 갱신 (같은 탭에서 상세 → 목록 복귀)
    window.addEventListener('focus', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onStorage)
    }
  }, [item.id])

  return (
    <article
      className="py-3 border-bottom"
      style={{ cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start' }}
      onClick={() => {
        if (navigate) { saveDetail(item); navigate(`crawl-detail/${item.id}`) }
        else onClick?.(item)
      }}>
      {rank != null && (
        <span className="flex-shrink-0 text-end fw-semibold"
          style={{ width: 28, fontSize: rank <= 3 ? 20 : 13, color: rank <= 3 ? 'var(--color-primary)' : '#ccc', paddingTop: rank <= 3 ? 2 : 4 }}>
          {rank}
        </span>
      )}
      <div className="flex-grow-1 overflow-hidden">
        <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
          {item.hot && <span className="badge badge-hot">🔥 HOT</span>}
          <small className="text-muted">{item.topicLabel} · {timeAgo(item.crawledAt)}</small>
          {item.source && (
            <a href={item.source} target="_blank" rel="noopener noreferrer"
              className="small text-primary" onClick={e => e.stopPropagation()}>↗ 원문</a>
          )}
        </div>
        <h6 className="fw-semibold mb-1"
          style={{ letterSpacing: '-0.374px', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = ''}>
          {item.title}
        </h6>
        {item.summary && (
          <p className="text-muted small mb-2"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
            {item.summary}
          </p>
        )}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {item.tags?.slice(0, 3).map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
          <div className="ms-auto d-flex gap-3">
            <div className="d-flex gap-3">
              <small className="text-muted">👁 {liveViews}</small>
              <small className="text-muted" style={{ color: liveLikes.liked ? 'var(--color-primary)' : '' }}>♥ {liveLikes.count}</small>
              <small className="text-muted">💬 0</small>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

/** 섹션 헤더 */
export function SectionHeader({ title, count, onRefresh, loading, source }) {
  return (
    <div className="d-flex align-items-baseline justify-content-between mb-3 pb-2" style={{ borderBottom: '2px solid var(--color-ink)' }}>
      <div className="d-flex align-items-baseline gap-2">
        <h5 className="mb-0 fw-semibold" style={{ letterSpacing: '0.231px' }}>{title}</h5>
        {count > 0 && <small className="text-muted">{count}개</small>}
        {source === 'fresh' && <span className="small text-primary fw-semibold">● 실시간</span>}
      </div>
      {onRefresh && (
        <button className="btn btn-link btn-sm p-0 text-decoration-none" onClick={onRefresh} disabled={loading}>
          {'새로고침'}
        </button>
      )}
    </div>
  )
}

/** 크롤링 피드 */
export function CrawlFeed({ topicKey, title, limit = 10, showRank = false, navigate }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getItems(topicKey, limit)
      const safeData = Array.isArray(data) ? data : []
      setItems(safeData)
      setSource(safeData.length > 0 ? 'fresh' : 'empty')
    } catch {
      getItems(topicKey, limit).then(d => { setItems(Array.isArray(d) ? d : []); setSource('cache') })
    } finally { setLoading(false) }
  }, [topicKey, limit])

  // topicKey 변경 시 즉시 초기화 → 이전 토픽 데이터 잔류 방지
  useEffect(() => {
    setItems([])
    setSource(null)
    refresh()
  }, [topicKey])
  useEffect(() => { const t = setInterval(refresh, 60000); return () => clearInterval(t) }, [refresh])

  if (items.length === 0) return (
    <div>
      <SectionHeader title={title} count={0} onRefresh={refresh} loading={loading} />
      <EmptyState />
    </div>
  )

  return (
    <div>
      <SectionHeader title={title} count={items.length} onRefresh={refresh} loading={loading} source={source} />
      {items.map((item, i) => (
        <CrawlCard key={item.id} item={item} rank={showRank ? i + 1 : null} navigate={navigate} />
      ))}
    </div>
  )
}

/** 빈 상태 — 로딩 스피너 + 간결한 메시지 */
export function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <div style={{
        width: 28, height: 28, margin: '0 auto',
        border: '3px solid var(--color-border-soft)',
        borderTopColor: 'var(--color-primary, #0066CC)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  )
}

/** 탭 네비게이션 — Bootstrap nav-tabs */
export function TabNav({ tabs, active, onChange }) {
  return (
    <ul className="nav nav-tabs mb-0">
      {tabs.map(tab => (
        <li className="nav-item" key={tab.key}>
          <button
            className={`nav-link${active === tab.key ? ' active' : ''}`}
            onClick={() => onChange(tab.key)}>
            {tab.label}
          </button>
        </li>
      ))}
    </ul>
  )
}

/** 페이지 헤더 */
export function PageHeader({ title, subtitle }) {
  return (
    <div className="py-4 py-md-5 border-bottom mb-0">
      <h1 className="fw-semibold mb-2" style={{ fontSize: 'clamp(28px, 5vw, 40px)', letterSpacing: 0 }}>{title}</h1>
      {subtitle && <p className="text-muted mb-0" style={{ fontSize: 'clamp(16px, 3vw, 22px)', fontWeight: 400 }}>{subtitle}</p>}
    </div>
  )
}

/** Coming Soon */
export function ComingSoon({ name }) {
  return (
    <div className="text-center py-5">
      <h4 className="fw-semibold mb-2">{name}</h4>
      <p className="text-muted">준비 중입니다.</p>
    </div>
  )
}
