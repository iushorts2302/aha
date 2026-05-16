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

  return (
    <header style={{
      height: 'var(--nav-height)',
      background: 'rgba(255,255,255,0.88)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--color-border-soft)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 40px',
      gap: '32px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* 워드마크 */}
      <button onClick={() => navigate('home')} style={{
        fontSize: '14px', fontWeight: 500,
        letterSpacing: '0.24em',
        color: 'var(--color-ink)',
        textTransform: 'uppercase',
        flexShrink: 0,
        transition: 'opacity var(--transition)',
      }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.5'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >AHA</button>

      {/* 네비 */}
      <nav style={{ display: 'flex', gap: '0' }}>
        {[{ label: '홈', key: 'home' }, { label: '게시판', key: 'board' }].map(item => (
          <button key={item.key} onClick={() => navigate(item.key)} style={{
            height: '32px', padding: '0 16px',
            fontSize: '14px', fontWeight: 500,
            color: currentPage === item.key ? 'var(--color-ink)' : 'var(--color-muted)',
            transition: 'color var(--transition)',
            borderRadius: 'var(--radius-btn)',
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-ink)'}
            onMouseLeave={e => { if (currentPage !== item.key) e.currentTarget.style.color = 'var(--color-muted)' }}
          >{item.label}</button>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {/* 검색 */}
      <form onSubmit={handleSearch}>
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-placeholder)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input className="input" style={{ paddingLeft: '32px', height: '32px', width: '220px', fontSize: '13px', background: 'var(--color-surface)' }}
            placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </form>

      {/* 유저 */}
      {currentUser ? (
        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            height: '32px', padding: '0 14px', borderRadius: 'var(--radius-btn)',
            fontSize: '14px', fontWeight: 500, color: 'var(--color-ink)',
            transition: 'background-color var(--transition)',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: 'var(--color-ink)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 600,
            }}>{currentUser.nickname[0]}</span>
            {currentUser.nickname}
          </button>
          {menuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setMenuOpen(false)} />
              <div style={{
                position: 'absolute', right: 0, top: '40px',
                background: '#fff', border: '1px solid var(--color-border-soft)',
                borderRadius: '4px', padding: '4px', minWidth: '160px', zIndex: 200,
              }}>
                {[
                  { label: '내 프로필', action: () => { navigate(`profile/${currentUser.id}`); setMenuOpen(false) } },
                  { label: '즐겨찾기', action: () => { navigate('bookmarks'); setMenuOpen(false) } },
                  { label: '글 작성', action: () => { navigate('write'); setMenuOpen(false) } },
                  null,
                  { label: '로그아웃', action: () => { logout(); setMenuOpen(false) }, danger: true },
                ].map((item, i) => item === null ? (
                  <div key={i} style={{ height: '1px', background: 'var(--color-border-soft)', margin: '4px 0' }} />
                ) : (
                  <button key={item.label} onClick={item.action} style={{
                    width: '100%', textAlign: 'left', padding: '8px 12px',
                    borderRadius: 'var(--radius-btn)', fontSize: '13px',
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
          <button onClick={() => navigate('login')} style={{
            height: '32px', padding: '0 16px', fontSize: '14px', fontWeight: 500,
            color: 'var(--color-muted)', borderRadius: 'var(--radius-btn)', transition: 'color var(--transition)',
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-ink)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted)'}
          >로그인</button>
          <button onClick={() => navigate('signup')} className="btn btn-primary" style={{ height: '32px', padding: '0 18px' }}>
            회원가입
          </button>
        </div>
      )}
    </header>
  )
}
