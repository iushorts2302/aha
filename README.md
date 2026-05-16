# aha!

전문 정보 큐레이션 및 공유 커뮤니티

## 프로젝트 구조

```
aha/
├── apps/
│   ├── user/     # aha! 사용자 웹사이트
│   └── admin/    # aha! 관리자 웹사이트
├── packages/
│   └── shared/   # 공통 타입 및 유틸리티
└── .github/
    └── workflows/ # CI/CD 파이프라인
```

## 시작하기

```bash
# 의존성 설치
npm install

# 사용자 앱 개발 서버
npm run dev:user

# 관리자 앱 개발 서버
npm run dev:admin
```

## Vercel 배포

- 사용자 앱: `aha.vercel.app` (Root: `apps/user`)
- 관리자 앱: `aha-admin.vercel.app` (Root: `apps/admin`)

## 브랜치 전략

- `main` → Production 자동 배포
- `dev` → Staging 자동 배포
- `feature/user/*` → 사용자 앱 PR Preview
- `feature/admin/*` → 관리자 앱 PR Preview
