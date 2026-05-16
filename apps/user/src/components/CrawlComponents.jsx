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

/** 크롤링 아이템 카드 — Apple list style */
export function CrawlCard({ item, onClick, rank }) {
  return (
    <article onClick={() => onClick?.(item)} style={{
      padding: '20px 0',
      borderBottom: '1px solid var(--color-divider)',
      cursor: 'pointer',
      display: 'flex', gap: '12px', alignItems: 'flex-start',
    }}>
      {rank != null && (
        <span style={{
          flexShrink: 0, width: '32px', textAlign: 'right',
          fontSize: rank <= 3 ? '22px' : 'var(--text-caption)',
          fontWeight: 600, lineHeight: 1.4,
          color: rank <= 3 ? 'var(--color-primary)' : 'var(--color-muted-48)',
          paddingTop: rank <= 3 ? '2px' : '4px',
        }}>{rank}</span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 메타 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
          {item.hot && <span className="badge-hot">🔥 HOT</span>}
          <span style={{ fontSize: 'var(--text-fine)', color: 'var(--color-muted-48)' }}>{item.topicLabel}</span>
          <span style={{ fontSize: 'var(--text-fine)', color: 'var(--color-muted-48)' }}>· {timeAgo(item.crawledAt)}</span>
        </div>
        {/* 제목 — Apple body-strong */}
        <h3 style={{
          fontSize: 'var(--text-body)',
          fontWeight: 600,
          lineHeight: 1.24,
          letterSpacing: '-0.374px',
          color: 'var(--color-ink)',
          marginBottom: '6px',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-ink)'}
        >{item.title}</h3>
        {/* 요약 */}
        {item.summary && (
          <p style={{
            fontSize: 'var(--text-body)', fontWeight: 400, lineHeight: 1.47,
            letterSpacing: '-0.374px', color: 'var(--color-muted-48)',
            marginBottom: '10px',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{item.summary}</p>
        )}
        {/* 태그 + 통계 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {item.tags?.slice(0, 3).map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
          <div style={{ flex: 1 }} />
          {[
            { icon: '👁', val: item.views?.toLocaleString() },
            { icon: '♥',  val: item.likes },
            { icon: '💬', val: item.comments },
          ].map(s => (
            <span key={s.icon} style={{ fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)' }}>
              {s.icon} {s.val}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}

/** 섹션 헤더 — Apple sub-head */
export function SectionHeader({ title, count, onRefresh, loading }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      marginBottom: '12px', paddingBottom: '12px',
      borderBottom: '1px solid var(--color-ink)',  /* Apple 두꺼운 구분선 */
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <h3 style={{
          fontSize: 'var(--text-tagline)',   /* 21px */
          fontWeight: 600, lineHeight: 1.19,
          letterSpacing: '0.231px',
          color: 'var(--color-ink)',
        }}>{title}</h3>
        {count > 0 && (
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)' }}>{count}개</span>
        )}
      </div>
      {onRefresh && (
        <button onClick={onRefresh} disabled={loading} style={{
          fontSize: 'var(--text-caption)', color: loading ? 'var(--color-muted-48)' : 'var(--color-primary)',
          transition: 'opacity var(--transition)',
        }}>
          {loading ? '로딩중...' : '새로고침'}
        </button>
      )}
    </div>
  )
}

/** 크롤링 피드 섹션 */
export function CrawlFeed({ topicKey, title, limit = 10, showRank = false }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  function refresh() { setItems(getItems(topicKey, limit)) }

  useEffect(() => {
    refresh()
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
    <div style={{ padding: '64px 0', textAlign: 'center' }}>
      <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-muted-48)', marginBottom: '8px' }}>{message}</p>
      <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-placeholder)' }}>{sub}</p>
    </div>
  )
}

/** 탭 네비게이션 — Apple style */
export function TabNav({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: '0',
      borderBottom: '1px solid var(--color-divider)',
      marginBottom: '24px',
      overflowX: 'auto',
    }}>
      {tabs.map(tab => (
        <button key={tab.key} onClick={() => onChange(tab.key)} style={{
          padding: '12px 18px',
          fontSize: 'var(--text-caption)',   /* 14px */
          fontWeight: active === tab.key ? 600 : 400,
          letterSpacing: '-0.224px',
          color: active === tab.key ? 'var(--color-ink)' : 'var(--color-muted-48)',
          borderBottom: `2px solid ${active === tab.key ? 'var(--color-ink)' : 'transparent'}`,
          marginBottom: '-1px',
          transition: 'color var(--transition), border-color var(--transition)',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>{tab.label}</button>
      ))}
    </div>
  )
}

/** 페이지 헤더 — Apple display-lg */
export function PageHeader({ title, subtitle }) {
  return (
    <div style={{
      padding: 'var(--sp-section) 0 var(--sp-xxl)',
      borderBottom: '1px solid var(--color-divider)',
    }}>
      <h1 style={{
        fontSize: 'var(--text-display-lg)',  /* 40px */
        fontWeight: 600, lineHeight: 1.10, letterSpacing: 0,
        color: 'var(--color-ink)',
        marginBottom: subtitle ? '8px' : 0,
      }}>{title}</h1>
      {subtitle && (
        <p style={{
          fontSize: 'var(--text-lead-lg)',  /* 28px */
          fontWeight: 400, lineHeight: 1.14,
          letterSpacing: '0.196px',
          color: 'var(--color-muted-48)',
        }}>{subtitle}</p>
      )}
    </div>
  )
}

/** Coming Soon */
export function ComingSoon({ name }) {
  return (
    <div style={{ padding: '80px 0', textAlign: 'center' }}>
      <p style={{ fontSize: 'var(--text-display)', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '12px', letterSpacing: '-0.374px' }}>{name}</p>
      <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-muted-48)', fontWeight: 400 }}>준비 중입니다.</p>
    </div>
  )
}
