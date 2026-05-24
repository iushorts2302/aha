import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { label: '홈',       key: 'home' },
  { label: 'AI',       key: 'ai' },
  { label: '개발',     key: 'dev' },
  { label: '스타트업', key: 'startup' },
  { label: '디자인',   key: 'design' },
  { label: '게임',     key: 'game' },
  { label: '금융',     key: 'finance' },
  { label: '학습',     key: 'learn' },
  { label: '게시판',   key: 'board' },
]

export default function Header({ currentPage, navigate }) {
  const { currentUser, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  function handleNav(key) {
    navigate(key)
    setMobileOpen(false)
    setUserMenuOpen(false)
  }

  function handleSearch(e) {
    e.preventDefault()
    const q = search.trim()
    if (q) {
      navigate(`search?q=${encodeURIComponent(q)}`)
      setSearch('')
      setMobileOpen(false)
    }
  }

  return (
    <>
      <nav className="aha-glass-dark" style={{
        position: 'sticky', top: 0, zIndex: 1030,
        minHeight: 'var(--nav-height)',
      }}>
        {/* ── 상단 바 ── */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', height: 'var(--nav-height)', gap: 12 }}>

          {/* 로고 */}
          <button type="button" onClick={() => handleNav('home')} style={{
            background: 'transparent', border: 'none', padding: 0,
            color: '#fff', fontWeight: 600, fontSize: 17,
            letterSpacing: '-0.374px', cursor: 'pointer', flexShrink: 0,
          }}>aha!</button>

          {/* 데스크톱 메뉴 (992px+) */}
          <nav className="d-none d-lg-flex" style={{
            flex: 1, overflowX: 'auto', scrollbarWidth: 'none',
            display: 'flex', gap: 0,
          }}>
            {NAV_ITEMS.map(item => {
              const active = currentPage === item.key
              return (
                <button key={item.key} type="button"
                  onClick={() => handleNav(item.key)}
                  style={{
                    background: 'transparent', border: 'none',
                    borderBottom: active ? '2px solid #fff' : '2px solid transparent',
                    borderRadius: 0,
                    padding: '6px 8px',
                    fontSize: 12, fontWeight: active ? 700 : 400,
                    color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                    whiteSpace: 'nowrap', cursor: 'pointer',
                    transition: 'color 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
                >{item.label}</button>
              )
            })}
          </nav>

          {/* 검색 (데스크톱) */}
          <form className="d-none d-lg-flex" onSubmit={handleSearch} style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex' }}>
              <input
                style={{
                  width: 120, height: 26, padding: '0 10px',
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRight: 'none',
                  borderRadius: 'var(--r-pill) 0 0 var(--r-pill)',
                  fontSize: 12, color: '#fff', outline: 'none',
                }}
                placeholder="검색..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button type="submit" style={{
                height: 26, padding: '0 10px',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '0 var(--r-pill) var(--r-pill) 0',
                color: '#fff', fontSize: 12, cursor: 'pointer',
              }}>🔍</button>
            </div>
          </form>

          {/* 유저 (데스크톱) */}
          <div className="d-none d-lg-block" style={{ flexShrink: 0, position: 'relative' }}>
            {currentUser ? (
              <>
                <button type="button"
                  onClick={() => setUserMenuOpen(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 'var(--r-sm)', padding: '4px 10px',
                    color: '#fff', fontSize: 12, cursor: 'pointer',
                  }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'var(--color-primary)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, flexShrink: 0,
                  }}>{(currentUser.nickname || '?')[0]}</span>
                  {currentUser.nickname}
                </button>
                {userMenuOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1040 }} onClick={() => setUserMenuOpen(false)} />
                    <div style={{
                      position: 'absolute', right: 0, top: 34, zIndex: 1050,
                      background: 'rgba(29,29,31,0.97)', backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12, padding: 6, minWidth: 160,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    }}>
                      {[
                        { label: '마이페이지', key: 'my' },
                        { label: '내 프로필',  key: `profile/${currentUser.id}` },
                        { label: '글 작성',    key: 'write' },
                      ].map(m => (
                        <button key={m.key} type="button"
                          onClick={() => handleNav(m.key)}
                          style={{ width: '100%', textAlign: 'left', padding: '7px 12px', borderRadius: 8, fontSize: 13, color: 'rgba(255,255,255,0.85)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >{m.label}</button>
                      ))}
                      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                      <button type="button"
                        onClick={() => { logout(); handleNav('home') }}
                        style={{ width: '100%', textAlign: 'left', padding: '7px 12px', borderRadius: 8, fontSize: 13, color: '#FF453A', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >로그아웃</button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => handleNav('login')} style={{ height: 26, padding: '0 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 'var(--r-sm)', color: '#fff', fontSize: 12, cursor: 'pointer' }}>로그인</button>
                <button type="button" onClick={() => handleNav('signup')} style={{ height: 26, padding: '0 12px', background: 'var(--color-primary)', border: 'none', borderRadius: 'var(--r-pill)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>회원가입</button>
              </div>
            )}
          </div>

          {/* 햄버거 (모바일) — d-lg-none */}
          <button
            type="button"
            className="d-lg-none"
            onClick={() => setMobileOpen(v => !v)}
            style={{
              marginLeft: 'auto', background: 'transparent', border: 'none',
              padding: 6, cursor: 'pointer', color: '#fff',
            }}
            aria-label="메뉴 열기"
          >
            {mobileOpen ? (
              /* X 아이콘 */
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            ) : (
              /* 햄버거 아이콘 */
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 6h18M3 12h18M3 18h18"/>
              </svg>
            )}
          </button>
        </div>

        {/* ── 모바일 드롭다운 패널 ── */}
        {mobileOpen && (
          <div className="d-lg-none" style={{
            background: 'rgba(18,18,18,0.98)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '12px 0 20px',
            maxHeight: '80vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            width: '100%',
            boxSizing: 'border-box',
          }}>
            {/* 검색 */}
            <div style={{ padding: '0 16px 12px' }}>
              <form onSubmit={handleSearch} style={{ display: 'flex' }}>
                <input
                  style={{
                    flex: 1, height: 36, padding: '0 14px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRight: 'none',
                    borderRadius: 'var(--r-pill) 0 0 var(--r-pill)',
                    fontSize: 13, color: '#fff', outline: 'none',
                  }}
                  placeholder="검색..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <button type="submit" style={{
                  height: 36, padding: '0 14px',
                  background: 'var(--color-primary)', border: 'none',
                  borderRadius: '0 var(--r-pill) var(--r-pill) 0',
                  color: '#fff', fontSize: 13, cursor: 'pointer',
                }}>🔍</button>
              </form>
            </div>

            {/* 메뉴 목록 */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {NAV_ITEMS.map(item => {
                const active = currentPage === item.key
                return (
                  <button key={item.key} type="button"
                    onClick={() => handleNav(item.key)}
                    style={{
                      padding: '11px 20px',
                      textAlign: 'left', background: 'transparent', border: 'none',
                      fontSize: 15,
                      fontWeight: active ? 700 : 400,
                      color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                      borderLeft: active ? '3px solid var(--color-primary)' : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'background-color 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >{item.label}</button>
                )
              })}
            </div>

            {/* 유저 영역 */}
            <div style={{ padding: '12px 16px 0', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 8 }}>
              {currentUser ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 6px' }}>
                    {currentUser.nickname} 님
                  </p>
                  {[
                    { label: '마이페이지', key: 'my' },
                    { label: '내 프로필', key: `profile/${currentUser.id}` },
                    { label: '글 작성', key: 'write' },
                  ].map(m => (
                    <button key={m.key} type="button"
                      onClick={() => handleNav(m.key)}
                      style={{ padding: '9px 0', textAlign: 'left', background: 'transparent', border: 'none', fontSize: 14, color: 'rgba(255,255,255,0.85)', cursor: 'pointer' }}>
                      {m.label}
                    </button>
                  ))}
                  <button type="button"
                    onClick={() => { logout(); handleNav('home') }}
                    style={{ padding: '9px 0', textAlign: 'left', background: 'transparent', border: 'none', fontSize: 14, color: '#FF453A', cursor: 'pointer' }}>
                    로그아웃
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => handleNav('login')}
                    style={{ flex: 1, height: 40, background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 'var(--r-pill)', color: '#fff', fontSize: 14, cursor: 'pointer' }}>
                    로그인
                  </button>
                  <button type="button" onClick={() => handleNav('signup')}
                    style={{ flex: 1, height: 40, background: 'var(--color-primary)', border: 'none', borderRadius: 'var(--r-pill)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    회원가입
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  )
}
