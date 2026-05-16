import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

const FormField = ({ label, children }) => (
  <div>
    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: '8px' }}>
      {label}
    </label>
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        {/* 워드마크 */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <button onClick={() => navigate('home')} style={{
            fontSize: '20px', fontWeight: 500, letterSpacing: '0.24em',
            color: 'var(--color-ink)', textTransform: 'uppercase',
          }}>AHA</button>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginTop: '10px' }}>계정에 로그인</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField label="이메일">
            <input className="input" type="email" placeholder="이메일 입력"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </FormField>
          <FormField label="비밀번호">
            <input className="input" type="password" placeholder="비밀번호 입력"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </FormField>

          {error && <p style={{ fontSize: '13px', color: 'var(--color-danger)' }}>{error}</p>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '44px', marginTop: '4px' }}>
            로그인
          </button>
        </form>

        <div style={{ height: '1px', background: 'var(--color-border-soft)', margin: '24px 0' }} />

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-muted)' }}>
          계정이 없으신가요?{' '}
          <button onClick={() => navigate('signup')} style={{
            color: 'var(--color-ink)', fontWeight: 500, textDecoration: 'underline',
          }}>회원가입</button>
        </p>

        {/* 데모 계정 */}
        <div style={{
          marginTop: '24px', padding: '14px 16px',
          background: 'var(--color-surface)', borderRadius: 'var(--radius-btn)',
          fontSize: '12px', color: 'var(--color-muted)',
        }}>
          <p style={{ fontWeight: 500, color: 'var(--color-ink)', marginBottom: '4px' }}>데모 계정</p>
          <p>demo@aha.com / demo1234</p>
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <button onClick={() => navigate('home')} style={{
            fontSize: '20px', fontWeight: 500, letterSpacing: '0.24em',
            color: 'var(--color-ink)', textTransform: 'uppercase',
          }}>AHA</button>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginTop: '10px' }}>새 계정 만들기</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { key: 'email', label: '이메일', type: 'email', placeholder: '이메일 입력' },
            { key: 'password', label: '비밀번호', type: 'password', placeholder: '6자 이상' },
            { key: 'nickname', label: '닉네임', type: 'text', placeholder: '닉네임 입력' },
          ].map(field => (
            <FormField key={field.key} label={field.label}>
              <input className="input" type={field.type} placeholder={field.placeholder}
                value={form[field.key]} onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))} />
            </FormField>
          ))}

          {/* 관심분야 */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: '10px' }}>
              관심 분야 <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(선택)</span>
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {categories.map(cat => {
                const selected = form.expertise.includes(cat.name)
                return (
                  <button key={cat.id} type="button" onClick={() => toggleExpertise(cat.name)} style={{
                    padding: '6px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: 500,
                    border: `1px solid ${selected ? 'var(--color-ink)' : 'var(--color-border)'}`,
                    background: selected ? 'var(--color-ink)' : 'transparent',
                    color: selected ? '#fff' : 'var(--color-muted)',
                    transition: 'background-color var(--transition), border-color var(--transition), color var(--transition)',
                  }}>{cat.icon} {cat.name}</button>
                )
              })}
            </div>
          </div>

          {error && <p style={{ fontSize: '13px', color: 'var(--color-danger)' }}>{error}</p>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '44px', marginTop: '4px' }}>
            회원가입
          </button>
        </form>

        <div style={{ height: '1px', background: 'var(--color-border-soft)', margin: '24px 0' }} />
        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-muted)' }}>
          이미 계정이 있으신가요?{' '}
          <button onClick={() => navigate('login')} style={{ color: 'var(--color-ink)', fontWeight: 500, textDecoration: 'underline' }}>
            로그인
          </button>
        </p>
      </div>
    </div>
  )
}
