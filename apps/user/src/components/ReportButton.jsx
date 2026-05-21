import { useState } from 'react'
import { reportAPI } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

const REASONS = [
  { code: 'spam',    label: '스팸/광고' },
  { code: 'abuse',   label: '욕설/괴롭힘' },
  { code: 'nsfw',    label: '음란/혐오' },
  { code: 'misinfo', label: '허위 정보' },
  { code: 'etc',     label: '기타' },
]

/**
 * 작은 "신고" 버튼 + 모달
 *
 * Props:
 *   targetType: 'post' | 'comment'
 *   targetId:   number | string
 *   compact:    true면 작은 아이콘 버튼 / false면 텍스트 링크
 */
export default function ReportButton({ targetType, targetId, compact = false }) {
  const { currentUser } = useAuth()
  const [open, setOpen]       = useState(false)
  const [code, setCode]       = useState('spam')
  const [text, setText]       = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone]       = useState(false)

  async function submit() {
    if (sending) return
    setSending(true)
    try {
      await reportAPI.create({
        target_type:  targetType,
        target_id:    targetId,
        reporter_id:  currentUser?.id ? Number(currentUser.id) : null,
        reason_code:  code,
        reason_text:  text.trim(),
      })
      setDone(true)
      setTimeout(() => { setOpen(false); setDone(false); setText('') }, 1200)
    } catch (e) {
      const msg = e?.message || '신고 처리 중 오류가 발생했습니다.'
      if (msg.includes('이미 신고')) {
        setDone(true)
        setTimeout(() => { setOpen(false); setDone(false) }, 1500)
      } else {
        alert(msg)
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        style={{
          background: 'none', border: 'none', padding: compact ? 4 : '4px 8px',
          fontSize: 12, color: 'var(--color-muted, #888)', cursor: 'pointer',
        }}
        title="신고하기"
        aria-label="신고하기"
      >
        🚩{compact ? '' : ' 신고'}
      </button>

      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div style={{
            background: '#fff', borderRadius: 14, padding: 20,
            width: '100%', maxWidth: 360, boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          }} onClick={(e) => e.stopPropagation()}>
            {done ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <p style={{ margin: 0, fontWeight: 600 }}>신고가 접수되었습니다</p>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#888' }}>관리자가 검토 후 처리합니다.</p>
              </div>
            ) : (
              <>
                <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600 }}>
                  {targetType === 'post' ? '게시글 신고' : '댓글 신고'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {REASONS.map(r => (
                    <label key={r.code} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                      <input type="radio" name="reason" value={r.code}
                        checked={code === r.code} onChange={() => setCode(r.code)} />
                      {r.label}
                    </label>
                  ))}
                </div>
                <textarea
                  placeholder="추가 설명 (선택)"
                  value={text} onChange={e => setText(e.target.value.slice(0, 500))}
                  rows={3}
                  style={{
                    width: '100%', padding: 10, fontSize: 13,
                    border: '1px solid #ddd', borderRadius: 8, resize: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 12,
                  }}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setOpen(false)}
                    style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>
                    취소
                  </button>
                  <button type="button" onClick={submit} disabled={sending}
                    style={{ padding: '8px 16px', border: 'none', borderRadius: 8,
                      background: '#0066CC', color: '#fff', cursor: 'pointer', opacity: sending ? 0.6 : 1 }}>
                    {sending ? '전송 중...' : '신고하기'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
