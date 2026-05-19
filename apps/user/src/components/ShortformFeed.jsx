/**
 * ShortformFeed — TikTok 스타일 무한 스크롤 숏폼 피드
 * 크롤링 데이터를 카드 스택으로 표현
 */
import { useState, useEffect, useRef } from 'react'
import { getItems } from '../store/crawlStore.js'
import ReactionBar from './ReactionBar.jsx'

export default function ShortformFeed({ topicKey = 'home.shortform' }) {
  const [items, setItems] = useState([])
  const [current, setCurrent] = useState(0)
  const containerRef = useRef(null)
  const touchStartY = useRef(0)

  useEffect(() => {
    getItems(topicKey, 20).then(data => {
      setItems(Array.isArray(data) ? data : [])
    }).catch(() => setItems([]))
  }, [topicKey])

  // 키보드 네비게이션
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowDown' || e.key === 'j') setCurrent(p => Math.min(p + 1, items.length - 1))
      if (e.key === 'ArrowUp'   || e.key === 'k') setCurrent(p => Math.max(p - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [items.length])

  // 터치 스와이프
  function onTouchStart(e) { touchStartY.current = e.touches[0].clientY }
  function onTouchEnd(e) {
    const delta = touchStartY.current - e.changedTouches[0].clientY
    if (delta > 50) setCurrent(p => Math.min(p + 1, items.length - 1))
    if (delta < -50) setCurrent(p => Math.max(p - 1, 0))
  }

  if (items.length === 0) return (
    <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-muted)' }}>숏폼 콘텐츠 준비중</p>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-placeholder)' }}>관리자 페이지에서 크롤링을 실행해 주세요.</p>
    </div>
  )

  const item = items[current]

  // 랜덤 배경색 (항상 일관되게)
  const COLORS = ['#0d1117', '#1a1a2e', '#16213e', '#0f3460', '#1b1b2f', '#111827']
  const bg = COLORS[current % COLORS.length]

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative', height: 'calc(100vh - 80px)',
        background: bg, borderRadius: 'var(--radius-card)', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        userSelect: 'none',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* 콘텐츠 */}
      <div style={{ padding: 'var(--space-6)', paddingBottom: '80px', color: '#fff' }}>
        {/* 상단 배지 */}
        {item.hot && (
          <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', background: '#FF4500', borderRadius: '99px', marginBottom: 'var(--space-3)', display: 'inline-block' }}>🔥 HOT</span>
        )}

        {/* 태그 */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
          {item.tags?.slice(0, 3).map(tag => (
            <span key={tag} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}>#{tag}</span>
          ))}
        </div>

        {/* 제목 */}
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, lineHeight: 1.35, marginBottom: 'var(--space-4)', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
          {item.title}
        </h2>

        {/* 요약 */}
        <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.75)', lineHeight: 1.65, marginBottom: 'var(--space-5)' }}>
          {item.summary}
        </p>

        {/* 통계 */}
        <div style={{ display: 'flex', gap: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
          {[
            { icon: '👁', val: item.views?.toLocaleString() },
            { icon: '♥', val: item.likes },
            { icon: '💬', val: item.comments },
          ].map(s => (
            <span key={s.icon} style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {s.icon} {s.val}
            </span>
          ))}
        </div>
      </div>

      {/* 우측 액션 버튼 (TikTok 스타일) */}
      <div style={{
        position: 'absolute', right: 'var(--space-4)', bottom: '100px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)',
      }}>
        {[
          { icon: '♥', label: item.likes,    action: () => {} },
          { icon: '💬', label: item.comments, action: () => {} },
          { icon: '↗',  label: '공유',        action: () => navigator.share?.({ title: item.title }) },
        ].map(btn => (
          <button key={btn.icon} onClick={btn.action} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
            color: '#fff',
          }}>
            <span style={{ fontSize: '24px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>{btn.icon}</span>
            <span style={{ fontSize: '11px', fontWeight: 700 }}>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* 하단 네비게이션 */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
        padding: 'var(--space-4)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={() => setCurrent(p => Math.max(p - 1, 0))} disabled={current === 0}
          style={{ color: current === 0 ? 'rgba(255,255,255,0.2)' : '#fff', fontSize: 'var(--text-lg)', padding: 'var(--space-2)' }}>↑</button>
        <span style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.6)' }}>{current + 1} / {items.length}</span>
        <button onClick={() => setCurrent(p => Math.min(p + 1, items.length - 1))} disabled={current === items.length - 1}
          style={{ color: current === items.length - 1 ? 'rgba(255,255,255,0.2)' : '#fff', fontSize: 'var(--text-lg)', padding: 'var(--space-2)' }}>↓</button>
      </div>

      {/* 진행 바 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'rgba(255,255,255,0.1)' }}>
        <div style={{ width: `${((current + 1) / items.length) * 100}%`, height: '100%', background: 'var(--color-accent)', transition: 'width 0.3s ease' }} />
      </div>
    </div>
  )
}
