import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Header({ currentPage, navigate }) {
  const { currentUser, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  function handleSearch(e) {
    e.preventDefault()
    if (searchQuery.trim()) navigate(`board?q=${encodeURIComponent(searchQuery.trim())}`)
  }

  return (
    <header style={{
      background: 'rgba(13,13,13,0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--color-border)',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: '16px',
    }}>
      {/* 로고 */}
      <button onClick={() => navigate('home')} style={{
        fontFamily: 'var(--font-display)',
        fontSize: '28px',
        color: 'var(--color-accent)',
        letterSpacing: '2px',
        flexShrink: 0,
      }}>aha!</button>

      {/* 검색창 */}
      <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: '360px' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', fontSize: '14px' }}>🔍</span>
          <input
            className="input"
            style={{ paddingLeft: '36px' }}
            placeholder="검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </form>

      <div style={{ flex: 1 }} />

      {/* 네비게이션 */}
      <nav style={{ display: 'flex', gap: '4px' }}>
        {[
          { label: '홈', key: 'home' },
          { label: '게시판', key: 'board' },
        ].map(item => (
          <button key={item.key} onClick={() => navigate(item.key)} className="btn btn-ghost" style={{
            padding: '6px 14px',
            fontSize: '13px',
            borderColor: currentPage === item.key ? 'var(--color-accent)' : 'transparent',
            color: currentPage === item.key ? 'var(--color-accent)' : 'var(--color-muted)',
          }}>{item.label}</button>
        ))}
      </nav>

      {/* 유저 메뉴 */}
      {currentUser ? (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 12px',
              background: 'var(--color-surface2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text)',
              fontSize: '13px',
            }}
          >
            <span style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: 'var(--color-accent)', color: '#000',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700,
            }}>{currentUser.nickname[0]}</span>
            {currentUser.nickname}
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '44px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '8px',
              minWidth: '160px',
              zIndex: 200,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}>
              {[
                { label: '내 프로필', action: () => { navigate(`profile/${currentUser.id}`); setMenuOpen(false) } },
                { label: '즐겨찾기', action: () => { navigate('bookmarks'); setMenuOpen(false) } },
                { label: '글 작성', action: () => { navigate('write'); setMenuOpen(false) } },
                { label: '로그아웃', action: () => { logout(); setMenuOpen(false) }, danger: true },
              ].map(item => (
                <button key={item.label} onClick={item.action} style={{
                  width: '100%', textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  color: item.danger ? 'var(--color-danger)' : 'var(--color-text)',
                  transition: 'var(--transition)',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >{item.label}</button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => navigate('login')} className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: '13px' }}>로그인</button>
          <button onClick={() => navigate('signup')} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '13px' }}>회원가입</button>
        </div>
      )}
    </header>
  )
}
