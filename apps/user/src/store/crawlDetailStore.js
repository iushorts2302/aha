/**
 * crawlDetailStore.js
 * 크롤링 아이템 상세 조회용 임시 스토어 (sessionStorage)
 * navigate 없이 id만으로 데이터 복원 가능
 */

const KEY = 'aha_crawl_detail'

export function saveDetail(item) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(item))
  } catch {}
}

export function loadDetail() {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearDetail() {
  sessionStorage.removeItem(KEY)
}
