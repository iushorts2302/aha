# aha! MariaDB 데이터베이스 스키마

> **대상 DBMS:** MariaDB 10.6+  
> **문자셋:** utf8mb4 / utf8mb4_unicode_ci  
> **PK 규칙:** 모든 테이블의 PK는 `seq_no BIGINT AUTO_INCREMENT`  
> **설계 기준:** 사용자웹 + 관리자웹 전체 데이터 영속화

---

## 테이블 목록

| 그룹 | 테이블 | 설명 |
|---|---|---|
| **사용자** | `tb_user` | 회원 정보 |
| | `tb_user_follow` | 팔로우 관계 |
| | `tb_user_expertise` | 관심 분야 (다중) |
| | `tb_user_bookmark` | 게시글 북마크 |
| **콘텐츠 분류** | `tb_category` | 메뉴 카테고리 |
| | `tb_topic` | 서브탭 토픽 |
| **게시글** | `tb_post` | 게시글 |
| | `tb_post_tag` | 게시글 태그 |
| | `tb_post_like` | 게시글 좋아요 |
| | `tb_post_view` | 게시글 조회 이력 |
| **댓글** | `tb_comment` | 댓글 |
| | `tb_comment_like` | 댓글 좋아요 |
| **이모지 반응** | `tb_reaction` | 이모지 반응 |
| **크롤링** | `tb_crawl_source` | 크롤링 소스 설정 |
| | `tb_crawl_source_topic` | 소스-토픽 연결 |
| | `tb_crawl_item` | 수집된 크롤링 아이템 |
| | `tb_crawl_item_tag` | 크롤링 아이템 태그 |
| | `tb_crawl_item_view` | 크롤링 아이템 조회 이력 |
| | `tb_crawl_item_like` | 크롤링 아이템 좋아요 |
| **관리자** | `tb_admin` | 관리자 계정 |
| | `tb_block` | 게시글 차단 목록 |
| | `tb_cron_log` | 크롤링 실행 이력 |

---

## DDL

```sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 데이터베이스 생성
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE DATABASE IF NOT EXISTS aha
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE aha;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. 사용자 (User)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE tb_user (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    email           VARCHAR(200)    NOT NULL               COMMENT '이메일 (로그인 ID)',
    password_hash   VARCHAR(255)    NOT NULL               COMMENT '비밀번호 해시 (bcrypt)',
    nickname        VARCHAR(50)     NOT NULL               COMMENT '닉네임',
    bio             VARCHAR(500)    NULL                   COMMENT '자기소개',
    avatar_url      VARCHAR(1000)   NULL                   COMMENT '프로필 이미지 URL',
    role            VARCHAR(20)     NOT NULL DEFAULT 'user' COMMENT '역할: user | admin',
    status          VARCHAR(20)     NOT NULL DEFAULT 'active' COMMENT '상태: active | suspended',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '가입일시',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    last_login_at   DATETIME        NULL                   COMMENT '마지막 로그인일시',
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_user_email (email),
    UNIQUE KEY uq_user_nickname (nickname),
    INDEX idx_user_status (status),
    INDEX idx_user_role (role)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='사용자';


-- 팔로우 관계 (N:M self-join)
CREATE TABLE tb_user_follow (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    follower_seq_no BIGINT          NOT NULL               COMMENT '팔로우 하는 사용자 (FK → tb_user)',
    followee_seq_no BIGINT          NOT NULL               COMMENT '팔로우 받는 사용자 (FK → tb_user)',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '팔로우일시',
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_follow (follower_seq_no, followee_seq_no),
    INDEX idx_follow_follower (follower_seq_no),
    INDEX idx_follow_followee (followee_seq_no),
    CONSTRAINT fk_follow_follower FOREIGN KEY (follower_seq_no) REFERENCES tb_user (seq_no) ON DELETE CASCADE,
    CONSTRAINT fk_follow_followee FOREIGN KEY (followee_seq_no) REFERENCES tb_user (seq_no) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='팔로우 관계';


-- 관심 분야 (사용자별 다중 선택)
CREATE TABLE tb_user_expertise (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    user_seq_no     BIGINT          NOT NULL               COMMENT '사용자 (FK → tb_user)',
    expertise_name  VARCHAR(100)    NOT NULL               COMMENT '관심 분야명',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_user_expertise (user_seq_no, expertise_name),
    INDEX idx_expertise_user (user_seq_no),
    CONSTRAINT fk_expertise_user FOREIGN KEY (user_seq_no) REFERENCES tb_user (seq_no) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='사용자 관심 분야';


-- 북마크
CREATE TABLE tb_user_bookmark (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    user_seq_no     BIGINT          NOT NULL               COMMENT '사용자 (FK → tb_user)',
    post_seq_no     BIGINT          NOT NULL               COMMENT '게시글 (FK → tb_post)',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '북마크일시',
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_bookmark (user_seq_no, post_seq_no),
    INDEX idx_bookmark_user (user_seq_no),
    INDEX idx_bookmark_post (post_seq_no),
    CONSTRAINT fk_bookmark_user FOREIGN KEY (user_seq_no) REFERENCES tb_user (seq_no) ON DELETE CASCADE,
    CONSTRAINT fk_bookmark_post FOREIGN KEY (post_seq_no) REFERENCES tb_post (seq_no) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='북마크';


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. 콘텐츠 분류
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 카테고리 (메뉴)
CREATE TABLE tb_category (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    category_id     VARCHAR(50)     NOT NULL               COMMENT '카테고리 식별자 (예: dev, ai, game)',
    label           VARCHAR(100)    NOT NULL               COMMENT '표시 이름 (예: 개발, AI 뉴스)',
    icon            VARCHAR(10)     NULL                   COMMENT '이모지 아이콘',
    sort_order      INT             NOT NULL DEFAULT 0     COMMENT '정렬 순서',
    active_yn       CHAR(1)         NOT NULL DEFAULT 'Y'   COMMENT '활성 여부: Y | N',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_category_id (category_id),
    INDEX idx_category_active (active_yn),
    INDEX idx_category_sort (sort_order)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='메뉴 카테고리';


-- 토픽 (서브탭)
CREATE TABLE tb_topic (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    topic_key       VARCHAR(100)    NOT NULL               COMMENT '토픽 키 (예: dev.javascript, ai.news)',
    category_seq_no BIGINT          NOT NULL               COMMENT '카테고리 (FK → tb_category)',
    label           VARCHAR(100)    NOT NULL               COMMENT '표시 이름 (예: JavaScript)',
    sort_order      INT             NOT NULL DEFAULT 0     COMMENT '정렬 순서',
    active_yn       CHAR(1)         NOT NULL DEFAULT 'Y'   COMMENT '활성 여부: Y | N',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_topic_key (topic_key),
    INDEX idx_topic_category (category_seq_no),
    INDEX idx_topic_active (active_yn),
    CONSTRAINT fk_topic_category FOREIGN KEY (category_seq_no) REFERENCES tb_category (seq_no) ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='서브탭 토픽';


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. 게시글 (Post)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE tb_post (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    author_seq_no   BIGINT          NOT NULL               COMMENT '작성자 (FK → tb_user)',
    category_seq_no BIGINT          NULL                   COMMENT '카테고리 (FK → tb_category)',
    title           VARCHAR(500)    NOT NULL               COMMENT '제목',
    body            LONGTEXT        NULL                   COMMENT '본문 (마크다운)',
    post_type       VARCHAR(20)     NOT NULL DEFAULT 'user' COMMENT '유형: user | crawled',
    status          VARCHAR(20)     NOT NULL DEFAULT 'published' COMMENT '상태: published | hidden | deleted',
    view_count      BIGINT          NOT NULL DEFAULT 0     COMMENT '조회수',
    like_count      BIGINT          NOT NULL DEFAULT 0     COMMENT '좋아요 수 (캐시)',
    comment_count   BIGINT          NOT NULL DEFAULT 0     COMMENT '댓글 수 (캐시)',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '작성일시',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    deleted_at      DATETIME        NULL                   COMMENT '삭제일시 (소프트 삭제)',
    PRIMARY KEY (seq_no),
    INDEX idx_post_author (author_seq_no),
    INDEX idx_post_category (category_seq_no),
    INDEX idx_post_status (status),
    INDEX idx_post_created (created_at DESC),
    INDEX idx_post_type_status (post_type, status),
    FULLTEXT INDEX ft_post_title_body (title, body),
    CONSTRAINT fk_post_author   FOREIGN KEY (author_seq_no)   REFERENCES tb_user (seq_no) ON DELETE RESTRICT,
    CONSTRAINT fk_post_category FOREIGN KEY (category_seq_no) REFERENCES tb_category (seq_no) ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='게시글';


-- 게시글 태그 (1:N)
CREATE TABLE tb_post_tag (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    post_seq_no     BIGINT          NOT NULL               COMMENT '게시글 (FK → tb_post)',
    tag_name        VARCHAR(100)    NOT NULL               COMMENT '태그명',
    sort_order      TINYINT         NOT NULL DEFAULT 0     COMMENT '순서',
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_post_tag (post_seq_no, tag_name),
    INDEX idx_post_tag_post (post_seq_no),
    INDEX idx_post_tag_name (tag_name),
    CONSTRAINT fk_post_tag_post FOREIGN KEY (post_seq_no) REFERENCES tb_post (seq_no) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='게시글 태그';


-- 게시글 좋아요
CREATE TABLE tb_post_like (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    post_seq_no     BIGINT          NOT NULL               COMMENT '게시글 (FK → tb_post)',
    user_seq_no     BIGINT          NOT NULL               COMMENT '사용자 (FK → tb_user)',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '좋아요일시',
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_post_like (post_seq_no, user_seq_no),
    INDEX idx_post_like_post (post_seq_no),
    INDEX idx_post_like_user (user_seq_no),
    CONSTRAINT fk_post_like_post FOREIGN KEY (post_seq_no) REFERENCES tb_post (seq_no) ON DELETE CASCADE,
    CONSTRAINT fk_post_like_user FOREIGN KEY (user_seq_no) REFERENCES tb_user (seq_no) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='게시글 좋아요';


-- 게시글 조회 이력 (중복 방지용)
CREATE TABLE tb_post_view (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    post_seq_no     BIGINT          NOT NULL               COMMENT '게시글 (FK → tb_post)',
    user_seq_no     BIGINT          NULL                   COMMENT '사용자 (비로그인 시 NULL)',
    client_ip       VARCHAR(45)     NULL                   COMMENT '클라이언트 IP (비로그인 중복방지)',
    viewed_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '조회일시',
    PRIMARY KEY (seq_no),
    INDEX idx_post_view_post (post_seq_no),
    INDEX idx_post_view_user (user_seq_no),
    INDEX idx_post_view_date (viewed_at),
    CONSTRAINT fk_post_view_post FOREIGN KEY (post_seq_no) REFERENCES tb_post (seq_no) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='게시글 조회 이력';


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. 댓글 (Comment)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE tb_comment (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    post_seq_no     BIGINT          NOT NULL               COMMENT '게시글 (FK → tb_post)',
    author_seq_no   BIGINT          NOT NULL               COMMENT '작성자 (FK → tb_user)',
    parent_seq_no   BIGINT          NULL                   COMMENT '부모 댓글 (대댓글, FK → tb_comment)',
    body            TEXT            NOT NULL               COMMENT '댓글 내용',
    like_count      BIGINT          NOT NULL DEFAULT 0     COMMENT '좋아요 수 (캐시)',
    status          VARCHAR(20)     NOT NULL DEFAULT 'active' COMMENT '상태: active | deleted',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '작성일시',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    deleted_at      DATETIME        NULL                   COMMENT '삭제일시',
    PRIMARY KEY (seq_no),
    INDEX idx_comment_post (post_seq_no),
    INDEX idx_comment_author (author_seq_no),
    INDEX idx_comment_parent (parent_seq_no),
    INDEX idx_comment_status (status),
    CONSTRAINT fk_comment_post   FOREIGN KEY (post_seq_no)   REFERENCES tb_post (seq_no) ON DELETE CASCADE,
    CONSTRAINT fk_comment_author FOREIGN KEY (author_seq_no) REFERENCES tb_user (seq_no) ON DELETE RESTRICT,
    CONSTRAINT fk_comment_parent FOREIGN KEY (parent_seq_no) REFERENCES tb_comment (seq_no) ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='댓글';


-- 댓글 좋아요
CREATE TABLE tb_comment_like (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    comment_seq_no  BIGINT          NOT NULL               COMMENT '댓글 (FK → tb_comment)',
    user_seq_no     BIGINT          NOT NULL               COMMENT '사용자 (FK → tb_user)',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '좋아요일시',
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_comment_like (comment_seq_no, user_seq_no),
    INDEX idx_comment_like_comment (comment_seq_no),
    INDEX idx_comment_like_user (user_seq_no),
    CONSTRAINT fk_comment_like_comment FOREIGN KEY (comment_seq_no) REFERENCES tb_comment (seq_no) ON DELETE CASCADE,
    CONSTRAINT fk_comment_like_user    FOREIGN KEY (user_seq_no)    REFERENCES tb_user (seq_no) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='댓글 좋아요';


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. 이모지 반응 (Reaction)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE tb_reaction (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    target_type     VARCHAR(20)     NOT NULL               COMMENT '대상 유형: post | crawl_item',
    target_seq_no   BIGINT          NOT NULL               COMMENT '대상 PK (tb_post 또는 tb_crawl_item)',
    user_seq_no     BIGINT          NOT NULL               COMMENT '사용자 (FK → tb_user)',
    reaction_key    VARCHAR(20)     NOT NULL               COMMENT '반응 종류: fire | lol | like | wow | sad | angry',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '반응일시',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP COMMENT '변경일시',
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_reaction (target_type, target_seq_no, user_seq_no),
    INDEX idx_reaction_target (target_type, target_seq_no),
    INDEX idx_reaction_user (user_seq_no),
    INDEX idx_reaction_key (reaction_key),
    CONSTRAINT fk_reaction_user FOREIGN KEY (user_seq_no) REFERENCES tb_user (seq_no) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='이모지 반응 (게시글/크롤링 공용)';


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. 크롤링 (Crawl)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 크롤링 소스 설정
CREATE TABLE tb_crawl_source (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    source_id       VARCHAR(100)    NOT NULL               COMMENT '소스 식별자 (예: src_kakao)',
    label           VARCHAR(200)    NOT NULL               COMMENT '소스 이름 (예: 카카오 GitHub)',
    source_type     VARCHAR(30)     NOT NULL               COMMENT '유형: github_org | github_topic | npm | pypi',
    source_value    VARCHAR(500)    NOT NULL               COMMENT '값 (예: kakao, llm, korean)',
    active_yn       CHAR(1)         NOT NULL DEFAULT 'Y'   COMMENT '활성 여부: Y | N',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_source_id (source_id),
    INDEX idx_source_type (source_type),
    INDEX idx_source_active (active_yn)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='크롤링 소스 설정';


-- 소스-토픽 연결 (N:M)
CREATE TABLE tb_crawl_source_topic (
    seq_no              BIGINT      NOT NULL AUTO_INCREMENT COMMENT 'PK',
    source_seq_no       BIGINT      NOT NULL               COMMENT '크롤링 소스 (FK → tb_crawl_source)',
    topic_seq_no        BIGINT      NOT NULL               COMMENT '토픽 (FK → tb_topic)',
    created_at          DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '연결일시',
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_source_topic (source_seq_no, topic_seq_no),
    INDEX idx_source_topic_source (source_seq_no),
    INDEX idx_source_topic_topic (topic_seq_no),
    CONSTRAINT fk_src_topic_source FOREIGN KEY (source_seq_no) REFERENCES tb_crawl_source (seq_no) ON DELETE CASCADE,
    CONSTRAINT fk_src_topic_topic  FOREIGN KEY (topic_seq_no)  REFERENCES tb_topic (seq_no) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='크롤링 소스-토픽 연결';


-- 수집된 크롤링 아이템
CREATE TABLE tb_crawl_item (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    item_id         VARCHAR(200)    NOT NULL               COMMENT '아이템 식별자 (topicKey_ts_idx)',
    topic_seq_no    BIGINT          NOT NULL               COMMENT '토픽 (FK → tb_topic)',
    source_seq_no   BIGINT          NULL                   COMMENT '소스 (FK → tb_crawl_source)',
    title           VARCHAR(500)    NOT NULL               COMMENT '제목',
    summary         VARCHAR(1000)   NULL                   COMMENT '요약',
    source_url      VARCHAR(2000)   NULL                   COMMENT '원문 URL',
    topic_label     VARCHAR(100)    NULL                   COMMENT '토픽 표시명 (비정규화)',
    category_id     VARCHAR(50)     NULL                   COMMENT '카테고리 ID (비정규화)',
    view_count      BIGINT          NOT NULL DEFAULT 0     COMMENT '조회수',
    like_count      BIGINT          NOT NULL DEFAULT 0     COMMENT '좋아요 수 (캐시)',
    hot_yn          CHAR(1)         NOT NULL DEFAULT 'N'   COMMENT 'HOT 여부: Y | N',
    blocked_yn      CHAR(1)         NOT NULL DEFAULT 'N'   COMMENT '차단 여부: Y | N',
    crawled_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '수집일시',
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_item_id (item_id),
    INDEX idx_crawl_item_topic (topic_seq_no),
    INDEX idx_crawl_item_source (source_seq_no),
    INDEX idx_crawl_item_blocked (blocked_yn),
    INDEX idx_crawl_item_crawled (crawled_at DESC),
    FULLTEXT INDEX ft_crawl_item_title (title),
    CONSTRAINT fk_crawl_item_topic  FOREIGN KEY (topic_seq_no)  REFERENCES tb_topic (seq_no) ON DELETE RESTRICT,
    CONSTRAINT fk_crawl_item_source FOREIGN KEY (source_seq_no) REFERENCES tb_crawl_source (seq_no) ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='수집된 크롤링 아이템';


-- 크롤링 아이템 태그
CREATE TABLE tb_crawl_item_tag (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    item_seq_no     BIGINT          NOT NULL               COMMENT '크롤링 아이템 (FK → tb_crawl_item)',
    tag_name        VARCHAR(100)    NOT NULL               COMMENT '태그명',
    sort_order      TINYINT         NOT NULL DEFAULT 0     COMMENT '순서',
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_crawl_tag (item_seq_no, tag_name),
    INDEX idx_crawl_tag_item (item_seq_no),
    INDEX idx_crawl_tag_name (tag_name),
    CONSTRAINT fk_crawl_tag_item FOREIGN KEY (item_seq_no) REFERENCES tb_crawl_item (seq_no) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='크롤링 아이템 태그';


-- 크롤링 아이템 조회 이력
CREATE TABLE tb_crawl_item_view (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    item_seq_no     BIGINT          NOT NULL               COMMENT '크롤링 아이템 (FK → tb_crawl_item)',
    user_seq_no     BIGINT          NULL                   COMMENT '사용자 (비로그인 시 NULL)',
    client_ip       VARCHAR(45)     NULL                   COMMENT '클라이언트 IP',
    viewed_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '조회일시',
    PRIMARY KEY (seq_no),
    INDEX idx_crawl_view_item (item_seq_no),
    INDEX idx_crawl_view_user (user_seq_no),
    CONSTRAINT fk_crawl_view_item FOREIGN KEY (item_seq_no) REFERENCES tb_crawl_item (seq_no) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='크롤링 아이템 조회 이력';


-- 크롤링 아이템 좋아요
CREATE TABLE tb_crawl_item_like (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    item_seq_no     BIGINT          NOT NULL               COMMENT '크롤링 아이템 (FK → tb_crawl_item)',
    user_seq_no     BIGINT          NOT NULL               COMMENT '사용자 (FK → tb_user)',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '좋아요일시',
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_crawl_like (item_seq_no, user_seq_no),
    INDEX idx_crawl_like_item (item_seq_no),
    INDEX idx_crawl_like_user (user_seq_no),
    CONSTRAINT fk_crawl_like_item FOREIGN KEY (item_seq_no) REFERENCES tb_crawl_item (seq_no) ON DELETE CASCADE,
    CONSTRAINT fk_crawl_like_user FOREIGN KEY (user_seq_no) REFERENCES tb_user (seq_no) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='크롤링 아이템 좋아요';


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7. 관리자 (Admin)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE tb_admin (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    email           VARCHAR(200)    NOT NULL               COMMENT '이메일 (로그인 ID)',
    password_hash   VARCHAR(255)    NOT NULL               COMMENT '비밀번호 해시 (bcrypt)',
    name            VARCHAR(100)    NOT NULL               COMMENT '관리자명',
    role            VARCHAR(30)     NOT NULL DEFAULT 'admin' COMMENT '역할: superadmin | admin',
    status          VARCHAR(20)     NOT NULL DEFAULT 'active' COMMENT '상태: active | suspended',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    last_login_at   DATETIME        NULL                   COMMENT '마지막 로그인일시',
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_admin_email (email),
    INDEX idx_admin_status (status)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='관리자';


-- 게시글 차단 목록
CREATE TABLE tb_block (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    target_type     VARCHAR(20)     NOT NULL DEFAULT 'post' COMMENT '대상 유형: post | crawl_item',
    target_seq_no   BIGINT          NOT NULL               COMMENT '대상 PK',
    reason          VARCHAR(500)    NULL                   COMMENT '차단 사유',
    blocked_by      BIGINT          NOT NULL               COMMENT '처리 관리자 (FK → tb_admin)',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '차단일시',
    unblocked_at    DATETIME        NULL                   COMMENT '차단 해제일시',
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_block (target_type, target_seq_no),
    INDEX idx_block_target (target_type, target_seq_no),
    INDEX idx_block_admin (blocked_by),
    CONSTRAINT fk_block_admin FOREIGN KEY (blocked_by) REFERENCES tb_admin (seq_no) ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='게시글/크롤링 차단 목록';


-- 크롤링 실행 이력
CREATE TABLE tb_cron_log (
    seq_no          BIGINT          NOT NULL AUTO_INCREMENT COMMENT 'PK',
    topic_key       VARCHAR(100)    NULL                   COMMENT '토픽 키 (NULL이면 전체 실행)',
    result          VARCHAR(20)     NOT NULL               COMMENT '결과: success | error | partial',
    item_count      INT             NULL                   COMMENT '수집된 아이템 수',
    error_msg       VARCHAR(1000)   NULL                   COMMENT '오류 메시지',
    elapsed_sec     DECIMAL(10,2)   NULL                   COMMENT '실행 소요시간(초)',
    started_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '시작일시',
    finished_at     DATETIME        NULL                   COMMENT '완료일시',
    PRIMARY KEY (seq_no),
    INDEX idx_cron_topic (topic_key),
    INDEX idx_cron_result (result),
    INDEX idx_cron_started (started_at DESC)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='크롤링 자동 실행 이력';
```

---

## ERD 테이블 관계

```
tb_user ──────────────────────────────────────────────────────────┐
  │ 1:N  tb_user_expertise (관심 분야)                            │
  │ N:M  tb_user_follow    (팔로우)                               │
  │ 1:N  tb_user_bookmark  ──────────── tb_post                   │
  │ 1:N  tb_post           (게시글)         │ 1:N  tb_post_tag    │
  │ 1:N  tb_comment        (댓글)           │ 1:N  tb_post_like   │
  │ 1:N  tb_post_like                       │ 1:N  tb_post_view   │
  │ 1:N  tb_comment_like                    │ 1:N  tb_comment     │
  │ 1:N  tb_reaction                    └─────────────────────────┘
  │ 1:N  tb_crawl_item_like
  │
tb_category ─── 1:N ─── tb_topic ──────────────────────────────────────┐
                              │ N:M  tb_crawl_source_topic               │
                              │                   │                       │
                         tb_crawl_source  ──── N:M                       │
                              │ 1:N  tb_crawl_item ───────────────────────┘
                                         │ 1:N  tb_crawl_item_tag
                                         │ 1:N  tb_crawl_item_view
                                         │ 1:N  tb_crawl_item_like
                                         │ 1:N  tb_reaction

tb_admin ─── 1:N ─── tb_block
         └── 1:N ─── tb_cron_log (topic_key → tb_topic.topic_key 참조용)
```

---

## 설계 고려사항

### PK 전략
- 모든 테이블 PK: `seq_no BIGINT AUTO_INCREMENT` — 요구사항 준수
- 비즈니스 식별자(`email`, `category_id`, `topic_key`, `item_id`)는 별도 UNIQUE KEY로 관리

### 비정규화 (성능)
| 컬럼 | 위치 | 이유 |
|---|---|---|
| `like_count`, `comment_count` | `tb_post` | 목록 조회 시 집계 쿼리 회피 |
| `like_count` | `tb_comment` | 댓글 목록 성능 |
| `view_count`, `like_count` | `tb_crawl_item` | 크롤링 목록 성능 |
| `topic_label`, `category_id` | `tb_crawl_item` | 빈번한 JOIN 회피 |

### 소프트 삭제
- `tb_post`, `tb_comment`: `deleted_at` 컬럼으로 소프트 삭제
- 실제 데이터 보존, 복원 가능

### 반응(Reaction) 통합 설계
- `tb_reaction.target_type` = `'post'` | `'crawl_item'`
- 단일 테이블로 게시글/크롤링 반응 모두 관리
- `target_seq_no`는 각 타입의 `seq_no`를 가리킴

### 차단(Block) 통합 설계
- `tb_block.target_type` = `'post'` | `'crawl_item'`
- 게시글과 크롤링 아이템 차단을 단일 테이블로 관리

### 인덱스 전략
- 조회 빈도 높은 컬럼: `status`, `active_yn`, `created_at` 인덱스
- 전문 검색: `tb_post(title, body)`, `tb_crawl_item(title)` FULLTEXT 인덱스
- UNIQUE KEY: 비즈니스 중복 방지 (이메일, 팔로우, 좋아요 등)

---

## 초기 데이터 (INSERT)

```sql
-- 관리자 계정 (비밀번호: admin1234 → bcrypt 해시)
INSERT INTO tb_admin (email, password_hash, name, role)
VALUES ('admin@aha.com', '$2b$12$...bcrypt_hash...', '관리자', 'superadmin');

-- 기본 카테고리 19개
INSERT INTO tb_category (category_id, label, icon, sort_order) VALUES
('home',    '홈',       '🏠',  1),
('ai',      'AI 뉴스',  '🤖',  2),
('startup', '스타트업', '🚀',  3),
('dev',     '개발',     '💻',  4),
('oss',     '오픈소스', '📦',  5),
('design',  '디자인',   '🎨',  6),
('it',      'IT 뉴스',  '📰',  7),
('board',   '게시판',   '📋',  8),
('game',    '게임',     '🎮',  9),
('finance', '주식/코인','💰', 10),
('market',  '마켓',     '🛒', 11),
('job',     '취업',     '💼', 12),
('learn',   '학습',     '📚', 13),
('research','논문',     '🔬', 14),
('video',   '영상',     '📹', 15),
('humor',   '유머',     '😂', 16),
('trending','인기',     '🔥', 17),
('image',   '이미지',   '🖼', 18),
('aihub',   'AI허브',   '🧠', 19);
```

