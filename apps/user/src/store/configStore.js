/**
 * configStore.js
 * 관리자앱 /api/config 설정을 폴링해 동기화
 * - 카테고리 / 주제(topicKey) 활성화 상태 제공
 * - 30초마다 갱신
 */

const ADMIN_API  = 'https://admin-vert-psi.vercel.app'
const CONFIG_KEY = 'aha_admin_config_v1'

let _cache = null
let _listeners = []

function readLS() {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY)) } catch { return null }
}
function writeLS(cfg) {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)) } catch {}
}

export function getConfig() {
  return _cache || readLS() || null
}

export function onConfigChange(fn) {
  _listeners.push(fn)
  return () => { _listeners = _listeners.filter(f => f !== fn) }
}

function notify() { _listeners.forEach(fn => fn(_cache)) }

export async function fetchConfig() {
  try {
    const r = await fetch(`${ADMIN_API}/api/config`, { signal: AbortSignal.timeout(8000) })
    if (!r.ok) return
    const cfg = await r.json()
    _cache = cfg
    writeLS(cfg)
    notify()
  } catch {}
}

// 초기 로드 + 30초 폴링
fetchConfig()
setInterval(fetchConfig, 30000)

// 비활성 topicKey 목록 반환
export function getInactiveTopics() {
  const cfg = getConfig()
  if (!cfg) return new Set()
  return new Set(
    (cfg.topics || []).filter(t => !t.active).map(t => t.key)
  )
}
