/**
 * circuitBreaker.js — API 서킷 브레이커
 *
 * 상태:
 *   CLOSED  — 정상 (기본값)
 *   OPEN    — 차단 (10회 연속 실패, 서버점검 페이지 표시)
 *   HALF    — 복구 시도 중 (30초마다 헬스체크)
 *
 * sessionStorage 키: aha_cb_state
 *   { state, failures, openedAt, lastCheck }
 */

const SK        = 'aha_cb_state'
const THRESHOLD = 10          // 실패 임계값
const HALF_TTL  = 30 * 1000   // 30초마다 복구 시도
const HEALTH_URL = 'https://admin-vert-psi.vercel.app/api/config'

export const CB_STATE = { CLOSED: 'CLOSED', OPEN: 'OPEN', HALF: 'HALF' }

// ── 저장소 ────────────────────────────────────────────
function load() {
  try {
    return JSON.parse(sessionStorage.getItem(SK)) || {
      state: CB_STATE.CLOSED, failures: 0, openedAt: null, lastCheck: 0
    }
  } catch {
    return { state: CB_STATE.CLOSED, failures: 0, openedAt: null, lastCheck: 0 }
  }
}
function save(s) {
  try { sessionStorage.setItem(SK, JSON.stringify(s)) } catch {}
}

// ── listeners ─────────────────────────────────────────
const _listeners = new Set()
export function onStateChange(fn) {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}
function _notify() { _listeners.forEach(fn => fn(getState())) }

// ── 공개 API ─────────────────────────────────────────
export function getState() { return load().state }
export function getFailures() { return load().failures }

/** API 호출 성공 시 호출 */
export function recordSuccess() {
  const s = load()
  if (s.state !== CB_STATE.CLOSED || s.failures > 0) {
    save({ state: CB_STATE.CLOSED, failures: 0, openedAt: null, lastCheck: 0 })
    _notify()
  }
}

/** API 호출 실패 시 호출 (DB down 포함) */
export function recordFailure() {
  const s = load()
  if (s.state === CB_STATE.OPEN) return  // 이미 OPEN

  const failures = s.failures + 1
  if (failures >= THRESHOLD) {
    save({ state: CB_STATE.OPEN, failures, openedAt: Date.now(), lastCheck: 0 })
    _notify()
  } else {
    save({ ...s, failures })
  }
}

/** OPEN 상태일 때 복구 시도 가능 여부 */
export function canAttemptRecovery() {
  const s = load()
  if (s.state !== CB_STATE.OPEN) return false
  return Date.now() - (s.lastCheck || 0) >= HALF_TTL
}

/** 복구 시도 시작 (OPEN → HALF) */
export function markHalfOpen() {
  const s = load()
  save({ ...s, state: CB_STATE.HALF, lastCheck: Date.now() })
  _notify()
}

/** 복구 시도 실패 → 다시 OPEN */
export function markOpenAgain() {
  const s = load()
  save({ ...s, state: CB_STATE.OPEN, lastCheck: Date.now() })
  _notify()
}

/** 복구 성공 → CLOSED */
export function markRecovered() {
  save({ state: CB_STATE.CLOSED, failures: 0, openedAt: null, lastCheck: 0 })
  _notify()
}

/** 강제 리셋 (관리자용) */
export function reset() {
  save({ state: CB_STATE.CLOSED, failures: 0, openedAt: null, lastCheck: 0 })
  _notify()
}

/** 헬스체크 실행 */
export async function healthCheck() {
  if (!canAttemptRecovery()) return false
  markHalfOpen()
  try {
    const r = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(5000) })
    if (r.ok) { markRecovered(); return true }
    markOpenAgain(); return false
  } catch {
    markOpenAgain(); return false
  }
}

// OPEN 상태일 때 자동 헬스체크 (30초 간격)
setInterval(() => {
  if (canAttemptRecovery()) healthCheck()
}, HALF_TTL)
