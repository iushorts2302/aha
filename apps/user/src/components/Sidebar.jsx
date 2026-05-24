/**
 * Sidebar — 데스크톱 우측 사이드바
 *
 * 표시 영역: 데스크톱(≥992px)에서만 노출 (모바일은 1-column 유지)
 *
 * 위젯:
 *  1. 🔥 실시간 인기 (home.trending 상위 5개)
 *  2. ⭐ 내 즐겨찾기 (로그인 시 최근 3개)
 *  3. 🚀 추천 카테고리 (NAV 빠른 이동)
 *
 * 회귀 방지:
 *  - .aha-sidebar 클래스로 격리
 *  - 모바일은 display: none (CSS)
 */
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getItems } from '../store/crawlStore'

const QUICK_CATEGORIES = [
  { key: 'ai',       label: 'AI',       icon: '🤖' },
  { key: 'dev',      label: '개발',     icon: '💻' },
  { key: 'startup',  label: '스타트업', icon: '🚀' },
  { key: 'design',   label: '디자인',   icon: '🎨' },
  { key: 'game',     label: '게임',     icon: '🎮' },
  { key: 'finance',  label: '주식/코인',icon: '💰' },
  { key: 'learn',    label: '학습',     icon: '📚' },
  { key: 'board',    label: '게시판',   icon: '💬' },
]

export default function Sidebar({ navigate }) {
  const { currentUser } = useAuth()
  const [trending, setTrending] = useState([])
  const [loading, setLoading] = useState(true)

  // 실시간 인기 — home.trending 상위 5개
  useEffect(() => {
    let cancelled = false
    getItems('home.trending', 5)
      .then(items => { if (!cancelled) setTrending((items || []).slice(0, 5)) })
      .catch(() => { if (!cancelled) setTrending([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // 즐겨찾기 (외부 콘텐츠 최대 3개)
  const myBookmarks = (currentUser?.bookmarksRaw || [])
    .filter(b => b.target_type === 'crawl_item')
    .slice(0, 3)

  return (
    <aside className="aha-sidebar">
      {/* ── 위젯 1: 실시간 인기 ── */}
      <SidebarCard title="🔥 실시간 인기">
        {loading ? (
          <SidebarSkeleton count={5} />
        ) : trending.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: 0 }}>아직 수집된 콘텐츠가 없어요</p>
        ) : (
          <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {trending.map((item, i) => (
              <li key={item.id} style={{ marginBottom: i === trending.length - 1 ? 0 : 10 }}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aha-sidebar__item"
                  title={item.title}>
                  <span className="aha-sidebar__rank">{i + 1}</span>
                  <span className="aha-sidebar__title">{item.title}</span>
                </a>
              </li>
            ))}
          </ol>
        )}
      </SidebarCard>

      {/* ── 위젯 2: 내 즐겨찾기 (로그인 시) ── */}
      {currentUser && (
        <SidebarCard
          title="⭐ 내 즐겨찾기"
          extra={myBookmarks.length > 0 ? (
            <button
              onClick={() => navigate('bookmarks')}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: 11, color: 'var(--color-primary)', padding: 0,
              }}>전체 보기 →</button>
          ) : null}>
          {myBookmarks.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: 0 }}>
              ★ 버튼을 눌러 좋아하는 콘텐츠를 저장해보세요
            </p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {myBookmarks.map((b, i) => (
                <li key={b.target_key} style={{ marginBottom: i === myBookmarks.length - 1 ? 0 : 8 }}>
                  <a
                    href={b.target_key.startsWith('http') ? b.target_key : `https://${b.target_key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aha-sidebar__item"
                    title={b.target_title}>
                    <span style={{ color: 'var(--color-primary)', fontSize: 13, marginRight: 6 }}>★</span>
                    <span className="aha-sidebar__title">{b.target_title || '(제목 없음)'}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </SidebarCard>
      )}

      {/* ── 위젯 3: 추천 카테고리 빠른 이동 ── */}
      <SidebarCard title="🚀 빠른 이동">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {QUICK_CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => navigate(cat.key)}
              className="aha-sidebar__chip">
              <span style={{ fontSize: 13 }}>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </SidebarCard>

      {/* ── 비로그인 안내 ── */}
      {!currentUser && (
        <SidebarCard title="💡 알림">
          <p style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.6, margin: '0 0 12px' }}>
            로그인하면 즐겨찾기 · 팔로우 · 맞춤 추천을 사용할 수 있어요.
          </p>
          <button
            onClick={() => navigate('login')}
            className="btn btn-primary btn-sm"
            style={{ width: '100%', fontSize: 12, padding: '6px 12px' }}>
            로그인 / 회원가입
          </button>
        </SidebarCard>
      )}
    </aside>
  )
}

/* 사이드바 카드 셸 */
function SidebarCard({ title, extra, children }) {
  return (
    <div className="aha-sidebar__card">
      <div className="aha-sidebar__card-header">
        <span>{title}</span>
        {extra}
      </div>
      <div className="aha-sidebar__card-body">{children}</div>
    </div>
  )
}

/* 스켈레톤 */
function SidebarSkeleton({ count }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          height: 14, borderRadius: 4,
          background: 'linear-gradient(90deg, #f0f0f0, #f5f5f5, #f0f0f0)',
          backgroundSize: '200% 100%',
          animation: 'skPulse 1.6s ease-in-out infinite',
        }} />
      ))}
    </div>
  )
}
