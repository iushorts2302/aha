import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

// ── LoginPage ────────────────────────────────────────────
export function LoginPage({ navigate }) {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    try {
      login(form.email, form.password)
      navigate('home')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="fade-up" style={{ maxWidth: '400px', margin: '60px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '48px', color: 'var(--color-accent)', letterSpacing: '3px' }}>aha!</h1>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginTop: '8px' }}>다시 오신 걸 환영합니다</p>
      </div>

      <div className="card" style={{ padding: '28px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>이메일</label>
            <input className="input" type="email" placeholder="이메일 입력" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>비밀번호</label>
            <input className="input" type="password" placeholder="비밀번호 입력" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          {error && <p style={{ fontSize: '13px', color: 'var(--color-danger)' }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>로그인</button>
        </form>

        <div className="divider" />

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-muted)' }}>
          계정이 없으신가요?{' '}
          <button onClick={() => navigate('signup')} style={{ color: 'var(--color-accent)', fontWeight: 600 }}>회원가입</button>
        </p>

        {/* 데모 계정 안내 */}
        <div style={{ marginTop: '16px', padding: '12px', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--color-muted)' }}>
          <p style={{ fontWeight: 600, marginBottom: '4px' }}>데모 계정</p>
          <p>이메일: demo@aha.com</p>
          <p>비밀번호: demo1234</p>
        </div>
      </div>
    </div>
  )
}

// ── SignupPage ───────────────────────────────────────────
export function SignupPage({ navigate }) {
  const { signup } = useAuth()
  const { categories } = useApp()
  const [form, setForm] = useState({ email: '', password: '', nickname: '', expertise: [] })
  const [error, setError] = useState('')

  function toggleExpertise(name) {
    setForm(f => ({
      ...f,
      expertise: f.expertise.includes(name)
        ? f.expertise.filter(e => e !== name)
        : [...f.expertise, name],
    }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password || !form.nickname) {
      setError('이메일, 비밀번호, 닉네임을 모두 입력해주세요.')
      return
    }
    if (form.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    try {
      signup(form)
      navigate('home')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="fade-up" style={{ maxWidth: '440px', margin: '40px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '48px', color: 'var(--color-accent)', letterSpacing: '3px' }}>aha!</h1>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginTop: '8px' }}>새 계정을 만들어보세요</p>
      </div>

      <div className="card" style={{ padding: '28px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { key: 'email', label: '이메일', type: 'email', placeholder: '이메일 입력' },
            { key: 'password', label: '비밀번호', type: 'password', placeholder: '6자 이상' },
            { key: 'nickname', label: '닉네임', type: 'text', placeholder: '사용할 닉네임' },
          ].map(field => (
            <div key={field.key}>
              <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>{field.label}</label>
              <input
                className="input"
                type={field.type}
                placeholder={field.placeholder}
                value={form[field.key]}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
              />
            </div>
          ))}

          {/* 관심분야 */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>관심 분야 (선택)</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {categories.map(cat => {
                const selected = form.expertise.includes(cat.name)
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleExpertise(cat.name)}
                    style={{
                      padding: '6px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 500,
                      border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      background: selected ? 'rgba(232,255,71,0.1)' : 'transparent',
                      color: selected ? 'var(--color-accent)' : 'var(--color-muted)',
                      transition: 'var(--transition)',
                    }}
                  >{cat.icon} {cat.name}</button>
                )
              })}
            </div>
          </div>

          {error && <p style={{ fontSize: '13px', color: 'var(--color-danger)' }}>{error}</p>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
            회원가입
          </button>
        </form>

        <div className="divider" />
        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-muted)' }}>
          이미 계정이 있으신가요?{' '}
          <button onClick={() => navigate('login')} style={{ color: 'var(--color-accent)', fontWeight: 600 }}>로그인</button>
        </p>
      </div>
    </div>
  )
}
