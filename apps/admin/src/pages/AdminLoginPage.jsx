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
    <div style={{ minHeight: '100vh', background: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '340px' }} className="fade-up">
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#fff', marginBottom: '6px' }}>AHA</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>관리자 로그인</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { key: 'email', type: 'email', placeholder: '관리자 이메일' },
            { key: 'password', type: 'password', placeholder: '비밀번호' },
          ].map(f => (
            <input key={f.key} className="input" type={f.type} placeholder={f.placeholder}
              value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', height: '42px' }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
            />
          ))}
          {error && <p style={{ fontSize: '12px', color: '#f87171' }}>{error}</p>}
          <button type="submit" style={{
            height: '42px', background: 'var(--color-accent)', color: '#fff',
            borderRadius: 'var(--radius-btn)', fontSize: '14px', fontWeight: 500,
            transition: 'background-color var(--transition)',
          }} onMouseEnter={e => e.currentTarget.style.background = 'var(--color-accent-dark)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--color-accent)'}
          >로그인</button>
        </form>

        <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-btn)', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
          <p style={{ marginBottom: '3px', color: 'rgba(255,255,255,0.6)' }}>데모 계정</p>
          <p>admin@aha.com / admin1234</p>
        </div>
      </div>
    </div>
  )
}
