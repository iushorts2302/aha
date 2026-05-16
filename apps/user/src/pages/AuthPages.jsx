import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

const FIELD_STYLE = {
  fontSize: 'var(--text-caption)', fontWeight: 600,
  color: 'var(--color-muted-80)', display: 'block', marginBottom: '6px',
  letterSpacing: '-0.12px',
}

/* ── LoginPage ─────────────────────────────────────────── */
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
    /* Apple parchment canvas */
    <div style={{ minHeight: '100vh', background: 'var(--color-parchment)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* 워드마크 */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <button onClick={() => navigate('home')} style={{
            fontSize: 'var(--text-hero)',   /* 56px */
            fontWeight: 600, letterSpacing: '-0.28px', lineHeight: 1.07,
            color: 'var(--color-ink)', fontFamily: 'var(--font-display)',
          }}>aha!</button>
          <p style={{ fontSize: 'var(--text-lead-lg)', fontWeight: 400, lineHeight: 1.14, letterSpacing: '0.196px', color: 'var(--color-muted-48)', marginTop: '8px' }}>
            계정에 로그인
          </p>
        </div>

        {/* 카드 — Apple utility card (r-lg 18px) */}
        <div style={{ background: 'var(--color-canvas)', borderRadius: 'var(--r-lg)', padding: '28px', border: '1px solid var(--color-hairline)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { key: 'email',    label: '이메일',    type: 'email',    placeholder: '이메일 주소' },
              { key: 'password', label: '비밀번호',  type: 'password', placeholder: '비밀번호' },
            ].map(f => (
              <div key={f.key}>
                <label style={FIELD_STYLE}>{f.label}</label>
                <input className="input" type={f.type} placeholder={f.placeholder}
                  style={{ borderRadius: 'var(--r-lg)', fontSize: 'var(--text-body)' }}
                  value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            {error && <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-danger)', fontWeight: 400 }}>{error}</p>}
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '4px' }}>
              로그인
            </button>
          </form>

          <div className="divider" />

          <p style={{ textAlign: 'center', fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)' }}>
            계정이 없으신가요?{' '}
            <button onClick={() => navigate('signup')} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              회원가입
            </button>
          </p>

          {/* 데모 */}
          <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--color-parchment)', borderRadius: 'var(--r-md)', fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)' }}>
            <p style={{ fontWeight: 600, color: 'var(--color-muted-80)', marginBottom: '4px' }}>데모 계정</p>
            <p>demo@aha.com · demo1234</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── SignupPage ─────────────────────────────────────────── */
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
    <div style={{ minHeight: '100vh', background: 'var(--color-parchment)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <button onClick={() => navigate('home')} style={{ fontSize: 'var(--text-hero)', fontWeight: 600, letterSpacing: '-0.28px', color: 'var(--color-ink)', fontFamily: 'var(--font-display)' }}>aha!</button>
          <p style={{ fontSize: 'var(--text-lead-lg)', fontWeight: 400, lineHeight: 1.14, color: 'var(--color-muted-48)', marginTop: '8px' }}>새 계정 만들기</p>
        </div>

        <div style={{ background: 'var(--color-canvas)', borderRadius: 'var(--r-lg)', padding: '28px', border: '1px solid var(--color-hairline)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { key: 'email',    label: '이메일',   type: 'email',    placeholder: '이메일 주소' },
              { key: 'password', label: '비밀번호', type: 'password', placeholder: '6자 이상' },
              { key: 'nickname', label: '닉네임',   type: 'text',     placeholder: '표시될 이름' },
            ].map(f => (
              <div key={f.key}>
                <label style={FIELD_STYLE}>{f.label}</label>
                <input className="input" type={f.type} placeholder={f.placeholder}
                  style={{ borderRadius: 'var(--r-lg)', fontSize: 'var(--text-body)' }}
                  value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}

            {/* 관심 분야 — Apple configurator chip */}
            <div>
              <label style={FIELD_STYLE}>관심 분야 <span style={{ fontWeight: 400, color: 'var(--color-muted-48)' }}>(선택)</span></label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {categories.map(cat => {
                  const sel = form.expertise.includes(cat.name)
                  return (
                    <button key={cat.id} type="button" onClick={() => toggleExpertise(cat.name)} style={{
                      padding: '8px 14px', borderRadius: 'var(--r-pill)',
                      fontSize: 'var(--text-caption)', fontWeight: sel ? 600 : 400,
                      border: `${sel ? 2 : 1}px solid ${sel ? 'var(--color-primary-focus)' : 'var(--color-hairline)'}`,
                      background: sel ? 'rgba(0,102,204,0.06)' : 'var(--color-canvas)',
                      color: sel ? 'var(--color-primary)' : 'var(--color-ink)',
                      transition: 'all var(--transition)',
                    }}>{cat.icon} {cat.name}</button>
                  )
                })}
              </div>
            </div>

            {error && <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-danger)' }}>{error}</p>}

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '4px' }}>
              회원가입
            </button>
          </form>

          <div className="divider" />
          <p style={{ textAlign: 'center', fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)' }}>
            이미 계정이 있으신가요?{' '}
            <button onClick={() => navigate('login')} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>로그인</button>
          </p>
        </div>
      </div>
    </div>
  )
}
