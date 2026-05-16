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
      {/* 브랜드 히어로 */}
      <div style={{
        padding: '56px 0 48px',
        borderBottom: '1px solid var(--color-border-soft)',
        marginBottom: '0',
      }}>
        <h1 style={{
          fontSize: '40px', fontWeight: 500,
          color: 'var(--color-ink)',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          marginBottom: '10px',
        }}>aha!</h1>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', maxWidth: '360px', lineHeight: 1.6 }}>
          전문 정보 큐레이션 & 공유 커뮤니티. 신뢰할 수 있는 지식과 경험을 나누세요.
        </p>
        {!currentUser && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            <button onClick={() => navigate('signup')} className="btn btn-primary">
              지금 가입하기
            </button>
            <button onClick={() => navigate('board')} className="btn btn-secondary">
              게시판 둘러보기
            </button>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-soft)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '16px 20px', fontSize: '14px', fontWeight: 500,
            color: tab === t.key ? 'var(--color-ink)' : 'var(--color-muted)',
            borderBottom: `2px solid ${tab === t.key ? 'var(--color-ink)' : 'transparent'}`,
            marginBottom: '-1px',
            transition: 'color var(--transition), border-color var(--transition)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* 피드 */}
      {tab === 'following' && !currentUser ? (
        <div style={{ padding: '80px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '20px' }}>
            팔로잉 피드를 보려면 로그인이 필요합니다.
          </p>
          <button onClick={() => navigate('login')} className="btn btn-primary">로그인</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '80px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>게시글이 없습니다.</p>
        </div>
      ) : (
        <div>
          {filtered.map(post => <PostCard key={post.id} post={post} navigate={navigate} />)}
        </div>
      )}
    </div>
  )
}
