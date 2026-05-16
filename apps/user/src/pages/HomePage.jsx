import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import PostCard from '../components/PostCard'

const TABS = [
  { key: 'latest', label: '최신' },
  { key: 'popular', label: '인기' },
  { key: 'following', label: '팔로잉' },
]

export default function HomePage({ navigate }) {
  const [tab, setTab] = useState('latest')
  const { currentUser } = useAuth()
  const { posts } = useApp()

  const filtered = (() => {
    if (tab === 'latest') return [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    if (tab === 'popular') return [...posts].sort((a, b) => (b.likes.length + b.views) - (a.likes.length + a.views))
    if (tab === 'following') {
      if (!currentUser) return []
      return posts.filter(p => currentUser.following.includes(p.authorId))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }
    return posts
  })()

  return (
    <div className="fade-up">
      {/* 헤더 */}
      <div style={{ marginBottom: '32px', paddingBottom: '28px', borderBottom: '1px solid var(--color-border-soft)' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 500, color: 'var(--color-ink)', letterSpacing: '-0.02em', marginBottom: '6px' }}>
          aha!
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>전문 정보 큐레이션 & 공유 커뮤니티</p>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '24px', borderBottom: '1px solid var(--color-border-soft)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 20px', fontSize: '14px', fontWeight: 500,
            color: tab === t.key ? 'var(--color-ink)' : 'var(--color-muted)',
            borderBottom: `2px solid ${tab === t.key ? 'var(--color-ink)' : 'transparent'}`,
            marginBottom: '-1px',
            transition: 'color var(--transition), border-color var(--transition)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* 피드 */}
      {tab === 'following' && !currentUser ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--color-muted)' }}>
          <p style={{ fontSize: '14px', marginBottom: '16px' }}>팔로잉 피드를 보려면 로그인이 필요합니다.</p>
          <button onClick={() => navigate('login')} className="btn btn-primary">로그인</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--color-muted)' }}>
          <p style={{ fontSize: '14px' }}>게시글이 없습니다.</p>
        </div>
      ) : (
        <div>
          {filtered.map(post => <PostCard key={post.id} post={post} navigate={navigate} />)}
        </div>
      )}
    </div>
  )
}
