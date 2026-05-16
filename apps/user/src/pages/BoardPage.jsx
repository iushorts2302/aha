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
    .filter(p => !search || p.title.includes(search) || p.tags.some(t => t.includes(search)))
    .sort((a, b) => {
      if (sort === 'latest') return new Date(b.createdAt) - new Date(a.createdAt)
      if (sort === 'popular') return (b.likes.length + b.views) - (a.likes.length + a.views)
      return comments.filter(c => c.postId === b.id).length - comments.filter(c => c.postId === a.id).length
    })

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid var(--color-border-soft)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--color-ink)' }}>커뮤니티 게시판</h2>
        {currentUser && (
          <button onClick={() => navigate('write')} className="btn btn-primary btn-sm">글 작성</button>
        )}
      </div>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input className="input" style={{ flex: 1, minWidth: '200px' }}
          placeholder="제목, 태그 검색..." value={search} onChange={e => setSearch(e.target.value)} />

        <select className="input" style={{ width: 'auto' }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="all">전체 분야</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>

        <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-btn)', overflow: 'hidden' }}>
          {SORTS.map(s => (
            <button key={s.key} onClick={() => setSort(s.key)} style={{
              padding: '0 14px', height: '38px', fontSize: '13px',
              background: sort === s.key ? 'var(--color-surface)' : 'transparent',
              color: sort === s.key ? 'var(--color-ink)' : 'var(--color-muted)',
              fontWeight: sort === s.key ? 500 : 400,
              transition: 'background-color var(--transition), color var(--transition)',
              borderRight: '1px solid var(--color-border)',
            }}>{s.label}</button>
          ))}
        </div>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--color-placeholder)', marginBottom: '8px' }}>
        {filtered.length}개의 게시글
      </p>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-muted)' }}>
          <p style={{ fontSize: '14px' }}>검색 결과가 없습니다.</p>
        </div>
      ) : (
        <div>{filtered.map(post => <PostCard key={post.id} post={post} navigate={navigate} />)}</div>
      )}
    </div>
  )
}
