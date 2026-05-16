import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { CrawlFeed, TabNav, PageHeader, EmptyState } from '../../components/CrawlComponents.jsx'
import PostCard from '../../components/PostCard.jsx'

const TABS = [
  { key: 'following',  label: 'Following' },
  { key: 'latest',     label: '최신글' },
  { key: 'recommended',label: '추천글' },
  { key: 'ai',         label: 'AI 맞춤 피드' },
]

export default function FeedPage({ navigate }) {
  const [tab, setTab] = useState('latest')
  const { currentUser } = useAuth()
  const { posts } = useApp()

  const followPosts = currentUser
    ? posts.filter(p => currentUser.following.includes(p.authorId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : []

  const latestPosts = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return (
    <div className="fade-up">
      <PageHeader title="피드" subtitle="나만의 맞춤 콘텐츠 피드" />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'following' && (
        currentUser
          ? followPosts.length > 0
            ? <div>{followPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div>
            : <EmptyState message="팔로잉 게시글이 없습니다." sub="관심 있는 사용자를 팔로우해 보세요." />
          : <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-muted)', marginBottom: 'var(--space-5)' }}>로그인이 필요합니다.</p>
              <button onClick={() => navigate('login')} className="btn btn-primary">로그인</button>
            </div>
      )}
      {tab === 'latest'      && <div>{latestPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div>}
      {tab === 'recommended' && <CrawlFeed topicKey="feed.recommended" title="추천글"       limit={10} />}
      {tab === 'ai'          && <CrawlFeed topicKey="home.ai_feed"     title="AI 맞춤 피드" limit={10} />}
    </div>
  )
}
