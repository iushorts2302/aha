import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { label: '홈',       key: 'home' },
  { label: '인기',     key: 'trending' },
  { label: 'AI 뉴스',  key: 'ai' },
  { label: '개발',     key: 'dev' },
  { label: '오픈소스', key: 'oss' },
  { label: '스타트업', key: 'startup' },
  { label: 'IT 뉴스',  key: 'itnews' },
  { label: '디자인',   key: 'design' },
  { label: '게시판',   key: 'board' },
  { label: '게임',     key: 'game' },
  { label: '주식/코인',key: 'finance' },
  { label: '마켓',     key: 'market' },
  { label: '취업',     key: 'job' },
  { label: '학습',     key: 'learn' },
  { label: '논문',     key: 'research' },
  { label: '영상',     key: 'video' },
  { label: '라이브',   key: 'live' },
]

export default function Header({ currentPage, navigate }) {
  const { currentUser, logout } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [search, setSearch] = useState('')

  function handleSearch(e) {
    e.preventDefault()
    const q = search.trim()
    if (q) { navigate(`search?q=${encodeURIComponent(q)}`); setSearch('') }
  }

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      height: 'var(--nav-height)',
      background: 'var(--color-nav-black)',
      backdropFilter: 'saturate(180%) blur(20px)',
      WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      display: 'flex', alignItems: 'center',
      padding: '0 22px', gap: '16px',
    }}>
      {/* 워드마크 */}
      <button onClick={() => navigate('home')} style={{
        fontSize: '17px', fontWeight: 600, letterSpacing: '-0.374px',
        color: '#FFFFFF', flexShrink: 0,
        transition: 'opacity var(--transition)',
      }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >aha!</button>

      {/* 스크롤 가능한 네비 */}
      <nav style={{ display: 'flex', gap: '2px', flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {NAV_ITEMS.map(item => (
          <button key={item.key} onClick={() => navigate(item.key)} style={{
            height: '28px', padding: '0 9px',
            fontSize: 'var(--text-fine)', fontWeight: 400,
            letterSpacing: '-0.12px',
            color: currentPage === item.key ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
            borderRadius: 'var(--r-xs)',
            background: currentPage === item.key ? 'rgba(255,255,255,0.12)' : 'transparent',
            transition: 'color var(--transition), background-color var(--transition)',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
            onMouseEnter={e => { if (currentPage !== item.key) e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { if (currentPage !== item.key) e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
          >{item.label}</button>
        ))}
      </nav>

      {/* 검색 */}
      <form onSubmit={handleSearch} style={{ flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.45)', pointerEvents: 'none' }}
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input style={{
            width: '140px', height: '26px', padding: '0 10px 0 28px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 'var(--r-pill)',
            fontSize: '12px', color: '#fff', outline: 'none',
            transition: 'width var(--transition), background-color var(--transition)',
          }}
            placeholder="검색" value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={e => { e.target.style.width = '190px'; e.target.style.background = 'rgba(255,255,255,0.16)' }}
            onBlur={e => { e.target.style.width = '140px'; e.target.style.background = 'rgba(255,255,255,0.1)' }}
          />
        </div>
      </form>

      {/* 유저 */}
      {currentUser ? (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => setUserMenuOpen(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            height: '26px', padding: '0 9px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 'var(--r-sm)',
            fontSize: '12px', color: '#fff',
          }}>
            <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 600 }}>
              {currentUser.nickname[0]}
            </span>
            {currentUser.nickname}
          </button>
          {userMenuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setUserMenuOpen(false)} />
              <div style={{ position: 'absolute', right: 0, top: '34px', background: 'rgba(29,29,31,0.96)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '6px', minWidth: '170px', zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                {[
                  { label: '마이페이지',  action: () => { navigate('my'); setUserMenuOpen(false) } },
                  { label: '내 프로필',   action: () => { navigate(`profile/${currentUser.id}`); setUserMenuOpen(false) } },
                  { label: '글 작성',     action: () => { navigate('write'); setUserMenuOpen(false) } },
                  null,
                  { label: '로그아웃',    action: () => { logout(); setUserMenuOpen(false) }, danger: true },
                ].map((item, i) => item === null
                  ? <div key={i} style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                  : <button key={item.label} onClick={item.action} style={{ width: '100%', textAlign: 'left', padding: '7px 12px', borderRadius: '8px', fontSize: '13px', color: item.danger ? '#FF453A' : 'rgba(255,255,255,0.85)', transition: 'background-color var(--transition)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >{item.label}</button>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button onClick={() => navigate('login')} style={{ height: '26px', padding: '0 10px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', borderRadius: 'var(--r-sm)', transition: 'color var(--transition)' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
          >로그인</button>
          <button onClick={() => navigate('signup')} style={{ height: '26px', padding: '0 12px', background: 'var(--color-primary)', color: '#fff', fontSize: '12px', fontWeight: 600, borderRadius: 'var(--r-pill)', transition: 'background-color var(--transition)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary)'}
          >회원가입</button>
        </div>
      )}
    </header>
  )
}
