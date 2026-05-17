# aha! 프로젝트 재현 스킬 가이드

> 이 문서는 현재 세션의 모든 작업을 재현하기 위한 스킬 파일입니다.  
> AI 에이전트가 이 프로젝트를 처음부터 또는 이어서 작업할 때 참조합니다.

---

## 1. 프로젝트 개요

**aha!** — 한국 IT 기업 오픈소스 기반 실시간 크롤링 커뮤니티 플랫폼

- **사용자웹**: https://aha-five.vercel.app (React + Vite + Bootstrap 5)
- **관리자웹**: https://admin-vert-psi.vercel.app (React + Vite)
- **크롤링**: GitHub Actions 10분 자동 + 사용자웹 30초 폴링
- **저장소**: https://github.com/iushorts2302/aha

---

## 2. 환경 제약사항 (필수 숙지)

### Vercel 서버리스 크롤링 허용 도메인
```
허용: github.com, registry.npmjs.org, pypi.org, api.github.com
차단(403): 대부분의 한국 뉴스/커뮤니티 사이트 (GeekNews, ZDNet, 클리앙 등)
```

### Vercel 서버리스 특성
- 인스턴스 간 메모리 공유 안 됨 → POST 저장값이 다른 인스턴스 GET에서 초기값으로 보일 수 있음
- 영속 저장 필요 시 Vercel KV 또는 외부 DB 필요

### 데이터 저장 위치
- **게시글/댓글/좋아요/조회수**: localStorage (aha_posts_v1, aha_comments_v1)
- **크롤링 상호작용**: localStorage (aha_crawl_views, aha_crawl_likes)
- **이모지 반응**: localStorage (aha_reactions)
- **크롤링 데이터**: localStorage 캐시 + 서버 API 폴링
- **인증**: 메모리(useState) — 새로고침 시 로그아웃

---

## 3. 핵심 버그 패턴 & 해결책

### 3-1. 뒤로가기 (SPA)

**❌ 잘못된 방식:**
```js
// history.back() — SPA에서 외부 사이트 이탈
onClick={() => history.back()}

// setState 배치 문제
const [prevRoute, setPrevRoute] = useState()
function navigate(to) { setPrevRoute(route); setRoute(to) }
// → PostDetailPage에 전달되는 prevPage가 배치로 인해 틀린 값
```

**✅ 올바른 방식:**
```js
// App.jsx — useRef로 즉시 기록 (렌더 사이클과 무관)
const prevRouteRef = useRef('home')
function navigate(to) {
  prevRouteRef.current = route  // 이동 전 즉시 기록
  setRoute(to)
}

// PostDetailPage — prop으로 수신
export default function PostDetailPage({ postId, navigate, prevPage }) {
  function goBack() { navigate(prevPage || 'board') }
}

// App.jsx — prevPage prop 전달
<PostDetailPage prevPage={prevRouteRef.current} ... />
<CrawlDetailPage prevPage={prevRouteRef.current} ... />
```

### 3-2. 좋아요/조회수 목록 미동기화

**❌ 잘못된 방식:**
```js
// PostCard가 prop 스냅샷의 views를 표시
export default function PostCard({ post }) {
  return <span>👁 {post.views}</span>  // 상세 진입 후 변경 안 됨
}
```

**✅ 올바른 방식:**
```js
// AppContext — allPosts 원본 공개
<AppContext.Provider value={{ allPosts: posts, posts: visiblePosts, ... }}>

// PostCard — allPosts에서 실시간 참조
export default function PostCard({ post: postProp, navigate }) {
  const { allPosts } = useApp()
  const post = allPosts.find(p => p.id === postProp.id) ?? postProp
  return <span>👁 {post.views}</span>  // 항상 최신값
}
```

### 3-3. toggleLike/incrementView 즉시 반영

**❌ 잘못된 방식:**
```js
// useEffect로 localStorage 저장 → 지연
setPosts(next)
useEffect(() => { writePosts(posts) }, [posts])  // 다음 렌더에 실행
```

**✅ 올바른 방식:**
```js
// 함수형 업데이트 내부에서 즉시 저장
const toggleLike = useCallback((postId, userId) => {
  setPosts(prev => {
    const next = prev.map(p => { /* 토글 로직 */ })
    writeLS(POSTS_KEY, next)  // ← 즉시 저장
    return next
  })
}, [])
```

### 3-4. 댓글 작성 안됨

**❌ 잘못된 방식:**
```jsx
// <form onSubmit> → 부모 <article onClick> 버블링 간섭
// Bootstrap className="btn-primary btn-sm" → .btn base 없이 동작 불안정
<form onSubmit={handleSubmit}>
  <button type="submit" className="btn-primary btn-sm">댓글 작성</button>
</form>
```

**✅ 올바른 방식:**
```jsx
// form 제거, type="button" onClick 직접 처리
<div>
  <textarea value={body} onChange={e => setBody(e.target.value)} />
  <button type="button" onClick={handleSubmit}
    style={{ background: 'var(--color-primary)', border: 'none', ... }}>
    댓글 작성
  </button>
</div>
```

### 3-5. 이모지 반응 클릭 안됨 (Bootstrap 간섭)

**❌ 잘못된 방식:**
```jsx
// Bootstrap .btn 클래스 → pointer-events/focus 간섭
<button className="btn btn-outline-secondary" onClick={handleReact}>
```

**✅ 올바른 방식:**
```jsx
// type="button" + 순수 인라인 스타일
<button type="button"
  onClick={() => handleReact(r.key)}
  style={{
    outline: 'none', boxShadow: 'none',
    border: 'none', background: 'transparent',
    cursor: 'pointer',
  }}>
```

### 3-6. CrawlFeed navigate prop 누락

**문제:** SubPages.jsx의 CrawlFeed에 navigate prop 없으면 크롤링 카드 상세 진입 불가

**검증 방법:**
```bash
grep "<CrawlFeed" apps/user/src/pages/SubPages.jsx | grep -v "navigate="
# 출력이 없어야 정상
```

**수정 방법:**
```python
# Python으로 일괄 수정
with open('apps/user/src/pages/SubPages.jsx', 'r') as f:
    lines = f.readlines()
result = []
for line in lines:
    if '<CrawlFeed' in line and 'navigate=' not in line and '/>' in line:
        line = line.replace(' />', ' navigate={navigate} />')
    result.append(line)
```

### 3-7. CrawlCard views/likes 동기화

**문제:** CrawlCard가 item.views (항상 0)를 표시, 상세 진입 후 변경 안 됨

**✅ 해결:**
```jsx
// crawlInteractionStore.js — localStorage 저장
export function incrementCrawlView(itemId) { ... }
export function toggleCrawlLike(itemId) { ... }

// CrawlCard — localStorage에서 실시간 조회
const [liveViews, setLiveViews] = useState(() => getCrawlViews(item.id))
useEffect(() => {
  function onSync() {
    setLiveViews(getCrawlViews(item.id))
  }
  window.addEventListener('focus', onSync)    // 상세→목록 복귀
  window.addEventListener('storage', onSync)  // 다른 탭 변경
  return () => {
    window.removeEventListener('focus', onSync)
    window.removeEventListener('storage', onSync)
  }
}, [item.id])
```

---

## 4. 파일별 책임

### 사용자웹 핵심 파일

| 파일 | 책임 |
|---|---|
| `App.jsx` | SPA 라우터, prevRouteRef, navigate 함수 |
| `context/AppContext.jsx` | posts/comments/likes/views — localStorage 영속, allPosts 공개 |
| `context/AuthContext.jsx` | 로그인/회원가입/팔로우/북마크 |
| `pages/PostDetailPage.jsx` | 게시글 상세, allPosts 직접 참조 |
| `pages/CrawlDetailPage.jsx` | 크롤링 상세, crawlInteractionStore 연동 |
| `pages/SubPages.jsx` | 17개 메뉴 페이지, 모든 CrawlFeed에 navigate 필수 |
| `components/PostCard.jsx` | allPosts.find로 실시간 views/likes |
| `components/CrawlComponents.jsx` | CrawlCard, liveViews/liveLikes state |
| `components/ReactionBar.jsx` | 이모지 6종, Bootstrap 클래스 없음 |
| `components/CommentSection.jsx` | form 없음, type=button |
| `store/crawlStore.js` | MENU_TOPICS 63개 정의 |
| `store/crawlInteractionStore.js` | 크롤링 조회수/좋아요 localStorage |
| `store/reactionStore.js` | 이모지 반응 localStorage |
| `store/configStore.js` | /api/config 30초 폴링 |

### 관리자웹/API 핵심 파일

| 파일 | 책임 |
|---|---|
| `api/crawl.py` | 크롤링 엔진 (github_org/topic, npm, pypi) |
| `api/cron.py` | 우선순위 20개 토픽 자동 크롤링 |
| `api/data.py` | GET /api/data?topic=xxx |
| `api/blocked.py` | 게시글 차단 GET/POST |
| `api/config.py` | 설정(카테고리/주제/소스) GET/POST |
| `pages/CrawlConfigManager.jsx` | 분야/주제/소스 CRUD UI |
| `pages/CrawlerDashboard.jsx` | 크롤링 현황 + 수동 실행 |

---

## 5. 품질 테스트 실행

```bash
# 사용자웹 품질 테스트 (88개 자동 검사)
node apps/user/src/__tests__/quality.test.cjs

# 기대 결과:
# BK(뒤로가기) 12/12  VW(조회수) 14/14  SY(동기화) 5/5
# LK(좋아요) 16/16   RC(반응) 11/11    CM(댓글) 12/12
# PS(영속성) 6/6      NV(navigate) 4/4  CC(CrawlCard) 8/8
# 합계: 88/88 PASS
```

---

## 6. 배포 절차

```bash
# 사용자 앱
cd apps/user && npm run build  # 빌드 확인
vercel deploy --prod --token $TOKEN --scope $TEAM

# 관리자 앱
cd apps/admin && npm run build
vercel deploy --prod --token $TOKEN --scope $TEAM

# Vercel 설정
TEAM=team_u0nTqhnSIto8IpMSFP3SvJxS
USER_PROJECT=prj_ujlNAlTkOn0DF491p588YT0Jra1i
ADMIN_PROJECT=prj_jE0limKYeaFCCUupNhIDiTvyOVWL
```

---

## 7. 작업 반복 시 체크리스트

```
□ 새 기능 추가 시:
  - CrawlFeed 사용 시 navigate={navigate} 반드시 포함
  - 버튼 클릭 핸들러에 type="button" 명시
  - localStorage 쓰기는 setPosts 함수형 업데이트 내부에서 즉시 실행
  - Bootstrap className 대신 인라인 스타일 사용

□ 뒤로가기 관련:
  - App.jsx의 prevRouteRef.current를 prevPage prop으로 전달
  - history.back() 절대 사용 금지

□ 배포 전:
  - node apps/user/src/__tests__/quality.test.cjs 실행
  - npm run build 성공 확인
  - CrawlFeed navigate 누락 없는지 확인
```

---

## 8. 관련 문서

- `docs/QA_TESTCASES.md` — 135개 수동 QA 테스트케이스 v1.1
- `docs/QA_REPORT_20260517.md` — QA 실행 리포트 (92.6% 통과)
- `apps/user/src/__tests__/quality.test.cjs` — 자동 품질 테스트 88개
