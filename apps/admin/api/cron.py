"""
/api/cron — GitHub Actions 10분 자동 크롤링
크롤링 결과를 tb_crawl_item에 DB 저장
"""
import json, os, sys, time, datetime
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))
from crawl import TOPIC_CRAWLERS, enrich

PRIORITY_TOPICS = [
    "home.trending","home.rising","home.ai_feed",
    "dev.trending","dev.javascript","dev.python",
    "ai.news","ai.trend",
    "startup.new",
    "it.news","it.cloud",
    "oss.trending",
    "game.news",
    "finance.crypto",
    "learn.tutorial",
    "job.dev",
    "trending.realtime",
    "board.it",
    "research.ai",
    "market.deal",
]

def _save_to_db(items, topic_key):
    try:
        import db
        topic = db.query_one("SELECT seq_no FROM tb_topic WHERE topic_key=%s", (topic_key,))
        if not topic: return 0
        saved = 0
        for item in items:
            exist = db.query_one("SELECT seq_no FROM tb_crawl_item WHERE item_id=%s", (item.get("id",""),))
            if exist:
                # 업데이트
                db.execute("UPDATE tb_crawl_item SET title=%s,summary=%s,source_url=%s,crawled_at=NOW() WHERE seq_no=%s",
                    (item.get("title","")[:500], item.get("summary","")[:1000],
                     item.get("source","")[:2000], exist["seq_no"]))
                seq = exist["seq_no"]
            else:
                seq = db.execute(
                    "INSERT INTO tb_crawl_item "
                    "(item_id,topic_seq_no,title,summary,source_url,topic_label,category_id,hot_yn) "
                    "VALUES(%s,%s,%s,%s,%s,%s,%s,'N')",
                    (item.get("id","")[:200], topic["seq_no"],
                     item.get("title","")[:500], item.get("summary","")[:1000],
                     item.get("source","")[:2000], item.get("topicLabel","")[:100],
                     item.get("category","")[:50]))
                saved += 1
            # 태그
            if item.get("tags") and not exist:
                for i, tag in enumerate(item["tags"][:5]):
                    db.execute("INSERT IGNORE INTO tb_crawl_item_tag (item_seq_no,tag_name,sort_order) VALUES(%s,%s,%s)",
                               (seq, str(tag)[:100], i))
        return saved
    except Exception as e:
        return 0

def _log_cron(topic_key, result, item_count, error_msg, elapsed):
    try:
        import db
        db.execute(
            "INSERT INTO tb_cron_log (topic_key,result,item_count,error_msg,elapsed_sec,finished_at) "
            "VALUES(%s,%s,%s,%s,%s,NOW())",
            (topic_key, result, item_count, error_msg, round(elapsed, 2)))
    except Exception:
        pass

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        secret = os.environ.get("CRON_SECRET", "")
        auth   = self.headers.get("Authorization", "")
        if secret and auth != f"Bearer {secret}":
            body = json.dumps({"error": "Unauthorized"}).encode()
            self.send_response(401)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers(); self.wfile.write(body); return

        start = time.time()
        crawled, errors = {}, {}

        for key in PRIORITY_TOPICS:
            fn = TOPIC_CRAWLERS.get(key)
            if not fn: continue
            t0 = time.time()
            try:
                raw   = fn()
                label = key.split(".")[-1].replace("_"," ").title()
                items = enrich(raw[:8], key, label, key.split(".")[0])
                saved = _save_to_db(items, key)
                # /tmp 캐시도 갱신 (data.py 폴백용)
                try:
                    import json as _j, time as _t
                    CACHE_FILE = "/tmp/crawl_cache.json"
                    try:
                        with open(CACHE_FILE, "r") as cf: cache = _j.load(cf)
                    except Exception: cache = {}
                    cache[key] = {"items": items, "saved_at": _t.time()}
                    with open(CACHE_FILE, "w") as cf: _j.dump(cache, cf, ensure_ascii=False, default=str)
                except Exception: pass
                crawled[key] = {"total": len(items), "saved": saved}
                _log_cron(key, "success", len(items), None, time.time()-t0)
                time.sleep(0.2)
            except Exception as e:
                errors[key] = str(e)
                _log_cron(key, "error", 0, str(e)[:500], time.time()-t0)

        body = json.dumps({
            "ok": True,
            "elapsed": round(time.time()-start, 2),
            "crawled": crawled,
            "errors": errors,
            "timestamp": datetime.datetime.utcnow().isoformat()+"Z",
        }, ensure_ascii=False).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers(); self.wfile.write(body)

    def log_message(self, *a): pass
