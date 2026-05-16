import { useState, useEffect } from 'react'
import { getItems } from '../store/crawlStore.js'

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  return `${Math.floor(m / 60)}시간 전`
}

/** 단일 크롤링 카드 */
export function CrawlCard({ item, onClick, rank }) {
  return (
    <article onClick={() => onClick?.(item)} style={{
      padding: 'var(--space-6) 0',
      borderBottom: '1px solid var(--color-border-soft)',
      cursor: 'pointer',
      display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start',
    }}>
      {rank && (
        <span style={{
          flexShrink: 0, width: '28px', textAlign: 'center',
          fontSize: '18px', fontWeight: 800,
          color: rank <= 3 ? 'var(--color-accent)' : 'var(--color-border)',
          lineHeight: 1.4,
        }}>{rank}</span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
          {item.hot && (
            <span style={{
              fontSize: '10px', fontWeight: 800, padding: '2px 7px',
              background: 'var(--color-accent)', color: 'var(--color-accent-text)',
              borderRadius: '99px', letterSpacing: '0.04em',
            }}>HOT</span>
          )}
          <span style={{ fontSize: '11px', color: 'var(--color-placeholder)' }}>{item.topicLabel}</span>
          <span style={{ fontSize: '11px', color: 'var(--color-placeholder)' }}>·</span>
          <span style={{ fontSize: '11px', color: 'var(--color-placeholder)' }}>{timeAgo(item.crawledAt)}</span>
        </div>
        <h3 style={{
          fontSize: 'var(--text-md)', fontWeight: 700,
          color: 'var(--color-ink)', lineHeight: 1.4, marginBottom: 'var(--space-2)',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >{item.title}</h3>
        {item.summary && (
          <p style={{
            fontSize: 'var(--text-sm)', color: 'var(--color-muted)', lineHeight: 1.6,
            marginBottom: 'var(--space-3)',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{item.summary}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
          {item.tags?.slice(0, 3).map(tag => (
            <span key={tag} style={{
              fontSize: '11px', color: 'var(--color-muted)',
              background: 'var(--color-surface)', padding: '2px 8px', borderRadius: '99px',
            }}>{tag}</span>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: '12px', color: 'var(--color-placeholder)' }}>조회 {item.views?.toLocaleString()}</span>
          <span style={{ fontSize: '12px', color: 'var(--color-placeholder)' }}>♥ {item.likes}</span>
          <span style={{ fontSize: '12px', color: 'var(--color-placeholder)' }}>💬 {item.comments}</span>
        </div>
      </div>
    </article>
  )
}

/** 섹션 헤더 */
export function SectionHeader({ title, count, onRefresh, loading }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-3)', borderBottom: '2px solid var(--color-ink)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--color-ink)' }}>{title}</h3>
        {count > 0 && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>{count}개</span>}
      </div>
      {onRefresh && (
        <button onClick={onRefresh} disabled={loading} style={{
          fontSize: 'var(--text-xs)', color: loading ? 'var(--color-placeholder)' : 'var(--color-muted)',
          transition: 'color var(--transition)',
        }}>
          {loading ? '로딩중...' : '새로고침'}
        </button>
      )}
    </div>
  )
}

/** 크롤링 데이터를 보여주는 피드 섹션 */
export function CrawlFeed({ topicKey, title, limit = 10, showRank = false }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  function refresh() {
    setItems(getItems(topicKey, limit))
  }

  useEffect(() => {
    refresh()
    // 30초마다 스토어에서 최신 데이터 polling
    const t = setInterval(refresh, 30000)
    return () => clearInterval(t)
  }, [topicKey, limit])

  if (items.length === 0) return (
    <div>
      <SectionHeader title={title} count={0} onRefresh={refresh} loading={loading} />
      <EmptyState />
    </div>
  )

  return (
    <div>
      <SectionHeader title={title} count={items.length} onRefresh={refresh} loading={loading} />
      {items.map((item, i) => (
        <CrawlCard key={item.id} item={item} rank={showRank ? i + 1 : null} />
      ))}
    </div>
  )
}

/** 빈 상태 */
export function EmptyState({ message = '콘텐츠를 불러오는 중입니다.', sub = '관리자 페이지에서 크롤링을 실행해 주세요.' }) {
  return (
    <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
      <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-muted)', marginBottom: 'var(--space-2)' }}>{message}</p>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-placeholder)' }}>{sub}</p>
    </div>
  )
}

/** 탭 네비게이션 */
export function TabNav({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-soft)', marginBottom: 'var(--space-6)', overflowX: 'auto' }}>
      {tabs.map(tab => (
        <button key={tab.key} onClick={() => onChange(tab.key)} style={{
          padding: 'var(--space-4) var(--space-5)', fontSize: 'var(--text-sm)', fontWeight: 700,
          color: active === tab.key ? 'var(--color-ink)' : 'var(--color-muted)',
          borderBottom: `2px solid ${active === tab.key ? 'var(--color-ink)' : 'transparent'}`,
          marginBottom: '-1px', transition: 'color var(--transition), border-color var(--transition)',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>{tab.label}</button>
      ))}
    </div>
  )
}

/** 페이지 헤더 */
export function PageHeader({ title, subtitle }) {
  return (
    <div style={{ padding: 'var(--space-8) 0 var(--space-6)', borderBottom: '1px solid var(--color-border-soft)', marginBottom: '0' }}>
      <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginTop: 'var(--space-2)' }}>{subtitle}</p>}
    </div>
  )
}

/** Coming Soon placeholder */
export function ComingSoon({ name }) {
  return (
    <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
      <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--color-ink)', marginBottom: 'var(--space-3)' }}>{name}</p>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)' }}>준비 중입니다.</p>
    </div>
  )
}
