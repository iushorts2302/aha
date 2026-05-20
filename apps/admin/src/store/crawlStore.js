/**
 * crawlStore.js
 * localStorage 기반 크롤링 데이터 스토어
 * 관리자가 생성한 AI 콘텐츠를 사용자 앱과 공유
 */

const STORE_KEY = 'aha_crawl_data'
const SCHEDULE_KEY = 'aha_crawl_schedule'

export const MENU_TOPICS = {
  'ai.news': { label: 'AI 뉴스', category: 'ai' },
  'ai.research': { label: 'AI 리서치', category: 'ai' },
  'ai.summary': { label: 'AI 요약', category: 'ai' },
  'ai.tools': { label: 'AI 도구', category: 'ai' },
  'ai.trend': { label: 'AI 트렌드', category: 'ai' },
  'aihub.summary': { label: 'AI 요약', category: 'aihub' },
  'aihub.trend': { label: 'AI 트렌드', category: 'aihub' },
  'board.anon': { label: '익명게시판', category: 'board' },
  'board.free': { label: '자유게시판', category: 'board' },
  'board.game': { label: '게임게시판', category: 'board' },
  'board.humor': { label: '유머게시판', category: 'board' },
  'board.info': { label: '정보게시판', category: 'board' },
  'board.it': { label: 'IT게시판', category: 'board' },
  'board.politics': { label: '정치게시판', category: 'board' },
  'board.question': { label: '질문게시판', category: 'board' },
  'board.sports': { label: '스포츠게시판', category: 'board' },
  'community.dev': { label: 'Dev', category: 'community' },
  'community.fashion': { label: 'Fashion', category: 'community' },
  'community.fitness': { label: 'Fitness', category: 'community' },
  'community.invest': { label: 'Invest', category: 'community' },
  'community.travel': { label: 'Travel', category: 'community' },
  'design.css': { label: 'CSS/스타일', category: 'design' },
  'design.tools': { label: '디자인 도구', category: 'design' },
  'design.ui': { label: 'UI 컴포넌트', category: 'design' },
  'design.ux': { label: 'UX 디자인', category: 'design' },
  'dev.devops': { label: 'DevOps', category: 'dev' },
  'dev.javascript': { label: 'JavaScript', category: 'dev' },
  'dev.opensource': { label: '오픈소스', category: 'dev' },
  'dev.python': { label: 'Python', category: 'dev' },
  'dev.tools': { label: '개발 도구', category: 'dev' },
  'dev.trending': { label: '개발 트렌딩', category: 'dev' },
  'feed.latest': { label: 'Latest', category: 'feed' },
  'feed.recommended': { label: 'Recommended', category: 'feed' },
  'finance.crypto': { label: '코인', category: 'finance' },
  'finance.invest': { label: '투자', category: 'finance' },
  'finance.stock': { label: '주식', category: 'finance' },
  'gallery.ai': { label: 'Ai', category: 'gallery' },
  'gallery.image': { label: 'Image', category: 'gallery' },
  'gallery.meme': { label: 'Meme', category: 'gallery' },
  'game.indie': { label: '인디게임', category: 'game' },
  'game.news': { label: '게임 뉴스', category: 'game' },
  'game.review': { label: '게임 리뷰', category: 'game' },
  'home.ai_feed': { label: 'AI 추천 피드', category: 'home' },
  'home.following': { label: 'Following', category: 'home' },
  'home.rising': { label: '실시간 급상승', category: 'home' },
  'home.shortform': { label: '숏폼 콘텐츠', category: 'home' },
  'home.trending': { label: '오늘의 인기글', category: 'home' },
  'humor.funny': { label: '유머', category: 'humor' },
  'humor.meme': { label: '밈', category: 'humor' },
  'image.ai': { label: 'AI 이미지', category: 'image' },
  'image.design': { label: '디자인 에셋', category: 'image' },
  'image.trending': { label: '인기 이미지', category: 'image' },
  'it.cloud': { label: '클라우드', category: 'it' },
  'it.mobile': { label: '모바일', category: 'it' },
  'it.news': { label: 'IT 뉴스', category: 'it' },
  'it.security': { label: '보안', category: 'it' },
  'job.dev': { label: '개발 채용', category: 'job' },
  'job.remote': { label: '원격 근무', category: 'job' },
  'job.startup': { label: '스타트업 채용', category: 'job' },
  'knowledge.news': { label: 'News', category: 'knowledge' },
  'knowledge.review': { label: 'Review', category: 'knowledge' },
  'knowledge.tips': { label: 'Tips', category: 'knowledge' },
  'knowledge.tutorial': { label: 'Tutorial', category: 'knowledge' },
  'learn.book': { label: '도서', category: 'learn' },
  'learn.course': { label: '강의/코스', category: 'learn' },
  'learn.tutorial': { label: '튜토리얼', category: 'learn' },
  'market.coupon': { label: '쿠폰/할인', category: 'market' },
  'market.deal': { label: '핫딜', category: 'market' },
  'market.used': { label: '중고거래', category: 'market' },
  'oss.awesome': { label: 'Awesome 리스트', category: 'oss' },
  'oss.new': { label: '신규 OSS', category: 'oss' },
  'oss.trending': { label: 'OSS 트렌딩', category: 'oss' },
  'research.ai': { label: 'AI 논문', category: 'research' },
  'research.data': { label: '데이터 사이언스', category: 'research' },
  'research.paper': { label: '최신 논문', category: 'research' },
  'startup.funding': { label: '투자/펀딩', category: 'startup' },
  'startup.new': { label: '신규 스타트업', category: 'startup' },
  'startup.product': { label: '신제품', category: 'startup' },
  'trending.daily': { label: '일간 베스트', category: 'trending' },
  'trending.debate': { label: '논쟁중', category: 'trending' },
  'trending.realtime': { label: '실시간 인기', category: 'trending' },
  'trending.weekly': { label: '주간 베스트', category: 'trending' },
  'video.shorts': { label: '숏폼', category: 'video' },
  'video.trending': { label: '인기 영상', category: 'video' },
}

/** 스토어에서 전체 데이터 읽기 */
export function readStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

/** 특정 토픽의 아이템 목록 반환 */
export function getItems(topicKey, limit = 20) {
  const store = readStore()
  const items = store[topicKey] || []
  return items.slice(0, limit)
}

/** 토픽에 아이템 추가 (최대 100개 유지) */
export function addItems(topicKey, newItems) {
  const store = readStore()
  const existing = store[topicKey] || []
  const merged = [...newItems, ...existing]
    .filter((item, i, arr) => arr.findIndex(x => x.id === item.id) === i)
    .slice(0, 100)
  store[topicKey] = merged
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

/** 스케줄 정보 읽기 */
export function readSchedule() {
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

/** 스케줄 업데이트 */
export function updateSchedule(topicKey, timestamp) {
  const schedule = readSchedule()
  schedule[topicKey] = timestamp
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule))
}

/** 마지막 크롤링 시각 반환 */
export function getLastCrawled(topicKey) {
  return readSchedule()[topicKey] || null
}

/** 전체 스토어 초기화 */
export function clearStore() {
  localStorage.removeItem(STORE_KEY)
  localStorage.removeItem(SCHEDULE_KEY)
}

/** 스토어 통계 */
export function getStoreStats() {
  const store = readStore()
  const schedule = readSchedule()
  const total = Object.values(store).reduce((sum, arr) => sum + arr.length, 0)
  const topics = Object.keys(store).length
  const lastUpdate = Object.values(schedule).sort().reverse()[0] || null
  return { total, topics, lastUpdate }
}
