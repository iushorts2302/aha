# aha! — 전문 정보 큐레이션 & 공유 커뮤니티

> **한국 기업 GitHub 기반 실시간 크롤링 + 사용자 커뮤니티 플랫폼**

---

## 배포 URL

| 앱 | URL | 계정 |
|---|---|---|
| **사용자 웹** | https://aha-five.vercel.app | demo@aha.com / demo1234 |
| **관리자 웹** | https://admin-vert-psi.vercel.app | admin@aha.com / admin1234 |
| **GitHub** | https://github.com/iushorts2302/aha | main 브랜치 자동 배포 |

---

## 프로젝트 구조

```
aha/
├── apps/
│   ├── user/                     # 사용자 웹앱 (React + Vite)
│   │   ├── src/
│   │   │   ├── App.jsx           # SPA 라우터 (prevRouteRef 기반)
│   │   │   ├── components/       # UI 컴포넌트
│   │   │   │   ├── Header.jsx           # 네비바 (React state 햄버거)
│   │   │   │   ├── PostCard.jsx         # 게시글 카드 (allPosts 실시간)
│   │   │   │   ├── CrawlComponents.jsx  # 크롤링 피드/카드
│   │   │   │   ├── CommentSection.jsx   # 댓글 (form 없음, button only)
│   │   │   │   └── ReactionBar.jsx      # 이모지 반응 (6종)
│   │   │   ├── context/
│   │   │   │   ├── AppContext.jsx        # posts/comments/likes (localStorage)
│   │   │   │   └── AuthContext.jsx       # 인증 (MOCK_USERS)
│   │   │   ├── pages/
│   │   │   │   ├── PostDetailPage.jsx    # 게시글 상세
│   │   │   │   ├── CrawlDetailPage.jsx  # 크롤링 상세
│   │   │   │   └── SubPages.jsx         # 17개 메뉴 페이지
│   │   │   └── store/
│   │   │       ├── crawlStore.js         # MENU_TOPICS 정의 + 서버 폴링
│   │   │       ├── crawlInteractionStore.js  # 크롤링 views/likes
│   │   │       ├── reactionStore.js      # 이모지 반응 localStorage
│   │   │       ├── configStore.js        # /api/config 30초 폴링
│   │   │       └── blockedStore.js       # 차단 목록 동기화
│   │   └── src/__tests__/
│   │       └── quality.test.cjs  # 자동 품질 테스트 (88개)
│   │
│   └── admin/                    # 관리자 웹앱 (React + Vite)
│       ├── api/                  # Vercel Serverless Functions (Python)
│       │   ├── crawl.py          # 크롤링 엔진 (GitHub/NPM/PyPI)
│       │   ├── cron.py           # 10분 자동 크롤링 (GitHub Actions)
│       │   ├── data.py           # GET /api/data?topic=xxx
│       │   ├── blocked.py        # GET/POST /api/blocked
│       │   └── config.py         # GET/POST /api/config (설정 관리)
│       └── src/pages/
│           ├── CrawlerDashboard.jsx    # 크롤링 현황 대시보드
│           └── CrawlConfigManager.jsx # 분야/주제/소스 CRUD
│
├── docs/
│   ├── QA_TESTCASES.md           # QA 테스트케이스 v1.1 (135개)
│   ├── QA_REPORT_20260517.md     # QA 실행 리포트
│   └── SKILL.md                  # 재현 스킬 가이드 (이 문서)
│
└── .github/workflows/
    └── crawl-cron.yml            # GitHub Actions 10분 크롤링
```

---

## 아키텍처

### 데이터 흐름

```
GitHub / NPM / PyPI
        ↓ (GitHub Actions 10분)
  /api/cron (인증 필요)
        ↓
  /api/data?topic=xxx  ←──── 사용자웹 30초 폴링
        ↓
  CrawlFeed → CrawlCard → CrawlDetailPage

관리자웹 변경
  → POST /api/config
  → 사용자웹 configStore 30초 폴링 반영
```

### localStorage 키 목록

| 키 | 내용 |
|---|---|
| `aha_posts_v1` | 게시글 (likes, views 포함) |
| `aha_comments_v1` | 댓글 목록 |
| `aha_reactions` | 이모지 반응 (postId별) |
| `aha_crawl_data_v2` | 크롤링 데이터 캐시 |
| `aha_crawl_views` | 크롤링 아이템 조회수 |
| `aha_crawl_likes` | 크롤링 아이템 좋아요 |
| `aha_blocked_posts` | 차단 게시글 ID Set |
| `aha_admin_config_v1` | 관리자 설정 캐시 |

---

## 주요 기술 결정

| 결정 | 이유 |
|---|---|
| SPA 라우팅 → `prevRouteRef(useRef)` | setState 배치로 인한 뒤로가기 오류 방지 |
| `allPosts` 직접 공개 | getPostById 클로저 stale state 문제 해결 |
| `<form>` 제거 → `type="button"` | 부모 onClick 버블링으로 댓글 제출 실패 방지 |
| Bootstrap 클래스 제거 | pointer-events/focus 간섭으로 클릭 불가 문제 방지 |
| 크롤링 소스 → 한국 기업 GitHub | Vercel 환경에서 한국 뉴스 사이트 403 차단 |
| CrawlCard focus 이벤트 갱신 | 같은 탭 상세→목록 복귀 시 views 즉시 반영 |

---

## 개발 가이드

```bash
# 의존성 설치
npm install

# 사용자 앱 개발 서버
cd apps/user && npm run dev

# 관리자 앱 개발 서버
cd apps/admin && npm run dev

# 품질 테스트 실행
node apps/user/src/__tests__/quality.test.cjs

# Vercel 배포 (사용자)
cd apps/user && vercel deploy --prod

# Vercel 배포 (관리자)
cd apps/admin && vercel deploy --prod
```

---

## 환경 변수

```bash
# .github/workflows/crawl-cron.yml
CRON_SECRET=aha_cron_secret_iushorts  # cron 인증 토큰
```

---

## 크롤링 소스 유형

| 유형 | 설명 | 예시 |
|---|---|---|
| `github_org` | 한국 기업 GitHub 저장소 | `kakao`, `naver`, `toss` |
| `github_topic` | GitHub 토픽 | `llm`, `blockchain`, `korean` |
| `npm` | NPM 패키지 키워드 | `korean`, `react` |
| `pypi` | PyPI 패키지 | `machine-learning` |

