import { useState, useEffect } from 'react'
import { loadDetail, saveDetail } from '../store/crawlDetailStore.js'
import { getItems } from '../store/crawlStore.js'
import ReactionBar from '../components/ReactionBar.jsx'

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

/** source URL에서 도메인 추출 */
function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', '') }
  catch { return url }
}

/** source 타입 판별 */
function getSourceType(source = '') {
  if (source.includes('github.com'))  return { label: 'GitHub',  color: '#24292F', icon: '⑆' }
  if (source.includes('npmjs.com'))   return { label: 'NPM',     color: '#CC3534', icon: '⬡' }
  if (source.includes('pypi.org'))    return { label: 'PyPI',    color: '#3775A9', icon: '🐍' }
  if (source.includes('vercel.com'))  return { label: 'Vercel',  color: '#000000', icon: '▲' }
  return { label: getDomain(source),  color: '#555',             icon: '🔗' }
}

/** GitHub URL이면 README iframe 가능 여부 판단 */
function isGitHub(url = '') { return url.includes('github.com') && url.split('/').length >= 5 }

export default function CrawlDetailPage({ itemId, navigate }) {
  const [item, setItem] = useState(null)
  const [related, setRelated] = useState([])
  const [copied, setCopied] = useState(false)
  const [iframeError, setIframeError] = useState(false)

  useEffect(() => {
    // sessionStorage에서 아이템 복원
    const saved = loadDetail()
    if (saved && saved.id === itemId) {
      setItem(saved)
      // 같은 토픽의 연관 아이템
      const rel = getItems(saved.topicKey, 20).filter(i => i.id !== itemId).slice(0, 5)
      setRelated(rel)
    }
  }, [itemId])

  if (!item) return (
    <div style={{ padding: '80px 0', textAlign: 'center' }}>
      <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-muted-48)', marginBottom: '20px' }}>
        콘텐츠를 찾을 수 없습니다.
      </p>
      <button onClick={() => navigate('home')} className="btn-secondary" style={{ minWidth: 'unset', height: '40px', padding: '0 20px', fontSize: 'var(--text-caption)' }}>
        홈으로
      </button>
    </div>
  )

  const srcType = getSourceType(item.source)

  function handleCopy() {
    navigator.clipboard?.writeText(item.source || window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <article className="fade-up" style={{ maxWidth: '720px', paddingTop: '24px' }}>

      {/* 뒤로가기 */}
      <button onClick={() => history.back()} style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)',
        marginBottom: '28px', transition: 'color var(--transition)',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted-48)'}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        뒤로
      </button>

      {/* 배지 + 메타 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {item.hot && (
          <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 9px', background: '#FF4500', color: '#fff', borderRadius: 'var(--r-pill)' }}>🔥 HOT</span>
        )}
        {/* 소스 출처 배지 */}
        <span style={{
          fontSize: '11px', fontWeight: 600, padding: '3px 10px',
          borderRadius: 'var(--r-pill)',
          background: srcType.color + '14',
          color: srcType.color === '#000000' ? '#333' : srcType.color,
          border: `1px solid ${srcType.color}28`,
        }}>{srcType.label}</span>
        <span style={{ fontSize: 'var(--text-fine)', color: 'var(--color-muted-48)' }}>{item.topicLabel}</span>
        <span style={{ fontSize: 'var(--text-fine)', color: 'var(--color-muted-48)' }}>· {timeAgo(item.crawledAt)}</span>
      </div>

      {/* 제목 */}
      <h1 style={{
        fontSize: 'var(--text-display-lg)', fontWeight: 600,
        lineHeight: 1.10, letterSpacing: 0,
        color: 'var(--color-ink)', marginBottom: '20px',
      }}>{item.title}</h1>

      {/* 요약 */}
      {item.summary && (
        <p style={{
          fontSize: 'var(--text-lead-lg)', fontWeight: 400, lineHeight: 1.47,
          letterSpacing: '0.196px', color: 'var(--color-muted-48)',
          marginBottom: '24px',
        }}>{item.summary}</p>
      )}

      {/* 태그 */}
      {item.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '28px' }}>
          {item.tags.map(tag => (
            <span key={tag} style={{
              fontSize: 'var(--text-caption)', padding: '5px 14px',
              borderRadius: 'var(--r-pill)',
              background: 'var(--color-parchment)',
              color: 'var(--color-muted-80)', fontWeight: 400,
            }}>#{tag}</span>
          ))}
        </div>
      )}

      {/* 통계 + 액션 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 0', borderTop: '1px solid var(--color-divider)',
        borderBottom: '1px solid var(--color-divider)',
        marginBottom: '32px', flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          {[
            { icon: '👁', val: item.views?.toLocaleString() },
            { icon: '♥', val: item.likes },
            { icon: '💬', val: item.comments },
          ].map(s => (
            <span key={s.icon} style={{ fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {s.icon} {s.val}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleCopy} className="btn-secondary" style={{
            height: '36px', padding: '0 16px', minWidth: 'unset',
            fontSize: 'var(--text-caption)',
            color: copied ? 'var(--color-primary)' : undefined,
          }}>
            {copied ? '✓ 복사됨' : '↗ 공유'}
          </button>
          {item.source && (
            <a href={item.source} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              height: '36px', padding: '0 18px',
              background: 'var(--color-primary)', color: '#fff',
              fontSize: 'var(--text-caption)', fontWeight: 400,
              borderRadius: 'var(--r-pill)',
              textDecoration: 'none',
              transition: 'background-color var(--transition)',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary)'}
            >
              원문 보기 ↗
            </a>
          )}
        </div>
      </div>

      {/* 반응 */}
      <div style={{ marginBottom: '40px' }}>
        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)', marginBottom: '12px', fontWeight: 600 }}>
          이 글 어떠셨나요?
        </p>
        <ReactionBar postId={item.id} compact={false} />
      </div>

      {/* 원문 콘텐츠 미리보기 */}
      {item.source && !iframeError && (
        <section style={{ marginBottom: '40px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '14px',
          }}>
            <h2 style={{ fontSize: 'var(--text-tagline)', fontWeight: 600, color: 'var(--color-ink)' }}>
              원문 내용
            </h2>
            <a href={item.source} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 'var(--text-caption)', color: 'var(--color-primary)' }}>
              {getDomain(item.source)} ↗
            </a>
          </div>

          {/* GitHub 레포: README 렌더링 */}
          {isGitHub(item.source) ? (
            <GitHubContent source={item.source} item={item} onError={() => setIframeError(true)} />
          ) : (
            /* 일반 소스: 상세 정보 카드 */
            <SourceInfoCard item={item} srcType={srcType} />
          )}
        </section>
      )}

      {/* 연관 콘텐츠 */}
      {related.length > 0 && (
        <section>
          <h2 style={{
            fontSize: 'var(--text-tagline)', fontWeight: 600,
            color: 'var(--color-ink)', marginBottom: '4px',
            paddingBottom: '12px', borderBottom: '1px solid var(--color-ink)',
          }}>관련 콘텐츠</h2>
          {related.map(rel => (
            <div key={rel.id} onClick={() => {
              saveDetail(rel)
              navigate(`crawl-detail/${rel.id}`)
            }} style={{
              padding: '16px 0', borderBottom: '1px solid var(--color-divider)',
              cursor: 'pointer',
            }}>
              <p style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '4px', letterSpacing: '-0.374px' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-ink)'}
              >{rel.title}</p>
              {rel.summary && (
                <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)', lineHeight: 1.47, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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

/** GitHub 레포 상세 카드 — README 파싱 + 메타 정보 */
function GitHubContent({ source, item, onError }) {
  const [readme, setReadme] = useState(null)
  const [loading, setLoading] = useState(true)
  const [repoMeta, setRepoMeta] = useState(null)

  useEffect(() => {
    // source: https://github.com/owner/repo
    const match = source.match(/github\.com\/([^/]+\/[^/]+)/)
    if (!match) { onError(); return }
    const repo = match[1]

    // GitHub raw README 가져오기
    const branches = ['main', 'master']
    async function fetchReadme() {
      for (const branch of branches) {
        try {
          const res = await fetch(`https://raw.githubusercontent.com/${repo}/${branch}/README.md`, { signal: AbortSignal.timeout(6000) })
          if (res.ok) {
            const text = await res.text()
            setReadme(text.slice(0, 6000)) // 6000자 제한
            setLoading(false)
            return
          }
        } catch {}
      }
      setLoading(false)
    }
    fetchReadme()
  }, [source])

  if (loading) return (
    <div style={{ padding: '40px', background: 'var(--color-parchment)', borderRadius: 'var(--r-lg)', textAlign: 'center' }}>
      <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)' }}>README 불러오는 중...</p>
    </div>
  )

  if (!readme) return <SourceInfoCard item={item} srcType={{ label: 'GitHub', color: '#24292F', icon: '⑆' }} />

  return (
    <div style={{
      background: 'var(--color-parchment)',
      border: '1px solid var(--color-hairline)',
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
    }}>
      {/* GitHub 헤더 */}
      <div style={{
        padding: '12px 20px',
        background: '#24292F', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600 }}>
          📄 README.md
        </span>
        <a href={source} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 'var(--text-caption)', color: '#58A6FF' }}>
          GitHub에서 보기 ↗
        </a>
      </div>
      {/* README 내용 — 마크다운 렌더링 */}
      <div style={{ padding: '24px', maxHeight: '600px', overflowY: 'auto' }}>
        <MarkdownView text={readme} />
      </div>
    </div>
  )
}

/** NPM/PyPI/일반 소스 정보 카드 */
function SourceInfoCard({ item, srcType }) {
  return (
    <div style={{
      border: '1px solid var(--color-hairline)',
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
    }}>
      {/* 소스 헤더 */}
      <div style={{
        padding: '14px 20px',
        background: srcType.color === '#000000' ? '#111' : srcType.color + 'ee',
        color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600 }}>
          {srcType.label}
        </span>
        {item.source && (
          <a href={item.source} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 'var(--text-caption)', color: 'rgba(255,255,255,0.8)' }}>
            원문 열기 ↗
          </a>
        )}
      </div>
      {/* 콘텐츠 */}
      <div style={{ padding: '28px 24px', background: '#fff' }}>
        <h3 style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '12px', letterSpacing: '-0.374px' }}>
          {item.title}
        </h3>
        {item.summary && (
          <p style={{ fontSize: 'var(--text-body)', fontWeight: 400, lineHeight: 1.65, color: 'var(--color-body)', marginBottom: '20px', letterSpacing: '-0.374px' }}>
            {item.summary}
          </p>
        )}

        {/* 메타 정보 */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '12px', padding: '16px', background: 'var(--color-parchment)',
          borderRadius: 'var(--r-md)',
        }}>
          {[
            { label: '조회수',  value: item.views?.toLocaleString() },
            { label: '좋아요',  value: item.likes },
            { label: '댓글',    value: item.comments },
            { label: '카테고리',value: item.topicLabel },
          ].map(m => (
            <div key={m.label}>
              <p style={{ fontSize: '11px', color: 'var(--color-muted-48)', marginBottom: '3px', fontWeight: 600 }}>{m.label}</p>
              <p style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-ink)' }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* 태그 */}
        {item.tags?.length > 0 && (
          <div style={{ marginTop: '16px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {item.tags.map(tag => (
              <span key={tag} style={{
                fontSize: '12px', padding: '4px 12px',
                borderRadius: 'var(--r-pill)',
                background: 'var(--color-primary)',
                color: '#fff', fontWeight: 600,
              }}>#{tag}</span>
            ))}
          </div>
        )}

        {/* 원문 링크 강조 */}
        {item.source && (
          <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(0,102,204,0.05)', borderRadius: 'var(--r-md)', border: '1px solid rgba(0,102,204,0.12)' }}>
            <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-muted-48)', marginBottom: '8px' }}>원문 주소</p>
            <a href={item.source} target="_blank" rel="noopener noreferrer"
              style={{
                fontSize: 'var(--text-caption)', color: 'var(--color-primary)',
                wordBreak: 'break-all', lineHeight: 1.6,
              }}>
              {item.source}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

/** 간단한 마크다운 → JSX 렌더러 */
function MarkdownView({ text }) {
  const lines = text.split('\n')
  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      {lines.map((line, i) => {
        // 이미지 제외 (외부 이미지 로딩 방지)
        if (/!\[.*?\]\(.*?\)/.test(line)) return null
        // H1
        if (line.startsWith('# ')) return (
          <h1 key={i} style={{ fontSize: 'var(--text-display)', fontWeight: 600, color: 'var(--color-ink)', margin: '24px 0 12px', letterSpacing: '-0.374px', lineHeight: 1.2 }}>
            {line.slice(2)}
          </h1>
        )
        // H2
        if (line.startsWith('## ')) return (
          <h2 key={i} style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-ink)', margin: '20px 0 8px', letterSpacing: '-0.374px' }}>
            {line.slice(3)}
          </h2>
        )
        // H3
        if (line.startsWith('### ')) return (
          <h3 key={i} style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-ink)', margin: '16px 0 6px' }}>
            {line.slice(4)}
          </h3>
        )
        // 코드 블록 (``` 라인)
        if (line.startsWith('```')) return (
          <div key={i} style={{ height: '2px' }} />
        )
        // 구분선
        if (/^[-*]{3,}$/.test(line.trim())) return (
          <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--color-divider)', margin: '16px 0' }} />
        )
        // 목록
        if (line.startsWith('- ') || line.startsWith('* ')) return (
          <p key={i} style={{ fontSize: 'var(--text-caption)', lineHeight: 1.65, color: 'var(--color-body)', paddingLeft: '16px', marginBottom: '4px' }}>
            • {inlineMarkdown(line.slice(2))}
          </p>
        )
        if (/^\d+\. /.test(line)) return (
          <p key={i} style={{ fontSize: 'var(--text-caption)', lineHeight: 1.65, color: 'var(--color-body)', paddingLeft: '16px', marginBottom: '4px' }}>
            {line}
          </p>
        )
        // 빈 줄
        if (!line.trim()) return <div key={i} style={{ height: '8px' }} />
        // 일반 텍스트
        return (
          <p key={i} style={{ fontSize: 'var(--text-caption)', lineHeight: 1.65, color: 'var(--color-body)', marginBottom: '4px' }}>
            {inlineMarkdown(line)}
          </p>
        )
      })}
    </div>
  )
}

/** 인라인 마크다운 처리 (bold, code, link → 텍스트) */
function inlineMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
}
