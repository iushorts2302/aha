import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { CrawlFeed, TabNav, PageHeader } from '../../components/CrawlComponents.jsx'
import PostCard from '../../components/PostCard.jsx'

const TABS = [
  { key: 'free',     label: '자유' },
  { key: 'question', label: '질문' },
  { key: 'info',     label: '정보' },
  { key: 'humor',    label: '유머' },
  { key: 'it',       label: 'IT' },
  { key: 'game',     label: '게임' },
  { key: 'sports',   label: '스포츠' },
  { key: 'politics', label: '정치' },
  { key: 'anon',     label: '익명' },
]

const TOPIC_MAP = {
  free:     'board.free',
  question: 'board.question',
  info:     'board.info',
  humor:    'board.humor',
  it:       'board.it',
  game:     'board.game',
  sports:   'board.sports',
  politics: 'board.politics',
  anon:     'board.free', // 익명은 자유 데이터 공유
}

const SORTS = [
  { key: 'latest',  label: '최신순' },
  { key: 'popular', label: '인기순' },
  { key: 'comments',label: '댓글순' },
]

export default function BoardPageNew({ navigate, searchQuery }) {
  const [tab, setTab] = useState('free')
  const [sort, setSort] = useState('latest')
  const [search, setSearch] = useState(searchQuery || '')
  const { currentUser } = useAuth()
  const { posts, comments } = useApp()

  // 자유게시판만 사용자 작성글 혼합
  const userPosts = tab === 'free'
    ? posts.sort((a, b) => {
        if (sort === 'latest')  return new Date(b.createdAt) - new Date(a.createdAt)
        if (sort === 'popular') return (b.likes.length + b.views) - (a.likes.length + a.views)
        if (sort === 'comments') return comments.filter(c => c.postId === b.id).length - comments.filter(c => c.postId === a.id).length
        return 0
      })
      .filter(p => !search || p.title.includes(search) || p.tags.some(t => t.includes(search)))
    : []

  return (
    <div className="fade-up">
      <div style={{ padding: 'var(--space-8) 0 var(--space-5)', borderBottom: '1px solid var(--color-border-soft)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>게시판</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginTop: 'var(--space-1)' }}>주제별 커뮤니티 게시판</p>
        </div>
        {currentUser && (
          <button onClick={() => navigate('write')} className="btn btn-primary">글 작성</button>
        )}
      </div>

      <TabNav tabs={TABS} active={tab} onChange={setTab} />

      {/* 자유게시판: 검색 + 정렬 + 사용자글 + 크롤링글 */}
      {tab === 'free' && (
        <>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
              <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-placeholder)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input className="input" style={{ paddingLeft: '32px', height: '32px', fontSize: 'var(--text-sm)' }}
                placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '2px' }}>
              {SORTS.map(s => (
                <button key={s.key} onClick={() => setSort(s.key)} style={{
                  height: '32px', padding: '0 var(--space-4)', fontSize: 'var(--text-sm)', fontWeight: 700,
                  borderRadius: 'var(--radius-btn)',
                  color: sort === s.key ? 'var(--color-ink)' : 'var(--color-muted)',
                  background: sort === s.key ? 'var(--color-surface)' : 'transparent',
                }}>{s.label}</button>
              ))}
            </div>
          </div>
          {userPosts.length > 0 && (
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', marginBottom: 'var(--space-3)', fontWeight: 700 }}>커뮤니티 게시글</p>
              {userPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}
            </div>
          )}
          <CrawlFeed topicKey="board.free" title="자유게시판 HOT" limit={10} />
        </>
      )}

      {tab !== 'free' && (
        <CrawlFeed
          topicKey={TOPIC_MAP[tab]}
          title={TABS.find(t => t.key === tab)?.label + ' 게시판'}
          limit={15}
        />
      )}
    </div>
  )
}
