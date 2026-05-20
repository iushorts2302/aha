import { useState, useEffect, useCallback } from 'react'

const ADMIN_API = 'https://admin-vert-psi.vercel.app'

function timeAgo(iso) {
  if (!iso) return '-'
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  return `${Math.floor(m / 60)}시간 전`
}

async function apiFetch(path) {
  const r = await fetch(`${ADMIN_API}${path}`, { signal: AbortSignal.timeout(12000) })
  return r.json()
}

export default function DataPreview() {
  const [topics,        setTopics]        = useState([])
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [items,         setItems]         = useState([])
  const [topicStats,    setTopicStats]    = useState({}) // topicKey → { count, lastCrawled }
  const [loadingTopics, setLoadingTopics] = useState(true)
  const [loadingItems,  setLoadingItems]  = useState(false)
  const [search,        setSearch]        = useState('')
  const [tab,           setTab]           = useState('crawl') // 'crawl' | 'posts'
  const [posts,         setPosts]         = useState([])
  const [loadingPosts,  setLoadingPosts]  = useState(false)

  // ── 토픽 목록 + 수집 현황 로드 ─────────────────────
  const loadTopics = useCallback(async () => {
    setLoadingTopics(true)
    try {
      const d = await apiFetch('/api/v1?resource=topics')
      const tps = d.topics || []
      setTopics(tps)

      // 토픽별 수집 수 조회
      const stats = {}
      await Promise.all(tps.map(async t => {
        try {
          const r = await apiFetch(
            `/api/v1?resource=crawl_items&topic_key=${encodeURIComponent(t.topic_key)}&count_only=1`)
          stats[t.topic_key] = { count: r.count || 0, lastCrawled: r.last_crawled || null }
        } catch {
          stats[t.topic_key] = { count: 0, lastCrawled: null }
        }
      }))
      setTopicStats(stats)
    } finally {
      setLoadingTopics(false)
    }
  }, [])

  useEffect(() => { loadTopics() }, [])
  useEffect(() => {
    const t = setInterval(loadTopics, 30000)
    return () => clearInterval(t)
  }, [loadTopics])

  // ── 토픽 선택 시 아이템 로드 ───────────────────────
  useEffect(() => {
    if (!selectedTopic) return
    setLoadingItems(true)
    setItems([])
    apiFetch(`/api/v1?resource=crawl_items&topic_key=${encodeURIComponent(selectedTopic)}&limit=30`)
      .then(d => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoadingItems(false))
  }, [selectedTopic])

  // ── 게시글 탭 ──────────────────────────────────────
  useEffect(() => {
    if (tab !== 'posts') return
    setLoadingPosts(true)
    apiFetch('/api/v1?resource=posts&limit=50')
      .then(d => setPosts(d.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoadingPosts(false))
  }, [tab])

  const filteredItems = search
    ? items.filter(i =>
        i.title?.includes(search) ||
        i.topic_label?.includes(search) ||
        (i.tags || []).some(t => t.includes(search)))
    : items

  const totalItems = Object.values(topicStats).reduce((s, v) => s + (v.count || 0), 0)

  return (
    <div className="fade-up">
      {/* 헤더 */}
      <div style={{ paddingBottom: 20, marginBottom: 20, borderBottom: '1px solid var(--color-border-soft)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-ink)' }}>데이터 미리보기</h2>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>
            DB에 저장된 크롤링 데이터와 게시글을 확인합니다 (30초 자동 갱신)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadTopics} className="btn btn-secondary" style={{ height: 34, fontSize: 13 }}>
            새로고침
          </button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1,
        background: 'var(--color-border-soft)', border: '1px solid var(--color-border-soft)', marginBottom: 20 }}>
        {[
          { label: 'DB 크롤링 아이템', value: totalItems.toLocaleString(), unit: '개' },
          { label: '토픽 수',          value: topics.length,               unit: '개' },
          { label: 'DB 게시글',        value: posts.length || '-',         unit: posts.length ? '개' : '' },
        ].map(s => (
          <div key={s.label} style={{ padding: '16px 20px', background: '#fff' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-ink)' }}>
              {s.value}<span style={{ fontSize: 11, color: 'var(--color-muted)', marginLeft: 3 }}>{s.unit}</span>
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4, fontWeight: 700 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[['crawl','크롤링 데이터'],['posts','게시글']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '6px 16px', borderRadius: 99, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', border: '1px solid var(--color-border-soft)',
            background: tab === key ? 'var(--color-accent)' : 'var(--color-surface)',
            color: tab === key ? 'var(--color-accent-text)' : 'var(--color-muted)',
          }}>{label}</button>
        ))}
      </div>

      {/* ── 크롤링 탭 ── */}
      {tab === 'crawl' && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>
          {/* 토픽 목록 */}
          <div style={{ border: '1px solid var(--color-border-soft)', borderRadius: 8,
            overflow: 'hidden', position: 'sticky', top: 72 }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border-soft)',
              background: 'var(--color-surface)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>토픽</span>
              <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{topics.length}개</span>
            </div>
            <div style={{ maxHeight: 580, overflowY: 'auto' }}>
              {loadingTopics ? (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--color-muted)' }}>
                  로딩 중...
                </div>
              ) : topics.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--color-muted)' }}>
                  토픽 없음<br />
                  <span style={{ fontSize: 11 }}>DB 초기화 필요</span>
                </div>
              ) : topics.map(t => {
                const stat = topicStats[t.topic_key] || { count: 0 }
                return (
                  <button key={t.seq_no} onClick={() => setSelectedTopic(t.topic_key)} style={{
                    width: '100%', textAlign: 'left',
                    padding: '8px 16px', cursor: 'pointer',
                    borderBottom: '1px solid var(--color-border-soft)',
                    borderLeft: `3px solid ${selectedTopic === t.topic_key ? 'var(--color-accent)' : 'transparent'}`,
                    background: selectedTopic === t.topic_key ? 'rgba(0,213,100,0.06)' : 'transparent',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: selectedTopic === t.topic_key ? 700 : 400,
                        color: 'var(--color-ink)' }}>{t.label}</span>
                      <span style={{
                        fontSize: 11, padding: '1px 6px', borderRadius: 99, fontWeight: 700,
                        background: stat.count > 0 ? 'rgba(0,213,100,0.12)' : 'var(--color-surface)',
                        color: stat.count > 0 ? '#005C27' : 'var(--color-placeholder)',
                      }}>{stat.count}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-placeholder)', marginTop: 2 }}>
                      {t.topic_key}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 아이템 목록 */}
          <div>
            {selectedTopic ? (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="제목/태그 검색..."
                    style={{ flex: 1, height: 36, padding: '0 12px', borderRadius: 8,
                      border: '1px solid var(--color-border-soft)', fontSize: 13 }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: '36px' }}>
                    {filteredItems.length}개
                  </span>
                </div>

                {loadingItems ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted)' }}>로딩 중...</div>
                ) : filteredItems.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>
                    수집된 데이터가 없습니다.<br />
                    <span style={{ fontSize: 12 }}>크롤링 관리에서 해당 토픽을 실행해 주세요.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filteredItems.map((item, idx) => (
                      <div key={item.seq_no || idx} style={{
                        padding: '14px 16px', border: '1px solid var(--color-border-soft)',
                        borderRadius: 8, background: '#fff',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)',
                                textDecoration: 'none', lineHeight: 1.4 }}>
                              {item.title}
                            </a>
                            {item.summary && (
                              <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4, lineHeight: 1.5 }}>
                                {item.summary.slice(0, 120)}{item.summary.length > 120 ? '...' : ''}
                              </p>
                            )}
                            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                              {(item.tags || []).map(tag => (
                                <span key={tag} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 99,
                                  background: 'var(--color-surface)', color: 'var(--color-muted)', fontWeight: 600 }}>
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-placeholder)', textAlign: 'right', flexShrink: 0 }}>
                            <div>{timeAgo(item.crawled_at || item.crawledAt)}</div>
                            <div style={{ marginTop: 4 }}>👁 {item.view_count || 0}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-muted)',
                border: '1px dashed var(--color-border-soft)', borderRadius: 8 }}>
                <p style={{ fontSize: 16, marginBottom: 8 }}>← 토픽을 선택하세요</p>
                <p style={{ fontSize: 13 }}>DB에 저장된 크롤링 데이터를 확인합니다</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 게시글 탭 ── */}
      {tab === 'posts' && (
        <div>
          {loadingPosts ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted)' }}>로딩 중...</div>
          ) : posts.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-muted)',
              border: '1px dashed var(--color-border-soft)', borderRadius: 8 }}>
              <p style={{ fontSize: 16, marginBottom: 8 }}>게시글이 없습니다</p>
              <p style={{ fontSize: 13 }}>사용자가 게시글을 작성하면 여기에 표시됩니다</p>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--color-border-soft)', borderRadius: 8, overflow: 'hidden' }}>
              <table className="table" style={{ marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th>제목</th><th>작성자</th><th>카테고리</th>
                    <th>조회</th><th>좋아요</th><th>댓글</th><th>작성일</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map(p => (
                    <tr key={p.seq_no}>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>{p.title}</span>
                      </td>
                      <td style={{ fontSize: 12 }}>{p.author_nickname || '-'}</td>
                      <td>
                        {p.category_name && (
                          <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 99,
                            background: 'var(--color-surface)', color: 'var(--color-muted)', fontWeight: 600 }}>
                            {p.category_name}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--color-muted)' }}>{p.view_count || 0}</td>
                      <td style={{ fontSize: 12, color: 'var(--color-muted)' }}>{p.like_count || 0}</td>
                      <td style={{ fontSize: 12, color: 'var(--color-muted)' }}>{p.comment_count || 0}</td>
                      <td style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('ko-KR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
