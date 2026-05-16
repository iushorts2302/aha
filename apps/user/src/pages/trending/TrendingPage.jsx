import { useState } from 'react'
import { CrawlFeed, TabNav, PageHeader } from '../../components/CrawlComponents.jsx'

const TABS = [
  { key: 'realtime', label: '실시간 인기' },
  { key: 'daily',    label: '일간 베스트' },
  { key: 'weekly',   label: '주간 베스트' },
  { key: 'debate',   label: '논쟁중' },
]

export default function TrendingPage() {
  const [tab, setTab] = useState('realtime')

  return (
    <div className="fade-up">
      <PageHeader title="인기" subtitle="지금 가장 뜨거운 콘텐츠" />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'realtime' && <CrawlFeed topicKey="trending.realtime" title="실시간 인기" limit={10} showRank />}
      {tab === 'daily'    && <CrawlFeed topicKey="trending.daily"    title="일간 베스트" limit={10} showRank />}
      {tab === 'weekly'   && <CrawlFeed topicKey="trending.weekly"   title="주간 베스트" limit={10} showRank />}
      {tab === 'debate'   && <CrawlFeed topicKey="trending.debate"   title="논쟁중"      limit={10} />}
    </div>
  )
}
