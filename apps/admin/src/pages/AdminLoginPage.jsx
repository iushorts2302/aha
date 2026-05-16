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
    <div style={{
      minHeight: '100vh', background: '#353B42',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px',
    }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        {/* 워드마크 */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{ fontSize: '15px', fontWeight: 500, letterSpacing: '0.24em', color: '#fff', textTransform: 'uppercase' }}>AHA</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', letterSpacing: '0.04em' }}>ADMIN</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { key: 'email', label: '이메일', type: 'email', placeholder: 'admin@aha.com' },
            { key: 'password', label: '비밀번호', type: 'password', placeholder: '비밀번호 입력' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px', letterSpacing: '0.04em' }}>
                {f.label}
              </label>
              <input type={f.type} placeholder={f.placeholder} value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                style={{
                  width: '100%', height: '40px', padding: '0 14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 'var(--radius-btn)',
                  color: '#fff', fontSize: '14px', outline: 'none',
                  transition: 'border-color var(--transition)',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
            </div>
          ))}

          {error && <p style={{ fontSize: '13px', color: '#f87171' }}>{error}</p>}

          <button type="submit" style={{
            width: '100%', height: '44px', marginTop: '8px',
            background: '#fff', color: 'var(--color-ink)',
            borderRadius: 'var(--radius-btn)',
            fontSize: '14px', fontWeight: 500,
            transition: 'opacity var(--transition)',
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >로그인</button>
        </form>

        {/* 데모 계정 */}
        <div style={{
          marginTop: '28px', padding: '14px 16px',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 'var(--radius-btn)',
          fontSize: '12px', color: 'rgba(255,255,255,0.35)',
        }}>
          <p style={{ fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>데모 계정</p>
          <p>admin@aha.com / admin1234</p>
        </div>
      </div>
    </div>
  )
}
