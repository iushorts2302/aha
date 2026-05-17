import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

export function LoginPage({ navigate }) {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    try { login(form.email, form.password); navigate('home') }
    catch (err) { setError(err.message) }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center py-5"
      style={{ background: 'var(--color-parchment)' }}>
      <div className="w-100" style={{ maxWidth: 400 }}>
        <div className="text-center mb-4">
          <button className="btn btn-link p-0 text-decoration-none" onClick={() => navigate('home')}
            style={{ fontSize: 'clamp(36px,8vw,56px)', fontWeight: 600, letterSpacing: '-0.28px', color: 'var(--color-ink)' }}>
            aha!
          </button>
          <p className="text-muted mt-1">계정에 로그인</p>
        </div>
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold small">이메일</label>
                <input className="form-control" type="email" placeholder="이메일 주소"
                  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold small">비밀번호</label>
                <input className="form-control" type="password" placeholder="비밀번호"
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
              </div>
              {error && <div className="alert alert-danger py-2 small">{error}</div>}
              <button type="submit" className="btn btn-primary w-100 mt-2">로그인</button>
            </form>
            <hr />
            <p className="text-center small text-muted mb-0">
              계정이 없으신가요?{' '}
              <button className="btn btn-link p-0 small" onClick={() => navigate('signup')}>회원가입</button>
            </p>
            <div className="mt-3 p-3 rounded" style={{ background: 'var(--color-parchment)', fontSize: '13px' }}>
              <p className="fw-semibold mb-1">데모 계정</p>
              <p className="text-muted mb-0">demo@aha.com · demo1234</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SignupPage({ navigate }) {
  const { signup } = useAuth()
  const { categories } = useApp()
  const [form, setForm] = useState({ email: '', password: '', nickname: '', expertise: [] })
  const [error, setError] = useState('')

  function toggleExpertise(name) {
    setForm(f => ({
      ...f,
      expertise: f.expertise.includes(name) ? f.expertise.filter(e => e !== name) : [...f.expertise, name],
    }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password || !form.nickname) { setError('모든 필드를 입력해주세요.'); return }
    if (form.password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return }
    try { signup(form); navigate('home') }
    catch (err) { setError(err.message) }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center py-5"
      style={{ background: 'var(--color-parchment)' }}>
      <div className="w-100" style={{ maxWidth: 460 }}>
        <div className="text-center mb-4">
          <button className="btn btn-link p-0 text-decoration-none" onClick={() => navigate('home')}
            style={{ fontSize: 'clamp(36px,8vw,56px)', fontWeight: 600, letterSpacing: '-0.28px', color: 'var(--color-ink)' }}>
            aha!
          </button>
          <p className="text-muted mt-1">새 계정 만들기</p>
        </div>
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <form onSubmit={handleSubmit}>
              {[
                { key: 'email',    label: '이메일',   type: 'email',    placeholder: '이메일 주소' },
                { key: 'password', label: '비밀번호', type: 'password', placeholder: '6자 이상' },
                { key: 'nickname', label: '닉네임',   type: 'text',     placeholder: '표시될 이름' },
              ].map(f => (
                <div className="mb-3" key={f.key}>
                  <label className="form-label fw-semibold small">{f.label}</label>
                  <input className="form-control" type={f.type} placeholder={f.placeholder}
                    value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div className="mb-3">
                <label className="form-label fw-semibold small">관심 분야 <span className="text-muted fw-normal">(선택)</span></label>
                <div className="d-flex flex-wrap gap-2">
                  {categories.map(cat => {
                    const sel = form.expertise.includes(cat.name)
                    return (
                      <button key={cat.id} type="button"
                        className={`btn btn-sm ${sel ? 'btn-primary' : 'btn-outline-secondary'}`}
                        style={{ borderRadius: 'var(--r-pill)', fontSize: 12 }}
                        onClick={() => toggleExpertise(cat.name)}>
                        {cat.icon} {cat.name}
                      </button>
                    )
                  })}
                </div>
              </div>
              {error && <div className="alert alert-danger py-2 small">{error}</div>}
              <button type="submit" className="btn btn-primary w-100 mt-2">회원가입</button>
            </form>
            <hr />
            <p className="text-center small text-muted mb-0">
              이미 계정이 있으신가요?{' '}
              <button className="btn btn-link p-0 small" onClick={() => navigate('login')}>로그인</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
