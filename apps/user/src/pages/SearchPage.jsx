/**
 * SearchPage — 통합 검색 (Phase 4 강화)
 *
 * 검색 대상:
 *  - 사용자 게시글 (제목/본문/태그)
 *  - 외부 큐레이션 콘텐츠 (제목/요약/태그)
 *
 * 필터 / 정렬:
 *  - 탭: 전체 / 게시글 / 큐레이션
 *  - 카테고리 필터 (전체 / AI / 개발 / 스타트업 ...)
 *  - 정렬: 최신순 / 인기순 (게시글 한정)
 */
import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { getItemsSync, MENU_TOPICS } from '../store/crawlStore.js'
import { sortPosts } from '../store/algorithm.js'
import { PageHeader, TabNav, CrawlCard } from '../components/CrawlComponents.jsx'
import PostCard from '../components/PostCard.jsx'

const CATEGORY_FILTERS = [
  { key: 'all',      label: '전체',      prefix: null },
  { key: 'ai',       label: 'AI',        prefix: 'ai' },
  { key: 'dev',      label: '개발',      prefix: 'dev' },
  { key: 'startup',  label: '스타트업',  prefix: 'startup' },
  { key: 'design',   label: '디자인',    prefix: 'design' },
  { key: 'game',     label: '게임',      prefix: 'game' },
  { key: 'finance',  label: '금융',      prefix: 'finance' },
  { key: 'learn',    label: '학습',      prefix: 'learn' },
]

const SORT_OPTIONS = [
  { key: 'hot', label: '인기순' },
  { key: 'new', label: '최신순' },
]

export default function SearchPage({ query: initQuery, navigate }) {
  const [query, setQuery] = useState(initQuery || '')
  const [input, setInput] = useState(initQuery || '')
  const [tab, setTab] = useState('all')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('hot')
  const { posts, comments } = useApp()

  useEffect(() => {
    setQuery(initQuery || '')
    setInput(initQuery || '')
  }, [initQuery])

  // 사용자 게시글 검색 — 카테고리 필터 + 정렬 적용
  const matchedPosts = useMemo(() => {
    if (!query) return []
    const lower = query.toLowerCase()
    let filtered = posts.filter(p =>
      p.title?.toLowerCase().includes(lower) ||
      p.body?.toLowerCase().includes(lower) ||
      (p.tags || []).some(t => t.toLowerCase().includes(lower))
    )
    // 카테고리 필터
    if (category !== 'all') {
      filtered = filtered.filter(p =>
        String(p.categoryId || '').toLowerCase().includes(category)
      )
    }
    const commentsMap = Object.fromEntries(
      posts.map(p => [p.id, (comments || []).filter(c => c.postId === p.id).length])
    )
    return sortPosts(filtered, commentsMap, sort)
  }, [query, posts, comments, category, sort])

  // 외부 큐레이션 검색 — 카테고리 prefix 필터
  const allCrawled = useMemo(() => {
    if (!query) return []
    const lower = query.toLowerCase()
    const targetKeys = category === 'all'
      ? Object.keys(MENU_TOPICS)
      : Object.keys(MENU_TOPICS).filter(k => k.startsWith(category + '.'))
    return targetKeys
      .flatMap(key => getItemsSync(key))
      .filter(item =>
        item.title?.toLowerCase().includes(lower) ||
        item.summary?.toLowerCase().includes(lower) ||
        (item.tags || []).some(t => t.toLowerCase().includes(lower))
      )
      .slice(0, 30)
  }, [query, category])

  const totalCount = matchedPosts.length + allCrawled.length

  const TABS = [
    { key: 'all',     label: `전체 (${totalCount})` },
    { key: 'posts',   label: `게시글 (${matchedPosts.length})` },
    { key: 'crawled', label: `큐레이션 (${allCrawled.length})` },
  ]

  function handleSearch(e) {
    e.preventDefault()
    setQuery(input.trim())
  }

  return (
    <div className="fade-up">
      <PageHeader title="검색" subtitle={query ? `"${query}" 검색 결과 ${totalCount}개` : '키워드를 입력하세요'} />

      {/* 검색창 */}
      <form onSubmit={handleSearch} style={{ margin: '20px 0' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-placeholder)', pointerEvents: 'none' }}
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="input"
              style={{ paddingLeft: 42, height: 44, fontSize: 14 }}
              placeholder="게시글, 태그, 키워드 검색..."
              value={input}
              onChange={e => setInput(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" className="btn-primary" style={{ height: 44, padding: '0 24px' }}>
            검색
          </button>
        </div>
      </form>

      {/* 검색 전 */}
      {!query && (
        <div style={{ padding: '64px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--color-muted)', marginBottom: 8 }}>검색어를 입력해 주세요</p>
          <p style={{ fontSize: 12, color: 'var(--color-muted)', opacity: 0.7 }}>
            게시글 제목, 본문, 태그 · 외부 콘텐츠를 한꺼번에 검색합니다
          </p>
        </div>
      )}

      {/* 검색 후 — 필터/정렬/탭 */}
      {query && (
        <>
          {/* ── 카테고리 필터 칩 ── */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6,
            marginBottom: 12, paddingBottom: 12,
            borderBottom: '1px solid var(--color-divider)',
          }}>
            <span style={{ fontSize: 11, color: 'var(--color-muted)', alignSelf: 'center', marginRight: 4 }}>
              카테고리:
            </span>
            {CATEGORY_FILTERS.map(cat => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className="aha-sidebar__chip"
                style={{
                  fontSize: 11,
                  background: category === cat.key ? 'var(--color-primary)' : 'var(--color-parchment, #f5f5f7)',
                  color: category === cat.key ? '#fff' : 'var(--color-body)',
                  border: '1px solid transparent',
                }}>
                {cat.label}
              </button>
            ))}
          </div>

          {/* ── 정렬 (게시글 한정) ── */}
          {(tab === 'all' || tab === 'posts') && matchedPosts.length > 1 && (
            <div style={{
              display: 'flex', gap: 8, marginBottom: 12,
              fontSize: 12, color: 'var(--color-muted)',
              alignItems: 'center',
            }}>
              <span>게시글 정렬:</span>
              {SORT_OPTIONS.map(s => (
                <button
                  key={s.key}
                  onClick={() => setSort(s.key)}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: '2px 8px', borderRadius: 4,
                    fontSize: 12, fontWeight: sort === s.key ? 700 : 400,
                    color: sort === s.key ? 'var(--color-primary)' : 'var(--color-muted)',
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <TabNav tabs={TABS} active={tab} onChange={setTab} />

          {totalCount === 0 && (
            <div style={{ padding: '64px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'var(--color-muted)', marginBottom: 8 }}>
                "{query}"에 대한 검색 결과가 없습니다
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-muted)', opacity: 0.7 }}>
                다른 키워드를 시도하거나 카테고리 필터를 '전체'로 바꿔보세요
              </p>
            </div>
          )}

          {/* 전체 탭 */}
          {tab === 'all' && (
            <div>
              {matchedPosts.length > 0 && (
                <div>
                  <SectionLabel text={`게시글 ${matchedPosts.length}개`} />
                  <div className="aha-stagger">
                    {matchedPosts.slice(0, 5).map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}
                  </div>
                </div>
              )}
              {allCrawled.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <SectionLabel text={`큐레이션 ${allCrawled.length}개`} />
                  <div className="aha-stagger">
                    {allCrawled.slice(0, 5).map(item => <CrawlCard key={item.id} item={item} navigate={navigate} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 게시글 탭 */}
          {tab === 'posts' && (
            matchedPosts.length > 0
              ? <div className="aha-stagger">{matchedPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div>
              : <Empty text="게시글 검색 결과가 없습니다" />
          )}

          {/* 큐레이션 탭 */}
          {tab === 'crawled' && (
            allCrawled.length > 0
              ? <div className="aha-stagger">{allCrawled.map(item => <CrawlCard key={item.id} item={item} navigate={navigate} />)}</div>
              : <Empty text="큐레이션 검색 결과가 없습니다" />
          )}
        </>
      )}
    </div>
  )
}

function SectionLabel({ text }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 600, color: 'var(--color-muted)',
      marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em',
    }}>{text}</p>
  )
}

function Empty({ text }) {
  return (
    <div style={{ padding: '48px 16px', textAlign: 'center' }}>
      <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>{text}</p>
    </div>
  )
}
