import { useState, useEffect } from 'react'
import { getFailures, healthCheck, reset, onStateChange, CB_STATE } from '../store/circuitBreaker.js'

// 재시도 횟수에 따른 단계별 안내
const STAGES = [
  {
    icon: '🔧',
    iconBg: 'linear-gradient(135deg, #fff5f0 0%, #ffe8e0 100%)',
    iconBorder: 'rgba(255,100,50,0.15)',
    title: '잠시 서비스가 중단되었습니다',
    desc: '서버와 연결하는 데 문제가 발생했습니다.\n자동으로 재연결을 시도하고 있으니 잠시만 기다려 주세요.',
    tip: null,
  },
  {
    icon: '⏳',
    iconBg: 'linear-gradient(135deg, #fff8e0 0%, #fff0c0 100%)',
    iconBorder: 'rgba(255,180,0,0.2)',
    title: '연결 복구를 시도하고 있습니다',
    desc: '서버 상태를 확인 중입니다.\n일시적인 네트워크 문제일 수 있으니 조금 더 기다려 주세요.',
    tip: '💡 브라우저를 새로고침하거나 인터넷 연결을 확인해 보세요.',
  },
  {
    icon: '🌐',
    iconBg: 'linear-gradient(135deg, #f0f4ff 0%, #e0ebff 100%)',
    iconBorder: 'rgba(0,102,204,0.15)',
    title: '서비스 복구 작업이 진행 중입니다',
    desc: '현재 서버 점검 또는 업데이트 작업이 진행 중일 수 있습니다.\n불편을 드려 죄송합니다.',
    tip: '💡 페이지를 닫고 잠시 후 다시 방문해 주시면 정상 이용이 가능합니다.',
  },
]

function getStage(attempts) {
  if (attempts < 2) return STAGES[0]
  if (attempts < 5) return STAGES[1]
  return STAGES[2]
}

export default function MaintenancePage() {
  const [checking,  setChecking]  = useState(false)
  const [countdown, setCountdown] = useState(30)
  const [attempts,  setAttempts]  = useState(0)
  const [recovered, setRecovered] = useState(false)
  const [pulse,     setPulse]     = useState(false)

  // 카운트다운 — 30초마다 자동 재시도
  useEffect(() => {
    setCountdown(30)
    const t = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { handleRetry(); return 30 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [attempts])

  // 복구 감지 → 안내 후 자동 리로드
  useEffect(() => {
    return onStateChange(state => {
      if (state === CB_STATE.CLOSED) {
        setRecovered(true)
        setTimeout(() => window.location.reload(), 2000)
      }
    })
  }, [])

  // 아이콘 펄스 애니메이션
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1800)
    return () => clearInterval(t)
  }, [])

  async function handleRetry() {
    if (checking) return
    setChecking(true)
    await healthCheck()
    setChecking(false)
    setAttempts(n => n + 1)
  }

  const stage = getStage(attempts)

  // ── 복구 완료 화면 ─────────────────────────────────
  if (recovered) {
    return (
      <div style={wrap}>
        <Logo />
        <div style={card}>
          <div style={{ ...iconWrap, background: 'linear-gradient(135deg, #e8faf0 0%, #d4f9e0 100%)', border: '1.5px solid rgba(0,180,80,0.2)' }}>
            ✅
          </div>
          <h1 style={title}>서비스가 복구되었습니다!</h1>
          <p style={desc}>잠시 후 자동으로 이동합니다…</p>
          <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden', marginTop: 24 }}>
            <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg,#34C759,#30D158)', borderRadius: 2, animation: 'none' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <Logo />

      {/* 메인 카드 */}
      <div style={card}>

        {/* 단계별 아이콘 */}
        <div style={{
          ...iconWrap,
          background: stage.iconBg,
          border: `1.5px solid ${stage.iconBorder}`,
          transform: pulse ? 'scale(1.06)' : 'scale(1)',
        }}>
          {stage.icon}
        </div>

        {/* 제목 */}
        <h1 style={title}>{stage.title}</h1>

        {/* 설명 */}
        <p style={desc}>
          {stage.desc.split('\n').map((line, i) => (
            <span key={i}>{line}{i === 0 && <br />}</span>
          ))}
        </p>

        {/* 팁 (2회차 이상) */}
        {stage.tip && (
          <div style={{
            padding: '12px 16px', background: '#f5f5f7',
            borderRadius: 10, marginBottom: 24,
            fontSize: 13, color: '#555', lineHeight: 1.6, textAlign: 'left',
          }}>
            {stage.tip}
          </div>
        )}

        {/* 상태 표시 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, marginBottom: 20,
          padding: '10px 18px',
          background: '#f5f5f7', borderRadius: 10,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
            background: checking ? '#FF9500' : '#FF3B30',
            boxShadow: checking ? '0 0 6px rgba(255,149,0,0.7)' : '0 0 6px rgba(255,59,48,0.6)',
            transition: 'background 0.3s',
          }} />
          <span style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>
            {checking
              ? '서버 연결을 확인하고 있습니다…'
              : `${countdown}초 후 자동으로 다시 시도합니다`}
          </span>
        </div>

        {/* 진행 바 */}
        <div style={{ height: 3, background: '#ebebeb', borderRadius: 2, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: checking ? '60%' : `${((30 - countdown) / 30) * 100}%`,
            background: 'linear-gradient(90deg, #0066CC, #4DA3FF)',
            borderRadius: 2, transition: checking ? 'width 0.5s ease' : 'width 1s linear',
          }} />
        </div>

        {/* 재시도 버튼 */}
        <button
          type="button"
          onClick={handleRetry}
          disabled={checking}
          style={{
            width: '100%', height: 48,
            background: checking
              ? '#f0f0f0'
              : 'linear-gradient(135deg, #0066CC 0%, #0077ED 100%)',
            color: checking ? '#aaa' : '#fff',
            border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 600,
            cursor: checking ? 'not-allowed' : 'pointer',
            marginBottom: 10, transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (!checking) e.currentTarget.style.opacity = '0.9' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          {checking ? '확인 중…' : '지금 다시 시도하기'}
        </button>

        {/* 홈으로 버튼 */}
        <button
          type="button"
          onClick={() => { reset(); window.location.reload() }}
          style={{
            width: '100%', height: 40,
            background: 'transparent', color: '#888',
            border: '1px solid #e4e4e4', borderRadius: 12,
            fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f8f8f8' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          홈으로 돌아가기
        </button>
      </div>

      {/* 하단 안내 */}
      <div style={{ marginTop: 28, textAlign: 'center', maxWidth: 400 }}>
        {attempts >= 3 && (
          <div style={{
            marginBottom: 16, padding: '14px 18px',
            background: '#fff', borderRadius: 12,
            border: '1px solid #ebebeb',
            boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', marginBottom: 6 }}>
              문제가 지속되나요?
            </p>
            <p style={{ fontSize: 13, color: '#777', lineHeight: 1.65, margin: 0 }}>
              · 인터넷 연결 상태를 확인해 주세요<br />
              · 브라우저 캐시를 지우고 다시 시도해 주세요<br />
              · 잠시 후 다시 방문해 주시면 정상 이용 가능합니다
            </p>
          </div>
        )}
        <p style={{ fontSize: 12, color: '#C0C0C0', lineHeight: 1.6 }}>
          서비스가 복구되면 자동으로 화면이 전환됩니다
        </p>
      </div>
    </div>
  )
}

function Logo() {
  return (
    <div style={{ marginBottom: 40, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em', color: '#1D1D1F' }}>
        aha!
      </span>
    </div>
  )
}

// ── 공통 스타일 ─────────────────────────────────────────
const wrap = {
  minHeight: '100vh',
  background: 'linear-gradient(160deg, #f5f5f7 0%, #ffffff 55%, #f0f4ff 100%)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  padding: '24px',
}

const card = {
  width: '100%', maxWidth: 440,
  background: '#ffffff',
  borderRadius: 20,
  boxShadow: '0 2px 32px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)',
  padding: '44px 36px 36px',
  textAlign: 'center',
}

const iconWrap = {
  width: 76, height: 76, borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  margin: '0 auto 24px', fontSize: 34,
  transition: 'transform 0.4s cubic-bezier(.34,1.56,.64,1)',
}

const title = {
  fontSize: 21, fontWeight: 700, color: '#1D1D1F',
  marginBottom: 10, letterSpacing: '-0.03em', lineHeight: 1.3,
}

const desc = {
  fontSize: 15, lineHeight: 1.75, color: '#6B6B6B', marginBottom: 24,
}
