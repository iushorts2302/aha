/**
 * @aha/shared - 공통 데이터 모델
 */

// 사용자
export const UserRole = {
  USER: 'user',
  ADMIN: 'admin',
}

// 게시글 타입
export const PostType = {
  USER: 'user',       // 사용자 작성
  CRAWLED: 'crawled', // 크롤링 수집
}

// 게시글 정렬
export const SortType = {
  LATEST: 'latest',
  POPULAR: 'popular',
  COMMENTS: 'comments',
}

// 크롤링 소스 상태
export const SourceStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
}
