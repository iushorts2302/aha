/**
 * AdminLoginPage — Tabler 스타일 로그인 페이지
 *
 * 지원 로그인 방식:
 *   1) 이메일 + 비밀번호 (local)
 *   2) 카카오 간편 로그인 (OAuth code flow)
 *   3) 구글 간편 로그인  (OAuth code flow)
 *
 * OAuth 흐름:
 *   [버튼 클릭]
 *   → window.location.href = provider 인증 URL
 *   → provider 페이지에서 로그인/동의
 *   → redirect_uri (/oauth/kakao or /oauth/google)로 ?code=... 와 함께 복귀
 *   → App.jsx의 라우터가 OAuthCallback 표시
 *   → loginOAuth(provider, code, redirect_uri) → setAdmin
 */
import { useEffect, useState } from 'react'
import { useAdmin } from '../context/AdminContext'

export default function AdminLoginPage({ navigate }) {
  const { login, getOAuthConfig } = useAdmin()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [error, setError]   = useState('')
  const [oauth, setOauth]   = useState({ kakao: { enabled: false }, google: { enabled: false } })
  const [submitting, setSubmitting] = useState(false)

  // OAuth 활성화 여부 조회
  useEffect(() => {
    getOAuthConfig().then(setOauth).catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSubmitting(true)
    try {
      await login(form.email, form.password)
      navigate('dashboard')
    } catch (err) {
      setError(err.message || '로그인 실패')
    } finally {
      setSubmitting(false)
    }
  }

  // ── 카카오 인증 URL로 이동 ──
  function startKakaoLogin() {
    if (!oauth.kakao.enabled) {
      setError('카카오 로그인이 비활성화되어 있습니다 (KAKAO_REST_KEY 미설정)')
      return
    }
    const params = new URLSearchParams({
      client_id:     oauth.kakao.client_id,
      redirect_uri:  oauth.kakao.redirect_uri,
      response_type: 'code',
    })
    window.location.href = `https://kauth.kakao.com/oauth/authorize?${params}`
  }

  // ── 구글 인증 URL로 이동 ──
  function startGoogleLogin() {
    if (!oauth.google.enabled) {
      setError('구글 로그인이 비활성화되어 있습니다 (GOOGLE_CLIENT_ID 미설정)')
      return
    }
    const params = new URLSearchParams({
      client_id:     oauth.google.client_id,
      redirect_uri:  oauth.google.redirect_uri,
      response_type: 'code',
      scope:         'openid email profile',
      access_type:   'online',
      prompt:        'select_account',
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--tblr-bg-body)',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* 브랜드 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{
            fontSize: 28, fontWeight: 800, margin: 0,
            color: 'var(--tblr-primary)', letterSpacing: '-0.02em',
          }}>aha!</h1>
          <p style={{ fontSize: 13, color: 'var(--tblr-secondary)', marginTop: 6, marginBottom: 0 }}>
            관리자 로그인
          </p>
        </div>

        {/* 로그인 카드 */}
        <div className="card">
          <div className="card-body" style={{ padding: 28 }}>
            {/* ── OAuth 버튼 (활성화된 것만 노출) ── */}
            {(oauth.kakao.enabled || oauth.google.enabled) && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {oauth.kakao.enabled && (
                    <button
                      type="button"
                      onClick={startKakaoLogin}
                      style={{
                        height: 42, borderRadius: 4, border: 'none',
                        background: '#FEE500', color: '#3C1E1E',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3C6.5 3 2 6.6 2 11c0 2.9 1.9 5.4 4.8 6.9-.2.6-.7 2.5-.8 2.9 0 0 0 .3.2.4.2 0 .3 0 .4-.1.2-.1 2.5-1.7 3.5-2.4.6.1 1.2.1 1.9.1 5.5 0 10-3.6 10-8s-4.5-8-10-8z"/>
                      </svg>
                      카카오로 로그인
                    </button>
                  )}
                  {oauth.google.enabled && (
                    <button
                      type="button"
                      onClick={startGoogleLogin}
                      style={{
                        height: 42, borderRadius: 4, border: '1px solid var(--tblr-border)',
                        background: '#FFFFFF', color: '#1F1F1F',
                        fontSize: 14, fontWeight: 500, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      }}>
                      <svg width="18" height="18" viewBox="0 0 48 48">
                        <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                        <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2c-.4.4 6.6-4.8 6.6-14.7 0-1.3-.1-2.6-.4-3.9z"/>
                      </svg>
                      Google로 로그인
                    </button>
                  )}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  margin: '16px 0', fontSize: 11, color: 'var(--tblr-muted)',
                }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--tblr-border)' }} />
                  <span>또는 이메일로</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--tblr-border)' }} />
                </div>
              </>
            )}

            {/* ── 이메일/비밀번호 폼 ── */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--tblr-body)', display: 'block', marginBottom: 4 }}>
                  이메일
                </label>
                <input
                  className="form-control"
                  type="email"
                  placeholder="admin@aha.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--tblr-body)', display: 'block', marginBottom: 4 }}>
                  비밀번호
                </label>
                <input
                  className="form-control"
                  type="password"
                  placeholder="비밀번호"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                />
              </div>
              {error && (
                <div style={{
                  padding: '8px 12px', marginBottom: 12, borderRadius: 4,
                  background: 'var(--tblr-danger-lt)', color: 'var(--tblr-danger)',
                  fontSize: 12, fontWeight: 500, whiteSpace: 'pre-line',
                }}>{error}</div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{ width: '100%', height: 40, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? '로그인 중...' : '로그인'}
              </button>
            </form>
          </div>
        </div>

        {/* 데모 안내 */}
        <div style={{
          marginTop: 16, padding: 12, borderRadius: 4,
          background: 'var(--tblr-bg-surface)', border: '1px solid var(--tblr-border)',
          fontSize: 11, color: 'var(--tblr-secondary)', textAlign: 'center',
        }}>
          데모: admin@aha.com · admin1234
        </div>
      </div>
    </div>
  )
}

/* ── OAuth 콜백 페이지 ──────────────────────────────────
 * URL: /oauth/kakao?code=... 또는 /oauth/google?code=...
 * App.jsx에서 라우팅되어 진입
 */
export function OAuthCallback({ provider, navigate }) {
  const { loginOAuth } = useAdmin()
  const [error, setError] = useState('')
  const [status, setStatus] = useState('인증 처리 중...')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code   = params.get('code')
    const err    = params.get('error')

    if (err) {
      setError(`${provider} 인증 거부: ${err}`)
      return
    }
    if (!code) {
      setError('인증 코드가 없습니다')
      return
    }

    setStatus(`${provider === 'kakao' ? '카카오' : '구글'} 계정 확인 중...`)
    const redirect_uri = `${window.location.origin}/oauth/${provider}`

    loginOAuth(provider, code, redirect_uri)
      .then(() => {
        // URL 정리 후 대시보드로
        window.history.replaceState({}, '', '/')
        navigate('dashboard')
      })
      .catch(e => {
        setError(e.message || 'OAuth 로그인 실패')
      })
  }, [])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--tblr-bg-body)',
    }}>
      <div style={{
        background: '#fff', padding: 32, borderRadius: 6,
        border: '1px solid var(--tblr-border)', maxWidth: 360, width: '100%', textAlign: 'center',
      }}>
        {error ? (
          <>
            <p style={{ fontSize: 14, color: 'var(--tblr-danger)', fontWeight: 600, marginBottom: 12 }}>
              로그인 실패
            </p>
            <p style={{ fontSize: 12, color: 'var(--tblr-secondary)', whiteSpace: 'pre-line', marginBottom: 20 }}>
              {error}
            </p>
            <button
              onClick={() => { window.history.replaceState({}, '', '/'); navigate('login') }}
              className="btn btn-primary"
              style={{ width: '100%' }}>
              로그인 화면으로
            </button>
          </>
        ) : (
          <>
            <div className="spinner-border text-primary" role="status"
              style={{ width: 32, height: 32, marginBottom: 16 }}>
              <span className="visually-hidden">처리 중...</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--tblr-secondary)' }}>{status}</p>
          </>
        )}
      </div>
    </div>
  )
}
