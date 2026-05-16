import { useState } from 'react'
import { useAdmin } from '../context/AdminContext'

export default function AdminLoginPage({ navigate }) {
  const { login } = useAdmin()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    try {
      login(form.email, form.password)
      navigate('dashboard')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '48px', color: 'var(--color-accent2)', letterSpacing: '3px' }}>aha!</h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '6px' }}>관리자 로그인</p>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '28px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { key: 'email', label: '관리자 이메일', type: 'email', placeholder: 'admin@aha.com' },
              { key: 'password', label: '비밀번호', type: 'password', placeholder: '비밀번호 입력' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '5px', display: 'block', color: 'var(--color-text)' }}>{f.label}</label>
                <input className="input" type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            {error && <p style={{ fontSize: '12px', color: 'var(--color-danger)' }}>{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: '4px' }}>
              로그인
            </button>
          </form>

          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--color-muted)' }}>
            <p style={{ fontWeight: 600, marginBottom: '4px' }}>데모 계정</p>
            <p>이메일: admin@aha.com</p>
            <p>비밀번호: admin1234</p>
          </div>
        </div>
      </div>
    </div>
  )
}
