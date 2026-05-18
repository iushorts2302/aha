# aha! — 전문 정보 큐레이션 & 공유 커뮤니티

> 한국 기업 GitHub 기반 실시간 크롤링 + MariaDB 영속 + 사용자 커뮤니티 플랫폼

---

## 배포 URL

| 앱 | URL | 계정 |
|---|---|---|
| **사용자 웹** | https://aha-five.vercel.app | demo@aha.com / demo1234 |
| **관리자 웹** | https://admin-vert-psi.vercel.app | admin@aha.com / admin1234 |
| **GitHub** | https://github.com/iushorts2302/aha | main 브랜치 자동 배포 |

---

## DB 연결 정보

| 항목 | 값 |
|---|---|
| **Host** | 0.tcp.jp.ngrok.io |
| **Port** | 10840 (ngrok 재시작 시 변경) |
| **User** | srvaha |
| **Password** | qwER12#$ |
| **Database** | aha_db |
| **내부 IP** | 172.30.8.82 (Windows Server, MariaDB) |
| **공인 IP** | 211.217.252.169 (공유기 NAT) |
| **터널** | ngrok TCP → 공유기 → 172.30.8.82:3306 |

> ⚠️ ngrok 무료 플랜: 재시작 시 포트 변경됨 → `db.py` 기본값 + Vercel 환경변수 `DB_PORT` 업데이트 필요

---

## 프로젝트 구조

```
aha/
├── apps/
│   ├── user/                         # 사용자 웹앱 (React + Vite)
│   │   ├── src/
│   │   │   ├── App.jsx               # SPA 라우터 (prevRouteRef 기반)
│   │   │   ├── api/
│   │   │   │   └── client.js         # DB API 클라이언트 (/api/v1)
│   │   │   ├── components/
│   │   │   │   ├── Header.jsx        # 네비바 (React state 햄버거)
│   │   │   │   ├── PostCard.jsx      # 게시글 카드 (allPosts 실시간)
│   │   │   │   ├── CrawlComponents.jsx  # 크롤링 피드/카드
│   │   │   │   ├── CommentSection.jsx   # 댓글 (<form> 없음, button only)
│   │   │   │   └── ReactionBar.jsx   # 이모지 반응 (6종, DB 연동)
│   │   │   ├── context/
│   │   │   │   ├── AppContext.jsx     # posts/comments — DB 우선, localStorage 폴백
│   │   │   │   └── AuthContext.jsx    # 인증 — DB 로그인, Mock 폴백
│   │   │   ├── pages/
│   │   │   │   ├── PostDetailPage.jsx
│   │   │   │   ├── CrawlDetailPage.jsx
│   │   │   │   └── SubPages.jsx      # 17개 메뉴 (모든 CrawlFeed에 navigate 필수)
│   │   │   └── store/
│   │   │       ├── crawlStore.js     # MENU_TOPICS + DB API 폴링 (메모리 캐시)
│   │   │       ├── crawlInteractionStore.js  # 크롤링 views/likes (메모리)
│   │   │       ├── reactionStore.js  # 이모지 반응 (DB API + 메모리 캐시)
│   │   │       ├── configStore.js    # /api/config 30초 폴링
│   │   │       └── blockedStore.js   # 차단 목록 동기화
│   │   └── src/__tests__/
│   │       └── quality.test.cjs      # 자동 품질 테스트
│   │
│   └── admin/                        # 관리자 웹앱 (React + Vite)
│       ├── api/                      # Vercel Serverless Functions (Python)
│       │   ├── db.py                 # MariaDB 공통 연결 (pymysql)
│       │   ├── v1.py                 # 통합 CRUD 라우터 (12개 resource)
│       │   ├── data.py               # GET /api/data?topic — DB 우선, 없으면 크롤링
│       │   ├── cron.py               # 크롤링 → DB 저장 + tb_cron_log
│       │   ├── crawl.py              # 크롤링 엔진 (GitHub/NPM/PyPI)
│       │   ├── blocked.py            # GET/POST /api/blocked
│       │   └── config.py             # GET/POST /api/config
│       ├── requirements.txt          # PyMySQL==1.1.3
│       └── src/pages/
│           ├── CrawlerDashboard.jsx  # 크롤링 현황 + DB 토픽 70개
│           ├── CrawlConfigManager.jsx # 분야/주제/소스 CRUD
│           └── AdminPages.jsx        # 사용자/게시글 관리
│
├── docs/
│   ├── DB_SCHEMA.md                  # MariaDB 21개 테이블 DDL
│   ├── SKILL.md                      # 재현 스킬 가이드
│   ├── QA_TESTCASES.md               # QA 테스트케이스 v1.1
│   └── QA_REPORT_20260517.md         # QA 실행 리포트
│
└── .github/workflows/
    └── crawl-cron.yml                # GitHub Actions 10분 크롤링
```

---

## 아키텍처

### 데이터 흐름

```
GitHub / NPM / PyPI
        ↓ (GitHub Actions 10분 / 관리자 수동)
  /api/cron (크롤링 → tb_crawl_item DB 저장 + tb_cron_log)
        ↓
  /api/data?topic=xxx  ←── DB 우선 조회, 없으면 즉시 크롤링
        ↓
  CrawlFeed → CrawlCard → CrawlDetailPage (사용자웹 30초 폴링)

사용자 액션 (게시글/댓글/좋아요/반응)
  → /api/v1?resource=<resource>
  → MariaDB (ngrok TCP 터널)
  → 즉시 반영 (DB 우선, localStorage 폴백)

관리자 설정 변경
  → POST /api/config
  → 사용자웹 configStore 30초 폴링 반영
```

### API 엔드포인트

```
GET/POST/PATCH/DELETE https://admin-vert-psi.vercel.app/api/v1?resource=<resource>
```

| resource | 기능 |
|---|---|
| `auth` | 로그인 (사용자/관리자 SHA256) |
| `users` | 회원 CRUD + 관심분야 |
| `posts` | 게시글 CRUD + 조회수 자동 증가 + 태그 |
| `comments` | 댓글 CRUD + 좋아요 |
| `likes` | 게시글 좋아요 토글 |
| `bookmarks` | 북마크 GET/토글 |
| `reactions` | 이모지 반응 GET/토글 (post\|crawl_item 공용) |
| `follows` | 팔로우 GET/토글 |
| `categories` | 카테고리 CRUD |
| `topics` | 토픽 CRUD |
| `sources` | 크롤링 소스 CRUD |
| `crawl_items` | 크롤링 아이템 CRUD + count_only 통계 |

---

## DB 현황

| 테이블 | 건수 |
|---|---|
| `tb_category` | 19개 |
| `tb_topic` | 70개 |
| `tb_user` | 2개 (테스트) |
| `tb_post` | 1개 (테스트) |
| `tb_crawl_item` | 4개+ (cron 실행 시 증가) |

---

## localStorage 키 현황

| 키 | 상태 | 설명 |
|---|---|---|
| `aha_posts_v1` | ✅ 유지 | DB 폴백용 |
| `aha_comments_v1` | ✅ 유지 | DB 폴백용 |
| `aha_user_v2` | ✅ 유지 | 인증 세션 |
| `aha_blocked_posts` | ✅ 유지 | 차단 목록 |
| `aha_admin_config_v1` | ✅ 유지 | 설정 캐시 |
| `aha_crawl_data_v2` | ❌ 제거 | DB로 이전 |
| `aha_crawl_schedule_v2` | ❌ 제거 | DB로 이전 |
| `aha_crawl_views` | ❌ 제거 | 메모리로 이전 |
| `aha_crawl_likes` | ❌ 제거 | 메모리로 이전 |
| `aha_reactions` | ❌ 제거 | DB로 이전 |

---

## 개발 가이드

```bash
# 사용자 앱 개발 서버
cd apps/user && npm run dev

# 관리자 앱 개발 서버
cd apps/admin && npm run dev

# 품질 테스트 실행
node apps/user/src/__tests__/quality.test.cjs

# Vercel 배포
cd apps/user  && vercel deploy --prod
cd apps/admin && vercel deploy --prod
```

### Vercel 환경변수 (관리자 앱)

```
DB_HOST=0.tcp.jp.ngrok.io   # ngrok 재시작 시 변경 필요
DB_PORT=10840                # ngrok 재시작 시 변경 필요
DB_USER=srvaha
DB_PASSWORD=qwER12#$
DB_NAME=aha_db
```

---

## ngrok 재시작 시 처리 절차

1. Windows 서버에서 `ngrok tcp 3306` 실행
2. 표시된 포트번호 확인 (예: `0.tcp.jp.ngrok.io:10840`)
3. `apps/admin/api/db.py` 기본값 포트 수정
4. Vercel 환경변수 `DB_PORT` 업데이트
5. 관리자 앱 재배포: `cd apps/admin && vercel deploy --prod`

---

## 크롤링 소스 유형

| 유형 | 설명 | 예시 |
|---|---|---|
| `github_org` | 한국 기업 GitHub | `kakao`, `naver`, `toss` |
| `github_topic` | GitHub 토픽 | `llm`, `blockchain` |
| `npm` | NPM 키워드 | `korean`, `react` |
| `pypi` | PyPI 키워드 | `machine-learning` |
