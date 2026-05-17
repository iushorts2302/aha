/**
 * crawlStore.js — 크롤링 데이터 스토어
 * 서버 API 폴링 우선, localStorage 폴백
 */

const STORE_KEY    = 'aha_crawl_data_v2'
const SCHEDULE_KEY = 'aha_crawl_schedule_v2'
const ADMIN_API    = 'https://admin-vert-psi.vercel.app'

// ── 전체 메뉴 토픽 정의 ──────────────────────────────────
export const MENU_TOPICS = {
  // 홈
  'home.trending':     { label: '오늘의 인기글',  category: 'home' },
  'home.rising':       { label: '실시간 급상승',  category: 'home' },
  'home.ai_feed':      { label: 'AI 추천 피드',   category: 'home' },
  'home.shortform':    { label: '숏폼 콘텐츠',    category: 'home' },

  // AI 뉴스
  'ai.news':           { label: 'AI 뉴스',        category: 'ai' },
  'ai.tools':          { label: 'AI 도구',        category: 'ai' },
  'ai.trend':          { label: 'AI 트렌드',      category: 'ai' },
  'ai.summary':        { label: 'AI 요약',        category: 'ai' },
  'ai.research':       { label: 'AI 리서치',      category: 'ai' },

  // 스타트업
  'startup.new':       { label: '신규 스타트업',  category: 'startup' },
  'startup.funding':   { label: '투자/펀딩',      category: 'startup' },
  'startup.product':   { label: '신제품',         category: 'startup' },

  // 개발
  'dev.trending':      { label: '개발 트렌딩',    category: 'dev' },
  'dev.opensource':    { label: '오픈소스',       category: 'dev' },
  'dev.javascript':    { label: 'JavaScript',     category: 'dev' },
  'dev.python':        { label: 'Python',         category: 'dev' },
  'dev.devops':        { label: 'DevOps',         category: 'dev' },
  'dev.tools':         { label: '개발 도구',      category: 'dev' },

  // 오픈소스
  'oss.trending':      { label: 'OSS 트렌딩',     category: 'oss' },
  'oss.awesome':       { label: 'Awesome 리스트', category: 'oss' },
  'oss.new':           { label: '신규 OSS',       category: 'oss' },

  // 디자인
  'design.ui':         { label: 'UI 컴포넌트',   category: 'design' },
  'design.ux':         { label: 'UX 디자인',     category: 'design' },
  'design.tools':      { label: '디자인 도구',   category: 'design' },
  'design.css':        { label: 'CSS/스타일',    category: 'design' },

  // IT 뉴스
  'it.news':           { label: 'IT 뉴스',        category: 'it' },
  'it.security':       { label: '보안',           category: 'it' },
  'it.cloud':          { label: '클라우드',       category: 'it' },
  'it.mobile':         { label: '모바일',         category: 'it' },

  // 게시판
  'board.free':        { label: '자유게시판',     category: 'board' },
  'board.question':    { label: '질문게시판',     category: 'board' },
  'board.info':        { label: '정보게시판',     category: 'board' },
  'board.humor':       { label: '유머게시판',     category: 'board' },
  'board.it':          { label: 'IT게시판',       category: 'board' },
  'board.game':        { label: '게임게시판',     category: 'board' },
  'board.sports':      { label: '스포츠게시판',   category: 'board' },
  'board.politics':    { label: '정치게시판',     category: 'board' },
  'board.anon':        { label: '익명게시판',     category: 'board' },

  // 유머/밈
  'humor.meme':        { label: '밈',             category: 'humor' },
  'humor.funny':       { label: '유머',           category: 'humor' },

  // 게임
  'game.news':         { label: '게임 뉴스',      category: 'game' },
  'game.indie':        { label: '인디게임',       category: 'game' },
  'game.review':       { label: '게임 리뷰',      category: 'game' },

  // 주식/코인
  'finance.stock':     { label: '주식',           category: 'finance' },
  'finance.crypto':    { label: '코인',           category: 'finance' },
  'finance.invest':    { label: '투자',           category: 'finance' },

  // 쇼핑/핫딜
  'market.deal':       { label: '핫딜',           category: 'market' },
  'market.coupon':     { label: '쿠폰/할인',      category: 'market' },
  'market.used':       { label: '중고거래',       category: 'market' },

  // 취업
  'job.dev':           { label: '개발 채용',      category: 'job' },
  'job.startup':       { label: '스타트업 채용',  category: 'job' },
  'job.remote':        { label: '원격 근무',      category: 'job' },

  // 학습/강의
  'learn.tutorial':    { label: '튜토리얼',       category: 'learn' },
  'learn.course':      { label: '강의/코스',      category: 'learn' },
  'learn.book':        { label: '도서',           category: 'learn' },

  // 논문/리서치
  'research.ai':       { label: 'AI 논문',        category: 'research' },
  'research.paper':    { label: '최신 논문',      category: 'research' },
  'research.data':     { label: '데이터 사이언스',category: 'research' },

  // 영상
  'video.trending':    { label: '인기 영상',      category: 'video' },
  'video.shorts':      { label: '숏폼',           category: 'video' },

  // 이미지
  'image.trending':    { label: '인기 이미지',    category: 'image' },
  'image.ai':          { label: 'AI 이미지',      category: 'image' },
  'image.design':      { label: '디자인 에셋',    category: 'image' },

  // 기존 호환
  'aihub.trend':       { label: 'AI 트렌드',      category: 'aihub' },
  'aihub.summary':     { label: 'AI 요약',        category: 'aihub' },
  'trending.realtime': { label: '실시간 인기',    category: 'trending' },
  'trending.daily':    { label: '일간 베스트',    category: 'trending' },
  'trending.weekly':   { label: '주간 베스트',    category: 'trending' },
}

// ── localStorage ─────────────────────────────────────────

function readStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') } catch { return {} }
}
function writeStore(data) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)) } catch {}
}

export function addItems(topicKey, newItems) {
  const store = readStore()
  const merged = [...newItems, ...(store[topicKey] || [])]
    .filter((item, i, arr) => arr.findIndex(x => x.id === item.id) === i)
    .slice(0, 100)
  store[topicKey] = merged
  writeStore(store)
}

export function getItems(topicKey, limit = 20) {
  return (readStore()[topicKey] || []).slice(0, limit)
}

export function readSchedule() {
  try { return JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '{}') } catch { return {} }
}
export function updateSchedule(topicKey, ts) {
  try {
    const s = readSchedule()
    s[topicKey] = ts
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(s))
  } catch {}
}
export function getLastCrawled(topicKey) {
  return readSchedule()[topicKey] || null
}
export function clearStore() {
  localStorage.removeItem(STORE_KEY)
  localStorage.removeItem(SCHEDULE_KEY)
}
export function getStoreStats() {
  const store = readStore()
  const schedule = readSchedule()
  return {
    total:      Object.values(store).reduce((s, a) => s + a.length, 0),
    topics:     Object.keys(store).length,
    lastUpdate: Object.values(schedule).sort().reverse()[0] || null,
  }
}

// ── 서버 API 폴링 ─────────────────────────────────────────

export async function fetchFromServer(topicKey, limit = 20) {
  try {
    const res = await fetch(`${ADMIN_API}/api/data?topic=${topicKey}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    const items = (data.items || []).slice(0, limit)
    if (items.length > 0) {
      addItems(topicKey, items)
      updateSchedule(topicKey, new Date().toISOString())
    }
    return items
  } catch {
    return getItems(topicKey, limit)
  }
}
