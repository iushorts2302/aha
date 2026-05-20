"""
/api/init — 앱 구동 시 초기화 엔드포인트

1. DB 연결 확인
2. tb_crawl_item 데이터 없는 토픽 → 즉시 크롤링 → DB 저장
3. 결과 반환 (사용자웹/관리자웹 둘 다 호출)

GET /api/init?force=1  → 강제 전체 재크롤링
GET /api/init          → 비어있는 토픽만 크롤링
"""
import json, os, sys, time, datetime
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, os.path.dirname(__file__))

# 우선순위 토픽 (빠른 초기 로딩용 — 가장 많이 보는 메뉴)
INIT_TOPICS = [
    "dev.trending", "dev.javascript", "dev.python", "dev.opensource",
    "ai.news",      "ai.trend",
    "home.trending","home.rising",
    "it.news",      "it.cloud",
    "oss.trending",
    "startup.new",
    "game.news",
    "finance.crypto","finance.stock",
    "job.dev",
    "learn.tutorial",
    "board.it",
    "market.deal",
    "research.ai",
]

CACHE_FILE = "/tmp/crawl_cache.json"

def _load_cache():
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def _save_cache(cache):
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, default=str)
    except Exception:
        pass

def _db_count(topic_key):
    """DB의 해당 토픽 아이템 수"""
    try:
        import db
        row = db.query_one(
            "SELECT COUNT(*) c FROM tb_crawl_item ci "
            "LEFT JOIN tb_topic t ON t.seq_no=ci.topic_seq_no "
            "WHERE t.topic_key=%s AND ci.blocked_yn='N'",
            (topic_key,)
        )
        return row["c"] if row else 0
    except Exception:
        return -1  # DB 연결 실패

def _save_to_db(items, topic_key):
    """크롤링 결과 DB 저장"""
    try:
        import db
        topic = db.query_one("SELECT seq_no FROM tb_topic WHERE topic_key=%s", (topic_key,))
        if not topic:
            return 0
        saved = 0
        for item in items:
            exist = db.query_one(
                "SELECT seq_no FROM tb_crawl_item WHERE item_id=%s",
                (item.get("id", ""),)
            )
            if exist:
                db.execute(
                    "UPDATE tb_crawl_item SET title=%s,summary=%s,source_url=%s,"
                    "topic_label=%s,category_id=%s,crawled_at=NOW() WHERE seq_no=%s",
                    (item.get("title","")[:500], item.get("summary","")[:1000],
                     item.get("source","")[:2000], item.get("topicLabel","")[:100],
                     item.get("category","")[:50], exist["seq_no"])
                )
                seq = exist["seq_no"]
            else:
                seq = db.execute(
                    "INSERT INTO tb_crawl_item "
                    "(item_id,topic_seq_no,title,summary,source_url,topic_label,category_id,hot_yn) "
                    "VALUES(%s,%s,%s,%s,%s,%s,%s,'N')",
                    (item.get("id","")[:200], topic["seq_no"],
                     item.get("title","")[:500], item.get("summary","")[:1000],
                     item.get("source","")[:2000], item.get("topicLabel","")[:100],
                     item.get("category","")[:50])
                )
                saved += 1
            # 태그
            if item.get("tags") and not exist:
                for i, tag in enumerate(item["tags"][:5]):
                    db.execute(
                        "INSERT IGNORE INTO tb_crawl_item_tag "
                        "(item_seq_no,tag_name,sort_order) VALUES(%s,%s,%s)",
                        (seq, str(tag)[:100], i)
                    )
        return saved
    except Exception:
        return 0

def _crawl_and_save(topic_key, force=False):
    """토픽 크롤링 → /tmp 캐시 + DB 저장"""
    # 캐시 확인 (10분 TTL)
    if not force:
        cache = _load_cache()
        entry = cache.get(topic_key)
        if entry and time.time() - entry.get("saved_at", 0) < 600:
            return {"source": "cache", "count": len(entry.get("items", []))}

    try:
        from crawl import TOPIC_CRAWLERS, enrich
        fn = TOPIC_CRAWLERS.get(topic_key)
        if not fn:
            return {"source": "no_crawler", "count": 0}

        raw   = fn()
        label = topic_key.split(".")[-1].replace("_", " ").title()
        items = enrich(raw[:10], topic_key, label, topic_key.split(".")[0])

        if not items:
            return {"source": "empty", "count": 0}

        # /tmp 캐시 저장
        cache = _load_cache()
        cache[topic_key] = {"items": items, "saved_at": time.time()}
        _save_cache(cache)

        # DB 저장 시도 (실패해도 캐시는 저장됨)
        saved = _save_to_db(items, topic_key)

        return {"source": "fresh", "count": len(items), "saved_db": saved}
    except Exception as e:
        return {"source": "error", "count": 0, "error": str(e)[:100]}


def _cors(h):
    h.send_header("Access-Control-Allow-Origin", "*")
    h.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
    h.send_header("Access-Control-Allow-Headers", "Content-Type")

def _json(h, status, data):
    body = json.dumps(data, ensure_ascii=False, default=str).encode("utf-8")
    h.send_response(status); _cors(h)
    h.send_header("Content-Type", "application/json; charset=utf-8")
    h.send_header("Content-Length", str(len(body)))
    h.end_headers(); h.wfile.write(body)


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200); _cors(self); self.end_headers()

    def do_GET(self):
        params = parse_qs(urlparse(self.path).query)
        force  = params.get("force", ["0"])[0] == "1"

        t0      = time.time()
        results = {}
        db_ok   = False

        # 1. DB 연결 확인
        try:
            import db as _db
            row = _db.query_one("SELECT COUNT(*) c FROM tb_crawl_item")
            total_in_db = row["c"] if row else 0
            db_ok = True
        except Exception:
            total_in_db = 0
            db_ok = False

        # 2. 토픽별 크롤링 필요 여부 판단
        # DB 연결 실패 or force → 모든 토픽 크롤링
        # DB 연결 성공 → 0건인 토픽만 크롤링
        topics_to_crawl = []
        for key in INIT_TOPICS:
            if force or not db_ok:
                topics_to_crawl.append(key)
            else:
                cnt = _db_count(key)
                if cnt <= 0:
                    topics_to_crawl.append(key)

        # 3. 크롤링 실행 (최대 10개 — Vercel 서버리스 30초 제한)
        crawled = 0
        for key in topics_to_crawl[:10]:
            r = _crawl_and_save(key, force=force)
            results[key] = r
            if r.get("count", 0) > 0:
                crawled += 1
            time.sleep(0.15)   # 과부하 방지

        elapsed = round(time.time() - t0, 2)

        _json(self, 200, {
            "ok":           True,
            "db_connected": db_ok,
            "total_in_db":  total_in_db,
            "topics_crawled": crawled,
            "topics_needed":  len(topics_to_crawl),
            "results":      results,
            "elapsed_sec":  elapsed,
            "timestamp":    datetime.datetime.utcnow().isoformat() + "Z",
        })

    def log_message(self, *a): pass
