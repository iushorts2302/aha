import { useState, useEffect } from 'react'
import { readStore, MENU_TOPICS, getLastCrawled } from '../store/crawlStore.js'

const CAT_LABELS = {
  home: '홈', trending: '인기', feed: '피드', board: '게시판',
  gallery: '갤러리', community: '커뮤니티', knowledge: '정보',
  market: '마켓', aihub: 'AI 허브',
}

function timeAgo(iso) {
  if (!iso) return '-'
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  return `${Math.floor(m / 60)}시간 전`
}

export default function DataPreview() {
  const [store, setStore] = useState({})
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setStore(readStore())
    const t = setInterval(() => setStore(readStore()), 5000)
    return () => clearInterval(t)
  }, [])

  const selectedItems = selectedTopic ? (store[selectedTopic] || []) : []
  const filteredItems = search
    ? selectedItems.filter(i => i.title?.includes(search) || i.tags?.some(t => t.includes(search)))
    : selectedItems

  const topicList = Object.entries(MENU_TOPICS).map(([key, topic]) => ({
    key, topic, count: (store[key] || []).length, lastCrawled: getLastCrawled(key),
  }))

  return (
    <div className="fade-up">
      <div style={{ paddingBottom: 'var(--space-7)', marginBottom: 'var(--space-7)', borderBottom: '1px solid var(--color-border-soft)' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-ink)' }}>수집 데이터 미리보기</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginTop: 'var(--space-1)' }}>
          수집된 콘텐츠를 토픽별로 확인합니다. 5초마다 자동 갱신.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* 토픽 목록 */}
        <div style={{ border: '1px solid var(--color-border-soft)', borderRadius: 'var(--radius-card)', overflow: 'hidden', position: 'sticky', top: '72px' }}>
          <div style={{ padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--color-border-soft)', background: 'var(--color-surface)' }}>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-ink)' }}>토픽 목록</p>
          </div>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {topicList.map(({ key, topic, count, lastCrawled }) => (
              <button key={key} onClick={() => setSelectedTopic(key)} style={{
                width: '100%', textAlign: 'left',
                padding: 'var(--space-3) var(--space-5)',
                borderBottom: '1px solid var(--color-border-soft)',
                background: selectedTopic === key ? 'rgba(0,213,100,0.06)' : 'transparent',
                borderLeft: `3px solid ${selectedTopic === key ? 'var(--color-accent)' : 'transparent'}`,
                transition: 'all var(--transition)',
                display: 'flex', flexDirection: 'column', gap: '2px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: selectedTopic === key ? 700 : 400, color: 'var(--color-ink)' }}>
                    {topic.label}
                  </span>
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '1px 6px', borderRadius: '99px',
                    background: count > 0 ? '#d4f9e6' : 'var(--color-surface2)',
                    color: count > 0 ? '#005C27' : 'var(--color-placeholder)',
                  }}>{count}</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-placeholder)' }}>
                  {CAT_LABELS[topic.category]} · {timeAgo(lastCrawled)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 데이터 상세 */}
        <div>
          {!selectedTopic ? (
            <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-muted)' }}>왼쪽에서 토픽을 선택하세요.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)' }}>
                    {MENU_TOPICS[selectedTopic]?.label}
                  </h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginTop: '2px' }}>
                    {filteredItems.length}개 항목
                  </p>
                </div>
                <input className="input" style={{ width: '200px', height: '32px', fontSize: 'var(--text-sm)' }}
                  placeholder="제목·태그 검색..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>

              {filteredItems.length === 0 ? (
                <div style={{ padding: 'var(--space-8) 0', textAlign: 'center', border: '1px solid var(--color-border-soft)', borderRadius: 'var(--radius-card)' }}>
                  <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-muted)' }}>
                    {store[selectedTopic]?.length > 0 ? '검색 결과가 없습니다.' : '수집된 데이터가 없습니다. 크롤링을 실행해 주세요.'}
                  </p>
                </div>
              ) : (
                <div style={{ border: '1px solid var(--color-border-soft)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
                  {filteredItems.map((item, i) => (
                    <div key={item.id} style={{
                      padding: 'var(--space-5)', borderBottom: i < filteredItems.length - 1 ? '1px solid var(--color-border-soft)' : 'none',
                      background: item.hot ? 'rgba(255,71,87,0.02)' : '#fff',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
                            {item.hot && <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', background: '#FF4500', color: '#fff', borderRadius: '99px' }}>🔥 HOT</span>}
                            <span style={{ fontSize: '11px', color: 'var(--color-placeholder)' }}>{timeAgo(item.crawledAt)}</span>
                          </div>
                          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-ink)', marginBottom: 'var(--space-2)', lineHeight: 1.4 }}>{item.title}</p>
                          {item.summary && (
                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', lineHeight: 1.6, marginBottom: 'var(--space-3)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {item.summary}
                            </p>
                          )}
                          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                            {item.tags?.map(t => (
                              <span key={t} style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '99px', background: 'var(--color-surface)', color: 'var(--color-muted)' }}>{t}</span>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-5)', flexShrink: 0, fontSize: 'var(--text-xs)', color: 'var(--color-placeholder)', textAlign: 'center' }}>
                          {[
                            { icon: '👁', val: item.views },
                            { icon: '♥', val: item.likes },
                            { icon: '💬', val: item.comments },
                          ].map(s => (
                            <div key={s.icon} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span>{s.icon}</span>
                              <span style={{ fontWeight: 700, color: 'var(--color-muted)' }}>{s.val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
