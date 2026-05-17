import { useState, useRef } from 'react'
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
  const [search, setSearch] = useState('')
  const collapseRef = useRef(null)

  function closeMenu() {
    const el = collapseRef.current
    if (el?.classList.contains('show')) {
      window.bootstrap?.Collapse.getInstance(el)?.hide()
    }
  }

  function handleNav(key) {
    navigate(key)
    closeMenu()
  }

  function handleSearch(e) {
    e.preventDefault()
    const q = search.trim()
    if (q) { navigate(`search?q=${encodeURIComponent(q)}`); setSearch(''); closeMenu() }
  }

  return (
    <nav className="navbar navbar-expand-lg sticky-top"
      style={{ background: 'var(--color-nav-black)', zIndex: 1030, minHeight: 'var(--nav-height)' }}>
      <div className="container-fluid px-3">

        {/* 워드마크 — 배경 투명 */}
        <button
          onClick={() => handleNav('home')}
          className="navbar-brand border-0 p-0 bg-transparent"
          style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 17, letterSpacing: '-0.374px' }}>
          aha!
        </button>

        {/* 모바일 토글 */}
        <button className="navbar-toggler border-0 p-1" type="button"
          data-bs-toggle="collapse" data-bs-target="#mainNav"
          aria-controls="mainNav" aria-expanded="false" aria-label="메뉴 열기">
          <span className="navbar-toggler-icon" />
        </button>

        {/* 콜랩스 영역 */}
        <div className="collapse navbar-collapse" id="mainNav" ref={collapseRef}>

          {/* 메인 링크 */}
          <ul className="navbar-nav me-auto" style={{ flexDirection: 'row', flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none', gap: 0 }}>
            {NAV_ITEMS.map(item => {
              const isActive = currentPage === item.key
              return (
                <li className="nav-item flex-shrink-0" key={item.key}>
                  <button
                    onClick={() => handleNav(item.key)}
                    className="nav-link border-0 bg-transparent px-2 py-1"
                    style={{
                      fontSize: 12,
                      fontWeight: isActive ? 700 : 400,
                      color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
                      // 선택 메뉴: 흰색 하단 밑줄 + 배경 강조
                      borderBottom: isActive ? '2px solid #FFFFFF' : '2px solid transparent',
                      borderRadius: 0,
                      whiteSpace: 'nowrap',
                      transition: 'color 0.15s, border-color 0.15s',
                      paddingBottom: 6,
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#FFFFFF' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}>
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ul>

          {/* 검색 */}
          <form className="d-flex me-2 my-2 my-lg-0" onSubmit={handleSearch}>
            <div className="input-group input-group-sm" style={{ minWidth: 0 }}>
              <input
                className="form-control form-control-sm"
                style={{
                  borderRadius: 'var(--r-pill) 0 0 var(--r-pill)',
                  fontSize: 12,
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  minWidth: 110,
                }}
                placeholder="검색..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button className="btn btn-sm btn-outline-light" type="submit"
                style={{ borderRadius: '0 var(--r-pill) var(--r-pill) 0', fontSize: 12 }}>
                🔍
              </button>
            </div>
          </form>

          {/* 유저 영역 */}
          {currentUser ? (
            <div className="dropdown my-2 my-lg-0">
              <button
                className="btn btn-sm d-flex align-items-center gap-2"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  borderRadius: 'var(--r-sm)',
                  fontSize: 12,
                }}
                data-bs-toggle="dropdown">
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'var(--color-primary)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, flexShrink: 0,
                }}>
                  {currentUser.nickname[0]}
                </span>
                <span className="d-none d-sm-inline">{currentUser.nickname}</span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><button className="dropdown-item" onClick={() => handleNav('my')}>마이페이지</button></li>
                <li><button className="dropdown-item" onClick={() => handleNav(`profile/${currentUser.id}`)}>내 프로필</button></li>
                <li><button className="dropdown-item" onClick={() => handleNav('write')}>글 작성</button></li>
                <li><hr className="dropdown-divider" /></li>
                <li><button className="dropdown-item text-danger" onClick={() => { logout(); handleNav('home') }}>로그아웃</button></li>
              </ul>
            </div>
          ) : (
            <div className="d-flex gap-2 my-2 my-lg-0">
              <button className="btn btn-sm btn-outline-light"
                style={{ borderRadius: 'var(--r-sm)', fontSize: 12 }}
                onClick={() => handleNav('login')}>로그인</button>
              <button className="btn btn-sm btn-primary"
                style={{ fontSize: 12 }}
                onClick={() => handleNav('signup')}>회원가입</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
