import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { sortPosts } from '../store/algorithm.js'
import PostCard from '../components/PostCard.jsx'

const TABS = [
  { key: 'posts',     label: '게시글' },
  { key: 'comments',  label: '댓글' },
  { key: 'bookmarks', label: '저장글', meOnly: true },
]

export default function ProfilePage({ userId, navigate }) {
  const { currentUser, getUserById, toggleFollow } = useAuth()
  const { getPostsByAuthor, posts, comments } = useApp()
  const [tab, setTab] = useState('posts')

  const user = getUserById(userId)
  if (!user) return (
    <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
      <p style={{ fontSize: 'var(--text-md)', color: 'var(--color-muted)' }}>사용자를 찾을 수 없습니다.</p>
    </div>
  )

  const isMe = currentUser?.id === userId
  const isFollowing = currentUser?.following?.includes(userId) || false

  const commentsMap = Object.fromEntries(posts.map(p => [p.id, comments.filter(c => c.postId === p.id).length]))
  const userPosts    = sortPosts(getPostsByAuthor(userId), commentsMap, 'hot')
  const userComments = comments.filter(c => c.authorId === userId)
  const savedPosts   = isMe ? posts.filter(p => currentUser.bookmarks?.includes(p.id)) : []

  const visibleTabs = TABS.filter(t => !t.meOnly || isMe)

  return (
    <div className="fade-up">
      {/* 프로필 헤더 */}
      <div style={{ padding: 'var(--space-8) 0 var(--space-6)', borderBottom: '1px solid var(--color-border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
          {/* 아바타 + 기본 정보 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'var(--color-ink)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px', fontWeight: 600, flexShrink: 0,
            }}>{(user.nickname||"?")[0]}</div>
            <div>
              <h1 style={{ fontSize: 'var(--text-display-md)', fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>{user.nickname}</h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginTop: 'var(--space-1)' }}>{user.bio || '소개가 없습니다.'}</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-placeholder)', marginTop: 'var(--space-2)' }}>{user.createdAt} 가입</p>
            </div>
          </div>

          {/* 팔로우 / 편집 */}
          {isMe ? (
            <button onClick={() => navigate('my')} className="btn-secondary" style={{ height: '36px', padding: '0 var(--space-5)', minWidth: 'unset' }}>
              프로필 편집
            </button>
          ) : currentUser && (
            <button onClick={() => toggleFollow(userId)}
              className={isFollowing ? 'btn btn-secondary' : 'btn btn-primary'}
              style={{ height: '40px', padding: '0 var(--space-6)', minWidth: 'unset' }}>
              {isFollowing ? '✓ 팔로잉' : '+ 팔로우'}
            </button>
          )}
        </div>

        {/* 통계 */}
        <div style={{ display: 'flex', gap: 'var(--space-8)', marginTop: 'var(--space-6)' }}>
          {[
            { label: '게시글',  value: userPosts.length },
            { label: '팔로워',  value: user.followers?.length || 0 },
            { label: '팔로잉',  value: user.following?.length || 0 },
            { label: '받은 좋아요', value: userPosts.reduce((s, p) => s + (p.likes?.length || 0), 0) },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--color-ink)', lineHeight: 1.2 }}>{stat.value}</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', marginTop: '2px' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* 전문성 배지 */}
        {user.expertise?.length > 0 && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-5)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-placeholder)', fontWeight: 700, alignSelf: 'center' }}>전문 분야</span>
            {user.expertise.map(e => (
              <span key={e} style={{
                fontSize: 'var(--text-xs)', fontWeight: 600,
                padding: 'var(--space-1) var(--space-4)', borderRadius: '99px',
                background: 'rgba(0,213,100,0.1)',
                color: '#FFFFFF',
                border: '1px solid rgba(0,213,100,0.25)',
              }}>⚡ {e}</span>
            ))}
          </div>
        )}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-soft)' }}>
        {visibleTabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: 'var(--space-4) var(--space-6)', fontSize: 'var(--text-sm)', fontWeight: 600,
            color: tab === t.key ? 'var(--color-ink)' : 'var(--color-muted)',
            borderBottom: `2px solid ${tab === t.key ? 'var(--color-ink)' : 'transparent'}`,
            marginBottom: '-1px', transition: 'color var(--transition), border-color var(--transition)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* 게시글 탭 */}
      {tab === 'posts' && (
        userPosts.length > 0
          ? <div>{userPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div>
          : <p style={{ padding: 'var(--space-8) 0', fontSize: 'var(--text-md)', color: 'var(--color-muted)', textAlign: 'center' }}>게시글이 없습니다.</p>
      )}

      {/* 댓글 탭 */}
      {tab === 'comments' && (
        userComments.length > 0
          ? <div>
              {userComments.map(c => {
                const p = posts.find(post => post.id === c.postId)
                return (
                  <div key={c.id} style={{ padding: 'var(--space-5) 0', borderBottom: '1px solid var(--color-border-soft)' }}>
                    {p && (
                      <button onClick={() => navigate(`post/${c.postId}`)} style={{
                        fontSize: 'var(--text-xs)', color: 'var(--color-primary)', fontWeight: 600,
                        marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                        transition: 'opacity var(--transition)',
                      }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                      >↗ {p.title}</button>
                    )}
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-body)', lineHeight: 1.65 }}>{c.body}</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-placeholder)', marginTop: 'var(--space-2)' }}>
                      {new Date(c.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                )
              })}
            </div>
          : <p style={{ padding: 'var(--space-8) 0', fontSize: 'var(--text-md)', color: 'var(--color-muted)', textAlign: 'center' }}>댓글이 없습니다.</p>
      )}

      {/* 저장글 탭 (본인만) */}
      {tab === 'bookmarks' && isMe && (
        savedPosts.length > 0
          ? <div>{savedPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}</div>
          : <p style={{ padding: 'var(--space-8) 0', fontSize: 'var(--text-md)', color: 'var(--color-muted)', textAlign: 'center' }}>저장한 글이 없습니다.</p>
      )}
    </div>
  )
}
