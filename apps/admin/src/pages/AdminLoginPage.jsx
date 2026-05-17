import { useState } from 'react'
import { useAdmin } from '../context/AdminContext'

export default function AdminLoginPage({ navigate }) {
  const { login } = useAdmin()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    try { login(form.email, form.password); navigate('dashboard') }
    catch (err) { setError(err.message) }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{ background: 'var(--color-bg)' }}>
      <div className="w-100" style={{ maxWidth: 400, padding: '0 16px' }}>
        <div className="text-center mb-4">
          <h2 className="fw-semibold mb-1" style={{ color: 'var(--color-accent)', letterSpacing: '-0.374px' }}>aha!</h2>
          <p className="text-muted small mb-0">관리자 로그인</p>
        </div>
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold small">이메일</label>
                <input className="form-control" type="email" placeholder="admin@aha.com"
                  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} autoFocus />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold small">비밀번호</label>
                <input className="form-control" type="password" placeholder="비밀번호"
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
              </div>
              {error && <div className="alert alert-danger py-2 small">{error}</div>}
              <button type="submit" className="btn btn-primary w-100 mt-2">로그인</button>
            </form>
            <div className="mt-3 p-3 rounded" style={{ background: 'var(--color-bg)', fontSize: 12 }}>
              <p className="fw-semibold mb-1 small">데모 계정</p>
              <p className="text-muted mb-0">admin@aha.com · admin1234</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
