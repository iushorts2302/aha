# aha! 프로젝트 재현 스킬 가이드

> 현재 세션의 모든 작업을 재현하기 위한 스킬 파일  
> AI 에이전트가 이 프로젝트를 처음 접하거나 이어받을 때 참조

---

## 1. 프로젝트 개요

**aha!** — 한국 IT 기업 오픈소스 기반 실시간 크롤링 + MariaDB 영속 커뮤니티 플랫폼

- **사용자웹**: https://aha-five.vercel.app (React + Vite + Bootstrap 5)
- **관리자웹**: https://admin-vert-psi.vercel.app (React + Vite)
- **DB**: MariaDB `aha_db` @ `172.30.8.82:3306` (ngrok TCP 터널 경유)
- **크롤링**: GitHub Actions 10분 자동 → DB 저장 → 사용자웹 30초 폴링
- **저장소**: https://github.com/iushorts2302/aha

---

## 2. 환경 제약사항 (필수 숙지)

### Vercel 서버리스 제약
- **함수 12개 제한** (Hobby 플랜) → 모든 DB API를 `/api/v1.py` 단일 파일로 통합
- 현재 7개 파일: `blocked.py`, `config.py`, `crawl.py`, `cron.py`, `data.py`, `db.py`, `v1.py`
- 사설 IP 직접 접근 불가 → ngrok TCP 터널 사용

### DB 접속 구조 (ngrok 터널)
```
Vercel 서버리스
    ↓ pymysql.connect("0.tcp.jp.ngrok.io", 10840)
ngrok 클라우드 (일본)
    ↓ TCP 터널
Windows 서버 ngrok 에이전트 (172.30.8.82)
    ↓
MariaDB :3306 / aha_db
```

### ngrok 무료 플랜 한계
- **재시작 시 포트 변경** → `db.py` 기본값 + Vercel 환경변수 `DB_PORT` 업데이트 필요
- 접속 정보: `srvaha` / `qwER12#$` / `aha_db`

### 크롤링 허용 도메인
```
허용: github.com, api.github.com, registry.npmjs.org, pypi.org
차단(403): 대부분의 한국 뉴스/커뮤니티 사이트
```

---

## 3. DB 연결 정보

```python
# apps/admin/api/db.py
DB_CONFIG = {
    "host":     os.environ.get("DB_HOST",     "0.tcp.jp.ngrok.io"),
    "port":     int(os.environ.get("DB_PORT", "10840")),
    "user":     os.environ.get("DB_USER",     "srvaha"),
    "password": os.environ.get("DB_PASSWORD", "qwER12#$"),
    "database": os.environ.get("DB_NAME",     "aha_db"),
}
```

### ngrok 포트 변경 시 처리 절차
```bash
# 1. db.py 기본값 수정
# 2. Vercel 환경변수 업데이트 (API로 일괄 처리)
TOKEN="vcp_..."
ADMIN_PRJ="prj_jE0limKYeaFCCUupNhIDiTvyOVWL"
TEAM="team_u0nTqhnSIto8IpMSFP3SvJxS"

# DB_PORT 환경변수 ID 조회
curl -s "https://api.vercel.com/v10/projects/$ADMIN_PRJ/env?teamId=$TEAM" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json
for e in json.load(sys.stdin).get('envs',[]):
    if e.get('key') == 'DB_PORT': print(e['id'], e['target'])"

# 업데이트 (ID별로)
curl -X PATCH "https://api.vercel.com/v10/projects/$ADMIN_PRJ/env/<ID>?teamId=$TEAM" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"value":"새포트번호"}'

# 3. 재배포
cd apps/admin && vercel deploy --prod
```

---

## 4. API 구조 (`/api/v1`)

```
GET/POST/PATCH/DELETE /api/v1?resource=<resource>
```

| resource | 주요 파라미터 |
|---|---|
| `auth` | POST `{email, password, type:"user"\|"admin"}` |
| `users` | GET `?id=`, POST `{email,password,nickname}` |
| `posts` | GET `?id=\|?page=&limit=`, POST `{author_id,title,body,tags[]}` |
| `comments` | GET `?post_id=`, POST `{post_id,author_id,body}` |
| `likes` | POST `{post_id,user_id}` → `{liked,like_count}` |
| `bookmarks` | GET `?user_id=`, POST `{user_id,post_id}` |
| `reactions` | GET `?target_type=&target_id=&user_id=`, POST `{target_type,target_id,user_id,reaction_key}` |
| `follows` | GET `?user_id=&type=following\|followers`, POST `{follower_id,followee_id}` |
| `categories` | GET / POST `{category_id,label,icon}` / PATCH / DELETE |
| `topics` | GET `?category_id=`, POST `{topic_key,category_id,label}` / PATCH / DELETE |
| `sources` | GET / POST `{source_id,label,source_type,source_value,topic_keys[]}` |
| `crawl_items` | GET `?topic_key=&count_only=1`, POST `{items[]}`, PATCH `{id,blocked_yn}` |

---

## 5. 핵심 버그 패턴 & 해결책

### 5-1. 뒤로가기 (SPA)

```js
// ❌ 잘못 — history.back() SPA 이탈 / setState 배치 문제
const [prevRoute, setPrevRoute] = useState()
function navigate(to) { setPrevRoute(route); setRoute(to) }

// ✅ 올바름 — useRef 즉시 기록
const prevRouteRef = useRef('home')
function navigate(to) {
  prevRouteRef.current = route  // 렌더 전 즉시 기록
  setRoute(to)
}
// PostDetailPage / CrawlDetailPage
<PostDetailPage prevPage={prevRouteRef.current} ... />
// 컴포넌트 내
function goBack() { navigate(prevPage || 'board') }
```

### 5-2. 좋아요/조회수 목록 미동기화

```js
// ❌ 잘못 — post prop(스냅샷)의 views 사용
export default function PostCard({ post }) {
  return <span>👁 {post.views}</span>
}

// ✅ 올바름 — allPosts에서 실시간 참조
export default function PostCard({ post: postProp }) {
  const { allPosts } = useApp()
  const post = allPosts.find(p => p.id === postProp.id) ?? postProp
  return <span>👁 {post.views}</span>
}
```

### 5-3. DB 쓰기 즉시 반영

```js
// ✅ 함수형 업데이트 내부에서 즉시 writeLS + DB 백그라운드 동기화
const toggleLike = useCallback((postId, userId) => {
  setPosts(prev => {
    const n = prev.map(p => { /* 토글 */ })
    writeLS(POSTS_KEY, n)  // 즉시
    return n
  })
  if (dbAvailable) postAPI.toggleLike(postId, userId).catch(() => {})
}, [dbAvailable])
```

### 5-4. 댓글 작성 안됨

```jsx
// ❌ 잘못 — <form onSubmit> + 부모 onClick 버블링 + Bootstrap .btn 간섭
<form onSubmit={handleSubmit}>
  <button type="submit" className="btn-primary btn-sm">작성</button>
</form>

// ✅ 올바름 — form 제거, type=button, 순수 인라인 스타일
<button type="button" onClick={handleSubmit}
  style={{ background: 'var(--color-primary)', border: 'none' }}>
  댓글 작성
</button>
```

### 5-5. 이모지 반응 클릭 안됨

```jsx
// ❌ 잘못 — Bootstrap .btn 클래스 pointer-events 간섭
<button className="btn btn-outline-secondary" onClick={handleReact}>

// ✅ 올바름 — 순수 인라인 스타일
<button type="button" onClick={() => handleReact(r.key)}
  style={{ outline: 'none', boxShadow: 'none', border: 'none',
           background: 'transparent', cursor: 'pointer' }}>
```

### 5-6. CrawlFeed navigate prop 누락

```bash
# 확인
grep "<CrawlFeed" apps/user/src/pages/SubPages.jsx | grep -v "navigate="
# → 출력 없어야 정상

# 일괄 수정 (Python)
with open('SubPages.jsx') as f: lines = f.readlines()
result = [l.replace(' />', ' navigate={navigate} />') if '<CrawlFeed' in l and 'navigate=' not in l else l for l in lines]
```

### 5-7. CrawlCard views/likes 동기화

```jsx
// ✅ focus/storage 이벤트로 메모리 캐시 갱신
const [liveViews, setLiveViews] = useState(() => getCrawlViews(item.id))
useEffect(() => {
  function onSync() { setLiveViews(getCrawlViews(item.id)) }
  window.addEventListener('focus',   onSync)
  window.addEventListener('storage', onSync)
  return () => { window.removeEventListener('focus', onSync); window.removeEventListener('storage', onSync) }
}, [item.id])
```

### 5-8. Vercel 12개 함수 제한

```
# ❌ 개별 파일 17개 → 배포 실패
auth.py users.py posts.py comments.py likes.py bookmarks.py
reactions.py follows.py categories.py topics.py sources.py ...

# ✅ v1.py 단일 파일 통합
/api/v1?resource=auth|users|posts|comments|likes|bookmarks|...
현재 7개: blocked.py config.py crawl.py cron.py data.py db.py v1.py
```

### 5-9. Vercel 환경변수 설정 (API)

```bash
# 환경변수 ID 조회
curl -s "https://api.vercel.com/v10/projects/$PRJ/env?teamId=$TEAM" \
  -H "Authorization: Bearer $TOKEN"

# 업데이트 (PUT이 아닌 PATCH)
curl -X PATCH "https://api.vercel.com/v10/projects/$PRJ/env/$ID?teamId=$TEAM" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"value":"새값"}'
```

---

## 6. 파일별 책임

### 사용자웹 (`apps/user/src/`)

| 파일 | 책임 |
|---|---|
| `App.jsx` | SPA 라우터, `prevRouteRef`, `navigate` 함수 |
| `api/client.js` | DB API 클라이언트 (`/api/v1?resource=`) |
| `context/AppContext.jsx` | posts/comments — DB 우선 로드, localStorage 폴백 |
| `context/AuthContext.jsx` | 로그인/회원가입 — DB 우선, Mock 폴백 |
| `pages/PostDetailPage.jsx` | `allPosts.find()` 실시간 참조 |
| `pages/CrawlDetailPage.jsx` | `crawlInteractionStore` 연동 |
| `pages/SubPages.jsx` | 17개 메뉴 — **모든 CrawlFeed에 navigate 필수** |
| `components/PostCard.jsx` | `allPosts.find()` views/likes 실시간 |
| `components/CrawlComponents.jsx` | `liveViews/liveLikes` state + focus 이벤트 |
| `components/ReactionBar.jsx` | `loadReactions()` DB 로드 + 메모리 토글 |
| `components/CommentSection.jsx` | `<form>` 없음, `type=button` |
| `store/crawlStore.js` | MENU_TOPICS 70개 + DB API 폴링 (메모리 캐시) |
| `store/crawlInteractionStore.js` | 크롤링 views/likes (메모리, localStorage 없음) |
| `store/reactionStore.js` | 이모지 반응 (DB API + 메모리 캐시, localStorage 없음) |
| `store/configStore.js` | `/api/config` 30초 폴링 |

### 관리자웹/API (`apps/admin/`)

| 파일 | 책임 |
|---|---|
| `api/db.py` | MariaDB 공통 연결 (pymysql, 환경변수 우선) |
| `api/v1.py` | 통합 CRUD 라우터 (12개 resource, 550줄) |
| `api/data.py` | GET /api/data?topic — DB 우선, 없으면 크롤링 후 저장 |
| `api/cron.py` | 20개 우선순위 토픽 크롤링 → DB 저장 + cron_log |
| `api/crawl.py` | 크롤링 엔진 (github_org/topic, npm, pypi) |
| `api/blocked.py` | 차단 목록 GET/POST |
| `api/config.py` | 카테고리/주제/소스 설정 GET/POST |
| `src/pages/CrawlerDashboard.jsx` | DB 토픽 70개 로드 + 수집 현황 |
| `src/pages/CrawlConfigManager.jsx` | 분야/주제/소스 CRUD UI |
| `src/context/AdminContext.jsx` | DB CRUD 완전 연동 |

---

## 7. 품질 테스트 실행

```bash
node apps/user/src/__tests__/quality.test.cjs

# 기대 결과 (총 110개):
# BK 뒤로가기   12/12   VW 조회수      14/14
# SY 목록동기화   5/5   LK 좋아요      16/16
# RC 이모지반응  11/11   CM 댓글작성   12/12
# PS 영속성       6/6   NV navigate     4/4
# CC CrawlCard    8/8   CF 설정관리   10/10
# DB DB연동      12/12
```

---

## 8. 배포 절차

```bash
TOKEN="vcp_xxxx...your_vercel_token"  # Vercel Personal Access Token
TEAM="team_u0nTqhnSIto8IpMSFP3SvJxS"

# 빌드 확인
cd apps/user  && npm run build
cd apps/admin && npm run build

# 배포
cd apps/user  && vercel deploy --prod --token $TOKEN --scope $TEAM
cd apps/admin && vercel deploy --prod --token $TOKEN --scope $TEAM

# Vercel 프로젝트 ID
USER_PROJECT=prj_ujlNAlTkOn0DF491p588YT0Jra1i
ADMIN_PROJECT=prj_jE0limKYeaFCCUupNhIDiTvyOVWL
```

---

## 9. 작업 반복 시 체크리스트

```
□ 새 기능 추가 시:
  - CrawlFeed 사용 → navigate={navigate} 반드시 포함
  - 버튼 클릭 핸들러 → type="button" 명시
  - DB 쓰기 → setPosts 함수형 업데이트 내부에서 writeLS 즉시 호출
  - 버튼 스타일 → Bootstrap className 대신 인라인 스타일

□ 뒤로가기 관련:
  - App.jsx의 prevRouteRef.current를 prevPage prop으로 전달
  - history.back() 절대 사용 금지

□ API 추가 시:
  - v1.py에 resource 함수 추가 (별도 파일 만들면 12개 제한 초과 위험)
  - ROUTES 딕셔너리에 등록

□ ngrok 포트 변경 시:
  - db.py 기본값 수정
  - Vercel 환경변수 DB_PORT 업데이트
  - 관리자 앱 재배포

□ 배포 전:
  - node apps/user/src/__tests__/quality.test.cjs 실행
  - npm run build 양쪽 모두 성공 확인
```

---

## 10. 관련 문서

- `docs/DB_SCHEMA.md` — MariaDB 21개 테이블 DDL (PK: seq_no BIGINT AUTO_INCREMENT)
- `docs/QA_TESTCASES.md` — 135개 수동 QA 테스트케이스 v1.1
- `docs/QA_REPORT_20260517.md` — QA 실행 리포트
- `apps/user/src/__tests__/quality.test.cjs` — 자동 품질 테스트
