"""
/api/data — 크롤링 데이터 조회 API
우선순위: 1) DB  2) /tmp JSON 캐시  3) 실시간 크롤링 → 캐시 저장
사용자웹 CrawlFeed 30초 폴링
"""
import json, os, sys, time
from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))

# /tmp는 Vercel 서버리스에서 쓰기 가능한 유일한 경로
CACHE_FILE = "/tmp/crawl_cache.json"
CACHE_TTL  = 30 * 60  # 30분

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

# ── JSON 파일 캐시 ────────────────────────────────────────
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

def _get_cached(topic_key):
    """캐시에서 토픽 데이터 조회 (TTL 확인)"""
    cache = _load_cache()
    entry = cache.get(topic_key)
    if not entry:
        return None
    if time.time() - entry.get("saved_at", 0) > CACHE_TTL:
        return None
    return entry.get("items", [])

def _set_cached(topic_key, items):
    """캐시에 토픽 데이터 저장"""
    cache = _load_cache()
    cache[topic_key] = {"items": items, "saved_at": time.time()}
    _save_cache(cache)

# ── DB 조회 ──────────────────────────────────────────────
def _db_items(topic_key, limit=20):
    try:
        import db
        rows = db.query(
            "SELECT ci.seq_no id, ci.item_id, t.topic_key topicKey, "
            "ci.topic_label topicLabel, ci.category_id category, "
            "ci.title, ci.summary, ci.source_url source, "
            "ci.view_count views, ci.like_count likes, "
            "0 comments, ci.hot_yn, ci.crawled_at crawledAt, 'crawled' type "
            "FROM tb_crawl_item ci "
            "LEFT JOIN tb_topic t ON t.seq_no = ci.topic_seq_no "
            "WHERE t.topic_key=%s AND ci.blocked_yn='N' "
            "ORDER BY ci.crawled_at DESC LIMIT %s",
            (topic_key, limit)
        )
        for r in rows:
            r["hot"]  = r.pop("hot_yn", "N") == "Y"
            r["tags"] = [t["tag_name"] for t in db.query(
                "SELECT tag_name FROM tb_crawl_item_tag WHERE item_seq_no=%s ORDER BY sort_order",
                (r["id"],))]
        return rows
    except Exception:
        return None  # DB 연결 실패 → None (캐시/크롤링으로 폴백)

def _save_to_db(items, topic_key):
    try:
        import db
        topic = db.query_one("SELECT seq_no FROM tb_topic WHERE topic_key=%s", (topic_key,))
        if not topic: return
        for item in items:
            if db.query_one("SELECT seq_no FROM tb_crawl_item WHERE item_id=%s", (item.get("id",""),)):
                continue
            seq = db.execute(
                "INSERT INTO tb_crawl_item "
                "(item_id,topic_seq_no,title,summary,source_url,topic_label,category_id,hot_yn) "
                "VALUES(%s,%s,%s,%s,%s,%s,%s,'N')",
                (item.get("id","")[:200], topic["seq_no"],
                 item.get("title","")[:500], item.get("summary","")[:1000],
                 item.get("source","")[:2000], item.get("topicLabel","")[:100],
                 item.get("category","")[:50]))
            for i, tag in enumerate((item.get("tags") or [])[:5]):
                db.execute("INSERT IGNORE INTO tb_crawl_item_tag (item_seq_no,tag_name,sort_order) VALUES(%s,%s,%s)",
                           (seq, str(tag)[:100], i))
    except Exception:
        pass  # DB 저장 실패 → 무시 (캐시에는 저장됨)


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200); _cors(self); self.end_headers()

    def do_GET(self):
        params    = parse_qs(urlparse(self.path).query)
        topic_key = params.get("topic", [None])[0]
        limit     = min(50, int(params.get("limit", ["20"])[0]))

        if not topic_key:
            return _json(self, 400, {"error": "topic parameter required"})

        # ── 1순위: DB ────────────────────────────────────
        db_items = _db_items(topic_key, limit)
        if db_items is not None and len(db_items) > 0:
            _set_cached(topic_key, db_items)  # DB 성공 → 캐시도 갱신
            return _json(self, 200, {"items": db_items, "count": len(db_items), "source": "db"})

        # ── 2순위: /tmp JSON 캐시 ────────────────────────
        cached = _get_cached(topic_key)
        if cached:
            return _json(self, 200, {"items": cached, "count": len(cached), "source": "cache"})

        # ── 3순위: 실시간 크롤링 → 캐시 저장 ────────────
        try:
            from crawl import TOPIC_CRAWLERS, enrich
            fn = TOPIC_CRAWLERS.get(topic_key)
            if not fn:
                return _json(self, 200, {"items": [], "count": 0, "source": "empty"})
            raw   = fn()
            label = topic_key.split(".")[-1].replace("_", " ").title()
            items = enrich(raw[:limit], topic_key, label, topic_key.split(".")[0])
            _set_cached(topic_key, items)    # 캐시에 저장
            _save_to_db(items, topic_key)    # DB에도 저장 시도 (실패해도 무방)
            return _json(self, 200, {"items": items, "count": len(items), "source": "fresh"})
        except Exception as e:
            return _json(self, 200, {"items": [], "count": 0, "source": "error", "error": str(e)})

    def log_message(self, *a): pass
