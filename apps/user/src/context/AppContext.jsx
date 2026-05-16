import { createContext, useContext, useState } from 'react'

const AppContext = createContext(null)

const MOCK_CATEGORIES = [
  { id: 'c1', name: 'DIY', icon: '🔧', description: '직접 만들고 고치는 모든 것' },
  { id: 'c2', name: '테크', icon: '💻', description: '최신 기술 트렌드와 리뷰' },
  { id: 'c3', name: '요리', icon: '🍳', description: '레시피와 맛집 정보' },
  { id: 'c4', name: '여행', icon: '✈️', description: '국내외 여행 정보와 경험담' },
  { id: 'c5', name: '운동', icon: '💪', description: '헬스, 러닝, 스포츠 정보' },
]

const MOCK_POSTS = [
  {
    id: 'p1', categoryId: 'c1', authorId: 'u2',
    title: '3만원으로 만든 원목 선반 후기 — 실패도 솔직하게',
    body: '처음 DIY에 도전했을 때 정말 막막했습니다. 유튜브만 보고 무작정 시작했다가 나사 구멍을 잘못 뚫어서 목재를 한 번 버렸어요. 그래도 포기하지 않고 두 번째 시도에서 성공했습니다.\n\n## 준비물\n- 원목 파인 집성목 900x200 (홈센터 구매, 약 1.5만원)\n- L자 브라켓 4개 (3천원)\n- 나사 세트, 앵커 (5천원)\n- 사포 200방, 320방\n- 수성 바니쉬\n\n## 작업 순서\n1. 목재 사포질 (200방 → 320방 순서로)\n2. 바니쉬 2회 도포 (각 4시간 건조)\n3. 벽 스터드 위치 확인 후 브라켓 고정\n4. 선반 올리고 나사 고정\n\n처음이라 하루 종일 걸렸지만 결과물이 마음에 들어서 뿌듯합니다!',
    tags: ['DIY', '선반', '원목', '인테리어'],
    type: 'user',
    likes: ['u1'],
    views: 342,
    createdAt: '2024-05-10T09:23:00Z',
  },
  {
    id: 'p2', categoryId: 'c2', authorId: 'u1',
    title: 'M3 맥북 에어 3개월 사용 — 실사용자 솔직 리뷰',
    body: '개발 작업과 영상 편집을 주로 하는 사람으로서 M3 맥북 에어를 3개월 사용한 후기를 공유합니다.\n\n## 장점\n- 배터리가 정말 놀랍습니다. 카페에서 하루 종일 써도 충전이 필요 없었어요.\n- 팬리스임에도 불구하고 일반 개발 작업에서는 발열이 거의 없습니다.\n- Xcode 빌드 속도가 이전 인텔 맥에 비해 체감상 3배 이상 빠릅니다.\n\n## 아쉬운 점\n- 8GB RAM 모델은 Final Cut Pro에서 무거운 프로젝트 시 스왑이 심하게 발생합니다.\n- 포트가 2개뿐이라 독으로 사용하면 충전하면서 외부 모니터 연결이 불가합니다.',
    tags: ['맥북', '애플', 'M3', '리뷰'],
    type: 'user',
    likes: ['u2'],
    views: 1204,
    createdAt: '2024-05-08T14:10:00Z',
  },
  {
    id: 'p3', categoryId: 'c3', authorId: 'u2',
    title: '에어프라이어로 만드는 바삭한 닭강정 레시피',
    body: '기름 없이 에어프라이어로 만드는 닭강정입니다. 오븐보다 훨씬 간편하고 바삭함은 비슷합니다.\n\n## 재료 (2인분)\n- 닭다리살 400g\n- 전분가루 4큰술\n- 간장, 올리고당, 고추장, 다진 마늘\n\n## 조리 방법\n1. 닭다리살을 한입 크기로 자른 뒤 소금, 후추로 밑간\n2. 전분가루를 골고루 묻힌 후 20분 재우기\n3. 에어프라이어 200도, 15분 → 뒤집어서 7분\n4. 소스 재료를 팬에 끓인 후 닭에 버무리기\n\n마지막에 깨를 뿌리면 완성!',
    tags: ['에어프라이어', '닭강정', '레시피'],
    type: 'user',
    likes: ['u1', 'u2'],
    views: 876,
    createdAt: '2024-05-06T18:44:00Z',
  },
  {
    id: 'p4', categoryId: 'c4', authorId: 'u1',
    title: '후쿠오카 3박 4일 — 혼자 여행 완전 가이드',
    body: '지난달 다녀온 후쿠오카 혼행 기록입니다. 항공권은 LCC 이용해서 왕복 18만원에 해결했어요.\n\n## 일정 요약\n**1일차**: 후쿠오카 공항 → 캐널시티 → 나카스 야타이\n**2일차**: 다자이후 → 야나가와 뱃놀이 → 텐진 쇼핑\n**3일차**: 모츠나베 → 유후인 당일치기\n**4일차**: 하카타역 쇼핑 → 귀국\n\n## 교통 팁\n- 니시테츠 패스 구매 필수 (3일권 ¥3,000)\n- 유후인은 왕복 버스보다 특급열차가 더 편합니다\n\n예산은 숙박 포함 총 50만원으로 해결!',
    tags: ['후쿠오카', '일본여행', '혼여행'],
    type: 'user',
    likes: [],
    views: 512,
    createdAt: '2024-05-04T11:30:00Z',
  },
  {
    id: 'p5', categoryId: 'c2', authorId: 'u2',
    title: '[크롤링] Vite 5.3 릴리즈 — 주요 변경사항 정리',
    body: 'Vite 5.3 버전이 릴리즈되었습니다. 이번 업데이트의 주요 변경사항을 정리합니다.\n\n빌드 성능이 대폭 개선되어 대규모 프로젝트에서 최대 40% 빠른 빌드 속도를 경험할 수 있습니다. 또한 CSS 처리 방식이 개선되어 복잡한 CSS 모듈에서 발생하던 버그들이 수정되었습니다.',
    tags: ['Vite', '웹개발', '릴리즈'],
    type: 'crawled',
    likes: ['u1'],
    views: 2341,
    createdAt: '2024-05-12T08:00:00Z',
  },
]

const MOCK_COMMENTS = [
  { id: 'cm1', postId: 'p1', authorId: 'u1', body: '저도 비슷한 경험 있어요! 스터드 파인더 꼭 사세요, 게임체인저입니다 ㅋㅋ', likes: [], createdAt: '2024-05-10T11:00:00Z' },
  { id: 'cm2', postId: 'p1', authorId: 'u2', body: '바니쉬 브랜드가 어떤 건지 여쭤봐도 될까요?', likes: ['u1'], createdAt: '2024-05-10T13:22:00Z' },
  { id: 'cm3', postId: 'p2', authorId: 'u2', body: '16GB 모델이면 영상편집도 충분한가요?', likes: [], createdAt: '2024-05-08T15:00:00Z' },
  { id: 'cm4', postId: 'p3', authorId: 'u1', body: '소스 비율이 정확히 어떻게 되나요? 간장 몇 큰술?', likes: [], createdAt: '2024-05-07T09:10:00Z' },
]

export function AppProvider({ children }) {
  const [categories] = useState(MOCK_CATEGORIES)
  const [posts, setPosts] = useState(MOCK_POSTS)
  const [comments, setComments] = useState(MOCK_COMMENTS)

  function getPostById(id) { return posts.find(p => p.id === id) }
  function getCommentsByPostId(postId) { return comments.filter(c => c.postId === postId) }
  function getPostsByCategory(categoryId) { return posts.filter(p => p.categoryId === categoryId) }
  function getPostsByAuthor(authorId) { return posts.filter(p => p.authorId === authorId) }

  function addPost(post) {
    const newPost = {
      ...post,
      id: `p${Date.now()}`,
      likes: [],
      views: 0,
      type: 'user',
      createdAt: new Date().toISOString(),
    }
    setPosts(prev => [newPost, ...prev])
    return newPost
  }

  function toggleLike(postId, userId) {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const liked = p.likes.includes(userId)
      return { ...p, likes: liked ? p.likes.filter(id => id !== userId) : [...p.likes, userId] }
    }))
  }

  function addComment(postId, authorId, body) {
    const newComment = {
      id: `cm${Date.now()}`,
      postId, authorId, body,
      likes: [],
      createdAt: new Date().toISOString(),
    }
    setComments(prev => [...prev, newComment])
    return newComment
  }

  function deleteComment(commentId) {
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  function incrementView(postId) {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, views: p.views + 1 } : p))
  }

  return (
    <AppContext.Provider value={{
      categories, posts, comments,
      getPostById, getCommentsByPostId, getPostsByCategory, getPostsByAuthor,
      addPost, toggleLike, addComment, deleteComment, incrementView,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() { return useContext(AppContext) }
