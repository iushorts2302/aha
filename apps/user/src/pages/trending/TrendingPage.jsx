import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { sortPosts, getHotPosts, getRisingPosts, getControversialPosts } from '../../store/algorithm.js'
import { CrawlFeed, TabNav, PageHeader } from '../../components/CrawlComponents.jsx'
import PostCard from '../../components/PostCard.jsx'

const TABS = [
  { key: 'realtime', label: '🔴 실시간 인기' },
  { key: 'daily',    label: '일간 베스트' },
  { key: 'weekly',   label: '주간 베스트' },
  { key: 'debate',   label: '💬 논쟁중' },
]

export default function TrendingPage({ navigate }) {
  const [tab, setTab] = useState('realtime')
  const { posts, comments } = useApp()

  const commentsMap = Object.fromEntries(
    posts.map(p => [p.id, comments.filter(c => c.postId === p.id).length])
  )

  const hotPosts   = getHotPosts(posts, commentsMap, 15)
  const topPosts   = sortPosts(posts, commentsMap, 'top').slice(0, 15)
  const debatePosts= getControversialPosts(posts, commentsMap, 15)

  const renderWithFallback = (userPosts, topicKey, title) =>
    userPosts.length > 0
      ? <div>{userPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div>
      : <CrawlFeed topicKey={topicKey} title={title} limit={15} showRank />

  return (
    <div className="fade-up">
      <PageHeader title="인기" subtitle="지금 가장 뜨거운 콘텐츠 — Reddit Hot Score 기반 알고리즘" />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'realtime' && renderWithFallback(hotPosts,   'trending.realtime', '실시간 인기')}
      {tab === 'daily'    && renderWithFallback(topPosts,   'trending.daily',    '일간 베스트')}
      {tab === 'weekly'   && <CrawlFeed topicKey="trending.weekly" title="주간 베스트" limit={15} showRank />}
      {tab === 'debate'   && renderWithFallback(debatePosts,'trending.debate',   '논쟁중')}
    </div>
  )
}
