import { useState, useEffect } from 'react'
import { getState, getFailures, healthCheck, reset, onStateChange, CB_STATE, HALF_TTL } from '../store/circuitBreaker.js'

export default function MaintenancePage() {
  const [checking,  setChecking]  = useState(false)
  const [countdown, setCountdown] = useState(30)
  const [attempts,  setAttempts]  = useState(0)
  const [pulse,     setPulse]     = useState(false)

  // 카운트다운 (30초마다 자동 재시도)
  useEffect(() => {
    setCountdown(30)
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleRetry(); return 30
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [attempts])

  // 상태 변경 감지 → 복구 시 자동 리로드
  useEffect(() => {
    const off = onStateChange(state => {
      if (state === CB_STATE.CLOSED) window.location.reload()
    })
    return off
  }, [])

  // 펄스 애니메이션
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1500)
    return () => clearInterval(t)
  }, [])

  async function handleRetry() {
    if (checking) return
    setChecking(true)
    await healthCheck()
    setChecking(false)
    setAttempts(n => n + 1)
  }

  const failures = getFailures()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #f5f5f7 0%, #ffffff 60%, #f0f4ff 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      padding: '24px',
    }}>

      {/* 로고 */}
      <div style={{ marginBottom: 48 }}>
        <span style={{
          fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em',
          color: '#1D1D1F',
        }}>aha!</span>
      </div>

      {/* 메인 카드 */}
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#fff',
        borderRadius: 24,
        boxShadow: '0 2px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        padding: '48px 40px',
        textAlign: 'center',
      }}>

        {/* 아이콘 */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #fff5f0 0%, #ffe8e0 100%)',
          border: '1.5px solid rgba(255,100,50,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          fontSize: 36,
          transition: 'transform 0.3s',
          transform: pulse ? 'scale(1.06)' : 'scale(1)',
        }}>
          🔧
        </div>

        <h1 style={{
          fontSize: 24, fontWeight: 700,
          color: '#1D1D1F', marginBottom: 12,
          letterSpacing: '-0.03em',
        }}>
          서버 점검 중
        </h1>
        <p style={{
          fontSize: 16, lineHeight: 1.7,
          color: '#7A7A7A', marginBottom: 32,
        }}>
          현재 서버에 연결할 수 없습니다.<br />
          잠시 후 자동으로 재연결을 시도합니다.
        </p>

        {/* 상태 인디케이터 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, marginBottom: 32,
          padding: '12px 20px',
          background: '#f5f5f7', borderRadius: 12,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: checking ? '#FF9500' : '#FF3B30',
            boxShadow: checking
              ? '0 0 8px rgba(255,149,0,0.6)'
              : '0 0 8px rgba(255,59,48,0.5)',
            display: 'inline-block',
            transition: 'background 0.3s',
          }} />
          <span style={{ fontSize: 13, color: '#7A7A7A', fontWeight: 500 }}>
            {checking ? '연결 확인 중...' : `${countdown}초 후 자동 재시도`}
          </span>
        </div>

        {/* 카운트다운 바 */}
        <div style={{
          height: 4, background: '#f0f0f0', borderRadius: 2,
          marginBottom: 32, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${(30 - countdown) / 30 * 100}%`,
            background: 'linear-gradient(90deg, #0066CC, #4DA3FF)',
            borderRadius: 2,
            transition: 'width 1s linear',
          }} />
        </div>

        {/* 지금 재시도 버튼 */}
        <button
          onClick={handleRetry}
          disabled={checking}
          style={{
            width: '100%', height: 48,
            background: checking
              ? '#f5f5f7'
              : 'linear-gradient(135deg, #0066CC 0%, #0077ED 100%)',
            color: checking ? '#7A7A7A' : '#fff',
            border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 600,
            cursor: checking ? 'not-allowed' : 'pointer',
            letterSpacing: '-0.01em',
            transition: 'all 0.2s',
            marginBottom: 12,
          }}
          onMouseEnter={e => { if (!checking) e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          {checking ? '연결 확인 중...' : '지금 재시도'}
        </button>

        {/* 초기화 버튼 */}
        <button
          onClick={() => { reset(); window.location.reload() }}
          style={{
            width: '100%', height: 40,
            background: 'transparent',
            color: '#7A7A7A',
            border: '1px solid #e8e8e8',
            borderRadius: 12,
            fontSize: 14, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f7' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          오류 초기화 후 홈으로
        </button>
      </div>

      {/* 하단 정보 */}
      <div style={{
        marginTop: 32, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: '실패 횟수', value: `${failures}회` },
            { label: '상태',     value: checking ? 'HALF-OPEN' : 'OPEN' },
            { label: '재시도',   value: `${attempts}회` },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1D1D1F', margin: 0 }}>
                {item.value}
              </p>
              <p style={{ fontSize: 11, color: '#B0B0B0', margin: 0, marginTop: 2 }}>
                {item.label}
              </p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#B0B0B0', marginTop: 12, textAlign: 'center', lineHeight: 1.6 }}>
          서버 복구가 감지되면 자동으로 서비스가 재개됩니다.
        </p>
      </div>
    </div>
  )
}
