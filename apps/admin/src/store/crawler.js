/**
 * crawler.js
 * Python 크롤러 Vercel API Route 호출
 * 실제 웹 크롤링 (GitHub, NPM, PyPI 등)
 */

import { MENU_TOPICS, addItems, updateSchedule, readSchedule } from './crawlStore.js'

const API_URL = '/api/crawl'

export async function crawlTopic(topicKey) {
  const topic = MENU_TOPICS[topicKey]
  if (!topic) throw new Error(`Unknown topic: ${topicKey}`)

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topicKey }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `크롤링 실패 (${response.status})`)
  }

  const data = await response.json()
  const items = (data.items || []).map(item => ({
    ...item,
    // 누락 필드 보완
    topicLabel: item.topicLabel || topic.label,
    category:   item.category   || topic.category,
  }))

  if (items.length === 0) throw new Error('수집된 항목이 없습니다')

  addItems(topicKey, items)
  updateSchedule(topicKey, new Date().toISOString())

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
      onProgress?.(key, 'error', err.message)
    }
    // 크롤링 간격 (서버 부하 방지)
    await new Promise(r => setTimeout(r, 800))
  }
  return results
}

export async function crawlStale(onProgress) {
  const schedule = readSchedule()
  const TEN_MIN = 10 * 60 * 1000

  const staleKeys = Object.keys(MENU_TOPICS).filter(key => {
    const last = schedule[key]
    if (!last) return true
    return Date.now() - new Date(last).getTime() > TEN_MIN
  })

  if (staleKeys.length === 0) return {}
  return crawlTopics(staleKeys, onProgress)
}
