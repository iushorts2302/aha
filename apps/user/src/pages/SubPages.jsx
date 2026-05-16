import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { sortPosts } from '../store/algorithm.js'
import { CrawlFeed, TabNav, PageHeader, ComingSoon } from '../components/CrawlComponents.jsx'
import { LiveChatPanel, LiveIssueRanking } from '../components/LiveChat.jsx'
import ShortformFeed from '../components/ShortformFeed.jsx'
import ReactionBar from '../components/ReactionBar.jsx'
import PostCard from '../components/PostCard.jsx'

// ── 피드 ────────────────────────────────────────────────
export function FeedPage({ navigate }) {
  const [tab, setTab] = useState('latest')
  const { currentUser } = useAuth()
  const { posts, comments } = useApp()
  const TABS = [
    { key: 'following',   label: 'Following' },
    { key: 'latest',      label: '최신글' },
    { key: 'recommended', label: '추천글' },
    { key: 'shortform',   label: '숏폼' },
    { key: 'ai',          label: 'AI 맞춤 피드' },
  ]
  const commentsMap = Object.fromEntries(posts.map(p => [p.id, comments.filter(c => c.postId === p.id).length]))
  const followPosts = currentUser ? sortPosts(posts.filter(p => currentUser.following.includes(p.authorId)), commentsMap, 'hot') : []
  const latestPosts = sortPosts(posts, commentsMap, 'new')

  return (
    <div className="fade-up">
      <PageHeader title="피드" subtitle="나만의 맞춤 콘텐츠 피드" />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'following' && (currentUser
        ? followPosts.length > 0 ? <div>{followPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div>
          : <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}><p style={{ color: 'var(--color-muted)', fontSize: 'var(--text-md)' }}>팔로잉 게시글이 없습니다.</p></div>
        : <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}><button onClick={() => navigate('login')} className="btn btn-primary">로그인</button></div>
      )}
      {tab === 'latest'      && <div>{latestPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div>}
      {tab === 'recommended' && <CrawlFeed topicKey="feed.recommended" title="추천글" limit={10} />}
      {tab === 'shortform'   && <ShortformFeed topicKey="home.shortform" />}
      {tab === 'ai'          && <CrawlFeed topicKey="home.ai_feed" title="AI 맞춤 피드" limit={10} />}
    </div>
  )
}

// ── 게시판 ──────────────────────────────────────────────
export function BoardPageNew({ navigate, searchQuery }) {
  const [tab, setTab] = useState('free')
  const [sort, setSort] = useState('hot')
  const [search, setSearch] = useState(searchQuery || '')
  const { currentUser } = useAuth()
  const { posts, comments } = useApp()

  const TABS = [
    { key: 'free', label: '자유' }, { key: 'question', label: '질문' },
    { key: 'info', label: '정보' }, { key: 'humor', label: '유머' },
    { key: 'it', label: 'IT' },     { key: 'game', label: '게임' },
    { key: 'sports', label: '스포츠' }, { key: 'politics', label: '정치' },
    { key: 'anon', label: '익명' },
  ]
  const TOPIC_MAP = { free: 'board.free', question: 'board.question', info: 'board.info', humor: 'board.humor', it: 'board.it', game: 'board.game', sports: 'board.sports', politics: 'board.politics', anon: 'board.free' }
  const SORTS = [{ key: 'hot', label: '인기순' }, { key: 'new', label: '최신순' }, { key: 'top', label: '추천순' }]

  const commentsMap = Object.fromEntries(posts.map(p => [p.id, comments.filter(c => c.postId === p.id).length]))
  const userPosts = tab === 'free' ? sortPosts(posts, commentsMap, sort).filter(p => !search || p.title.includes(search) || p.tags.some(t => t.includes(search))) : []

  return (
    <div className="fade-up">
      <div style={{ padding: 'var(--space-8) 0 var(--space-5)', borderBottom: '1px solid var(--color-border-soft)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>게시판</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginTop: 'var(--space-1)' }}>주제별 커뮤니티 게시판</p>
        </div>
        {currentUser && <button onClick={() => navigate('write')} className="btn btn-primary">글 작성</button>}
      </div>
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'free' && (
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-placeholder)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input className="input" style={{ paddingLeft: '30px', height: '32px', fontSize: 'var(--text-sm)' }} placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '2px' }}>
            {SORTS.map(s => (
              <button key={s.key} onClick={() => setSort(s.key)} style={{ height: '32px', padding: '0 var(--space-4)', fontSize: 'var(--text-sm)', fontWeight: 700, borderRadius: 'var(--radius-btn)', color: sort === s.key ? 'var(--color-ink)' : 'var(--color-muted)', background: sort === s.key ? 'var(--color-surface)' : 'transparent' }}>{s.label}</button>
            ))}
          </div>
        </div>
      )}
      {tab === 'free' && userPosts.length > 0 && <div style={{ marginBottom: 'var(--space-6)' }}>{userPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div>}
      <CrawlFeed topicKey={TOPIC_MAP[tab]} title={TABS.find(t => t.key === tab)?.label + ' 게시판 HOT'} limit={10} />
    </div>
  )
}

// ── 갤러리 ──────────────────────────────────────────────
export function GalleryPage() {
  const [tab, setTab] = useState('image')
  const TABS = [{ key: 'image', label: '이미지' }, { key: 'meme', label: '밈' }, { key: 'ai', label: 'AI 이미지' }, { key: 'shortform', label: '숏폼' }]
  return (
    <div className="fade-up">
      <PageHeader title="갤러리" subtitle="이미지, 밈, AI 생성 이미지" />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'image'    && <CrawlFeed topicKey="gallery.image" title="이미지" limit={10} />}
      {tab === 'meme'     && <CrawlFeed topicKey="gallery.meme" title="밈" limit={10} />}
      {tab === 'ai'       && <CrawlFeed topicKey="gallery.ai" title="AI 이미지" limit={10} />}
      {tab === 'shortform'&& <ShortformFeed topicKey="home.shortform" />}
    </div>
  )
}

// ── 커뮤니티 ────────────────────────────────────────────
export function CommunityPage() {
  const [tab, setTab] = useState('dev')
  const TABS = [{ key: 'dev', label: '개발' }, { key: 'invest', label: '투자' }, { key: 'travel', label: '여행' }, { key: 'fashion', label: '패션' }, { key: 'fitness', label: '운동' }]
  const TOPIC_MAP = { dev: 'community.dev', invest: 'community.invest', travel: 'community.travel', fashion: 'community.fashion', fitness: 'community.fitness' }
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
  const TABS = [{ key: 'news', label: '뉴스' }, { key: 'tips', label: '팁' }, { key: 'review', label: '리뷰' }, { key: 'tutorial', label: '튜토리얼' }]
  const TOPIC_MAP = { news: 'knowledge.news', tips: 'knowledge.tips', review: 'knowledge.review', tutorial: 'knowledge.tutorial' }
  return (
    <div className="fade-up">
      <PageHeader title="정보" subtitle="검증된 지식과 정보" />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      <CrawlFeed topicKey={TOPIC_MAP[tab]} title={TABS.find(t => t.key === tab)?.label} limit={10} />
    </div>
  )
}

// ── 마켓 ────────────────────────────────────────────────
export function MarketPage() {
  const [tab, setTab] = useState('deal')
  const TABS = [{ key: 'deal', label: '핫딜' }, { key: 'coupon', label: '쿠폰' }, { key: 'used', label: '중고거래' }, { key: 'event', label: '이벤트' }]
  return (
    <div className="fade-up">
      <PageHeader title="마켓" subtitle="핫딜, 쿠폰, 중고거래, 이벤트" />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      <CrawlFeed topicKey={tab === 'deal' || tab === 'used' ? 'market.deal' : 'market.coupon'} title={TABS.find(t => t.key === tab)?.label} limit={10} />
    </div>
  )
}

// ── 라이브 ──────────────────────────────────────────────
export function LivePage() {
  const [tab, setTab] = useState('issue')
  const TABS = [{ key: 'issue', label: '🔴 라이브 이슈' }, { key: 'chat', label: '실시간 채팅' }, { key: 'stream', label: '스트리밍' }]
  return (
    <div className="fade-up">
      <PageHeader title="라이브" subtitle="지금 이 순간, 실시간 소통" />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'issue' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--space-6)', alignItems: 'start' }}>
          <CrawlFeed topicKey="trending.realtime" title="실시간 이슈 피드" limit={10} />
          <LiveIssueRanking />
        </div>
      )}
      {tab === 'chat' && (
        <div style={{ paddingTop: 'var(--space-5)' }}>
          <LiveChatPanel channel="free" />
        </div>
      )}
      {tab === 'stream' && <ComingSoon name="스트리밍" />}
    </div>
  )
}

// ── AI 허브 ─────────────────────────────────────────────
export function AIHubPage() {
  const [tab, setTab] = useState('trend')
  const TABS = [{ key: 'trend', label: 'AI 트렌드' }, { key: 'summary', label: 'AI 요약' }, { key: 'search', label: 'AI 검색' }]
  return (
    <div className="fade-up">
      <PageHeader title="AI 허브" subtitle="AI로 더 스마트하게 탐색하기" />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'trend'   && <CrawlFeed topicKey="aihub.trend" title="AI 트렌드" limit={10} />}
      {tab === 'summary' && <CrawlFeed topicKey="aihub.summary" title="AI 요약" limit={10} />}
      {tab === 'search'  && <ComingSoon name="AI 검색" />}
    </div>
  )
}

// ── 알림 ────────────────────────────────────────────────
export function NotificationPage({ navigate }) {
  const { currentUser } = useAuth()
  const [tab, setTab] = useState('comment')
  const TABS = [{ key: 'comment', label: '댓글' }, { key: 'mention', label: '멘션' }, { key: 'follow', label: '팔로우' }, { key: 'system', label: '시스템' }]
  if (!currentUser) return <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}><button onClick={() => navigate('login')} className="btn btn-primary">로그인</button></div>
  return (
    <div className="fade-up">
      <PageHeader title="알림" subtitle="나의 활동 알림" />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}><p style={{ fontSize: 'var(--text-md)', color: 'var(--color-muted)' }}>새로운 알림이 없습니다.</p></div>
    </div>
  )
}

// ── 마이 ────────────────────────────────────────────────
export function MyPage({ navigate }) {
  const { currentUser, logout } = useAuth()
  const { getPostsByAuthor } = useApp()
  const [tab, setTab] = useState('profile')
  const TABS = [{ key: 'profile', label: '프로필' }, { key: 'posts', label: '작성글' }, { key: 'saved', label: '저장글' }, { key: 'settings', label: '계정 설정' }]

  if (!currentUser) return (
    <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
      <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-muted)', marginBottom: 'var(--space-5)' }}>로그인이 필요합니다.</p>
      <button onClick={() => navigate('login')} className="btn btn-primary">로그인</button>
    </div>
  )

  const myPosts = getPostsByAuthor(currentUser.id)
  return (
    <div className="fade-up">
      <div style={{ padding: 'var(--space-8) 0 var(--space-6)', borderBottom: '1px solid var(--color-border-soft)', display: 'flex', alignItems: 'center', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--color-ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 800 }}>{currentUser.nickname[0]}</div>
        <div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-ink)' }}>{currentUser.nickname}</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginTop: 'var(--space-1)' }}>{currentUser.email}</p>
          <div style={{ display: 'flex', gap: 'var(--space-5)', marginTop: 'var(--space-3)' }}>
            {[{ label: '게시글', value: myPosts.length }, { label: '팔로워', value: currentUser.followers.length }, { label: '팔로잉', value: currentUser.following.length }].map(s => (
              <div key={s.label}><span style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--color-ink)' }}>{s.value}</span><span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', marginLeft: 'var(--space-1)' }}>{s.label}</span></div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => navigate(`profile/${currentUser.id}`)} className="btn btn-secondary" style={{ height: '36px' }}>프로필 보기</button>
      </div>
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'profile' && <div style={{ padding: 'var(--space-6) 0' }}>{currentUser.bio && <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-body)', marginBottom: 'var(--space-5)' }}>{currentUser.bio}</p>}{currentUser.expertise?.length > 0 && <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>{currentUser.expertise.map(e => <span key={e} style={{ fontSize: 'var(--text-sm)', padding: '4px 14px', borderRadius: '99px', border: '1px solid var(--color-border)', color: 'var(--color-body)', fontWeight: 700 }}>{e}</span>)}</div>}</div>}
      {tab === 'posts' && (myPosts.length > 0 ? <div>{myPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div> : <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}><p style={{ color: 'var(--color-muted)', marginBottom: 'var(--space-5)' }}>작성한 글이 없습니다.</p><button onClick={() => navigate('write')} className="btn btn-primary">글 작성하기</button></div>)}
      {tab === 'saved' && <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}><p style={{ color: 'var(--color-muted)' }}>저장된 글이 없습니다.</p></div>}
      {tab === 'settings' && (
        <div style={{ padding: 'var(--space-6) 0', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '400px' }}>
          {[{ label: '닉네임', value: currentUser.nickname }, { label: '이메일', value: currentUser.email }, { label: '가입일', value: currentUser.createdAt }].map(f => (
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

// ── 홈 ─────────────────────────────────────────────────
export function HomePage({ navigate }) {
  const [tab, setTab] = useState('trending')
  const { currentUser } = useAuth()
  const { posts, comments } = useApp()

  const TABS = [
    { key: 'trending',  label: '오늘의 인기글' },
    { key: 'rising',    label: '🔥 실시간 급상승' },
    { key: 'ai_feed',   label: 'AI 추천 피드' },
    { key: 'shortform', label: '숏폼' },
    { key: 'following', label: '팔로잉' },
  ]

  const commentsMap = Object.fromEntries(posts.map(p => [p.id, comments.filter(c => c.postId === p.id).length]))
  const hotPosts    = posts.map(p => ({ ...p, _s: sortPosts([p], commentsMap, 'hot')[0]?._score || 0 })).sort((a, b) => b._s - a._s).slice(0, 10)
  const risingPosts = posts.filter(p => (Date.now() - new Date(p.createdAt).getTime()) < 3 * 3600000).sort((a, b) => (b.likes?.length + b.views) - (a.likes?.length + a.views)).slice(0, 10)
  const followPosts = currentUser ? posts.filter(p => currentUser.following.includes(p.authorId)) : []

  return (
    <div className="fade-up">
      <div style={{ padding: 'var(--space-8) 0 var(--space-6)', borderBottom: '1px solid var(--color-border-soft)' }}>
        <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 800, color: 'var(--color-ink)', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 'var(--space-2)' }}>
          <span style={{ color: 'var(--color-accent)' }}>aha!</span>
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)' }}>전문 정보 큐레이션 & 공유 커뮤니티</p>
        {!currentUser && (
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
            <button onClick={() => navigate('signup')} className="btn btn-primary">지금 가입하기</button>
            <button onClick={() => navigate('board')} className="btn btn-secondary">게시판 둘러보기</button>
          </div>
        )}
      </div>
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'trending'  && (hotPosts.length > 0 ? <div>{hotPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div> : <CrawlFeed topicKey="home.trending" title="오늘의 인기글" limit={10} showRank />)}
      {tab === 'rising'    && (risingPosts.length > 0 ? <div>{risingPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div> : <CrawlFeed topicKey="home.rising" title="실시간 급상승" limit={10} showRank />)}
      {tab === 'ai_feed'   && <CrawlFeed topicKey="home.ai_feed" title="AI 추천 피드" limit={10} />}
      {tab === 'shortform' && <ShortformFeed topicKey="home.shortform" />}
      {tab === 'following' && (
        currentUser
          ? followPosts.length > 0
            ? <div>{followPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div>
            : <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}><p style={{ color: 'var(--color-muted)' }}>팔로잉 게시글이 없습니다.</p></div>
          : <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}><button onClick={() => navigate('login')} className="btn btn-primary">로그인</button></div>
      )}
    </div>
  )
}

// ── 인기 ────────────────────────────────────────────────
export function TrendingPage({ navigate }) {
  const [tab, setTab] = useState('realtime')
  const { posts, comments } = useApp()
  const TABS = [
    { key: 'realtime', label: '🔴 실시간 인기' },
    { key: 'daily',    label: '일간 베스트' },
    { key: 'weekly',   label: '주간 베스트' },
    { key: 'debate',   label: '💬 논쟁중' },
  ]
  const commentsMap = Object.fromEntries(posts.map(p => [p.id, comments.filter(c => c.postId === p.id).length]))
  const hotPosts    = sortPosts(posts, commentsMap, 'hot').slice(0, 15)
  const topPosts    = sortPosts(posts, commentsMap, 'top').slice(0, 15)
  const debatePosts = posts.filter(p => (commentsMap[p.id] || 0) >= 2).sort((a, b) => (commentsMap[b.id] || 0) - (commentsMap[a.id] || 0)).slice(0, 15)

  return (
    <div className="fade-up">
      <PageHeader title="인기" subtitle="지금 가장 뜨거운 콘텐츠 — Hot Score 알고리즘 기반" />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'realtime' && (hotPosts.length > 0 ? <div>{hotPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div> : <CrawlFeed topicKey="trending.realtime" title="실시간 인기" limit={15} showRank />)}
      {tab === 'daily'    && (topPosts.length > 0 ? <div>{topPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div> : <CrawlFeed topicKey="trending.daily" title="일간 베스트" limit={15} showRank />)}
      {tab === 'weekly'   && <CrawlFeed topicKey="trending.weekly" title="주간 베스트" limit={15} showRank />}
      {tab === 'debate'   && (debatePosts.length > 0 ? <div>{debatePosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div> : <CrawlFeed topicKey="trending.debate" title="논쟁중" limit={15} />)}
    </div>
  )
}
