import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import PostCard from '../components/PostCard'

const TABS = [
  { key: 'posts', label: '게시글' },
  { key: 'comments', label: '댓글' },
  { key: 'bookmarks', label: '즐겨찾기' },
]

export default function ProfilePage({ userId, navigate }) {
  const { currentUser, getUserById, toggleFollow } = useAuth()
  const { getPostsByAuthor, getCommentsByPostId, posts, comments } = useApp()
  const [tab, setTab] = useState('posts')

  const user = getUserById(userId)
  if (!user) return (
    <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-muted)' }}>
      <p style={{ fontSize: '32px' }}>😕</p>
      <p style={{ marginTop: '12px' }}>사용자를 찾을 수 없습니다.</p>
    </div>
  )

  const isMe = currentUser?.id === userId
  const isFollowing = currentUser?.following.includes(userId)
  const userPosts = getPostsByAuthor(userId)
  const userComments = comments.filter(c => c.authorId === userId)
  const bookmarkedPosts = isMe ? posts.filter(p => currentUser.bookmarks.includes(p.id)) : []

  return (
    <div className="fade-up">
      {/* 프로필 카드 */}
      <div className="card" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'var(--color-accent)', color: '#000',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', fontWeight: 700, flexShrink: 0,
            }}>{user.nickname[0]}</div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{user.nickname}</h2>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '4px' }}>{user.bio || '소개가 없습니다.'}</p>
              <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>가입일 {user.createdAt}</p>
            </div>
          </div>

          {!isMe && currentUser && (
            <button
              onClick={() => toggleFollow(userId)}
              className={isFollowing ? 'btn btn-ghost' : 'btn btn-primary'}
            >
              {isFollowing ? '✓ 팔로잉' : '+ 팔로우'}
            </button>
          )}
        </div>

        {/* 통계 */}
        <div style={{ display: 'flex', gap: '24px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
          {[
            { label: '게시글', value: userPosts.length },
            { label: '팔로워', value: user.followers.length },
            { label: '팔로잉', value: user.following.length },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-accent)' }}>{stat.value}</p>
              <p style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* 전문성 배지 */}
        {user.expertise.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '16px' }}>
            {user.expertise.map(e => (
              <span key={e} style={{
                padding: '4px 12px', borderRadius: '99px',
                background: 'rgba(232,255,71,0.1)', color: 'var(--color-accent)',
                border: '1px solid rgba(232,255,71,0.3)',
                fontSize: '12px', fontWeight: 600,
              }}>⚡ {e}</span>
            ))}
          </div>
        )}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
        {TABS.filter(t => isMe || t.key !== 'bookmarks').map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 18px', fontSize: '14px',
            fontWeight: tab === t.key ? 600 : 400,
            color: tab === t.key ? 'var(--color-accent)' : 'var(--color-muted)',
            borderBottom: tab === t.key ? '2px solid var(--color-accent)' : '2px solid transparent',
            marginBottom: '-1px',
          }}>{t.label}</button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {tab === 'posts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {userPosts.length === 0
            ? <p style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)', fontSize: '13px' }}>게시글이 없습니다.</p>
            : userPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}
        </div>
      )}

      {tab === 'comments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {userComments.length === 0
            ? <p style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)', fontSize: '13px' }}>댓글이 없습니다.</p>
            : userComments.map(c => {
              const post = posts.find(p => p.id === c.postId)
              return (
                <div key={c.id} className="card" style={{ padding: '14px 18px' }}>
                  <button onClick={() => navigate(`post/${c.postId}`)} style={{ fontSize: '12px', color: 'var(--color-accent)', marginBottom: '6px' }}>
                    → {post?.title}
                  </button>
                  <p style={{ fontSize: '13px' }}>{c.body}</p>
                </div>
              )
            })}
        </div>
      )}

      {tab === 'bookmarks' && isMe && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {bookmarkedPosts.length === 0
            ? <p style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)', fontSize: '13px' }}>저장한 글이 없습니다.</p>
            : bookmarkedPosts.map(p => <PostCard key={p.id} post={p} navigate={navigate} />)}
        </div>
      )}
    </div>
  )
}
