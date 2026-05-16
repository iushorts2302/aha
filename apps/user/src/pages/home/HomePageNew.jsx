import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { sortPosts, getHotPosts, getRisingPosts } from '../../store/algorithm.js'
import { CrawlFeed, TabNav, EmptyState } from '../../components/CrawlComponents.jsx'
import ShortformFeed from '../../components/ShortformFeed.jsx'
import { LiveIssueRanking } from '../../components/LiveChat.jsx'
import PostCard from '../../components/PostCard.jsx'

const TABS = [
  { key: 'trending',  label: '오늘의 인기글' },
  { key: 'rising',    label: '🔥 실시간 급상승' },
  { key: 'ai_feed',   label: 'AI 추천 피드' },
  { key: 'shortform', label: '숏폼' },
  { key: 'following', label: '팔로잉' },
]

export default function HomePageNew({ navigate }) {
  const [tab, setTab] = useState('trending')
  const { currentUser } = useAuth()
  const { posts, comments } = useApp()

  const commentsMap = Object.fromEntries(
    posts.map(p => [p.id, comments.filter(c => c.postId === p.id).length])
  )

  const hotPosts     = getHotPosts(posts, commentsMap, 10)
  const risingPosts  = getRisingPosts(posts, commentsMap, 10)
  const followPosts  = currentUser
    ? sortPosts(posts.filter(p => currentUser.following.includes(p.authorId)), commentsMap, 'hot')
    : []

  return (
    <div className="fade-up">
      {/* 히어로 */}
      <div style={{ padding: 'var(--space-8) 0 var(--space-6)', borderBottom: '1px solid var(--color-border-soft)', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--space-6)', alignItems: 'start' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 'var(--space-2)' }}>
            <span style={{ color: 'var(--color-accent)' }}>aha!</span>
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginBottom: 'var(--space-5)' }}>
            전문 정보 큐레이션 & 공유 커뮤니티
          </p>
          {!currentUser && (
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button onClick={() => navigate('signup')} className="btn btn-primary">지금 가입하기</button>
              <button onClick={() => navigate('board')} className="btn btn-secondary">게시판 둘러보기</button>
            </div>
          )}
        </div>
        {/* 실시간 이슈 사이드 */}
        <LiveIssueRanking />
      </div>

      <TabNav tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'trending' && (
        hotPosts.length > 0
          ? <div>{hotPosts.map((p, i) => <PostCard key={p.id} post={p} navigate={navigate} />)}</div>
          : <CrawlFeed topicKey="home.trending" title="오늘의 인기글" limit={10} showRank />
      )}
      {tab === 'rising' && (
        risingPosts.length > 0
          ? <div>{risingPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div>
          : <CrawlFeed topicKey="home.rising" title="실시간 급상승" limit={10} showRank />
      )}
      {tab === 'ai_feed'   && <CrawlFeed topicKey="home.ai_feed"   title="AI 추천 피드" limit={10} />}
      {tab === 'shortform' && <ShortformFeed topicKey="home.shortform" />}
      {tab === 'following' && (
        currentUser
          ? followPosts.length > 0
            ? <div>{followPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div>
            : <EmptyState message="팔로잉 게시글이 없습니다." sub="관심 있는 사용자를 팔로우해 보세요." />
          : <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-muted)', marginBottom: 'var(--space-5)' }}>로그인하면 팔로잉 피드를 볼 수 있습니다.</p>
              <button onClick={() => navigate('login')} className="btn btn-primary">로그인</button>
            </div>
      )}
    </div>
  )
}
