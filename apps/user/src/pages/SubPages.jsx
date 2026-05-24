import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { sortPosts } from '../store/algorithm.js'
import { CrawlFeed, TabNav, PageHeader, ComingSoon } from '../components/CrawlComponents.jsx'
import PostCard from '../components/PostCard.jsx'

// ── 홈 ─────────────────────────────────────────────────────
export function HomePage({ navigate }) {
  const { currentUser } = useAuth()
  const { posts, comments } = useApp()
  const commentsMap = Object.fromEntries(posts.map(p => [p.id, comments.filter(c => c.postId === p.id).length]))
  const hotPosts = sortPosts(posts, commentsMap, 'hot').slice(0, 5)

  return (
    <div className="fade-up">
      {/* 히어로 — 환영 메시지 */}
      <div style={{ padding: 'var(--sp-section) 0 var(--sp-xxl)', borderBottom: '1px solid var(--color-divider)' }}>
        <h1 style={{ fontSize: 'var(--text-hero)', fontWeight: 600, letterSpacing: '-0.28px', lineHeight: 1.07, color: 'var(--color-ink)', marginBottom: '8px' }}>
          <span style={{ color: 'var(--color-primary)' }}>aha!</span>
        </h1>
        <p style={{ fontSize: 'var(--text-lead-lg)', fontWeight: 400, lineHeight: 1.14, color: 'var(--color-muted-48)' }}>
          오늘의 IT · 스타트업 · AI 큐레이션
        </p>
        {!currentUser && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button onClick={() => navigate('signup')} className="btn-primary">지금 가입하기</button>
            <button onClick={() => navigate('board')} className="btn-secondary">게시판 둘러보기</button>
          </div>
        )}
      </div>

      {/* 큐레이션 섹션 — 클릭 없이 다양한 컨텐츠 즉시 노출 */}
      <div style={{ marginTop: 'var(--sp-xxl)' }}>
        {/* 1. AI 트렌드 — 최상단 강조 (그라데이션 배경 박스) */}
        <section className="aha-glass-light" style={{
          marginBottom: 56, padding: '24px 24px 8px',
          borderRadius: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--color-ink)' }}>
              AI 트렌드
            </h2>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
              background: 'var(--color-primary, #0066CC)', color: '#fff', letterSpacing: '0.3px',
            }}>HOT</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-muted, #888)', margin: '0 0 16px' }}>
            AI 에이전트 · 트렌드 · 도구 · 연구를 한눈에
          </p>
          <CrawlFeed topicKey="ai.agents"    title="🤖 AI 에이전트 / Skills" limit={5} showRank navigate={navigate} />
          <CrawlFeed topicKey="ai.trend"     title="🔥 AI 트렌드"             limit={5} navigate={navigate} />
          <CrawlFeed topicKey="ai.tools"     title="🛠 AI 도구/SDK"           limit={5} navigate={navigate} />
          <CrawlFeed topicKey="ai.research"  title="📄 AI 논문/연구"          limit={4} navigate={navigate} />
        </section>

        {/* 2. 사용자 게시글 (있으면) */}
        {hotPosts.length > 0 && (
          <section style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, paddingBottom: 8,
              borderBottom: '2px solid var(--color-ink)' }}>🔥 오늘의 인기 글</h2>
            {hotPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}
          </section>
        )}

        {/* 3. 실시간 IT 이슈 */}
        <section style={{ marginBottom: 56 }}>
          <CrawlFeed topicKey="home.trending" title="🔴 실시간 인기" limit={5} showRank navigate={navigate} />
        </section>

        {/* 4. AI 일반 뉴스 */}
        <section style={{ marginBottom: 56 }}>
          <CrawlFeed topicKey="ai.news" title="📰 AI 뉴스" limit={5} navigate={navigate} />
        </section>

        {/* 5. 한국 스타트업 */}
        <section style={{ marginBottom: 56 }}>
          <CrawlFeed topicKey="startup.new" title="🚀 한국 스타트업" limit={5} navigate={navigate} />
        </section>

        {/* 6. 개발 트렌딩 */}
        <section style={{ marginBottom: 56 }}>
          <CrawlFeed topicKey="dev.trending" title="💻 개발 트렌딩" limit={5} navigate={navigate} />
        </section>

        {/* 7. 코인 시세 */}
        <section style={{ marginBottom: 56 }}>
          <CrawlFeed topicKey="finance.crypto" title="💰 코인 시세" limit={5} navigate={navigate} />
        </section>

        {/* 8. 한국 개발자 글 (Velog) */}
        <section style={{ marginBottom: 56 }}>
          <CrawlFeed topicKey="learn.korean" title="📚 한국 개발자 글" limit={5} navigate={navigate} />
        </section>
      </div>
    </div>
  )
}


// ── 게시판(Board) ────────────────────────────────────────────
export function BoardPageNew({ navigate, searchQuery }) {
  const [tab, setTab] = useState('free')
  const [sort, setSort] = useState('hot')
  const [search, setSearch] = useState(searchQuery || '')
  const { currentUser } = useAuth()
  const { posts, comments } = useApp()
  const TABS = [
    { key: 'free',     label: '자유' },
    { key: 'question', label: '질문' },
    { key: 'it',       label: 'IT' },
  ]
  const SORTS = [{ key: 'hot', label: '인기순' }, { key: 'new', label: '최신순' }, { key: 'top', label: '추천순' }]
  const commentsMap = Object.fromEntries(posts.map(p => [p.id, comments.filter(c => c.postId === p.id).length]))
  const userPosts = tab === 'free'
    ? sortPosts(posts, commentsMap, sort).filter(p => !search || p.title.includes(search) || p.tags.some(t => t.includes(search)))
    : []

  return (
    <div className="fade-up">
      <div style={{ padding: 'var(--sp-section) 0 var(--sp-xxl)', borderBottom: '1px solid var(--color-divider)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-display-lg)', fontWeight: 600, color: 'var(--color-ink)' }}>게시판</h1>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-muted-48)', marginTop: '8px' }}>주제별 커뮤니티 게시판</p>
        </div>
        {currentUser && <button onClick={() => navigate('write')} className="btn-primary">글 작성</button>}
      </div>
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'free' && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
            <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-placeholder)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input className="input" style={{ paddingLeft: '40px', height: '40px', fontSize: 'var(--text-body)' }}
              placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '2px' }}>
            {SORTS.map(s => (
              <button key={s.key} onClick={() => setSort(s.key)} style={{
                height: '40px', padding: '0 16px', fontSize: 'var(--text-caption)', fontWeight: sort===s.key?600:400,
                borderRadius: 'var(--r-pill)', color: sort===s.key?'var(--color-ink)':'var(--color-muted-48)',
                background: sort===s.key?'var(--color-parchment)':'transparent',
              }}>{s.label}</button>
            ))}
          </div>
        </div>
      )}
      {tab === 'free' && userPosts.length > 0 && <div style={{ marginBottom: '24px' }}>{userPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate}/>)}</div>}
      <CrawlFeed topicKey={`board.${tab}`} title={TABS.find(t=>t.key===tab)?.label + ' 게시판 HOT'} limit={10} navigate={navigate} />
    </div>
  )
}

// ── AI 뉴스 ─────────────────────────────────────────────────
export function AIPage({ navigate }) {
  const [tab, setTab] = useState('agents')
  const TABS = [
    { key: 'agents',   label: 'AI 에이전트' },
    { key: 'trend',    label: 'AI 트렌드' },
    { key: 'tools',    label: 'AI 도구' },
    { key: 'news',     label: 'AI 뉴스' },
    { key: 'research', label: 'AI 리서치' },
  ]
  return (
    <div className="fade-up">
      <CategoryHero
        icon="🤖"
        title="AI 트렌드"
        subtitle="TechCrunch AI · The Verge · VentureBeat · arXiv 기반 최신 AI 소식"
        gradient="linear-gradient(135deg, #f0f6ff 0%, #faf5ff 100%)"
        accentColor="rgba(120, 80, 220, 0.10)"
      />
      <CrawlFeed topicKey="ai.trend" title="🔥 지금 가장 핫한 AI" limit={5} showRank navigate={navigate} />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      <CrawlFeed topicKey={`ai.${tab}`} title={TABS.find(t=>t.key===tab)?.label} limit={10} navigate={navigate} />
    </div>
  )
}

// ── 스타트업 ─────────────────────────────────────────────────
export function StartupPage({ navigate }) {
  const [tab, setTab] = useState('new')
  const TABS = [
    { key: 'new',     label: '신규 스타트업' },
    { key: 'funding', label: '투자/펀딩' },
    { key: 'product', label: '신제품' },
  ]
  return (
    <div className="fade-up">
      <CategoryHero
        icon="🚀"
        title="스타트업"
        subtitle="Product Hunt · Y Combinator · 디스콰이엇 기반 한국·글로벌 스타트업 소식"
        gradient="linear-gradient(135deg, #fff5f0 0%, #fff0ee 100%)"
        accentColor="rgba(255, 120, 80, 0.10)"
      />
      <CrawlFeed topicKey="startup.new" title="🔥 주목받는 신규 스타트업" limit={5} showRank navigate={navigate} />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      <CrawlFeed topicKey={`startup.${tab}`} title={TABS.find(t=>t.key===tab)?.label} limit={10} navigate={navigate} />
    </div>
  )
}

// ── 개발(Dev) ────────────────────────────────────────────────
export function DevPage({ navigate }) {
  const [tab, setTab] = useState('trending')
  const TABS = [
    { key: 'trending',  label: 'GitHub 트렌딩' },
    { key: 'javascript',label: 'JavaScript' },
    { key: 'python',    label: 'Python' },
    { key: 'devops',    label: 'DevOps' },
    { key: 'tools',     label: '개발 도구' },
  ]
  return (
    <div className="fade-up">
      <CategoryHero
        icon="💻"
        title="개발"
        subtitle="GitHub Trending · Dev.to · Stack Overflow · velog 기반 개발 콘텐츠"
        gradient="linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)"
        accentColor="rgba(34, 197, 94, 0.10)"
      />
      <CrawlFeed topicKey="dev.trending" title="🔥 GitHub 트렌딩 TOP" limit={5} showRank navigate={navigate} />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      <CrawlFeed topicKey={`dev.${tab}`} title={TABS.find(t=>t.key===tab)?.label} limit={10} navigate={navigate} />
    </div>
  )
}

// ── 디자인(Design) ───────────────────────────────────────────
export function DesignPage({ navigate }) {
  const [tab, setTab] = useState('ui')
  const TABS = [
    { key: 'ui',  label: 'UI 컴포넌트' },
    { key: 'ux',  label: 'UX 디자인' },
    { key: 'css', label: 'CSS/스타일' },
  ]
  return (
    <div className="fade-up">
      <CategoryHero
        icon="🎨"
        title="디자인"
        subtitle="Dribbble · Behance · Awwwards 기반 UI/UX 레퍼런스"
        gradient="linear-gradient(135deg, #fdf2ff 0%, #fff0f5 100%)"
        accentColor="rgba(217, 70, 239, 0.10)"
      />
      <CrawlFeed topicKey="design.ui" title="🔥 인기 UI 컴포넌트" limit={5} showRank navigate={navigate} />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      <CrawlFeed topicKey={`design.${tab}`} title={TABS.find(t=>t.key===tab)?.label} limit={10} navigate={navigate} />
    </div>
  )
}

// ── 게임(Game) ───────────────────────────────────────────────
export function GamePage({ navigate }) {
  const [tab, setTab] = useState('news')
  const TABS = [
    { key: 'news', label: '게임 뉴스' }, { key: 'indie', label: '인디게임' }, { key: 'review', label: '게임 리뷰' },
  ]
  return (
    <div className="fade-up">
      <CategoryHero
        icon="🎮"
        title="게임"
        subtitle="Inven · IGN · GameSpot 기반 국내·해외 게임 뉴스"
        gradient="linear-gradient(135deg, #f0f5ff 0%, #faf0ff 100%)"
        accentColor="rgba(99, 102, 241, 0.10)"
      />
      <CrawlFeed topicKey="game.news" title="🔥 최신 게임 뉴스" limit={5} showRank navigate={navigate} />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      <CrawlFeed topicKey={`game.${tab}`} title={TABS.find(t=>t.key===tab)?.label} limit={10} navigate={navigate} />
    </div>
  )
}

// ── 주식/코인(Finance) ───────────────────────────────────────
export function FinancePage({ navigate }) {
  const [tab, setTab] = useState('stock')
  const TABS = [
    { key: 'stock', label: '주식' }, { key: 'crypto', label: '코인' }, { key: 'invest', label: '투자' },
  ]
  return (
    <div className="fade-up">
      <CategoryHero
        icon="💰"
        title="주식 / 코인"
        subtitle="TradingView · CoinGecko · Investing.com 기반 금융 시장 동향"
        gradient="linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)"
        accentColor="rgba(234, 179, 8, 0.12)"
      />
      <CrawlFeed topicKey="finance.crypto" title="🔥 코인 시세 변동" limit={5} showRank navigate={navigate} />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      <CrawlFeed topicKey={`finance.${tab}`} title={TABS.find(t=>t.key===tab)?.label} limit={10} navigate={navigate} />
    </div>
  )
}

// ── 학습(Learn) ──────────────────────────────────────────────
export function LearnPage({ navigate }) {
  const [tab, setTab] = useState('tutorial')
  const TABS = [
    { key: 'tutorial', label: '튜토리얼' }, { key: 'course', label: '강의/코스' }, { key: 'book', label: '도서' },
  ]
  return (
    <div className="fade-up">
      <CategoryHero
        icon="📚"
        title="학습 / 강의"
        subtitle="Inflearn · Coursera · velog 기반 한국·해외 교육 콘텐츠"
        gradient="linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%)"
        accentColor="rgba(16, 185, 129, 0.10)"
      />
      <CrawlFeed topicKey="learn.korean" title="🔥 추천 한국어 자료" limit={5} showRank navigate={navigate} />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      <CrawlFeed topicKey={`learn.${tab}`} title={TABS.find(t=>t.key===tab)?.label} limit={10} navigate={navigate} />
    </div>
  )
}

// ── 알림(Notification) ───────────────────────────────────────
export function NotificationPage({ navigate }) {
  const { currentUser } = useAuth()
  const [tab, setTab] = useState('comment')
  const TABS = [
    { key: 'comment', label: '댓글' }, { key: 'mention', label: '멘션' },
    { key: 'follow', label: '팔로우' }, { key: 'system', label: '시스템' },
  ]
  if (!currentUser) return <LoginPrompt navigate={navigate} />
  return (
    <div className="fade-up">
      <PageHeader title="알림" subtitle="나의 활동 알림" />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      <div style={{ padding: '64px 0', textAlign: 'center' }}>
        <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-muted-48)' }}>새로운 알림이 없습니다.</p>
      </div>
    </div>
  )
}

// ── 마이(My) ─────────────────────────────────────────────────
export function MyPage({ navigate }) {
  const { currentUser, logout } = useAuth()
  const { getPostsByAuthor } = useApp()
  const [tab, setTab] = useState('profile')
  const TABS = [
    { key: 'profile', label: '프로필' }, { key: 'posts', label: '작성글' },
    { key: 'saved', label: '저장글' }, { key: 'settings', label: '계정 설정' },
  ]
  if (!currentUser) return <LoginPrompt navigate={navigate} />
  const myPosts = getPostsByAuthor(currentUser.id)
  return (
    <div className="fade-up">
      <div style={{ padding: 'var(--sp-section) 0 var(--sp-xxl)', borderBottom: '1px solid var(--color-divider)', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--color-ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 600 }}>{(currentUser.nickname||"?")[0]}</div>
        <div>
          <h1 style={{ fontSize: 'var(--text-display-md)', fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.374px' }}>{currentUser.nickname}</h1>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-muted-48)', marginTop: '4px' }}>{currentUser.email}</p>
          <div style={{ display: 'flex', gap: '24px', marginTop: '12px' }}>
            {[{ label: '게시글', value: myPosts.length }, { label: '팔로워', value: currentUser.followers.length }, { label: '팔로잉', value: currentUser.following.length }].map(s => (
              <div key={s.label}><span style={{ fontSize: 'var(--text-tagline)', fontWeight: 600, color: 'var(--color-ink)' }}>{s.value}</span><span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)', marginLeft: '4px' }}>{s.label}</span></div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => navigate(`profile/${currentUser.id}`)} className="btn-secondary" style={{ height: '36px', padding: '0 20px', minWidth: 'unset', fontSize: 'var(--text-caption)' }}>프로필 보기</button>
      </div>
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'profile' && <div style={{ padding: '24px 0' }}>{currentUser.bio && <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-body)', marginBottom: '20px' }}>{currentUser.bio}</p>}{currentUser.expertise?.length > 0 && <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{currentUser.expertise.map(e => <span key={e} style={{ fontSize: 'var(--text-caption)', padding: '6px 16px', borderRadius: 'var(--r-pill)', border: '2px solid var(--color-primary)', color: 'var(--color-primary)', fontWeight: 600 }}>⚡ {e}</span>)}</div>}</div>}
      {tab === 'posts' && (myPosts.length > 0 ? <div>{myPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate}/>)}</div> : <div style={{ padding: '64px 0', textAlign: 'center' }}><p style={{ color: 'var(--color-muted-48)', marginBottom: '20px', fontSize: 'var(--text-body)' }}>작성한 글이 없습니다.</p><button onClick={() => navigate('write')} className="btn-primary">글 작성하기</button></div>)}
      {tab === 'saved' && <div style={{ padding: '64px 0', textAlign: 'center' }}><p style={{ fontSize: 'var(--text-body)', color: 'var(--color-muted-48)' }}>저장된 글이 없습니다.</p></div>}
      {tab === 'settings' && (
        <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
          {[{ label: '닉네임', value: currentUser.nickname }, { label: '이메일', value: currentUser.email }, { label: '가입일', value: currentUser.createdAt }].map(f => (
            <div key={f.label} style={{ borderBottom: '1px solid var(--color-divider)', paddingBottom: '16px' }}>
              <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)', marginBottom: '4px', fontWeight: 600 }}>{f.label}</p>
              <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-ink)' }}>{f.value}</p>
            </div>
          ))}
          <button onClick={() => logout()} className="btn-secondary" style={{ marginTop: '16px', alignSelf: 'flex-start' }}>로그아웃</button>
        </div>
      )}
    </div>
  )
}

// ── 공통 컴포넌트 ─────────────────────────────────────────────
function LoginPrompt({ navigate }) {
  return (
    <div style={{ padding: '80px 0', textAlign: 'center' }}>
      <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-muted-48)', marginBottom: '20px' }}>로그인이 필요합니다.</p>
      <button onClick={() => navigate?.('login')} className="btn-primary">로그인</button>
    </div>
  )
}
function Empty({ msg }) {
  return <div style={{ padding: '64px 0', textAlign: 'center' }}><p style={{ fontSize: 'var(--text-body)', color: 'var(--color-muted-48)' }}>{msg}</p></div>
}
