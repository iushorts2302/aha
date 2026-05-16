import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { CrawlFeed, TabNav, PageHeader, ComingSoon } from '../components/CrawlComponents.jsx'
import PostCard from '../components/PostCard.jsx'

// ── 갤러리 ──────────────────────────────────────────────
export function GalleryPage() {
  const [tab, setTab] = useState('image')
  const TABS = [
    { key: 'image', label: '이미지' },
    { key: 'meme',  label: '밈' },
    { key: 'ai',    label: 'AI 이미지' },
  ]
  return (
    <div className="fade-up">
      <PageHeader title="갤러리" subtitle="이미지, 움짤, 밈, AI 생성 이미지" />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'image' && <CrawlFeed topicKey="gallery.image" title="이미지"    limit={10} />}
      {tab === 'meme'  && <CrawlFeed topicKey="gallery.meme"  title="밈"        limit={10} />}
      {tab === 'ai'    && <CrawlFeed topicKey="gallery.ai"    title="AI 이미지" limit={10} />}
    </div>
  )
}

// ── 커뮤니티 ────────────────────────────────────────────
export function CommunityPage() {
  const [tab, setTab] = useState('dev')
  const TABS = [
    { key: 'dev',    label: '개발' },
    { key: 'invest', label: '투자' },
    { key: 'travel', label: '여행' },
    { key: 'fashion',label: '패션' },
    { key: 'fitness',label: '운동' },
  ]
  const TOPIC_MAP = {
    dev: 'community.dev', invest: 'community.invest',
    travel: 'community.travel', fashion: 'community.fashion', fitness: 'community.fitness',
  }
  return (
    <div className="fade-up">
      <PageHeader title="커뮤니티" subtitle="관심사 기반 전문 커뮤니티" />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      <CrawlFeed topicKey={TOPIC_MAP[tab]} title={TABS.find(t => t.key === tab)?.label + ' 커뮤니티'} limit={10} />
    </div>
  )
}

// ── 정보 ────────────────────────────────────────────────
export function KnowledgePage() {
  const [tab, setTab] = useState('news')
  const TABS = [
    { key: 'news',     label: '뉴스' },
    { key: 'tips',     label: '팁' },
    { key: 'review',   label: '리뷰' },
    { key: 'tutorial', label: '튜토리얼' },
  ]
  const TOPIC_MAP = {
    news: 'knowledge.news', tips: 'knowledge.tips',
    review: 'knowledge.review', tutorial: 'knowledge.tutorial',
  }
  return (
    <div className="fade-up">
      <PageHeader title="정보" subtitle="검증된 지식과 정보를 한 곳에" />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      <CrawlFeed topicKey={TOPIC_MAP[tab]} title={TABS.find(t => t.key === tab)?.label} limit={10} />
    </div>
  )
}

// ── 마켓 ────────────────────────────────────────────────
export function MarketPage() {
  const [tab, setTab] = useState('deal')
  const TABS = [
    { key: 'deal',   label: '핫딜' },
    { key: 'coupon', label: '쿠폰' },
    { key: 'used',   label: '중고거래' },
    { key: 'event',  label: '이벤트' },
  ]
  const TOPIC_MAP = {
    deal: 'market.deal', coupon: 'market.coupon',
    used: 'market.deal', event: 'market.coupon',
  }
  return (
    <div className="fade-up">
      <PageHeader title="마켓" subtitle="핫딜, 쿠폰, 중고거래, 이벤트" />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      <CrawlFeed topicKey={TOPIC_MAP[tab]} title={TABS.find(t => t.key === tab)?.label} limit={10} />
    </div>
  )
}

// ── 라이브 ──────────────────────────────────────────────
export function LivePage() {
  const TABS = [
    { key: 'chat',   label: '실시간 채팅' },
    { key: 'issue',  label: '라이브 이슈' },
    { key: 'stream', label: '스트리밍' },
  ]
  const [tab, setTab] = useState('issue')
  return (
    <div className="fade-up">
      <PageHeader title="라이브" subtitle="지금 이 순간, 실시간 소통" />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'issue'  && <CrawlFeed topicKey="trending.realtime" title="라이브 이슈" limit={10} />}
      {tab !== 'issue'  && <ComingSoon name={TABS.find(t => t.key === tab)?.label} />}
    </div>
  )
}

// ── AI 허브 ─────────────────────────────────────────────
export function AIHubPage() {
  const [tab, setTab] = useState('trend')
  const TABS = [
    { key: 'trend',   label: 'AI 트렌드' },
    { key: 'summary', label: 'AI 요약' },
    { key: 'search',  label: 'AI 검색' },
  ]
  return (
    <div className="fade-up">
      <PageHeader title="AI 허브" subtitle="AI로 더 스마트하게 탐색하기" />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'trend'   && <CrawlFeed topicKey="aihub.trend"   title="AI 트렌드" limit={10} />}
      {tab === 'summary' && <CrawlFeed topicKey="aihub.summary" title="AI 요약"   limit={10} />}
      {tab === 'search'  && <ComingSoon name="AI 검색" />}
    </div>
  )
}

// ── 알림 ────────────────────────────────────────────────
export function NotificationPage({ navigate }) {
  const { currentUser } = useAuth()
  if (!currentUser) return (
    <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
      <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-muted)', marginBottom: 'var(--space-5)' }}>로그인이 필요합니다.</p>
      <button onClick={() => navigate('login')} className="btn btn-primary">로그인</button>
    </div>
  )
  const TABS = [
    { key: 'comment', label: '댓글' },
    { key: 'mention', label: '멘션' },
    { key: 'follow',  label: '팔로우' },
    { key: 'system',  label: '시스템' },
  ]
  const [tab, setTab] = useState('comment')
  return (
    <div className="fade-up">
      <PageHeader title="알림" subtitle="나의 활동 알림" />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
        <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-muted)' }}>새로운 알림이 없습니다.</p>
      </div>
    </div>
  )
}

// ── 마이 ────────────────────────────────────────────────
export function MyPage({ navigate }) {
  const { currentUser, logout } = useAuth()
  const { getPostsByAuthor } = useApp()

  if (!currentUser) return (
    <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
      <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-muted)', marginBottom: 'var(--space-5)' }}>로그인이 필요합니다.</p>
      <button onClick={() => navigate('login')} className="btn btn-primary">로그인</button>
    </div>
  )

  const myPosts = getPostsByAuthor(currentUser.id)
  const TABS = [
    { key: 'profile', label: '프로필' },
    { key: 'posts',   label: '작성글' },
    { key: 'saved',   label: '저장글' },
    { key: 'settings',label: '계정 설정' },
  ]
  const [tab, setTab] = useState('profile')

  return (
    <div className="fade-up">
      {/* 프로필 헤더 */}
      <div style={{ padding: 'var(--space-8) 0 var(--space-6)', borderBottom: '1px solid var(--color-border-soft)', display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'var(--color-ink)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', fontWeight: 800,
        }}>{currentUser.nickname[0]}</div>
        <div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-ink)' }}>{currentUser.nickname}</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginTop: 'var(--space-1)' }}>{currentUser.email}</p>
          <div style={{ display: 'flex', gap: 'var(--space-5)', marginTop: 'var(--space-3)' }}>
            {[
              { label: '게시글', value: myPosts.length },
              { label: '팔로워', value: currentUser.followers.length },
              { label: '팔로잉', value: currentUser.following.length },
            ].map(s => (
              <div key={s.label}>
                <span style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--color-ink)' }}>{s.value}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', marginLeft: 'var(--space-1)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => navigate(`profile/${currentUser.id}`)} className="btn btn-secondary" style={{ height: '36px' }}>프로필 보기</button>
      </div>

      <TabNav tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'profile' && (
        <div style={{ padding: 'var(--space-6) 0' }}>
          {currentUser.bio && <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-body)', marginBottom: 'var(--space-5)' }}>{currentUser.bio}</p>}
          {currentUser.expertise.length > 0 && (
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {currentUser.expertise.map(e => (
                <span key={e} style={{ fontSize: 'var(--text-sm)', padding: '4px 14px', borderRadius: '99px', border: '1px solid var(--color-border)', color: 'var(--color-body)', fontWeight: 700 }}>{e}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'posts' && (
        myPosts.length > 0
          ? <div>{myPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div>
          : <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-muted)', marginBottom: 'var(--space-5)' }}>작성한 글이 없습니다.</p>
              <button onClick={() => navigate('write')} className="btn btn-primary">글 작성하기</button>
            </div>
      )}

      {tab === 'saved' && (
        <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-muted)' }}>저장된 글이 없습니다.</p>
        </div>
      )}

      {tab === 'settings' && (
        <div style={{ padding: 'var(--space-6) 0', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '400px' }}>
          {[
            { label: '닉네임', value: currentUser.nickname },
            { label: '이메일', value: currentUser.email },
            { label: '가입일', value: currentUser.createdAt },
          ].map(f => (
            <div key={f.label} style={{ borderBottom: '1px solid var(--color-border-soft)', paddingBottom: 'var(--space-4)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', marginBottom: 'var(--space-1)', fontWeight: 700 }}>{f.label}</p>
              <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-ink)' }}>{f.value}</p>
            </div>
          ))}
          <button onClick={() => logout()} className="btn btn-secondary" style={{ marginTop: 'var(--space-4)', alignSelf: 'flex-start' }}>로그아웃</button>
        </div>
      )}
    </div>
  )
}
