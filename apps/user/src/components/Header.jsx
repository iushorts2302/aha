import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { label: '홈',      key: 'home' },
  { label: '인기',    key: 'trending' },
  { label: '피드',    key: 'feed' },
  { label: '게시판',  key: 'board' },
  { label: '갤러리',  key: 'gallery' },
  { label: '커뮤니티',key: 'community' },
  { label: '정보',    key: 'knowledge' },
  { label: '마켓',    key: 'market' },
  { label: 'AI 허브', key: 'aihub' },
  { label: '라이브',  key: 'live' },
]

export default function Header({ currentPage, navigate }) {
  const { currentUser, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [search, setSearch] = useState('')

  function handleSearch(e) {
    e.preventDefault()
    const q = search.trim()
    if (q) { navigate(`search?q=${encodeURIComponent(q)}`); setSearch('') }
  }

  return (
    <>
      {/* ── Global Nav — true black 44px ───────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        height: 'var(--nav-height)',  /* 44px */
        background: 'var(--color-nav-black)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        display: 'flex', alignItems: 'center',
        padding: '0 22px',
        gap: '20px',
      }}>
        {/* 워드마크 */}
        <button onClick={() => navigate('home')} style={{
          fontFamily: 'var(--font-display)',
          fontSize: '17px', fontWeight: 600,
          letterSpacing: '-0.374px',
          color: '#FFFFFF',
          flexShrink: 0,
          transition: 'opacity var(--transition)',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >aha!</button>

        {/* 메인 네비 — 데스크톱 */}
        <nav style={{ display: 'flex', gap: '4px', flex: 1, overflowX: 'auto' }}
          className="desktop-nav">
          {NAV_ITEMS.map(item => (
            <button key={item.key} onClick={() => navigate(item.key)} style={{
              height: '28px', padding: '0 10px',
              fontSize: 'var(--text-fine)',      /* 12px */
              fontWeight: 400,
              letterSpacing: '-0.12px',
              color: currentPage === item.key ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
              borderRadius: 'var(--r-xs)',
              background: currentPage === item.key ? 'rgba(255,255,255,0.12)' : 'transparent',
              transition: 'color var(--transition), background-color var(--transition)',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
              onMouseEnter={e => { if (currentPage !== item.key) e.currentTarget.style.color = '#FFFFFF' }}
              onMouseLeave={e => { if (currentPage !== item.key) e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
            >{item.label}</button>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        {/* 검색 */}
        <form onSubmit={handleSearch} style={{ flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', pointerEvents: 'none' }}
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input style={{
              width: '160px', height: '28px', padding: '0 12px 0 30px',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 'var(--r-pill)',
              fontSize: 'var(--text-fine)',
              color: '#FFFFFF', outline: 'none',
              transition: 'background-color var(--transition), width var(--transition)',
            }}
              placeholder="검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={e => { e.target.style.width = '200px'; e.target.style.background = 'rgba(255,255,255,0.18)' }}
              onBlur={e => { e.target.style.width = '160px'; e.target.style.background = 'rgba(255,255,255,0.12)' }}
            />
          </div>
        </form>

        {/* 유저 영역 */}
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, position: 'relative' }}>
            <button onClick={() => navigate('notification')} style={{
              width: '28px', height: '28px', borderRadius: 'var(--r-sm)',
              color: 'rgba(255,255,255,0.75)', fontSize: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color var(--transition)',
            }}
              onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
            >🔔</button>

            <button onClick={() => setUserMenuOpen(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              height: '28px', padding: '0 10px',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 'var(--r-sm)',
              fontSize: 'var(--text-fine)', fontWeight: 400,
              color: '#FFFFFF',
              transition: 'background-color var(--transition)',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            >
              <span style={{
                width: '18px', height: '18px', borderRadius: '50%',
                background: 'var(--color-primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '9px', fontWeight: 600,
              }}>{currentUser.nickname[0]}</span>
              {currentUser.nickname}
            </button>

            {userMenuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setUserMenuOpen(false)} />
                <div style={{
                  position: 'absolute', right: 0, top: '36px',
                  background: 'rgba(29, 29, 31, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', padding: '6px',
                  minWidth: '180px', zIndex: 200,
                  boxShadow: 'rgba(0,0,0,0.4) 0 8px 32px',
                }}>
                  {[
                    { label: '마이페이지',  action: () => { navigate('my'); setUserMenuOpen(false) } },
                    { label: '내 프로필',   action: () => { navigate(`profile/${currentUser.id}`); setUserMenuOpen(false) } },
                    { label: '즐겨찾기',    action: () => { navigate('bookmarks'); setUserMenuOpen(false) } },
                    { label: '글 작성',     action: () => { navigate('write'); setUserMenuOpen(false) } },
                    null,
                    { label: '로그아웃',    action: () => { logout(); setUserMenuOpen(false) }, danger: true },
                  ].map((item, i) => item === null
                    ? <div key={i} style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                    : <button key={item.label} onClick={item.action} style={{
                        width: '100%', textAlign: 'left', padding: '8px 12px',
                        borderRadius: '8px', fontSize: '13px', fontWeight: 400,
                        color: item.danger ? '#FF453A' : 'rgba(255,255,255,0.85)',
                        transition: 'background-color var(--transition)',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >{item.label}</button>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button onClick={() => navigate('login')} style={{
              height: '28px', padding: '0 12px',
              fontSize: 'var(--text-fine)', fontWeight: 400,
              color: 'rgba(255,255,255,0.75)', borderRadius: 'var(--r-sm)',
              transition: 'color var(--transition)',
            }}
              onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
            >로그인</button>
            <button onClick={() => navigate('signup')} style={{
              height: '28px', padding: '0 14px',
              background: 'var(--color-primary)',
              color: '#FFFFFF',
              fontSize: 'var(--text-fine)', fontWeight: 600,
              borderRadius: 'var(--r-pill)',
              transition: 'background-color var(--transition)',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary)'}
            >회원가입</button>
          </div>
        )}
      </header>
    </>
  )
}
