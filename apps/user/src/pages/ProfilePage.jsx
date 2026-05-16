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
    <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-muted)' }}>
      <p style={{ fontSize: '14px' }}>사용자를 찾을 수 없습니다.</p>
    </div>
  )

  const isMe = currentUser?.id === userId
  const isFollowing = currentUser?.following?.includes(userId)
  const userPosts = getPostsByAuthor(userId)
  const userComments = comments.filter(c => c.authorId === userId)
  const bookmarked = isMe ? posts.filter(p => currentUser.bookmarks.includes(p.id)) : []

  const tabs = [
    { key: 'posts', label: `게시글 ${userPosts.length}` },
    { key: 'comments', label: `댓글 ${userComments.length}` },
    ...(isMe ? [{ key: 'bookmarks', label: `즐겨찾기 ${bookmarked.length}` }] : []),
  ]

  return (
    <div className="fade-up">
      {/* 프로필 */}
      <div style={{ marginBottom: '32px', paddingBottom: '28px', borderBottom: '1px solid var(--color-border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 600, flexShrink: 0 }}>
              {user.nickname[0]}
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-ink)', marginBottom: '4px' }}>{user.nickname}</h2>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{user.bio || '소개가 없습니다.'}</p>
            </div>
          </div>
          {!isMe && currentUser && (
            <button onClick={() => toggleFollow(userId)} className={isFollowing ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}>
              {isFollowing ? '팔로잉' : '팔로우'}
            </button>
          )}
        </div>

        {/* 통계 */}
        <div style={{ display: 'flex', gap: '28px' }}>
          {[
            { label: '게시글', value: userPosts.length },
            { label: '팔로워', value: user.followers.length },
            { label: '팔로잉', value: user.following.length },
          ].map(s => (
            <div key={s.label}>
              <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-ink)' }}>{s.value}</span>
              <span style={{ fontSize: '13px', color: 'var(--color-muted)', marginLeft: '6px' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* 전문성 배지 */}
        {user.expertise.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px' }}>
            {user.expertise.map(e => (
              <span key={e} style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 500, color: 'var(--color-accent)', background: 'rgba(62,106,225,0.08)', border: '1px solid rgba(62,106,225,0.2)' }}>{e}</span>
            ))}
          </div>
        )}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-soft)', marginBottom: '16px' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 20px', fontSize: '14px', fontWeight: 500,
            color: tab === t.key ? 'var(--color-ink)' : 'var(--color-muted)',
            borderBottom: `2px solid ${tab === t.key ? 'var(--color-ink)' : 'transparent'}`,
            marginBottom: '-1px', transition: 'color var(--transition), border-color var(--transition)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* 콘텐츠 */}
      {tab === 'posts' && (
        userPosts.length === 0
          ? <p style={{ fontSize: '14px', color: 'var(--color-muted)', padding: '40px 0', textAlign: 'center' }}>게시글이 없습니다.</p>
          : userPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)
      )}
      {tab === 'comments' && (
        userComments.length === 0
          ? <p style={{ fontSize: '14px', color: 'var(--color-muted)', padding: '40px 0', textAlign: 'center' }}>댓글이 없습니다.</p>
          : userComments.map(c => {
            const post = posts.find(p => p.id === c.postId)
            return (
              <div key={c.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--color-border-soft)' }}>
                <button onClick={() => navigate(`post/${c.postId}`)} style={{ fontSize: '12px', color: 'var(--color-accent)', marginBottom: '6px', display: 'block' }}>
                  → {post?.title}
                </button>
                <p style={{ fontSize: '14px', color: 'var(--color-body)' }}>{c.body}</p>
              </div>
            )
          })
      )}
      {tab === 'bookmarks' && isMe && (
        bookmarked.length === 0
          ? <p style={{ fontSize: '14px', color: 'var(--color-muted)', padding: '40px 0', textAlign: 'center' }}>저장한 글이 없습니다.</p>
          : bookmarked.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)
      )}
    </div>
  )
}
