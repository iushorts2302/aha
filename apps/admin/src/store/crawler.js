/**
 * crawler.js
 * Python 크롤러 Vercel API Route 호출
 * 실제 웹 크롤링 (GitHub, NPM, PyPI 등)
 */

import { MENU_TOPICS } from './crawlStore.js'

const CRAWL_API  = 'https://admin-vert-psi.vercel.app/api/crawl'
const SAVE_API   = 'https://admin-vert-psi.vercel.app/api/v1?resource=crawl_items'

export async function crawlTopic(topicKey) {
  // MENU_TOPICS 존재 여부와 무관하게 crawl.py에 위임
  // crawl.py의 TOPIC_CRAWLERS가 84개 토픽 지원
  const topic = MENU_TOPICS[topicKey] || { label: topicKey, category: topicKey.split('.')[0] }

  // 1. 크롤링 실행
  const response = await fetch(CRAWL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topicKey }),
    signal: AbortSignal.timeout(25000),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `크롤링 실패 (${response.status})`)
  }

  const data = await response.json()
  const items = (data.items || []).map(item => ({
    ...item,
    topicLabel: item.topicLabel || topic.label,
    category:   item.category   || topic.category,
  }))

  // 2. DB 저장 (백그라운드 — 실패해도 크롤링 성공으로 처리)
  if (items.length > 0) {
    fetch(SAVE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
      signal: AbortSignal.timeout(15000),
    }).catch(() => {})
  }

  // 3. items가 0이어도 오류 대신 빈 배열 반환 (크롤러 제한 상황 대응)
  return items
}

export async function crawlTopics(topicKeys, onProgress) {
  const results = {}
  for (const key of topicKeys) {
    try {
      onProgress?.(key, 'loading')
      const items = await crawlTopic(key)
      results[key] = { success: true, count: items.length }
      onProgress?.(key, 'success', items.length)
    } catch (err) {
      results[key] = { success: false, error: err.message }
      onProgress?.(key, 'error', err.message.slice(0, 60))
    }
    // 크롤링 간격 (서버 부하 방지)
    await new Promise(r => setTimeout(r, 800))
  }
  return results
}

export async function crawlStale(onProgress) {
  // 모든 MENU_TOPICS 토픽을 대상으로 stale 크롤링
  const staleKeys = Object.keys(MENU_TOPICS)
  if (staleKeys.length === 0) return {}
  return crawlTopics(staleKeys, onProgress)
}
