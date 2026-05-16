import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { ahaScore } from '../store/algorithm.js'
import ReactionBar from './ReactionBar.jsx'

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

export default function PostCard({ post, navigate }) {
  const { currentUser, toggleBookmark, getUserById } = useAuth()
  const { toggleLike, categories, comments } = useApp()
  const author = getUserById(post.authorId)
  const category = categories.find(c => c.id === post.categoryId)
  const commentCount = comments.filter(c => c.postId === post.id).length
  const isLiked = post.likes.includes(currentUser?.id)
  const isBookmarked = currentUser?.bookmarks?.includes(post.id)

  // 알고리즘 점수
  const score = ahaScore(post, commentCount)
  const isHot     = score > 5
  const isViral   = score > 8
  const isRising  = score > 3 && (Date.now() - new Date(post.createdAt).getTime()) < 3 * 3600000

  return (
    <article style={{
      padding: 'var(--space-6) 0',
      borderBottom: '1px solid var(--color-border-soft)',
      cursor: 'pointer',
      borderLeft: isViral ? '3px solid #FF4500' : isHot ? '3px solid var(--color-accent)' : '3px solid transparent',
      paddingLeft: (isViral || isHot) ? 'var(--space-4)' : '0',
      transition: 'border-color var(--transition)',
    }} onClick={() => navigate(`post/${post.id}`)}>

      {/* 메타 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
        {/* HOT 배지 */}
        {isViral && <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', background: '#FF4500', color: '#fff', borderRadius: '99px' }}>🔥 바이럴</span>}
        {!isViral && isRising && <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', background: 'var(--color-accent)', color: 'var(--color-accent-text)', borderRadius: '99px' }}>↑ 급상승</span>}
        {!isViral && !isRising && isHot && <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', background: '#FF4500', color: '#fff', borderRadius: '99px' }}>HOT</span>}

        {post.type === 'crawled' && (
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', color: 'var(--color-accent)', border: '1px solid rgba(0,213,100,0.3)', borderRadius: '99px' }}>큐레이션</span>
        )}
        {category && <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{category.icon} {category.name}</span>}
        <span style={{ fontSize: '11px', color: 'var(--color-placeholder)' }}>·</span>
        <span style={{ fontSize: '11px', color: 'var(--color-placeholder)' }}>{timeAgo(post.createdAt)}</span>
      </div>

      {/* 제목 */}
      <h3 style={{
        fontSize: 'var(--text-md)', fontWeight: 700,
        color: 'var(--color-ink)', lineHeight: 1.4, marginBottom: 'var(--space-2)',
      }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >{post.title}</h3>

      {/* 미리보기 */}
      <p style={{
        fontSize: 'var(--text-sm)', color: 'var(--color-muted)', lineHeight: 1.65, marginBottom: 'var(--space-3)',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>{post.body?.replace(/#+\s/g, '').replace(/\n/g, ' ')}</p>

      {/* 태그 */}
      {post.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
          {post.tags.slice(0, 4).map(tag => (
            <span key={tag} style={{ fontSize: '11px', color: 'var(--color-muted)', background: 'var(--color-surface)', padding: '2px 8px', borderRadius: '99px' }}>{tag}</span>
          ))}
        </div>
      )}

      {/* 하단 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <button onClick={e => { e.stopPropagation(); navigate(`profile/${post.authorId}`) }} style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          fontSize: 'var(--text-sm)', color: 'var(--color-muted)', transition: 'color var(--transition)',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-ink)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-muted)'}
        >
          <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--color-ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800 }}>
            {author?.nickname?.[0] ?? '?'}
          </span>
          {author?.nickname ?? '알 수 없음'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          {/* 반응 바 (compact) */}
          <div onClick={e => e.stopPropagation()}>
            <ReactionBar postId={post.id} compact />
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-placeholder)' }}>조회 {post.views}</span>
          <button onClick={e => { e.stopPropagation(); if (currentUser) toggleLike(post.id, currentUser.id) }} style={{
            fontSize: '12px', color: isLiked ? 'var(--color-accent)' : 'var(--color-placeholder)',
            display: 'flex', alignItems: 'center', gap: '3px', transition: 'color var(--transition)',
          }}>♥ {post.likes.length}</button>
          <span style={{ fontSize: '12px', color: 'var(--color-placeholder)' }}>💬 {commentCount}</span>
          <button onClick={e => { e.stopPropagation(); if (currentUser) toggleBookmark(post.id) }} style={{
            fontSize: '13px', color: isBookmarked ? 'var(--color-ink)' : 'var(--color-placeholder)', transition: 'color var(--transition)',
          }}>{isBookmarked ? '★' : '☆'}</button>
        </div>
      </div>
    </article>
  )
}
