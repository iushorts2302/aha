/**
 * circuitBreaker.js — API 서킷 브레이커
 *
 * 상태:
 *   CLOSED  — 정상 (기본값)
 *   OPEN    — 차단 (THRESHOLD회 연속 실패)
 *   HALF    — 복구 시도 중
 *
 * 설계 원칙:
 *   - 앱 시작 시 항상 CLOSED로 초기화 (이전 OPEN 상태 승계 안 함)
 *   - db_down은 실패로 카운트 안 함 (DB 없음 ≠ 서비스 다운)
 *   - 진짜 네트워크 실패(타임아웃/연결거부)만 카운트
 */

const THRESHOLD = 10          // 실패 임계값
const HALF_TTL  = 30 * 1000   // 30초마다 복구 시도
const HEALTH_URL = 'https://admin-vert-psi.vercel.app/api/config'

export const CB_STATE = { CLOSED: 'CLOSED', OPEN: 'OPEN', HALF: 'HALF' }

// ── 메모리 상태 (sessionStorage 제거 — 이전 OPEN 상태 승계 방지) ──
let _state    = CB_STATE.CLOSED
let _failures = 0
let _listeners = new Set()

function _notify() { _listeners.forEach(fn => fn(_state)) }

// ── 공개 API ──────────────────────────────────────────
export function getState()    { return _state }
export function getFailures() { return _failures }

export function onStateChange(fn) {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}

export function recordSuccess() {
  if (_state !== CB_STATE.CLOSED || _failures > 0) {
    _state    = CB_STATE.CLOSED
    _failures = 0
    _notify()
  }
}

export function recordFailure() {
  if (_state === CB_STATE.OPEN) return
  _failures += 1
  if (_failures >= THRESHOLD) {
    _state = CB_STATE.OPEN
    _notify()
  }
}

export function canAttemptRecovery() {
  return _state === CB_STATE.OPEN
}

export function markHalfOpen() {
  _state = CB_STATE.HALF
  _notify()
}

export function markOpenAgain() {
  _state = CB_STATE.OPEN
  _notify()
}

export function markRecovered() {
  _state    = CB_STATE.CLOSED
  _failures = 0
  _notify()
}

export function reset() {
  _state    = CB_STATE.CLOSED
  _failures = 0
  // 혹시 남아있을 수 있는 sessionStorage도 정리
  try { sessionStorage.removeItem('aha_cb_state') } catch {}
  _notify()
}

export async function healthCheck() {
  if (_state !== CB_STATE.OPEN) return false
  markHalfOpen()
  try {
    const r = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(5000) })
    if (r.ok) { markRecovered(); return true }
    markOpenAgain(); return false
  } catch {
    markOpenAgain(); return false
  }
}

// OPEN 상태일 때 30초마다 자동 헬스체크
setInterval(() => {
  if (_state === CB_STATE.OPEN) healthCheck()
}, HALF_TTL)
