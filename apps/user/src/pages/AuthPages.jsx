import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

const Field = ({ label, children }) => (
  <div style={{ marginBottom: '18px' }}>
    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '6px' }}>{label}</label>
    {children}
  </div>
)

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
    <div className="fade-up" style={{ maxWidth: '360px', margin: '80px auto', padding: '0 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-ink)', marginBottom: '8px' }}>AHA</h1>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>다시 오신 걸 환영합니다</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Field label="이메일">
          <input className="input" type="email" placeholder="이메일 입력" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </Field>
        <Field label="비밀번호">
          <input className="input" type="password" placeholder="비밀번호 입력" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        </Field>
        {error && <p style={{ fontSize: '13px', color: 'var(--color-danger)', marginBottom: '14px' }}>{error}</p>}
        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '16px' }}>로그인</button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-muted)', marginBottom: '20px' }}>
        계정이 없으신가요?{' '}
        <button onClick={() => navigate('signup')} style={{ color: 'var(--color-accent)', fontWeight: 500, transition: 'opacity var(--transition)' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >회원가입</button>
      </p>

      <div style={{ padding: '14px', background: 'var(--color-surface)', borderRadius: 'var(--radius-btn)', fontSize: '12px', color: 'var(--color-muted)' }}>
        <p style={{ fontWeight: 500, marginBottom: '4px', color: 'var(--color-body)' }}>데모 계정</p>
        <p>demo@aha.com / demo1234</p>
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
    <div className="fade-up" style={{ maxWidth: '380px', margin: '60px auto', padding: '0 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-ink)', marginBottom: '8px' }}>AHA</h1>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>새 계정 만들기</p>
      </div>

      <form onSubmit={handleSubmit}>
        {[
          { key: 'email', label: '이메일', type: 'email', placeholder: '이메일 입력' },
          { key: 'password', label: '비밀번호', type: 'password', placeholder: '6자 이상' },
          { key: 'nickname', label: '닉네임', type: 'text', placeholder: '사용할 닉네임' },
        ].map(f => (
          <Field key={f.key} label={f.label}>
            <input className="input" type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
          </Field>
        ))}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '10px' }}>관심 분야 (선택)</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {categories.map(cat => {
              const sel = form.expertise.includes(cat.name)
              return (
                <button key={cat.id} type="button" onClick={() => toggleExpertise(cat.name)} style={{
                  padding: '6px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 500,
                  border: `1px solid ${sel ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  background: sel ? 'rgba(62,106,225,0.08)' : 'transparent',
                  color: sel ? 'var(--color-accent)' : 'var(--color-muted)',
                  transition: 'all var(--transition)',
                }}>{cat.icon} {cat.name}</button>
              )
            })}
          </div>
        </div>

        {error && <p style={{ fontSize: '13px', color: 'var(--color-danger)', marginBottom: '14px' }}>{error}</p>}
        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '16px' }}>회원가입</button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-muted)' }}>
        이미 계정이 있으신가요?{' '}
        <button onClick={() => navigate('login')} style={{ color: 'var(--color-accent)', fontWeight: 500 }}>로그인</button>
      </p>
    </div>
  )
}
