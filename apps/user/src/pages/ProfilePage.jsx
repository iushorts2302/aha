import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import PostCard from '../components/PostCard'

export default function ProfilePage({ userId, navigate }) {
  const { currentUser, getUserById, toggleFollow } = useAuth()
  const { getPostsByAuthor, posts, comments } = useApp()
  const [tab, setTab] = useState('posts')

  const user = getUserById(userId)
  if (!user) return (
    <div style={{ padding: '80px 0', textAlign: 'center' }}>
      <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>사용자를 찾을 수 없습니다.</p>
    </div>
  )

  const isMe = currentUser?.id === userId
  const isFollowing = currentUser?.following.includes(userId)
  const userPosts = getPostsByAuthor(userId)
  const userComments = comments.filter(c => c.authorId === userId)
  const bookmarkedPosts = isMe ? posts.filter(p => currentUser.bookmarks.includes(p.id)) : []

  const TABS = [
    { key: 'posts', label: `게시글 ${userPosts.length}` },
    { key: 'comments', label: `댓글 ${userComments.length}` },
    ...(isMe ? [{ key: 'bookmarks', label: `즐겨찾기 ${bookmarkedPosts.length}` }] : []),
  ]

  return (
    <div className="fade-up">
      {/* 프로필 헤더 */}
      <div style={{ padding: '48px 0 40px', borderBottom: '1px solid var(--color-border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* 아바타 */}
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'var(--color-ink)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', fontWeight: 500,
            }}>{user.nickname[0]}</div>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 500, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
                {user.nickname}
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginTop: '4px' }}>
                {user.bio || '소개가 없습니다.'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-placeholder)', marginTop: '6px' }}>
                {user.createdAt} 가입
              </p>
            </div>
          </div>

          {!isMe && currentUser && (
            <button onClick={() => toggleFollow(userId)} className={isFollowing ? 'btn btn-secondary' : 'btn btn-primary'}
              style={{ height: '40px', padding: '0 24px' }}>
              {isFollowing ? '팔로잉' : '팔로우'}
            </button>
          )}
        </div>

        {/* 통계 */}
        <div style={{ display: 'flex', gap: '32px', marginTop: '32px' }}>
          {[
            { label: '게시글', value: userPosts.length },
            { label: '팔로워', value: user.followers.length },
            { label: '팔로잉', value: user.following.length },
          ].map(stat => (
            <div key={stat.label}>
              <p style={{ fontSize: '22px', fontWeight: 500, color: 'var(--color-ink)' }}>{stat.value}</p>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '2px' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* 전문성 */}
        {user.expertise.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '20px' }}>
            {user.expertise.map(e => (
              <span key={e} style={{
                fontSize: '12px', fontWeight: 500,
                padding: '4px 12px', borderRadius: '99px',
                border: '1px solid var(--color-border)',
                color: 'var(--color-body)',
              }}>{e}</span>
            ))}
          </div>
        )}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-soft)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '16px 20px', fontSize: '14px', fontWeight: 500,
            color: tab === t.key ? 'var(--color-ink)' : 'var(--color-muted)',
            borderBottom: `2px solid ${tab === t.key ? 'var(--color-ink)' : 'transparent'}`,
            marginBottom: '-1px', transition: 'color var(--transition), border-color var(--transition)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* 콘텐츠 */}
      {tab === 'posts' && (
        <div>
          {userPosts.length === 0
            ? <p style={{ padding: '48px 0', fontSize: '14px', color: 'var(--color-muted)' }}>게시글이 없습니다.</p>
            : userPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}
        </div>
      )}

      {tab === 'comments' && (
        <div>
          {userComments.length === 0
            ? <p style={{ padding: '48px 0', fontSize: '14px', color: 'var(--color-muted)' }}>댓글이 없습니다.</p>
            : userComments.map(c => {
              const post = posts.find(p => p.id === c.postId)
              return (
                <div key={c.id} style={{ padding: '20px 0', borderBottom: '1px solid var(--color-border-soft)' }}>
                  <button onClick={() => navigate(`post/${c.postId}`)} style={{
                    fontSize: '12px', color: 'var(--color-accent)', marginBottom: '8px', display: 'block',
                    transition: 'opacity var(--transition)',
                  }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >↗ {post?.title}</button>
                  <p style={{ fontSize: '14px', color: 'var(--color-body)', lineHeight: 1.65 }}>{c.body}</p>
                </div>
              )
            })}
        </div>
      )}

      {tab === 'bookmarks' && isMe && (
        <div>
          {bookmarkedPosts.length === 0
            ? <p style={{ padding: '48px 0', fontSize: '14px', color: 'var(--color-muted)' }}>저장한 글이 없습니다.</p>
            : bookmarkedPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}
        </div>
      )}
    </div>
  )
}
