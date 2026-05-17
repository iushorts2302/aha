import { useState, useRef, useEffect } from 'react'
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

  function handleSearch(e) {
    e.preventDefault()
    const q = search.trim()
    if (q) {
      navigate(`search?q=${encodeURIComponent(q)}`)
      setSearch('')
      // 모바일 메뉴 닫기
      const bsCollapse = window.bootstrap?.Collapse.getInstance(collapseRef.current)
      bsCollapse?.hide()
    }
  }

  function handleNav(key) {
    navigate(key)
    const bsCollapse = window.bootstrap?.Collapse.getInstance(collapseRef.current)
    bsCollapse?.hide()
  }

  return (
    <nav className="navbar navbar-expand-lg sticky-top" style={{ zIndex: 1030 }}>
      <div className="container-fluid px-3">

        {/* 브랜드 */}
        <button className="navbar-brand fw-semibold" onClick={() => handleNav('home')}
          style={{ color: '#fff', letterSpacing: '-0.374px', fontSize: '17px' }}>
          aha!
        </button>

        {/* 모바일 토글 */}
        <button className="navbar-toggler border-0" type="button"
          data-bs-toggle="collapse" data-bs-target="#mainNav"
          aria-controls="mainNav" aria-expanded="false" aria-label="메뉴 열기">
          <span className="navbar-toggler-icon" />
        </button>

        {/* 네비 + 검색 + 유저 */}
        <div className="collapse navbar-collapse" id="mainNav" ref={collapseRef}>
          {/* 메인 링크 (가로 스크롤) */}
          <ul className="navbar-nav me-auto flex-row flex-wrap gap-0"
            style={{ overflowX: 'auto', flexWrap: 'nowrap', scrollbarWidth: 'none' }}>
            {NAV_ITEMS.map(item => (
              <li className="nav-item" key={item.key}>
                <button
                  className={`nav-link px-2 py-1${currentPage === item.key ? ' active fw-semibold' : ''}`}
                  onClick={() => handleNav(item.key)}
                  style={{ fontSize: '12px', whiteSpace: 'nowrap', background: 'none', border: 'none' }}>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          {/* 검색 */}
          <form className="d-flex me-2 my-2 my-lg-0" onSubmit={handleSearch} style={{ minWidth: 0 }}>
            <div className="input-group input-group-sm">
              <input
                className="form-control"
                style={{ borderRadius: 'var(--r-pill) 0 0 var(--r-pill)', fontSize: '13px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', minWidth: '120px' }}
                placeholder="검색..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button className="btn btn-sm btn-outline-light" type="submit"
                style={{ borderRadius: '0 var(--r-pill) var(--r-pill) 0' }}>
                🔍
              </button>
            </div>
          </form>

          {/* 유저 */}
          {currentUser ? (
            <div className="dropdown my-2 my-lg-0">
              <button className="btn btn-sm d-flex align-items-center gap-2"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 'var(--r-sm)', fontSize: '12px' }}
                data-bs-toggle="dropdown" aria-expanded="false">
                <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 600, flexShrink: 0 }}>
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
              <button className="btn btn-sm btn-outline-light" style={{ borderRadius: 'var(--r-sm)', fontSize: '12px' }} onClick={() => handleNav('login')}>로그인</button>
              <button className="btn btn-sm btn-primary" style={{ fontSize: '12px' }} onClick={() => handleNav('signup')}>회원가입</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
