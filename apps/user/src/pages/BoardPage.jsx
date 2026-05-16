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
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState(searchQuery || '')

  const filtered = posts
    .filter(p => categoryFilter === 'all' || p.categoryId === categoryFilter)
    .filter(p => !search || p.title.includes(search) || p.body.includes(search) || p.tags.some(t => t.includes(search)))
    .sort((a, b) => {
      if (sort === 'latest') return new Date(b.createdAt) - new Date(a.createdAt)
      if (sort === 'popular') return (b.likes.length + b.views) - (a.likes.length + a.views)
      if (sort === 'comments') return comments.filter(c => c.postId === b.id).length - comments.filter(c => c.postId === a.id).length
      return 0
    })

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700 }}>커뮤니티 게시판</h2>
        {currentUser && (
          <button onClick={() => navigate('write')} className="btn btn-primary">✏️ 글 작성</button>
        )}
      </div>

      {/* 필터 영역 */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {/* 검색 */}
        <input
          className="input"
          style={{ flex: 1, minWidth: '200px' }}
          placeholder="제목, 내용, 태그 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* 카테고리 필터 */}
        <select
          className="input"
          style={{ width: 'auto' }}
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="all">전체 분야</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>

        {/* 정렬 */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)', padding: '3px' }}>
          {SORTS.map(s => (
            <button key={s.key} onClick={() => setSort(s.key)} style={{
              padding: '5px 12px', fontSize: '12px', borderRadius: 'var(--radius-sm)',
              background: sort === s.key ? 'var(--color-accent)' : 'transparent',
              color: sort === s.key ? '#000' : 'var(--color-muted)',
              fontWeight: sort === s.key ? 600 : 400,
              transition: 'var(--transition)',
            }}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* 결과 수 */}
      <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '14px' }}>
        총 <strong style={{ color: 'var(--color-accent)' }}>{filtered.length}</strong>개의 게시글
      </p>

      {/* 게시글 목록 */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-muted)' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</p>
          <p style={{ fontSize: '14px' }}>검색 결과가 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((post, i) => (
            <div key={post.id} style={{ animationDelay: `${i * 0.04}s` }}>
              <PostCard post={post} navigate={navigate} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
