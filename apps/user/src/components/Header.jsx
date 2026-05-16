import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { label: '홈',     key: 'home' },
  { label: '인기',   key: 'trending' },
  { label: '피드',   key: 'feed' },
  { label: '게시판', key: 'board' },
  { label: '갤러리', key: 'gallery' },
  { label: '커뮤니티',key: 'community' },
  { label: '정보',   key: 'knowledge' },
  { label: '마켓',   key: 'market' },
  { label: 'AI 허브',key: 'aihub' },
]

export default function Header({ currentPage, navigate }) {
  const { currentUser, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')

  function handleSearch(e) {
    e.preventDefault()
    if (search.trim()) { navigate(`board?q=${encodeURIComponent(search.trim())}`); setSearch('') }
  }

  return (
    <>
      <header style={{
        height: 'var(--nav-height)',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--color-border-soft)',
        display: 'flex', alignItems: 'center',
        padding: '0 var(--space-6)', gap: 'var(--space-5)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        {/* 워드마크 */}
        <button onClick={() => navigate('home')} style={{
          fontSize: 'var(--text-sm)', fontWeight: 800,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'var(--color-ink)', flexShrink: 0,
          transition: 'opacity var(--transition)',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.6'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <span style={{ color: 'var(--color-accent)' }}>A</span>HA
        </button>

        {/* 데스크톱 네비 */}
        <nav style={{ display: 'flex', gap: '2px', overflowX: 'auto' }}>
          {NAV_ITEMS.map(item => (
            <button key={item.key} onClick={() => navigate(item.key)} style={{
              height: '32px', padding: '0 var(--space-3)',
              fontSize: '13px', fontWeight: 700,
              color: currentPage === item.key ? 'var(--color-ink)' : 'var(--color-muted)',
              borderRadius: 'var(--radius-btn)',
              background: currentPage === item.key ? 'var(--color-surface)' : 'transparent',
              transition: 'color var(--transition), background-color var(--transition)',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
              onMouseEnter={e => { if (currentPage !== item.key) e.currentTarget.style.color = 'var(--color-ink)' }}
              onMouseLeave={e => { if (currentPage !== item.key) e.currentTarget.style.color = 'var(--color-muted)' }}
            >{item.label}</button>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        {/* 검색 */}
        <form onSubmit={handleSearch} style={{ flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-placeholder)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input className="input" style={{ paddingLeft: '30px', height: '32px', width: '180px', fontSize: '13px', background: 'var(--color-surface)' }}
              placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </form>

        {/* 유저 */}
        {currentUser ? (
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexShrink: 0 }}>
            <button onClick={() => navigate('notification')} style={{ height: '32px', padding: '0 var(--space-2)', fontSize: '16px', color: 'var(--color-muted)', borderRadius: 'var(--radius-btn)', transition: 'color var(--transition)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-ink)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted)'}
            >🔔</button>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setMenuOpen(v => !v)} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                height: '32px', padding: '0 var(--space-3)', borderRadius: 'var(--radius-btn)',
                fontSize: '13px', fontWeight: 700, color: 'var(--color-ink)',
                transition: 'background-color var(--transition)',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800 }}>
                  {currentUser.nickname[0]}
                </span>
                {currentUser.nickname}
              </button>
              {menuOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setMenuOpen(false)} />
                  <div style={{ position: 'absolute', right: 0, top: '40px', background: '#fff', border: '1px solid var(--color-border-soft)', borderRadius: '4px', padding: '4px', minWidth: '160px', zIndex: 200 }}>
                    {[
                      { label: '마이페이지', action: () => { navigate('my'); setMenuOpen(false) } },
                      { label: '내 프로필',  action: () => { navigate(`profile/${currentUser.id}`); setMenuOpen(false) } },
                      { label: '즐겨찾기',   action: () => { navigate('bookmarks'); setMenuOpen(false) } },
                      { label: '글 작성',    action: () => { navigate('write'); setMenuOpen(false) } },
                      null,
                      { label: '로그아웃',   action: () => { logout(); setMenuOpen(false) }, danger: true },
                    ].map((item, i) => item === null
                      ? <div key={i} style={{ height: '1px', background: 'var(--color-border-soft)', margin: '4px 0' }} />
                      : <button key={item.label} onClick={item.action} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 'var(--radius-btn)', fontSize: '13px', color: item.danger ? 'var(--color-danger)' : 'var(--color-body)', transition: 'background-color var(--transition)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >{item.label}</button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
            <button onClick={() => navigate('login')} style={{ height: '32px', padding: '0 var(--space-4)', fontSize: '13px', fontWeight: 700, color: 'var(--color-muted)', borderRadius: 'var(--radius-btn)', transition: 'color var(--transition)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-ink)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted)'}
            >로그인</button>
            <button onClick={() => navigate('signup')} className="btn btn-primary" style={{ height: '32px', padding: '0 var(--space-4)' }}>회원가입</button>
          </div>
        )}
      </header>
    </>
  )
}
