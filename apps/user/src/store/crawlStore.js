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
  'home.trending': { label: '오늘의 인기', category: 'home' },
  'home.rising': { label: '이번 주 급상승', category: 'home' },
  'home.ai_feed': { label: 'AI 추천 피드', category: 'home' },
  'dev.trending': { label: '개발 트렌딩', category: 'dev' },
  'dev.javascript': { label: 'JavaScript/NPM', category: 'dev' },
  'dev.python': { label: 'Python/PyPI', category: 'dev' },
  'dev.devops': { label: 'DevOps/인프라', category: 'dev' },
  'dev.tools': { label: '개발 도구', category: 'dev' },
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

// 토픽별 init 트리거 여부 추적 (세션 내 1회만)
const _initTriggered = new Set()

// ── localStorage 캐시 (방안 2: stale-while-revalidate) ──
const LS_PREFIX  = 'aha_crawl_v3_'
const LS_TTL     = 30 * 60 * 1000   // 30분 — 오래된 데이터도 즉시 표시 후 갱신

function lsRead(topicKey) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + topicKey)
    if (!raw) return null
    const { items, savedAt } = JSON.parse(raw)
    return { items, savedAt, stale: Date.now() - savedAt > LS_TTL }
  } catch { return null }
}

function lsWrite(topicKey, items) {
  try {
    localStorage.setItem(LS_PREFIX + topicKey,
      JSON.stringify({ items, savedAt: Date.now() }))
  } catch {}
}

// 진행 중 폴링 추적 (중복 폴링 방지)
const _polling = new Set()

// ── DB API에서 크롤링 아이템 조회 ────────────────────────
async function fetchFromDB(topicKey) {
  // 메모리 캐시 (60초)
  const mem = _cache.get(topicKey)
  if (mem && Date.now() - mem.fetchedAt < 60000) return mem.items

  try {
    const r = await fetch(
      `${ADMIN_API}/api/data?topic=${encodeURIComponent(topicKey)}`,
      { signal: AbortSignal.timeout(5000) }  // 5초로 단축 — 서버는 즉시 응답하므로
    )
    if (!r.ok) return lsRead(topicKey)?.items || []
    const data = await r.json()
    const items = (data.items || []).filter(i => i.blocked_yn !== 'Y')
    const source = data.source

    if (items.length > 0) {
      _cache.set(topicKey, { items, fetchedAt: Date.now() })
      lsWrite(topicKey, items)
    }

    // queued = 서버가 백그라운드로 크롤링 시작함 → 짧은 폴링으로 확인
    if (source === 'queued' && !_polling.has(topicKey)) {
      _polling.add(topicKey)
      _pollUntilReady(topicKey)
    }

    return items
  } catch {
    return lsRead(topicKey)?.items || []
  }
}

/** queued 응답 시 백그라운드에서 짧은 폴링으로 데이터 도착 감지 */
async function _pollUntilReady(topicKey) {
  const delays = [2000, 3000, 5000, 8000]  // 2/3/5/8초 후 재시도 (최대 18초)
  for (const wait of delays) {
    await new Promise(res => setTimeout(res, wait))
    try {
      const r = await fetch(
        `${ADMIN_API}/api/data?topic=${encodeURIComponent(topicKey)}`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (!r.ok) continue
      const data = await r.json()
      const items = (data.items || []).filter(i => i.blocked_yn !== 'Y')
      if (items.length > 0) {
        _cache.set(topicKey, { items, fetchedAt: Date.now() })
        lsWrite(topicKey, items)
        // 폴링 성공 → 화면 갱신 이벤트
        window.dispatchEvent(new CustomEvent('aha:crawl-updated', { detail: { topicKey, items } }))
        break
      }
    } catch {}
  }
  _polling.delete(topicKey)
}

// ── 공개 API ────────────────────────────────────────────
export async function getItems(topicKey, limit = 10) {
  const items = await fetchFromDB(topicKey)
  return items.slice(0, limit)
}

/** localStorage에서 즉시 반환 (stale-while-revalidate) */
export function getItemsStale(topicKey, limit = 10) {
  // 메모리 캐시 먼저
  const mem = _cache.get(topicKey)
  if (mem) return mem.items.slice(0, limit)
  // localStorage 폴백
  return (lsRead(topicKey)?.items || []).slice(0, limit)
}

/** 방안 3: 주요 토픽 백그라운드 프리페치 */
export function prefetchTopics(keys) {
  keys.forEach((key, i) => {
    setTimeout(() => {
      if (!_cache.has(key)) fetchFromDB(key).catch(() => {})
    }, i * 800)   // 800ms 간격으로 순차 프리페치 (서버 부하 분산)
  })
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
