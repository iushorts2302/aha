/**
 * LiveChat — Discord/실시간 채팅 시뮬레이션
 */
import { useState, useEffect, useRef } from 'react'
import { getMessages, sendUserMessage, generateBotMessage, getLiveIssues } from '../store/liveStore.js'
import { useAuth } from '../context/AuthContext'

function timeStr(iso) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

const CHANNELS = [
  { key: 'free',    label: '# 자유수다' },
  { key: 'it',      label: '# IT·개발' },
  { key: 'sports',  label: '# 스포츠' },
  { key: 'issue',   label: '# 이슈·뉴스' },
]

export function LiveChatPanel({ channel = 'free' }) {
  const { currentUser } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [onlineCount, setOnlineCount] = useState(Math.floor(Math.random() * 300 + 100))
  const bottomRef = useRef(null)

  // 초기 메시지 로드 + 봇 메시지 인터벌
  useEffect(() => {
    setMessages(getMessages(channel))
    // 2~5초마다 봇 메시지
    const t = setInterval(() => {
      const msgs = generateBotMessage(channel)
      setMessages([...msgs])
      setOnlineCount(p => p + Math.floor(Math.random() * 5 - 2))
    }, 2000 + Math.random() * 3000)
    return () => clearInterval(t)
  }, [channel])

  // 자동 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || !currentUser) return
    const msgs = sendUserMessage(channel, currentUser.id, currentUser.nickname, input.trim())
    setMessages([...msgs])
    setInput('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '600px', border: '1px solid var(--color-border-soft)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
      {/* 헤더 */}
      <div style={{ padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--color-border-soft)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-block', boxShadow: '0 0 6px rgba(0,213,100,0.6)' }} />
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--color-ink)' }}>실시간 채팅</span>
        </div>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>🟢 {onlineCount.toLocaleString()}명 접속중</span>
      </div>

      {/* 메시지 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-3) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        {messages.length === 0 && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-placeholder)', textAlign: 'center', marginTop: 'var(--space-6)' }}>
            채팅을 시작해보세요!
          </p>
        )}
        {messages.map(msg => {
          const isMe = msg.authorId === currentUser?.id
          return (
            <div key={msg.id} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', flexDirection: isMe ? 'row-reverse' : 'row' }}>
              {!isMe && (
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: msg.isBot ? 'var(--color-surface2)' : 'var(--color-ink)', color: msg.isBot ? 'var(--color-muted)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, flexShrink: 0, marginTop: '2px' }}>
                  {msg.nickname[0]}
                </div>
              )}
              <div style={{ maxWidth: '70%' }}>
                {!isMe && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-ink)' }}>{msg.nickname}</span>
                    <span style={{ fontSize: '10px', color: 'var(--color-placeholder)' }}>{timeStr(msg.createdAt)}</span>
                  </div>
                )}
                <div style={{
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: isMe ? 'var(--color-ink)' : 'var(--color-surface)',
                  color: isMe ? '#fff' : 'var(--color-body)',
                  fontSize: 'var(--text-sm)', lineHeight: 1.5,
                  border: isMe ? 'none' : '1px solid var(--color-border-soft)',
                }}>
                  {msg.body}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <form onSubmit={handleSend} style={{ padding: 'var(--space-3)', borderTop: '1px solid var(--color-border-soft)', display: 'flex', gap: 'var(--space-2)' }}>
        <input
          className="input"
          style={{ height: '36px', fontSize: 'var(--text-sm)' }}
          placeholder={currentUser ? '메시지 입력...' : '로그인 후 채팅 가능'}
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={!currentUser}
        />
        <button type="submit" className="btn btn-primary" style={{ height: '36px', padding: '0 var(--space-4)', minWidth: 'unset', flexShrink: 0 }}
          disabled={!currentUser || !input.trim()}>
          전송
        </button>
      </form>
    </div>
  )
}

/** 실시간 이슈 키워드 랭킹 */
export function LiveIssueRanking() {
  const [issues, setIssues] = useState(getLiveIssues())

  useEffect(() => {
    const t = setInterval(() => setIssues(getLiveIssues()), 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ border: '1px solid var(--color-border-soft)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
      <div style={{ padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--color-border-soft)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--color-ink)' }}>🔥 실시간 이슈</span>
        <span style={{ fontSize: '10px', color: 'var(--color-placeholder)' }}>30초마다 갱신</span>
      </div>
      {issues.map(issue => (
        <div key={issue.rank} style={{ padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--color-border-soft)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <span style={{ width: '20px', textAlign: 'center', fontSize: 'var(--text-sm)', fontWeight: 800, color: issue.rank <= 3 ? 'var(--color-accent)' : 'var(--color-placeholder)', flexShrink: 0 }}>
            {issue.rank}
          </span>
          <span style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: issue.rank <= 3 ? 800 : 400, color: 'var(--color-ink)' }}>
            {issue.keyword}
          </span>
          <span style={{ fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '99px',
            background: issue.change === 'NEW' ? 'var(--color-accent)' : issue.change.startsWith('+') ? 'rgba(0,213,100,0.1)' : 'rgba(224,49,49,0.1)',
            color: issue.change === 'NEW' ? 'var(--color-accent-text)' : issue.change.startsWith('+') ? '#005C27' : '#9B1C1C',
          }}>
            {issue.change}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-placeholder)', flexShrink: 0 }}>
            {issue.volume.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}
