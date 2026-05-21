import { useState, useEffect, useRef } from 'react'
import { loadDetail, saveDetail } from '../store/crawlDetailStore.js'
import { getItems } from '../store/crawlStore.js'
import ReactionBar from '../components/ReactionBar.jsx'
import { useAuth } from '../context/AuthContext'
import {
  getCrawlViews, incrementCrawlView,
  getCrawlLikes, toggleCrawlLike,
} from '../store/crawlInteractionStore.js'

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

function getSourceType(source = '') {
  if (source.includes('github.com')) return { label: 'GitHub', color: '#24292F' }
  if (source.includes('npmjs.com'))  return { label: 'NPM',    color: '#CC3534' }
  if (source.includes('pypi.org'))   return { label: 'PyPI',   color: '#3775A9' }
  return { label: getDomain(source), color: '#555' }
}

function isGitHub(url = '') {
  return url.includes('github.com') && url.split('/').length >= 5
}

// 공통 고스트 버튼
const ghostBtn = (active) => ({
  background: 'transparent',
  border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-hairline)'}`,
  borderRadius: 'var(--r-pill)',
  padding: '7px 16px',
  fontSize: 14,
  color: active ? 'var(--color-primary)' : 'var(--color-muted-48)',
  cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 5,
  outline: 'none', boxShadow: 'none',
  transition: 'all 0.15s', userSelect: 'none',
})

export default function CrawlDetailPage({ itemId, navigate, prevPage }) {
  const { currentUser } = useAuth()
  const [item, setItem]     = useState(null)
  const [related, setRelated] = useState([])
  const [copied, setCopied] = useState(false)
  const [views, setViews]   = useState(0)
  const [likes, setLikes]   = useState({ count: 0, liked: false })
  const hasViewed = useRef(false)

  useEffect(() => {
    const saved = loadDetail()
    if (saved && saved.id === itemId) {
      setItem(saved)
      getItems(saved.topicKey, 20).then(relRaw => {
        const rel = (Array.isArray(relRaw) ? relRaw : []).filter(i => i.id !== itemId).slice(0, 5)
        setRelated(rel)
      }).catch(() => setRelated([]))
      // 저장된 조회수/좋아요 로드
      setViews(getCrawlViews(itemId))
      setLikes(getCrawlLikes(itemId))
    }
  }, [itemId])

  // 조회수: 마운트 1회만
  useEffect(() => {
    if (!hasViewed.current && itemId) {
      hasViewed.current = true
      setViews(incrementCrawlView(itemId))
    }
  }, [])

  function goBack() {
    navigate(prevPage || 'home')
  }

  function handleLike() {
    if (!currentUser) return navigate('login')
    setLikes(toggleCrawlLike(itemId))
  }

  function handleCopy() {
    navigator.clipboard?.writeText(item?.source || window.location.href).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!item) return (
    <div style={{ padding: '80px 0', textAlign: 'center' }}>
      <p style={{ fontSize: 15, color: 'var(--color-muted-48)', marginBottom: 20 }}>
        콘텐츠를 찾을 수 없습니다.
      </p>
      <button type="button" onClick={() => navigate('home')} style={ghostBtn(false)}>
        홈으로
      </button>
    </div>
  )

  const srcType = getSourceType(item.source)

  return (
    <article className="fade-up" style={{ maxWidth: 720, paddingTop: 24 }}>

      {/* 뒤로가기 */}
      <button type="button" onClick={goBack} style={{
        background: 'transparent', border: 'none', padding: 0,
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 14, color: 'var(--color-muted-48)',
        marginBottom: 28, cursor: 'pointer',
        outline: 'none', boxShadow: 'none',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted-48)'}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        뒤로
      </button>

      {/* 배지 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 10px',
          borderRadius: 'var(--r-pill)',
          background: srcType.color + '18',
          color: srcType.color === '#000000' ? '#333' : srcType.color,
          border: `1px solid ${srcType.color}30`,
        }}>{srcType.label}</span>
        <span style={{ fontSize: 12, color: 'var(--color-muted-48)' }}>{item.topicLabel}</span>
        <span style={{ fontSize: 12, color: 'var(--color-muted-48)' }}>· {timeAgo(item.crawledAt)}</span>
      </div>

      {/* 제목 */}
      <h1 style={{
        fontSize: 'clamp(22px,5vw,38px)', fontWeight: 600,
        lineHeight: 1.15, color: 'var(--color-ink)', marginBottom: 16,
      }}>{item.title}</h1>

      {/* 요약 */}
      {item.summary && (
        <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--color-muted-80)', marginBottom: 20 }}>
          {item.summary}
        </p>
      )}

      {/* 태그 */}
      {item.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
          {item.tags.map(tag => (
            <span key={tag} style={{
              fontSize: 13, padding: '4px 12px',
              borderRadius: 'var(--r-pill)',
              background: 'var(--color-parchment)',
              color: 'var(--color-muted-80)',
            }}>#{tag}</span>
          ))}
        </div>
      )}

      {/* 통계 + 액션 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 0', borderTop: '1px solid var(--color-divider)',
        borderBottom: '1px solid var(--color-divider)',
        marginBottom: 28, flexWrap: 'wrap', gap: 12,
      }}>
        {/* 통계 — 클릭 가능한 버튼 */}
        <div style={{ display: 'flex', gap: 16 }}>
          {/* 조회수 */}
          <span style={{ fontSize: 14, color: 'var(--color-muted-48)', display: 'flex', alignItems: 'center', gap: 4 }}>
            👁 {views}
          </span>
          {/* 좋아요 — 클릭 가능 */}
          <button type="button" onClick={handleLike} style={{
            background: 'transparent', border: 'none', padding: 0,
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 14,
            color: likes.liked ? 'var(--color-primary)' : 'var(--color-muted-48)',
            cursor: 'pointer', outline: 'none',
            transition: 'color 0.15s',
          }}>
            {likes.liked ? '♥' : '♡'} {likes.count}
          </button>
          {/* 댓글 — 현재 미지원 */}
          <span style={{ fontSize: 14, color: 'var(--color-muted-48)', display: 'flex', alignItems: 'center', gap: 4 }}>
            💬 0
          </span>
        </div>

        {/* 액션 버튼 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={handleCopy} style={ghostBtn(copied)}>
            {copied ? '✓ 복사됨' : '↗ 공유'}
          </button>
          {item.source && (
            <a href={item.source} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              height: 36, padding: '0 18px',
              background: 'var(--color-primary)', color: '#fff',
              fontSize: 14, fontWeight: 500,
              borderRadius: 'var(--r-pill)',
              textDecoration: 'none',
            }}>
              원문 보기 ↗
            </a>
          )}
        </div>
      </div>

      {/* 이모지 반응 */}
      <div style={{ marginBottom: 36, paddingBottom: 28, borderBottom: '1px solid var(--color-divider)' }}>
        <p style={{ fontSize: 13, color: 'var(--color-muted-48)', marginBottom: 12, fontWeight: 600 }}>
          이 글 어떠셨나요?
        </p>
        <ReactionBar postId={item.id} compact={false} />
      </div>

      {/* 원문 콘텐츠 */}
      {item.source && (
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-ink)' }}>원문 내용</h2>
            <a href={item.source} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, color: 'var(--color-primary)' }}>
              {getDomain(item.source)} ↗
            </a>
          </div>
          {isGitHub(item.source)
            ? <GitHubContent source={item.source} item={item} />
            : <SourceInfoCard item={item} srcType={srcType} />
          }
        </section>
      )}

      {/* 연관 콘텐츠 */}
      {related.length > 0 && (
        <section>
          <h2 style={{
            fontSize: 17, fontWeight: 600, color: 'var(--color-ink)',
            marginBottom: 4, paddingBottom: 12,
            borderBottom: '1px solid var(--color-divider)',
          }}>관련 콘텐츠</h2>
          {related.map(rel => (
            <div key={rel.id} onClick={() => { saveDetail(rel); navigate(`crawl-detail/${rel.id}`) }}
              style={{ padding: '14px 0', borderBottom: '1px solid var(--color-divider)', cursor: 'pointer' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 3 }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-ink)'}
              >{rel.title}</p>
              {rel.summary && (
                <p style={{ fontSize: 13, color: 'var(--color-muted-48)', lineHeight: 1.4,
                  display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {rel.summary}
                </p>
              )}
            </div>
          ))}
        </section>
      )}
    </article>
  )
}

function GitHubContent({ source, item }) {
  const [readme, setReadme] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const match = source.match(/github\.com\/([^/]+\/[^/]+)/)
    if (!match) { setLoading(false); return }
    const repo = match[1];

    (async () => {
      for (const branch of ['main', 'master']) {
        try {
          const res = await fetch(
            `https://raw.githubusercontent.com/${repo}/${branch}/README.md`,
            { signal: AbortSignal.timeout(6000) }
          )
          if (res.ok) { setReadme((await res.text()).slice(0, 6000)); break }
        } catch {}
      }
      setLoading(false)
    })()
  }, [source])

  if (loading) return (
    <div style={{ padding: 32, background: 'var(--color-parchment)', borderRadius: 'var(--r-lg)', textAlign: 'center' }}>
      <p style={{ fontSize: 13, color: 'var(--color-muted-48)' }}></p>
    </div>
  )

  if (!readme) return <SourceInfoCard item={item} srcType={{ label: 'GitHub', color: '#24292F' }} />

  return (
    <div style={{ border: '1px solid var(--color-hairline)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 18px', background: '#24292F', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>📄 README.md</span>
        <a href={source} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#58A6FF' }}>
          GitHub에서 보기 ↗
        </a>
      </div>
      <div style={{ padding: 20, maxHeight: 560, overflowY: 'auto', background: '#fff' }}>
        <MarkdownView text={readme} />
      </div>
    </div>
  )
}

function SourceInfoCard({ item, srcType }) {
  return (
    <div style={{ border: '1px solid var(--color-hairline)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 18px', background: srcType.color, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{srcType.label}</span>
        {item.source && (
          <a href={item.source} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
            원문 열기 ↗
          </a>
        )}
      </div>
      <div style={{ padding: '24px 20px', background: '#fff' }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 10 }}>{item.title}</p>
        {item.summary && (
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-body)', marginBottom: 18 }}>{item.summary}</p>
        )}
        {item.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {item.tags.map(tag => (
              <span key={tag} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 'var(--r-pill)', background: 'var(--color-primary)', color: '#fff' }}>#{tag}</span>
            ))}
          </div>
        )}
        {item.source && (
          <div style={{ padding: 14, background: 'rgba(0,102,204,0.05)', borderRadius: 'var(--r-md)', border: '1px solid rgba(0,102,204,0.12)' }}>
            <p style={{ fontSize: 12, color: 'var(--color-muted-48)', marginBottom: 6 }}>원문 주소</p>
            <a href={item.source} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, color: 'var(--color-primary)', wordBreak: 'break-all', lineHeight: 1.5 }}>
              {item.source}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

function MarkdownView({ text }) {
  return (
    <div>
      {text.split('\n').map((line, i) => {
        if (/!\[.*?\]\(.*?\)/.test(line)) return null
        if (line.startsWith('# '))   return <h1 key={i} style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-ink)', margin: '20px 0 8px' }}>{line.slice(2)}</h1>
        if (line.startsWith('## '))  return <h2 key={i} style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)', margin: '16px 0 6px' }}>{line.slice(3)}</h2>
        if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', margin: '12px 0 4px' }}>{line.slice(4)}</h3>
        if (line.startsWith('```'))  return <div key={i} style={{ height: 2 }} />
        if (/^[-*]{3,}$/.test(line.trim())) return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--color-divider)', margin: '12px 0' }} />
        if (line.startsWith('- ') || line.startsWith('* ')) return (
          <p key={i} style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-body)', paddingLeft: 14, marginBottom: 3 }}>
            • {line.slice(2).replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1')}
          </p>
        )
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />
        return (
          <p key={i} style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--color-body)', marginBottom: 3 }}>
            {line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}
          </p>
        )
      })}
    </div>
  )
}
