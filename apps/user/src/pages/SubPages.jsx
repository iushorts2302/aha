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
  const { getPostsByAuthor, comments } = useApp()
  const [tab, setTab] = useState('all')
  if (!currentUser) return <LoginPrompt navigate={navigate} />

  // 활동 피드 — 내 글에 달린 댓글 + 좋아요 + 시스템 알림 통합
  const myPosts = getPostsByAuthor(currentUser.id) || []
  const myPostIds = new Set(myPosts.map(p => String(p.id)))

  // 내 글에 달린 댓글 (자신 제외)
  const commentsOnMyPosts = (comments || [])
    .filter(c => myPostIds.has(String(c.postId)) && String(c.authorId) !== String(currentUser.id))
    .map(c => ({
      id: `cmt-${c.id}`,
      type: 'comment',
      timestamp: c.createdAt,
      icon: '💬',
      iconBg: '#e0f2fe',
      title: `${c.authorNickname || '누군가'}님이 회원님의 글에 댓글을 남겼어요`,
      detail: c.content.slice(0, 80),
      onClick: () => navigate(`post/${c.postId}`),
    }))

  // 내 글에 좋아요 (현재 데이터에 likes 배열 있을 경우)
  const likesOnMyPosts = myPosts
    .filter(p => (p.likes || []).length > 0)
    .map(p => ({
      id: `like-${p.id}`,
      type: 'like',
      timestamp: p.createdAt,
      icon: '❤️',
      iconBg: '#fee2e2',
      title: `회원님의 글에 ${(p.likes || []).length}명이 좋아요를 눌렀어요`,
      detail: p.title,
      onClick: () => navigate(`post/${p.id}`),
    }))

  // 시스템 알림 (예시)
  const systemNotifs = [
    {
      id: 'sys-welcome',
      type: 'system',
      timestamp: currentUser.createdAt || new Date().toISOString(),
      icon: '👋',
      iconBg: '#fef3c7',
      title: `${currentUser.nickname}님, aha!에 오신 것을 환영합니다`,
      detail: '관심 카테고리를 골라 맞춤 추천을 받아보세요',
      onClick: () => navigate('my'),
    },
  ]

  const allNotifs = [...commentsOnMyPosts, ...likesOnMyPosts, ...systemNotifs]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  const filtered = tab === 'all' ? allNotifs
    : tab === 'comment' ? commentsOnMyPosts
    : tab === 'like'    ? likesOnMyPosts
    : systemNotifs

  const TABS = [
    { key: 'all',     label: `전체 (${allNotifs.length})` },
    { key: 'comment', label: `댓글 (${commentsOnMyPosts.length})` },
    { key: 'like',    label: `좋아요 (${likesOnMyPosts.length})` },
    { key: 'system',  label: `시스템 (${systemNotifs.length})` },
  ]

  return (
    <div className="fade-up">
      <PageHeader title="알림" subtitle={`나의 활동과 시스템 알림 ${allNotifs.length}건`} />
      <TabNav tabs={TABS} active={tab} onChange={setTab} />
      {filtered.length === 0 ? (
        <div style={{ padding: '64px 0', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--color-muted)', margin: 0 }}>
            새로운 알림이 없어요
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 6, opacity: 0.7 }}>
            글을 작성하거나 다른 사용자와 소통해보세요
          </p>
        </div>
      ) : (
        <div className="aha-stagger" style={{ marginTop: 12 }}>
          {filtered.map(n => (
            <div
              key={n.id}
              onClick={n.onClick}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); n.onClick?.() } }}
              style={{
                display: 'flex', gap: 12, padding: '14px 16px',
                background: '#fff',
                border: '1px solid var(--color-divider)',
                borderRadius: 10, marginBottom: 8,
                cursor: n.onClick ? 'pointer' : 'default',
              }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: n.iconBg, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>{n.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
                  {n.title}
                </p>
                {n.detail && (
                  <p style={{
                    fontSize: 12, color: 'var(--color-muted)',
                    margin: '4px 0 0', lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>{n.detail}</p>
                )}
                <p style={{ fontSize: 11, color: 'var(--color-muted)', margin: '4px 0 0', opacity: 0.7 }}>
                  {timeAgo(n.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* 시간 표시 헬퍼 */
function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}일 전`
  return new Date(iso).toLocaleDateString('ko-KR')
}

// ── 마이(My) — 활동 대시보드 (Phase 3) ───────────────────────
export function MyPage({ navigate }) {
  const { currentUser, logout } = useAuth()
  const { getPostsByAuthor, comments } = useApp()
  if (!currentUser) return <LoginPrompt navigate={navigate} />

  const myPosts    = getPostsByAuthor(currentUser.id) || []
  const myComments = (comments || []).filter(cmt => String(cmt.authorId) === String(currentUser.id))
  const initial    = (currentUser.nickname || '?')[0].toUpperCase()
  const followCount = (currentUser.following || []).length
  const followerCount = (currentUser.followers || []).length

  // 즐겨찾기 미리보기 — 게시글 + 외부 콘텐츠 합산
  const bookmarksRaw = currentUser.bookmarksRaw || []
  const crawlBookmarks = bookmarksRaw.filter(b => b.target_type === 'crawl_item')
  const postBookmarkCount = bookmarksRaw.filter(b => b.target_type === 'post').length
  const totalBookmarks = bookmarksRaw.length

  // 맞춤 추천 카테고리 — preferences.favorite_categories 기반
  const prefs = currentUser.preferences || {}
  const favCats = prefs.favorite_categories
    ? prefs.favorite_categories.split(',').map(s => s.trim()).filter(Boolean)
    : []
  // 추천이 없으면 인기 카테고리 기본값
  const recommendedTopics = favCats.length > 0
    ? favCats.slice(0, 3).map(cat => ({ topic: `${cat}.trending` || `${cat}.new`, label: cat.toUpperCase() }))
    : [
        { topic: 'ai.agents',     label: 'AI 에이전트' },
        { topic: 'dev.trending',  label: 'GitHub 트렌딩' },
        { topic: 'home.trending', label: '실시간 인기' },
      ]

  return (
    <div className="fade-up">
      {/* ── 프로필 카드 ── */}
      <div style={{
        padding: '28px 24px', marginBottom: 24,
        background: 'linear-gradient(135deg, #f8f9ff 0%, #fff5f5 100%)',
        border: '1px solid rgba(0,102,204,0.10)',
        borderRadius: 16,
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--color-primary)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 700, flexShrink: 0,
        }}>{initial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontSize: 24, fontWeight: 700, margin: 0,
            color: 'var(--color-ink)', letterSpacing: '-0.02em',
          }}>{currentUser.nickname}</h1>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: '4px 0 12px' }}>{currentUser.email}</p>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              { label: '게시글', value: myPosts.length },
              { label: '댓글',   value: myComments.length },
              { label: '즐겨찾기', value: totalBookmarks },
              { label: '팔로잉', value: followCount },
            ].map(s => (
              <div key={s.label}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-ink)' }}>{s.value}</span>
                <span style={{ fontSize: 11, color: 'var(--color-muted)', marginLeft: 4 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => navigate(`profile/${currentUser.id}`)}
          className="btn-secondary-aha"
          style={{ height: 36, fontSize: 12 }}>
          공개 프로필 보기
        </button>
      </div>

      {/* ── 섹션 1: 즐겨찾기 미리보기 ── */}
      <DashSection
        title="⭐ 내 즐겨찾기"
        count={totalBookmarks}
        action={totalBookmarks > 0 ? { label: '전체 보기 →', onClick: () => navigate('bookmarks') } : null}>
        {totalBookmarks === 0 ? (
          <EmptyHint
            text="아직 저장한 콘텐츠가 없어요"
            sub="카드의 ★ 버튼을 눌러 보관해보세요"
          />
        ) : (
          <>
            {postBookmarkCount > 0 && (
              <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: '0 0 8px' }}>
                📝 게시글 {postBookmarkCount}개 저장됨
              </p>
            )}
            {crawlBookmarks.slice(0, 4).map(b => (
              <a
                key={b.target_key}
                href={b.target_key.startsWith('http') ? b.target_key : `https://${b.target_key}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'block', padding: '10px 12px',
                  borderRadius: 8, marginBottom: 6,
                  background: 'var(--color-parchment, #f5f5f7)',
                  textDecoration: 'none', color: 'var(--color-ink)',
                  fontSize: 13, lineHeight: 1.4,
                  border: '1px solid transparent',
                  transition: 'border-color 0.15s ease, background 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,102,204,0.15)'; e.currentTarget.style.background = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'var(--color-parchment, #f5f5f7)' }}>
                <span style={{ color: 'var(--color-primary)', marginRight: 6 }}>★</span>
                {b.target_title || b.target_key}
              </a>
            ))}
          </>
        )}
      </DashSection>

      {/* ── 섹션 2: 내가 쓴 글 ── */}
      <DashSection
        title="📝 내가 쓴 글"
        count={myPosts.length}
        action={{ label: '+ 새 글', onClick: () => navigate('write') }}>
        {myPosts.length === 0 ? (
          <EmptyHint
            text="아직 작성한 글이 없어요"
            sub="첫 글을 작성해보세요"
          />
        ) : (
          myPosts.slice(0, 4).map(p => <PostCard key={p.id} post={p} navigate={navigate} />)
        )}
      </DashSection>

      {/* ── 섹션 3: 내 댓글 ── */}
      {myComments.length > 0 && (
        <DashSection title="💬 내가 쓴 댓글" count={myComments.length}>
          {myComments.slice(0, 4).map(cmt => (
            <div
              key={cmt.id}
              onClick={() => navigate(`post/${cmt.postId}`)}
              style={{
                padding: '10px 12px', borderRadius: 8, marginBottom: 6,
                background: 'var(--color-parchment, #f5f5f7)',
                cursor: 'pointer', fontSize: 13, lineHeight: 1.5,
              }}>
              <p style={{ margin: 0, color: 'var(--color-ink)' }}>{cmt.content}</p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--color-muted)' }}>
                ↗ 게시글로 이동
              </p>
            </div>
          ))}
        </DashSection>
      )}

      {/* ── 섹션 4: 맞춤 추천 ── */}
      <DashSection title="🎯 맞춤 추천">
        <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: '0 0 12px' }}>
          관심사 기반 추천 콘텐츠
        </p>
        {recommendedTopics.map(rec => (
          <div key={rec.topic} style={{ marginBottom: 16 }}>
            <CrawlFeed topicKey={rec.topic} title={`▸ ${rec.label}`} limit={3} navigate={navigate} />
          </div>
        ))}
      </DashSection>

      {/* ── 로그아웃 ── */}
      <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--color-divider)' }}>
        <button onClick={() => logout()} className="btn-secondary-aha" style={{ fontSize: 13 }}>
          로그아웃
        </button>
      </div>
    </div>
  )
}

/* ── 대시보드 섹션 셸 ── */
function DashSection({ title, count, action, children }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 12, paddingBottom: 8,
        borderBottom: '1px solid var(--color-divider)',
      }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--color-ink)' }}>
          {title}
          {typeof count === 'number' && count > 0 && (
            <span style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 500, marginLeft: 8 }}>
              {count}
            </span>
          )}
        </h2>
        {action && (
          <button
            onClick={action.onClick}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 12, color: 'var(--color-primary)', padding: 0,
            }}>{action.label}</button>
        )}
      </div>
      <div>{children}</div>
    </section>
  )
}

function EmptyHint({ text, sub }) {
  return (
    <div style={{ padding: '24px 16px', textAlign: 'center' }}>
      <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>{text}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--color-muted)', margin: '4px 0 0', opacity: 0.7 }}>{sub}</p>}
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
