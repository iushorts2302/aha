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
    <div>
      {/* 히어로 */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '52px', color: 'var(--color-accent)', letterSpacing: '3px', lineHeight: 1 }}>aha!</h1>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginTop: '6px' }}>전문 정보 큐레이션 & 공유 커뮤니티</p>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '0' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 18px',
            fontSize: '14px',
            fontWeight: tab === t.key ? 600 : 400,
            color: tab === t.key ? 'var(--color-accent)' : 'var(--color-muted)',
            borderBottom: tab === t.key ? '2px solid var(--color-accent)' : '2px solid transparent',
            marginBottom: '-1px',
            transition: 'var(--transition)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* 피드 */}
      {tab === 'following' && !currentUser ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-muted)' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>👥</p>
          <p style={{ fontSize: '14px', marginBottom: '16px' }}>팔로잉 피드를 보려면 로그인이 필요합니다.</p>
          <button onClick={() => navigate('login')} className="btn btn-primary">로그인</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-muted)' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>📭</p>
          <p style={{ fontSize: '14px' }}>아직 게시글이 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((post, i) => (
            <div key={post.id} style={{ animationDelay: `${i * 0.06}s` }}>
              <PostCard post={post} navigate={navigate} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
