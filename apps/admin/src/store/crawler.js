/**
 * crawler.js
 * Anthropic API 콘텐츠 생성 — Vercel API Route 프록시 경유 (CORS 해결)
 */

import { MENU_TOPICS, addItems, updateSchedule, readSchedule } from './crawlStore.js'

// 개발: 직접 호출, 프로덕션: Vercel 프록시 경유
const API_URL = '/api/crawl'

export async function crawlTopic(topicKey) {
  const topic = MENU_TOPICS[topicKey]
  if (!topic) throw new Error(`Unknown topic: ${topicKey}`)

  const now = new Date()
  const dateStr = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일`
  const timeStr = `${now.getHours()}시 ${now.getMinutes()}분`

  const prompt = `당신은 한국의 인기 커뮤니티 사이트의 콘텐츠 큐레이터입니다.
현재 시각: ${dateStr} ${timeStr}
섹션: "${topic.label}"
키워드: ${topic.keywords}

위 섹션에 맞는 한국어 커뮤니티 게시글 5개를 생성해주세요.
각 게시글은 최신 트렌드와 실제 관심사를 반영해야 합니다.

반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:
[
  {
    "title": "게시글 제목 (한국어, 30자 이내, 클릭을 유도하는 제목)",
    "summary": "게시글 요약 내용 (한국어, 100자 이내, 흥미로운 내용)",
    "tags": ["태그1", "태그2", "태그3"],
    "views": 숫자(100~9999),
    "likes": 숫자(10~999),
    "comments": 숫자(5~200),
    "hot": true 또는 false
  }
]

규칙:
- 제목은 실제 커뮤니티에서 볼 수 있는 자연스러운 한국어로
- 최소 1개는 hot: true로 설정
- 다양한 views/likes/comments 값 사용
- 태그는 2-4개, 한국어 또는 영어`

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `API 오류 (${response.status})`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || '[]'

  let items
  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    items = JSON.parse(clean)
  } catch {
    throw new Error('AI 응답 파싱 실패')
  }

  const enriched = items.map((item, i) => ({
    id: `${topicKey}_${Date.now()}_${i}`,
    topicKey,
    category: topic.category,
    topicLabel: topic.label,
    title: item.title,
    summary: item.summary,
    tags: item.tags || [],
    views: item.views || 100,
    likes: item.likes || 10,
    comments: item.comments || 5,
    hot: item.hot || false,
    crawledAt: new Date().toISOString(),
    type: 'crawled',
  }))

  addItems(topicKey, enriched)
  updateSchedule(topicKey, new Date().toISOString())

  return enriched
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
    // rate limit 방지
    await new Promise(r => setTimeout(r, 1500))
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
