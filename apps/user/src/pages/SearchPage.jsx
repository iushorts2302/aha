import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { getItems, MENU_TOPICS } from '../store/crawlStore.js'
import { sortPosts } from '../store/algorithm.js'
import { PageHeader, TabNav, CrawlCard } from '../components/CrawlComponents.jsx'
import PostCard from '../components/PostCard.jsx'

export default function SearchPage({ query: initQuery, navigate }) {
  const [query, setQuery] = useState(initQuery || '')
  const [input, setInput] = useState(initQuery || '')
  const [tab, setTab] = useState('all')
  const { posts, comments } = useApp()

  useEffect(() => {
    setQuery(initQuery || '')
    setInput(initQuery || '')
  }, [initQuery])

  const TABS = [
    { key: 'all',     label: '전체' },
    { key: 'posts',   label: '게시글' },
    { key: 'crawled', label: '큐레이션' },
  ]

  // 사용자 게시글 검색
  const commentsMap = Object.fromEntries(posts.map(p => [p.id, comments.filter(c => c.postId === p.id).length]))
  const matchedPosts = query
    ? sortPosts(
        posts.filter(p =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.body.toLowerCase().includes(query.toLowerCase()) ||
          p.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
        ),
        commentsMap, 'hot'
      )
    : []

  // 크롤링 데이터 검색
  const allCrawled = query
    ? Object.keys(MENU_TOPICS).flatMap(key => getItems(key, 20)).filter(item =>
        item.title?.toLowerCase().includes(query.toLowerCase()) ||
        item.summary?.toLowerCase().includes(query.toLowerCase()) ||
        item.tags?.some(t => t.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 30)
    : []

  const totalCount = matchedPosts.length + allCrawled.length

  function handleSearch(e) {
    e.preventDefault()
    setQuery(input.trim())
  }

  return (
    <div className="fade-up">
      <PageHeader title="검색" subtitle={query ? `"${query}" 검색 결과 ${totalCount}개` : '키워드를 입력하세요'} />

      {/* 검색창 */}
      <form onSubmit={handleSearch} style={{ margin: 'var(--space-6) 0' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-placeholder)', pointerEvents: 'none' }}
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="input"
              style={{ paddingLeft: '42px', height: '44px', fontSize: 'var(--text-md)' }}
              placeholder="게시글, 태그, 키워드 검색..."
              value={input}
              onChange={e => setInput(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '44px', padding: '0 var(--space-6)' }}>
            검색
          </button>
        </div>
      </form>

      {/* 검색 전 */}
      {!query && (
        <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-muted)' }}>검색어를 입력해 주세요.</p>
        </div>
      )}

      {/* 검색 결과 */}
      {query && (
        <>
          <TabNav tabs={TABS} active={tab} onChange={setTab} />

          {totalCount === 0 && (
            <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-muted)', marginBottom: 'var(--space-3)' }}>
                "{query}"에 대한 검색 결과가 없습니다.
              </p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-placeholder)' }}>
                다른 키워드로 검색하거나, 관리자 페이지에서 크롤링을 실행해 보세요.
              </p>
            </div>
          )}

          {/* 전체 */}
          {tab === 'all' && (
            <div>
              {matchedPosts.length > 0 && (
                <div>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--color-muted)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    게시글 {matchedPosts.length}개
                  </p>
                  {matchedPosts.slice(0, 5).map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}
                </div>
              )}
              {allCrawled.length > 0 && (
                <div style={{ marginTop: 'var(--space-6)' }}>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--color-muted)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    큐레이션 {allCrawled.length}개
                  </p>
                  {allCrawled.slice(0, 5).map(item => <CrawlCard key={item.id} item={item} />)}
                </div>
              )}
            </div>
          )}

          {/* 게시글만 */}
          {tab === 'posts' && (
            matchedPosts.length > 0
              ? <div>{matchedPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div>
              : <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}><p style={{ color: 'var(--color-muted)' }}>게시글 검색 결과가 없습니다.</p></div>
          )}

          {/* 큐레이션만 */}
          {tab === 'crawled' && (
            allCrawled.length > 0
              ? <div>{allCrawled.map(item => <CrawlCard key={item.id} item={item} />)}</div>
              : <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}><p style={{ color: 'var(--color-muted)' }}>큐레이션 검색 결과가 없습니다.</p></div>
          )}
        </>
      )}
    </div>
  )
}
