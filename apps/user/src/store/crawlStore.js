/**
 * crawlStore.js
 * 크롤링 데이터 스토어
 * 우선순위: 관리자 서버(/api/data) → localStorage 폴백
 */

const STORE_KEY = 'aha_crawl_data'
const SCHEDULE_KEY = 'aha_crawl_schedule'

// 관리자 앱 API 엔드포인트 (환경에 따라 변경)
const ADMIN_API = 'https://admin-vert-psi.vercel.app'

export const MENU_TOPICS = {
  'home.trending':     { label: '오늘의 인기글',  category: 'home',      keywords: '오늘 인기 화제 트렌드' },
  'home.rising':       { label: '실시간 급상승',  category: 'home',      keywords: '실시간 급상승 이슈 속보' },
  'home.ai_feed':      { label: 'AI 추천 피드',   category: 'home',      keywords: 'AI 추천 알고리즘 개인화' },
  'home.shortform':    { label: '숏폼 콘텐츠',    category: 'home',      keywords: '숏폼 릴스 쇼츠 트렌드' },
  'trending.realtime': { label: '실시간 인기',    category: 'trending',  keywords: '실시간 인기 핫이슈 속보' },
  'trending.daily':    { label: '일간 베스트',    category: 'trending',  keywords: '오늘의 베스트 게시글 커뮤니티' },
  'trending.weekly':   { label: '주간 베스트',    category: 'trending',  keywords: '이번주 인기 주간 트렌드' },
  'trending.debate':   { label: '논쟁중',         category: 'trending',  keywords: '논쟁 토론 이슈 갑론을박' },
  'feed.latest':       { label: '최신글',         category: 'feed',      keywords: '최신 뉴스 정보 소식' },
  'feed.recommended':  { label: '추천글',         category: 'feed',      keywords: '추천 큐레이션 엄선 콘텐츠' },
  'board.free':        { label: '자유게시판',     category: 'board',     keywords: '자유 일상 잡담 유머' },
  'board.question':    { label: '질문게시판',     category: 'board',     keywords: '질문 답변 도움 궁금증' },
  'board.info':        { label: '정보게시판',     category: 'board',     keywords: '정보 지식 팁 노하우' },
  'board.humor':       { label: '유머게시판',     category: 'board',     keywords: '유머 웃긴 재미 밈' },
  'board.it':          { label: 'IT게시판',       category: 'board',     keywords: 'IT 기술 개발 스타트업 AI' },
  'board.game':        { label: '게임게시판',     category: 'board',     keywords: '게임 리뷰 공략 신작' },
  'board.sports':      { label: '스포츠게시판',   category: 'board',     keywords: '스포츠 축구 야구 농구' },
  'board.politics':    { label: '정치게시판',     category: 'board',     keywords: '정치 시사 사회 뉴스' },
  'gallery.image':     { label: '이미지',         category: 'gallery',   keywords: '이미지 사진 그림 일러스트' },
  'gallery.meme':      { label: '밈',             category: 'gallery',   keywords: '밈 짤 유머 인터넷밈' },
  'gallery.ai':        { label: 'AI 이미지',      category: 'gallery',   keywords: 'AI 생성 이미지 미드저니' },
  'community.dev':     { label: '개발',           category: 'community', keywords: '개발 프로그래밍 코딩 오픈소스' },
  'community.invest':  { label: '투자',           category: 'community', keywords: '투자 주식 코인 부동산 재테크' },
  'community.travel':  { label: '여행',           category: 'community', keywords: '여행 국내여행 해외여행 맛집' },
  'community.fashion': { label: '패션',           category: 'community', keywords: '패션 옷 코디 브랜드 쇼핑' },
  'community.fitness': { label: '운동',           category: 'community', keywords: '운동 헬스 러닝 다이어트' },
  'knowledge.news':    { label: '뉴스',           category: 'knowledge', keywords: '국내외 뉴스 시사 정치 경제' },
  'knowledge.tips':    { label: '팁',             category: 'knowledge', keywords: '생활 팁 노하우 꿀팁' },
  'knowledge.review':  { label: '리뷰',           category: 'knowledge', keywords: '제품 리뷰 서비스 평가 추천' },
  'knowledge.tutorial':{ label: '튜토리얼',       category: 'knowledge', keywords: '튜토리얼 강좌 방법 가이드' },
  'market.deal':       { label: '핫딜',           category: 'market',    keywords: '핫딜 할인 특가 이벤트' },
  'market.coupon':     { label: '쿠폰',           category: 'market',    keywords: '쿠폰 할인코드 프로모션' },
  'aihub.trend':       { label: 'AI 트렌드',      category: 'aihub',     keywords: 'AI 인공지능 GPT LLM 트렌드' },
  'aihub.summary':     { label: 'AI 요약',        category: 'aihub',     keywords: 'AI 요약 뉴스 주요이슈 브리핑' },
}

// ── localStorage 폴백 ────────────────────────────────────

function readLocalStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') } catch { return {} }
}
function writeLocalStore(data) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)) } catch {}
}

export function addItems(topicKey, newItems) {
  const store = readLocalStore()
  const existing = store[topicKey] || []
  const merged = [...newItems, ...existing]
    .filter((item, i, arr) => arr.findIndex(x => x.id === item.id) === i)
    .slice(0, 100)
  store[topicKey] = merged
  writeLocalStore(store)
}

export function getLastCrawled(topicKey) {
  try { return JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '{}')[topicKey] || null } catch { return null }
}
export function updateSchedule(topicKey, ts) {
  try {
    const s = JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '{}')
    s[topicKey] = ts
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(s))
  } catch {}
}
export function readSchedule() {
  try { return JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '{}') } catch { return {} }
}
export function clearStore() {
  localStorage.removeItem(STORE_KEY)
  localStorage.removeItem(SCHEDULE_KEY)
}
export function getStoreStats() {
  const store = readLocalStore()
  const schedule = readSchedule()
  const total = Object.values(store).reduce((s, a) => s + a.length, 0)
  const topics = Object.keys(store).length
  const lastUpdate = Object.values(schedule).sort().reverse()[0] || null
  return { total, topics, lastUpdate }
}

// ── 서버 API 폴링 (우선순위 1) ───────────────────────────

/**
 * 관리자 서버 /api/data에서 최신 크롤링 데이터 가져오기
 * 실패 시 localStorage 폴백
 */
export async function fetchFromServer(topicKey, limit = 20) {
  try {
    const res = await fetch(`${ADMIN_API}/api/data?topic=${topicKey}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    const items = (data.items || []).slice(0, limit)
    if (items.length > 0) {
      // 서버 데이터 → localStorage에도 동기화
      addItems(topicKey, items)
      updateSchedule(topicKey, new Date().toISOString())
    }
    return items
  } catch {
    // 서버 오류 → localStorage 폴백
    return getItems(topicKey, limit)
  }
}

/** localStorage에서 읽기 (폴백) */
export function getItems(topicKey, limit = 20) {
  const store = readLocalStore()
  return (store[topicKey] || []).slice(0, limit)
}
