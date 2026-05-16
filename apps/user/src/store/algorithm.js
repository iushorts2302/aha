/**
 * algorithm.js — Reddit Hot Score 기반 aha! 추천 알고리즘
 *
 * Reddit Hot Score 공식:
 *   score = log10(max(ups - downs, 1)) + (sign * seconds) / 45000
 *
 * aha! 변형:
 *   - ups = likes + reactions(긍정)
 *   - downs = reactions(부정)
 *   - 댓글 수 가중치 추가 (댓글 = 참여 신호)
 *   - 조회수 감쇠 (조회 대비 반응률 반영)
 *   - 바이럴 부스트 (빠른 시간 내 반응 급증)
 */

const GRAVITY = 1.8          // 시간 감쇠 강도 (높을수록 신규 콘텐츠 유리)
const COMMENT_WEIGHT = 0.5   // 댓글 가중치
const REACTION_WEIGHT = 0.3  // 반응 가중치
const VIRAL_THRESHOLD = 10   // 1시간 내 이 수 이상 반응 시 바이럴 부스트

/**
 * Reddit-inspired Hot Score
 * @param {number} ups - 좋아요 + 긍정 반응
 * @param {number} downs - 부정 반응
 * @param {string} createdAt - ISO 날짜
 * @returns {number}
 */
export function hotScore(ups, downs, createdAt) {
  const s = Math.max(ups - downs, 1)
  const order = Math.log10(s)
  const sign = s > 0 ? 1 : s < 0 ? -1 : 0
  const epoch = new Date(createdAt).getTime() / 1000
  const now = Date.now() / 1000
  return order + (sign * Math.max(epoch, now - 60 * 60 * 24 * 7)) / 45000
}

/**
 * aha! 종합 점수
 * @param {object} post - 게시글 객체
 * @param {number} commentCount - 댓글 수
 * @returns {number}
 */
export function ahaScore(post, commentCount = 0) {
  const likes = post.likes?.length || post.likes || 0
  const reactions = post.reactions ? Object.values(post.reactions).reduce((s, v) => s + v, 0) : 0
  const views = post.views || 1
  const age = (Date.now() - new Date(post.createdAt).getTime()) / 3600000 // hours

  // 기본 hot score
  const base = hotScore(likes + reactions * REACTION_WEIGHT, 0, post.createdAt)

  // 댓글 참여 보너스
  const commentBonus = Math.log1p(commentCount) * COMMENT_WEIGHT

  // 반응률 (조회 대비 참여)
  const engagementRate = (likes + reactions + commentCount) / Math.max(views, 1)
  const engagementBonus = engagementRate * 2

  // 바이럴 부스트: 게시 후 1시간 내 반응이 많으면 부스트
  const isViral = age < 1 && (likes + reactions) >= VIRAL_THRESHOLD
  const viralBoost = isViral ? 3 : 0

  return base + commentBonus + engagementBonus + viralBoost
}

/**
 * 게시글 배열을 알고리즘으로 정렬
 * @param {Array} posts
 * @param {Object} commentsMap - { postId: count }
 * @param {'hot'|'new'|'top'|'rising'} mode
 */
export function sortPosts(posts, commentsMap = {}, mode = 'hot') {
  const scored = posts.map(p => ({
    ...p,
    _score: ahaScore(p, commentsMap[p.id] || 0),
  }))

  switch (mode) {
    case 'hot':
      return scored.sort((a, b) => b._score - a._score)
    case 'new':
      return scored.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    case 'top':
      return scored.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
    case 'rising': {
      // 상승세: 최근 6시간 이내 + 높은 참여율
      const recent = scored.filter(p => {
        const age = (Date.now() - new Date(p.createdAt).getTime()) / 3600000
        return age <= 6
      })
      return recent.sort((a, b) => b._score - a._score)
    }
    default:
      return scored
  }
}

/**
 * HOT 게시글 자동 선별 (상위 N개)
 * @param {Array} posts
 * @param {Object} commentsMap
 * @param {number} n
 */
export function getHotPosts(posts, commentsMap = {}, n = 10) {
  return sortPosts(posts, commentsMap, 'hot').slice(0, n)
}

/**
 * 급상승 감지: 짧은 시간 내 반응 급증
 * @param {Array} posts
 */
export function getRisingPosts(posts, commentsMap = {}, n = 10) {
  return sortPosts(posts, commentsMap, 'rising').slice(0, n)
}

/**
 * 논쟁 감지: 댓글 많고 반응이 양극화
 */
export function getControversialPosts(posts, commentsMap = {}, n = 10) {
  return posts
    .filter(p => (commentsMap[p.id] || 0) >= 3)
    .sort((a, b) => (commentsMap[b.id] || 0) - (commentsMap[a.id] || 0))
    .slice(0, n)
}
