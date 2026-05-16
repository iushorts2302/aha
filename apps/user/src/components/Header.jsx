import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Header({ currentPage, navigate }) {
  const { currentUser, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [search, setSearch] = useState('')

  function handleSearch(e) {
    e.preventDefault()
    if (search.trim()) { navigate(`board?q=${encodeURIComponent(search.trim())}`); setSearch('') }
  }

  const navItems = [
    { label: '홈', key: 'home' },
    { label: '게시판', key: 'board' },
  ]

  return (
    <header style={{
      height: 'var(--nav-height)',
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--color-border-soft)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 32px',
      gap: '24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>

      {/* 워드마크 */}
      <button onClick={() => navigate('home')} style={{
        fontSize: '16px',
        fontWeight: 600,
        letterSpacing: '0.18em',
        color: 'var(--color-ink)',
        textTransform: 'uppercase',
        flexShrink: 0,
      }}>AHA</button>

      {/* 검색 */}
      <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: '320px' }}>
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-placeholder)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="input" style={{ paddingLeft: '36px', height: '34px' }} placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </form>

      <div style={{ flex: 1 }} />

      {/* 네비게이션 */}
      <nav style={{ display: 'flex', gap: '2px' }}>
        {navItems.map(item => (
          <button key={item.key} onClick={() => navigate(item.key)} style={{
            height: '32px', padding: '0 14px',
            borderRadius: 'var(--radius-btn)',
            fontSize: '14px', fontWeight: '500',
            color: currentPage === item.key ? 'var(--color-ink)' : 'var(--color-muted)',
            background: currentPage === item.key ? 'var(--color-surface)' : 'transparent',
            transition: 'color var(--transition), background-color var(--transition)',
          }}
            onMouseEnter={e => { if (currentPage !== item.key) e.currentTarget.style.color = 'var(--color-ink)' }}
            onMouseLeave={e => { if (currentPage !== item.key) e.currentTarget.style.color = 'var(--color-muted)' }}
          >{item.label}</button>
        ))}
      </nav>

      {/* 유저 영역 */}
      {currentUser ? (
        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            height: '32px', padding: '0 12px',
            borderRadius: 'var(--radius-btn)',
            fontSize: '13px', fontWeight: 500,
            color: 'var(--color-ink)',
            border: '1px solid var(--color-border)',
            transition: 'border-color var(--transition)',
          }}>
            <span style={{
              width: '20px', height: '20px', borderRadius: '50%',
              background: 'var(--color-accent)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 600, flexShrink: 0,
            }}>{currentUser.nickname[0]}</span>
            {currentUser.nickname}
          </button>
          {menuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setMenuOpen(false)} />
              <div style={{
                position: 'absolute', right: 0, top: '40px',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border-soft)',
                borderRadius: 'var(--radius-card)',
                padding: '6px',
                minWidth: '160px',
                zIndex: 200,
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              }}>
                {[
                  { label: '내 프로필', action: () => { navigate(`profile/${currentUser.id}`); setMenuOpen(false) } },
                  { label: '즐겨찾기', action: () => { navigate('bookmarks'); setMenuOpen(false) } },
                  { label: '글 작성', action: () => { navigate('write'); setMenuOpen(false) } },
                  { label: '로그아웃', action: () => { logout(); setMenuOpen(false) }, danger: true },
                ].map(item => (
                  <button key={item.label} onClick={item.action} style={{
                    width: '100%', textAlign: 'left',
                    padding: '8px 12px', borderRadius: 'var(--radius-btn)',
                    fontSize: '13px',
                    color: item.danger ? 'var(--color-danger)' : 'var(--color-body)',
                    transition: 'background-color var(--transition)',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >{item.label}</button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => navigate('login')} className="btn btn-ghost">로그인</button>
          <button onClick={() => navigate('signup')} className="btn btn-primary btn-sm">회원가입</button>
        </div>
      )}
    </header>
  )
}
