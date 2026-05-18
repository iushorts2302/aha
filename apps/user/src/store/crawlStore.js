/**
 * crawlStore.js — 크롤링 데이터 스토어
 * localStorage 제거 → DB API(/api/v1?resource=crawl_items) 직접 조회
 * 폴링 캐시는 메모리(Map)만 사용
 */

const ADMIN_API = 'https://admin-vert-psi.vercel.app'

// 메모리 캐시 (새로고침 시 초기화 — localStorage 사용 안 함)
const _cache = new Map()  // topicKey → { items, fetchedAt }

// ── 전체 메뉴 토픽 정의 ──────────────────────────────────
export const MENU_TOPICS = {
  'home.trending':      { label: '오늘의 인기글',  category: 'home' },
  'home.rising':        { label: '실시간 급상승',  category: 'home' },
  'home.ai_feed':       { label: 'AI 추천 피드',   category: 'home' },
  'home.shortform':     { label: '숏폼 콘텐츠',    category: 'home' },
  'home.following':     { label: '팔로잉',         category: 'home' },
  'trending.realtime':  { label: '실시간 인기',    category: 'trending' },
  'trending.daily':     { label: '일간 베스트',    category: 'trending' },
  'trending.weekly':    { label: '주간 베스트',    category: 'trending' },
  'trending.debate':    { label: '논쟁중',         category: 'trending' },
  'ai.news':            { label: 'AI 뉴스',        category: 'ai' },
  'ai.tools':           { label: 'AI 도구',        category: 'ai' },
  'ai.trend':           { label: 'AI 트렌드',      category: 'ai' },
  'ai.summary':         { label: 'AI 요약',        category: 'ai' },
  'ai.research':        { label: 'AI 리서치',      category: 'ai' },
  'startup.new':        { label: '신규 스타트업',  category: 'startup' },
  'startup.funding':    { label: '투자/펀딩',      category: 'startup' },
  'startup.product':    { label: '신제품',         category: 'startup' },
  'dev.trending':       { label: '개발 트렌딩',    category: 'dev' },
  'dev.opensource':     { label: '오픈소스',       category: 'dev' },
  'dev.javascript':     { label: 'JavaScript',     category: 'dev' },
  'dev.python':         { label: 'Python',         category: 'dev' },
  'dev.devops':         { label: 'DevOps',         category: 'dev' },
  'dev.tools':          { label: '개발 도구',      category: 'dev' },
  'oss.trending':       { label: 'OSS 트렌딩',     category: 'oss' },
  'oss.awesome':        { label: 'Awesome 리스트', category: 'oss' },
  'oss.new':            { label: '신규 OSS',       category: 'oss' },
  'design.ui':          { label: 'UI 컴포넌트',    category: 'design' },
  'design.ux':          { label: 'UX 디자인',      category: 'design' },
  'design.tools':       { label: '디자인 도구',    category: 'design' },
  'design.css':         { label: 'CSS/스타일',     category: 'design' },
  'it.news':            { label: 'IT 뉴스',        category: 'it' },
  'it.security':        { label: '보안',           category: 'it' },
  'it.cloud':           { label: '클라우드',       category: 'it' },
  'it.mobile':          { label: '모바일',         category: 'it' },
  'board.free':         { label: '자유게시판',     category: 'board' },
  'board.question':     { label: '질문게시판',     category: 'board' },
  'board.info':         { label: '정보게시판',     category: 'board' },
  'board.humor':        { label: '유머게시판',     category: 'board' },
  'board.it':           { label: 'IT게시판',       category: 'board' },
  'board.game':         { label: '게임게시판',     category: 'board' },
  'board.sports':       { label: '스포츠게시판',   category: 'board' },
  'board.politics':     { label: '정치게시판',     category: 'board' },
  'board.anon':         { label: '익명게시판',     category: 'board' },
  'game.news':          { label: '게임 뉴스',      category: 'game' },
  'game.indie':         { label: '인디게임',       category: 'game' },
  'game.review':        { label: '게임 리뷰',      category: 'game' },
  'finance.stock':      { label: '주식',           category: 'finance' },
  'finance.crypto':     { label: '코인',           category: 'finance' },
  'finance.invest':     { label: '투자',           category: 'finance' },
  'market.deal':        { label: '핫딜',           category: 'market' },
  'market.coupon':      { label: '쿠폰/할인',      category: 'market' },
  'market.used':        { label: '중고거래',       category: 'market' },
  'job.dev':            { label: '개발 채용',      category: 'job' },
  'job.startup':        { label: '스타트업 채용',  category: 'job' },
  'job.remote':         { label: '원격 근무',      category: 'job' },
  'learn.tutorial':     { label: '튜토리얼',       category: 'learn' },
  'learn.course':       { label: '강의/코스',      category: 'learn' },
  'learn.book':         { label: '도서',           category: 'learn' },
  'research.ai':        { label: 'AI 논문',        category: 'research' },
  'research.paper':     { label: '최신 논문',      category: 'research' },
  'research.data':      { label: '데이터 사이언스',category: 'research' },
  'video.trending':     { label: '인기 영상',      category: 'video' },
  'video.shorts':       { label: '숏폼',           category: 'video' },
  'humor.meme':         { label: '밈',             category: 'humor' },
  'humor.funny':        { label: '유머',           category: 'humor' },
  'image.trending':     { label: '인기 이미지',    category: 'image' },
  'image.ai':           { label: 'AI 이미지',      category: 'image' },
  'image.design':       { label: '디자인 에셋',    category: 'image' },
  'aihub.trend':        { label: 'AI 트렌드',      category: 'aihub' },
  'aihub.summary':      { label: 'AI 요약',        category: 'aihub' },
  'community.dev':      { label: '개발 커뮤니티',  category: 'community' },
  'community.invest':   { label: '투자 커뮤니티',  category: 'community' },
  'knowledge.news':     { label: '지식 뉴스',      category: 'knowledge' },
  'knowledge.tips':     { label: '팁 & 트릭',      category: 'knowledge' },
}

// ── DB API에서 크롤링 아이템 조회 ────────────────────────
async function fetchFromDB(topicKey) {
  const cached = _cache.get(topicKey)
  if (cached && Date.now() - cached.fetchedAt < 30000) return cached.items

  try {
    const r = await fetch(
      `${ADMIN_API}/api/data?topic=${encodeURIComponent(topicKey)}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!r.ok) return []
    const data = await r.json()
    const items = (data.items || []).filter(i => i.blocked_yn !== 'Y')
    _cache.set(topicKey, { items, fetchedAt: Date.now() })
    return items
  } catch {
    return []
  }
}

// ── 공개 API ────────────────────────────────────────────
export async function getItems(topicKey, limit = 10) {
  const items = await fetchFromDB(topicKey)
  return items.slice(0, limit)
}

export function getItemsSync(topicKey) {
  return _cache.get(topicKey)?.items || []
}

// 하위 호환 (CrawlComponents 등에서 사용)
export function readStore() {
  const result = {}
  for (const [key, val] of _cache.entries()) {
    result[key] = val.items
  }
  return result
}

export function getLastCrawled(topicKey) {
  const items = _cache.get(topicKey)?.items || []
  if (!items.length) return null
  const dates = items.map(i => i.crawled_at || i.crawledAt).filter(Boolean)
  return dates.length ? dates.sort().reverse()[0] : null
}

export function getStoreStats() {
  let total = 0
  for (const val of _cache.values()) total += (val.items || []).length
  return { total, topics: _cache.size, lastUpdate: Date.now() }
}

// localStorage 완전 제거 — 기존 데이터 정리
export function clearStore() {
  _cache.clear()
  // 기존 localStorage 키 제거
  try {
    localStorage.removeItem('aha_crawl_data_v2')
    localStorage.removeItem('aha_crawl_schedule_v2')
    localStorage.removeItem('aha_crawl_detail')
  } catch {}
}

export function addItems() {}        // noop (DB 저장은 서버에서)
export function updateSchedule() {}  // noop
export function readSchedule() { return {} }

// 앱 시작 시 기존 localStorage 자동 정리
clearStore()
