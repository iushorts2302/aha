/**
 * crawlStore.js
 * localStorage 기반 크롤링 데이터 스토어
 * 관리자가 생성한 AI 콘텐츠를 사용자 앱과 공유
 */

const STORE_KEY = 'aha_crawl_data'
const SCHEDULE_KEY = 'aha_crawl_schedule'

export const MENU_TOPICS = {
  'home.trending': { label: '오늘의 인기', category: 'home' },
  'home.rising': { label: '이번 주 급상승', category: 'home' },
  'home.ai_feed': { label: 'AI 추천 피드', category: 'home' },
  'dev.trending': { label: '개발 트렌딩', category: 'dev' },
  'dev.javascript': { label: 'JavaScript/NPM', category: 'dev' },
  'dev.python': { label: 'Python/PyPI', category: 'dev' },
  'dev.devops': { label: 'DevOps/인프라', category: 'dev' },
  'dev.tools': { label: '개발 도구', category: 'dev' },
  'ai.agents': { label: 'AI 에이전트', category: 'ai' },
  'ai.news': { label: 'AI 뉴스', category: 'ai' },
  'ai.tools': { label: 'AI 도구', category: 'ai' },
  'ai.trend': { label: 'AI 트렌드', category: 'ai' },
  'ai.research': { label: 'AI 논문/연구', category: 'ai' },
  'startup.new': { label: '신규 스타트업', category: 'startup' },
  'startup.funding': { label: '핀테크/투자', category: 'startup' },
  'startup.product': { label: '앱/서비스', category: 'startup' },
  'oss.trending': { label: 'OSS 트렌딩', category: 'oss' },
  'oss.awesome': { label: 'Awesome 목록', category: 'oss' },
  'oss.new': { label: '신규 패키지', category: 'oss' },
  'it.news': { label: 'IT 동향', category: 'it' },
  'it.security': { label: '보안/해킹', category: 'it' },
  'it.cloud': { label: '클라우드', category: 'it' },
  'it.mobile': { label: '모바일', category: 'it' },
  'design.ui': { label: 'UI 컴포넌트', category: 'design' },
  'design.ux': { label: 'UX/디자인 시스템', category: 'design' },
  'design.css': { label: 'CSS/스타일', category: 'design' },
  'game.news': { label: '게임 뉴스', category: 'game' },
  'game.indie': { label: '인디게임', category: 'game' },
  'game.review': { label: 'Unity/Unreal', category: 'game' },
  'finance.stock': { label: '주식/퀀트', category: 'finance' },
  'finance.crypto': { label: '블록체인/코인', category: 'finance' },
  'finance.invest': { label: '투자 분석', category: 'finance' },
  'market.deal': { label: '이커머스', category: 'market' },
  'market.used': { label: '중고마켓', category: 'market' },
  'job.dev': { label: '개발자 면접', category: 'job' },
  'job.startup': { label: '스타트업 취업', category: 'job' },
  'job.algorithm': { label: '알고리즘', category: 'job' },
  'learn.tutorial': { label: '튜토리얼', category: 'learn' },
  'learn.course': { label: '강의/커리큘럼', category: 'learn' },
  'learn.book': { label: '프로그래밍 책', category: 'learn' },
  'learn.korean': { label: '한국어 자료', category: 'learn' },
  'board.free': { label: '자유', category: 'board' },
  'board.it': { label: 'IT 토론', category: 'board' },
  'board.question': { label: 'Q&A', category: 'board' },
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
