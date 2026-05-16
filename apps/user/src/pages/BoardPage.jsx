import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import PostCard from '../components/PostCard'

const SORTS = [
  { key: 'latest', label: '최신순' },
  { key: 'popular', label: '인기순' },
  { key: 'comments', label: '댓글순' },
]

export default function BoardPage({ navigate, searchQuery }) {
  const { posts, categories, comments } = useApp()
  const { currentUser } = useAuth()
  const [sort, setSort] = useState('latest')
  const [catFilter, setCatFilter] = useState('all')
  const [search, setSearch] = useState(searchQuery || '')

  const filtered = posts
    .filter(p => catFilter === 'all' || p.categoryId === catFilter)
    .filter(p => !search || p.title.includes(search) || p.body.includes(search) || p.tags.some(t => t.includes(search)))
    .sort((a, b) => {
      if (sort === 'latest') return new Date(b.createdAt) - new Date(a.createdAt)
      if (sort === 'popular') return (b.likes.length + b.views) - (a.likes.length + a.views)
      if (sort === 'comments') return comments.filter(c => c.postId === b.id).length - comments.filter(c => c.postId === a.id).length
      return 0
    })

  return (
    <div className="fade-up">
      {/* 페이지 헤더 */}
      <div style={{
        padding: '40px 0 32px',
        borderBottom: '1px solid var(--color-border-soft)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 500, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
            커뮤니티 게시판
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '6px' }}>
            총 <strong style={{ color: 'var(--color-ink)', fontWeight: 500 }}>{filtered.length}</strong>개의 게시글
          </p>
        </div>
        {currentUser && (
          <button onClick={() => navigate('write')} className="btn btn-primary">
            글 작성
          </button>
        )}
      </div>

      {/* 필터 바 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px 0',
        borderBottom: '1px solid var(--color-border-soft)',
        flexWrap: 'wrap',
      }}>
        {/* 검색 */}
        <div style={{ position: 'relative', flex: 1, minWidth: '160px', maxWidth: '280px' }}>
          <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-placeholder)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input className="input" style={{ paddingLeft: '32px', height: '32px', fontSize: '13px' }}
            placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* 분야 필터 */}
        <select className="input" style={{ width: 'auto', height: '32px', fontSize: '13px' }}
          value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="all">전체 분야</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>

        <div style={{ flex: 1 }} />

        {/* 정렬 */}
        <div style={{ display: 'flex', gap: '2px' }}>
          {SORTS.map(s => (
            <button key={s.key} onClick={() => setSort(s.key)} style={{
              height: '32px', padding: '0 14px', fontSize: '13px', fontWeight: 500,
              borderRadius: 'var(--radius-btn)',
              color: sort === s.key ? 'var(--color-ink)' : 'var(--color-muted)',
              background: sort === s.key ? 'var(--color-surface)' : 'transparent',
              transition: 'color var(--transition), background-color var(--transition)',
            }}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div style={{ padding: '80px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>검색 결과가 없습니다.</p>
        </div>
      ) : (
        <div>{filtered.map(post => <PostCard key={post.id} post={post} navigate={navigate} />)}</div>
      )}
    </div>
  )
}
