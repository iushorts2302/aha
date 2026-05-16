/**
 * @aha/shared - 공통 유틸리티
 */

/** 날짜를 "N분 전 / N시간 전 / N일 전" 형식으로 변환 */
export function timeAgo(dateString) {
  const diff = Date.now() - new Date(dateString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}일 전`
  return new Date(dateString).toLocaleDateString('ko-KR')
}

/** 숫자를 "1.2k / 3.4만" 형식으로 변환 */
export function formatCount(n) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

/** 문자열을 slug로 변환 */
export function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
}
