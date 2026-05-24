"""
/api/setup — DB 초기화 엔드포인트 (1회 실행용)
GET /api/setup        → 테이블 생성 + 기본 데이터 INSERT
GET /api/setup?check=1 → 현재 테이블/데이터 현황만 확인
"""
import json, os, sys, hashlib
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, os.path.dirname(__file__))

DDL_TABLES = [

"""CREATE TABLE IF NOT EXISTS tb_user (
    seq_no BIGINT NOT NULL AUTO_INCREMENT,
    email VARCHAR(200) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    bio VARCHAR(500),
    avatar_url VARCHAR(1000),
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at DATETIME,
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_user_email (email),
    UNIQUE KEY uq_user_nickname (nickname)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""",

"""CREATE TABLE IF NOT EXISTS tb_user_bookmark (
    seq_no BIGINT NOT NULL AUTO_INCREMENT,
    user_seq_no BIGINT NOT NULL,
    target_type VARCHAR(20) NOT NULL COMMENT 'post | crawl_item',
    target_seq_no BIGINT NULL COMMENT 'post.seq_no (post일 때)',
    target_key VARCHAR(255) NULL COMMENT 'crawl_item url 등 외부 키 (crawl_item일 때)',
    target_title VARCHAR(500) NULL COMMENT '제목 캐시 (목록 표시용)',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (seq_no),
    INDEX idx_bookmark_user (user_seq_no, created_at DESC),
    UNIQUE KEY uq_bookmark_post (user_seq_no, target_type, target_seq_no),
    UNIQUE KEY uq_bookmark_key  (user_seq_no, target_type, target_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 즐겨찾기'""",

"""CREATE TABLE IF NOT EXISTS tb_user_follow (
    seq_no BIGINT NOT NULL AUTO_INCREMENT,
    follower_seq_no BIGINT NOT NULL,
    followee_seq_no BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_follow (follower_seq_no, followee_seq_no),
    INDEX idx_follow_followee (followee_seq_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='팔로우 관계'""",

"""CREATE TABLE IF NOT EXISTS tb_user_preference (
    user_seq_no BIGINT NOT NULL,
    pref_key VARCHAR(50) NOT NULL COMMENT 'theme | font_size | feed_layout | notifications ...',
    pref_value VARCHAR(500) NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_seq_no, pref_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='개인화 설정'""",

"""CREATE TABLE IF NOT EXISTS tb_category (
    seq_no BIGINT NOT NULL AUTO_INCREMENT,
    category_id VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    icon VARCHAR(10),
    sort_order INT NOT NULL DEFAULT 0,
    active_yn CHAR(1) NOT NULL DEFAULT 'Y',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_category_id (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""",

"""CREATE TABLE IF NOT EXISTS tb_topic (
    seq_no BIGINT NOT NULL AUTO_INCREMENT,
    topic_key VARCHAR(100) NOT NULL,
    category_seq_no BIGINT NOT NULL,
    label VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    active_yn CHAR(1) NOT NULL DEFAULT 'Y',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_topic_key (topic_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""",

"""CREATE TABLE IF NOT EXISTS tb_post (
    seq_no BIGINT NOT NULL AUTO_INCREMENT,
    author_seq_no BIGINT NOT NULL,
    category_seq_no BIGINT,
    title VARCHAR(500) NOT NULL,
    body LONGTEXT,
    post_type VARCHAR(20) NOT NULL DEFAULT 'user',
    status VARCHAR(20) NOT NULL DEFAULT 'published',
    view_count BIGINT NOT NULL DEFAULT 0,
    like_count BIGINT NOT NULL DEFAULT 0,
    comment_count BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    PRIMARY KEY (seq_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""",

"""CREATE TABLE IF NOT EXISTS tb_comment (
    seq_no BIGINT NOT NULL AUTO_INCREMENT,
    post_seq_no BIGINT NOT NULL,
    author_seq_no BIGINT NOT NULL,
    parent_seq_no BIGINT,
    body TEXT NOT NULL,
    like_count BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    PRIMARY KEY (seq_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""",

"""CREATE TABLE IF NOT EXISTS tb_admin_log (
    seq_no BIGINT NOT NULL AUTO_INCREMENT,
    admin_seq_no BIGINT NULL COMMENT '관리자 ID (NULL = 시스템)',
    action_type VARCHAR(40) NOT NULL COMMENT 'post_hide | post_delete | comment_delete | report_resolve | user_suspend ...',
    target_type VARCHAR(20) NULL COMMENT 'post | comment | user | report',
    target_seq_no BIGINT NULL,
    detail VARCHAR(500) NULL COMMENT '추가 설명',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (seq_no),
    INDEX idx_log_admin (admin_seq_no),
    INDEX idx_log_action (action_type),
    INDEX idx_log_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='관리자 활동 로그'""",

"""CREATE TABLE IF NOT EXISTS tb_report (
    seq_no BIGINT NOT NULL AUTO_INCREMENT,
    target_type VARCHAR(20) NOT NULL COMMENT 'post | comment',
    target_seq_no BIGINT NOT NULL,
    reporter_seq_no BIGINT NULL,
    reason_code VARCHAR(30) NOT NULL COMMENT 'spam | abuse | nsfw | misinfo | etc',
    reason_text VARCHAR(500) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending | resolved | rejected',
    resolved_at DATETIME NULL,
    resolved_by BIGINT NULL,
    resolved_action VARCHAR(30) NULL COMMENT 'hide | delete | warn | none',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (seq_no),
    INDEX idx_report_target (target_type, target_seq_no),
    INDEX idx_report_status (status),
    INDEX idx_report_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 신고'""",

"""CREATE TABLE IF NOT EXISTS tb_crawl_item (
    seq_no BIGINT NOT NULL AUTO_INCREMENT,
    item_id VARCHAR(200) NOT NULL,
    topic_seq_no BIGINT NOT NULL,
    source_seq_no BIGINT,
    title VARCHAR(500) NOT NULL,
    summary VARCHAR(1000),
    source_url VARCHAR(2000),
    topic_label VARCHAR(100),
    category_id VARCHAR(50),
    view_count BIGINT NOT NULL DEFAULT 0,
    like_count BIGINT NOT NULL DEFAULT 0,
    hot_yn CHAR(1) NOT NULL DEFAULT 'N',
    blocked_yn CHAR(1) NOT NULL DEFAULT 'N',
    crawled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_item_id (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""",

"""CREATE TABLE IF NOT EXISTS tb_admin (
    seq_no BIGINT NOT NULL AUTO_INCREMENT,
    email VARCHAR(200) NOT NULL,
    password_hash VARCHAR(255) NULL COMMENT 'OAuth 사용자는 NULL',
    name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'admin',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    auth_provider VARCHAR(20) NOT NULL DEFAULT 'local' COMMENT 'local | kakao | google',
    provider_id VARCHAR(100) NULL COMMENT 'OAuth provider 측 사용자 ID',
    avatar_url VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME,
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_admin_email (email),
    UNIQUE KEY uq_admin_provider (auth_provider, provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""",

"""CREATE TABLE IF NOT EXISTS tb_admin_allowlist (
    seq_no BIGINT NOT NULL AUTO_INCREMENT,
    email VARCHAR(200) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'admin',
    note VARCHAR(200) NULL COMMENT '추가 메모',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (seq_no),
    UNIQUE KEY uq_allowlist_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='관리자 OAuth 화이트리스트'""",

]

CATEGORIES = [
    ('home','홈','🏠',1), ('ai','AI 뉴스','🤖',2), ('startup','스타트업','🚀',3),
    ('dev','개발','💻',4), ('oss','오픈소스','📦',5), ('design','디자인','🎨',6),
    ('it','IT 뉴스','📰',7), ('board','게시판','📋',8), ('game','게임','🎮',9),
    ('finance','주식/코인','💰',10), ('market','마켓','🛒',11), ('job','취업','💼',12),
    ('learn','학습','📚',13), ('research','논문','🔬',14), ('video','영상','📹',15),
    ('humor','유머','😂',16), ('trending','인기','🔥',17), ('image','이미지','🖼',18),
    ('aihub','AI허브','🧠',19),
]

TOPICS = [
    ('home.trending','home','오늘의 인기글',1), ('home.rising','home','실시간 급상승',2),
    ('home.ai_feed','home','AI 추천 피드',3), ('home.shortform','home','숏폼 콘텐츠',4),
    ('ai.news','ai','AI 뉴스',1), ('ai.tools','ai','AI 도구',2),
    ('ai.trend','ai','AI 트렌드',3), ('ai.research','ai','AI 리서치',4),
    ('startup.new','startup','신규 스타트업',1), ('startup.funding','startup','투자/펀딩',2),
    ('startup.product','startup','신제품',3),
    ('dev.trending','dev','개발 트렌딩',1), ('dev.opensource','dev','오픈소스',2),
    ('dev.javascript','dev','JavaScript',3), ('dev.python','dev','Python',4),
    ('dev.devops','dev','DevOps',5), ('dev.tools','dev','개발 도구',6),
    ('oss.trending','oss','OSS 트렌딩',1), ('oss.awesome','oss','Awesome 리스트',2),
    ('oss.new','oss','신규 OSS',3),
    ('design.ui','design','UI 컴포넌트',1), ('design.ux','design','UX 디자인',2),
    ('design.tools','design','디자인 도구',3),
    ('it.news','it','IT 뉴스',1), ('it.security','it','보안',2),
    ('it.cloud','it','클라우드',3), ('it.mobile','it','모바일',4),
    ('board.free','board','자유게시판',1), ('board.question','board','질문게시판',2),
    ('board.info','board','정보게시판',3), ('board.humor','board','유머게시판',4),
    ('board.it','board','IT게시판',5),
    ('game.news','game','게임 뉴스',1), ('game.indie','game','인디게임',2),
    ('game.review','game','게임 리뷰',3),
    ('finance.stock','finance','주식',1), ('finance.crypto','finance','코인',2),
    ('finance.invest','finance','투자',3),
    ('market.deal','market','핫딜',1), ('market.coupon','market','쿠폰/할인',2),
    ('job.dev','job','개발 채용',1), ('job.startup','job','스타트업 채용',2),
    ('job.remote','job','원격 근무',3),
    ('learn.tutorial','learn','튜토리얼',1), ('learn.course','learn','강의/코스',2),
    ('learn.book','learn','도서',3),
    ('research.ai','research','AI 논문',1), ('research.paper','research','최신 논문',2),
    ('video.trending','video','인기 영상',1), ('video.shorts','video','숏폼',2),
    ('humor.meme','humor','밈',1), ('humor.funny','humor','유머',2),
    ('image.trending','image','인기 이미지',1), ('image.ai','image','AI 이미지',2),
    ('trending.realtime','trending','실시간 인기',1), ('trending.daily','trending','일간 베스트',2),
    ('trending.weekly','trending','주간 베스트',3),
    ('aihub.trend','aihub','AI 트렌드',1), ('aihub.summary','aihub','AI 요약',2),
]

def _sha256(s): return hashlib.sha256(s.encode()).hexdigest()

def _cors(h):
    h.send_header("Access-Control-Allow-Origin","*")
    h.send_header("Access-Control-Allow-Methods","GET,OPTIONS")
    h.send_header("Access-Control-Allow-Headers","Content-Type")

def _json(h, status, data):
    body = json.dumps(data, ensure_ascii=False, default=str).encode()
    h.send_response(status); _cors(h)
    h.send_header("Content-Type","application/json; charset=utf-8")
    h.send_header("Content-Length",str(len(body)))
    h.end_headers(); h.wfile.write(body)


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200); _cors(self); self.end_headers()

    def do_GET(self):
        params = parse_qs(urlparse(self.path).query)
        check_only = params.get("check",["0"])[0] == "1"

        try:
            import db
            result = {"tables": {}, "inserted": {}, "errors": []}

            if check_only:
                # 현황만 확인
                tables_to_check = [
                    "tb_category","tb_topic","tb_user","tb_post",
                    "tb_crawl_item","tb_admin","tb_comment",
                    "tb_report","tb_admin_log",
                    "tb_user_bookmark","tb_user_follow","tb_user_preference","tb_admin_allowlist"
                ]
                for t in tables_to_check:
                    try:
                        row = db.query_one(f"SELECT COUNT(*) c FROM {t}")
                        result["tables"][t] = row["c"] if row else 0
                    except Exception as e:
                        result["tables"][t] = f"ERROR: {str(e)[:50]}"
                return _json(self, 200, result)

            step = params.get("step", ["all"])[0]
            if step == "oauth_migration":
                # 기존 tb_admin에 OAuth 컬럼 추가 (있으면 무시)
                MIGRATIONS = [
                    "ALTER TABLE tb_admin MODIFY password_hash VARCHAR(255) NULL",
                    "ALTER TABLE tb_admin ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'local'",
                    "ALTER TABLE tb_admin ADD COLUMN provider_id VARCHAR(100) NULL",
                    "ALTER TABLE tb_admin ADD COLUMN avatar_url VARCHAR(500) NULL",
                    "ALTER TABLE tb_admin ADD UNIQUE KEY uq_admin_provider (auth_provider, provider_id)",
                ]
                for sql in MIGRATIONS:
                    try:
                        db.execute(sql)
                        result["migrations"] = result.get("migrations", [])
                        result["migrations"].append(f"OK: {sql[:60]}")
                    except Exception as e:
                        result["migrations"] = result.get("migrations", [])
                        result["migrations"].append(f"SKIP: {sql[:60]} ({str(e)[:50]})")
                # 화이트리스트 테이블 생성 (없으면)
                try:
                    for ddl in DDL_TABLES:
                        if "tb_admin_allowlist" in ddl:
                            db.execute(ddl)
                            result["tables"]["tb_admin_allowlist"] = "created"
                            break
                except Exception as e:
                    result["errors"].append(f"allowlist create: {str(e)[:80]}")
                # 기존 allowlist에 provider/provider_id 컬럼 추가 (이메일 없는 OAuth 지원)
                ALLOW_MIGRATIONS = [
                    "ALTER TABLE tb_admin_allowlist MODIFY email VARCHAR(200) NULL",
                    "ALTER TABLE tb_admin_allowlist ADD COLUMN provider VARCHAR(20) NULL",
                    "ALTER TABLE tb_admin_allowlist ADD COLUMN provider_id VARCHAR(100) NULL",
                    "ALTER TABLE tb_admin_allowlist ADD UNIQUE KEY uq_allowlist_provider (provider, provider_id)",
                ]
                for sql in ALLOW_MIGRATIONS:
                    try:
                        db.execute(sql)
                        result["migrations"].append(f"OK: {sql[:65]}")
                    except Exception as e:
                        result["migrations"].append(f"SKIP: {sql[:65]} ({str(e)[:40]})")
                _json(self, 200, result)
                return
            if step == "drop_user_personal":
                # 옛 스키마 테이블 강제 재생성 (target_type 컬럼 추가)
                for t in ["tb_user_bookmark", "tb_user_follow", "tb_user_preference"]:
                    try:
                        db.execute(f"DROP TABLE IF EXISTS {t}")
                        result["tables"][t] = "dropped"
                    except Exception as e:
                        result["errors"].append(f"{t} drop: {str(e)[:80]}")
                # 재생성
                NEW_ONLY = ("tb_user_bookmark", "tb_user_follow", "tb_user_preference")
                for ddl in DDL_TABLES:
                    table_name = ddl.split("EXISTS")[1].split("(")[0].strip()
                    if table_name not in NEW_ONLY: continue
                    try:
                        db.execute(ddl)
                        result["tables"][table_name] = "recreated"
                    except Exception as e:
                        result["errors"].append(f"{table_name}: {str(e)[:80]}")
                _json(self, 200, result)
                return

            if step in ("all", "tables", "new"):
                # ── 1. 테이블 생성 ──────────────────────────
                # 'new' = 신규 추가 테이블만 처리 (tb_report, tb_admin_log)
                NEW_ONLY = ("tb_report", "tb_admin_log", "tb_user_bookmark", "tb_user_follow", "tb_user_preference")
                created = 0
                for ddl in DDL_TABLES:
                    table_name = ddl.split("EXISTS")[1].split("(")[0].strip()
                    if step == "new" and table_name not in NEW_ONLY:
                        continue
                    try:
                        db.execute(ddl)
                        result["tables"][table_name] = "ok"
                        created += 1
                    except Exception as e:
                        result["errors"].append(f"{table_name}: {str(e)[:80]}")
                result["tables_processed"] = created

            if step in ("all", "data"):
                # ── 2. categories INSERT ────────────────────
                cat_inserted = 0; cat_map = {}
                for cid, label, icon, sort in CATEGORIES:
                    exist = db.query_one("SELECT seq_no FROM tb_category WHERE category_id=%s",(cid,))
                    if exist: cat_map[cid] = exist["seq_no"]
                    else:
                        seq = db.execute(
                            "INSERT INTO tb_category (category_id,label,icon,sort_order) VALUES(%s,%s,%s,%s)",
                            (cid, label, icon, sort))
                        cat_map[cid] = seq; cat_inserted += 1
                result["inserted"]["categories"] = cat_inserted

                # ── 3. topics INSERT ────────────────────────
                topic_inserted = 0
                if not cat_map:
                    for row in db.query("SELECT seq_no, category_id FROM tb_category"):
                        cat_map[row["category_id"]] = row["seq_no"]
                for key, cat_id, label, sort in TOPICS:
                    cat_seq = cat_map.get(cat_id)
                    if not cat_seq: continue
                    if not db.query_one("SELECT seq_no FROM tb_topic WHERE topic_key=%s",(key,)):
                        db.execute(
                            "INSERT INTO tb_topic (topic_key,category_seq_no,label,sort_order,active_yn) "
                            "VALUES(%s,%s,%s,%s,'Y')", (key, cat_seq, label, sort))
                        topic_inserted += 1
                result["inserted"]["topics"] = topic_inserted

                # ── 4. admin 계정 ──────────────────────────
                if not db.query_one("SELECT seq_no FROM tb_admin WHERE email='admin@aha.com'"):
                    db.execute(
                        "INSERT INTO tb_admin (email,password_hash,name,role,status) "
                        "VALUES('admin@aha.com',%s,'관리자','superadmin','active')",
                        (_sha256("admin1234"),))
                    result["inserted"]["admin"] = 1
                else: result["inserted"]["admin"] = 0

                # ── 5. demo 유저 ───────────────────────────
                if not db.query_one("SELECT seq_no FROM tb_user WHERE email='demo@aha.com'"):
                    db.execute(
                        "INSERT INTO tb_user (email,password_hash,nickname,bio,role,status) "
                        "VALUES('demo@aha.com',%s,'김민준','DIY & 테크 enthusiast','user','active')",
                        (_sha256("demo1234"),))
                    result["inserted"]["demo_user"] = 1
                else: result["inserted"]["demo_user"] = 0

            result["ok"] = True
            _json(self, 200, result)

        except Exception as e:
            _json(self, 500, {"ok": False, "error": str(e)})

    def log_message(self, *a): pass
