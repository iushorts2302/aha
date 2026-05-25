"""
/api/data — 크롤링 데이터 즉시 응답 API

[핵심 원칙: 절대 사용자를 기다리게 하지 않는다]
- 캐시 있음 → 즉시 반환 (~200ms)
- 캐시 없음 → 빈 배열 즉시 반환 + 백그라운드에서 채우기
- 다음 요청 시 캐시에서 즉시 반환됨

성능 비교:
  기존: 캐시 미스 → DB(3.5s) → 크롤링(5~15s) 동기 대기 = 16~20초
  개선: 캐시 미스 → 즉시 [] 반환 + 백그라운드 처리 = ~200ms
"""
import json, os, sys, time, threading
from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))

CACHE_FILE = "/tmp/crawl_cache.json"
CACHE_TTL  = 30 * 60  # 30분

# ── CORS / JSON ────────────────────────────────────────────
def _cors(h):
    h.send_header("Access-Control-Allow-Origin", "*")
    h.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
    h.send_header("Access-Control-Allow-Headers", "Content-Type")

def _json(h, status, data):
    body = json.dumps(data, ensure_ascii=False, default=str).encode("utf-8")
    h.send_response(status); _cors(h)
    h.send_header("Content-Type", "application/json; charset=utf-8")
    h.send_header("Cache-Control", "public, max-age=30")  # 브라우저/CDN 30초 캐시
    h.send_header("Content-Length", str(len(body)))
    h.end_headers(); h.wfile.write(body)

# ── /tmp 캐시 ─────────────────────────────────────────────
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

def _get_cached(topic_key, allow_stale=False):
    """캐시 조회. allow_stale=True면 TTL 무시하고 반환"""
    cache = _load_cache()
    entry = cache.get(topic_key)
    if not entry: return None
    if allow_stale:
        return entry.get("items", [])
    if time.time() - entry.get("saved_at", 0) > CACHE_TTL:
        return None
    return entry.get("items", [])

def _set_cached(topic_key, items):
    cache = _load_cache()
    cache[topic_key] = {"items": items, "saved_at": time.time()}
    _save_cache(cache)

# ── DB 조회 (배치 최적화 — N+1 제거) ───────────────────────
def _db_items(topic_key, limit=20):
    """DB에서 토픽 아이템 조회. 태그를 IN 절로 한번에 조회 (N+1 → 2 쿼리)"""
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
        if not rows: return []
        for r in rows:
            r["hot"]  = r.pop("hot_yn", "N") == "Y"
            r["tags"] = []
        # 모든 태그를 IN 쿼리로 한번에 조회 (N+1 → 2 쿼리)
        ids = [r["id"] for r in rows]
        if ids:
            placeholders = ",".join(["%s"] * len(ids))
            tags = db.query(
                f"SELECT item_seq_no, tag_name FROM tb_crawl_item_tag "
                f"WHERE item_seq_no IN ({placeholders}) ORDER BY sort_order",
                tuple(ids)
            )
            by_id = {}
            for t in tags:
                by_id.setdefault(t["item_seq_no"], []).append(t["tag_name"])
            for r in rows:
                r["tags"] = by_id.get(r["id"], [])
        # URL 보강: source_url이 비어 있는 경우 GitHub 한국 조직 패턴으로 URL 조립
        # 예: title="[네이버] anny" → https://github.com/naver/anny
        ORG_MAP = {
            "네이버": "naver", "카카오": "kakaocorp", "라인": "line",
            "당근": "daangn", "토스": "toss", "쿠팡": "Coupang",
            "우아한형제": "woowabros", "GitHub": None,  # 이미 GitHub 표시면 별도 처리
        }
        for r in rows:
            if not r.get("source"):
                title = r.get("title", "") or ""
                if title.startswith("[") and "]" in title:
                    label = title[1:title.index("]")]
                    repo  = title[title.index("]") + 1:].strip()
                    if " / " in repo:  # "[GitHub] org / repo" 패턴
                        repo = repo.replace(" / ", "/", 1)
                        r["source"] = f"https://github.com/{repo}"
                    elif label in ORG_MAP and ORG_MAP[label]:
                        r["source"] = f"https://github.com/{ORG_MAP[label]}/{repo}"
            # 프론트 호환: url 필드도 함께 노출
            r["url"] = r.get("source", "")

        # 중복 제거: title 기준 (같은 레포가 여러 토픽에서 들어와 중복)
        seen, deduped = set(), []
        for r in rows:
            key = r.get("title", "")
            if key in seen: continue
            seen.add(key)
            deduped.append(r)
        return deduped
    except Exception:
        return None

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
                db.execute(
                    "INSERT IGNORE INTO tb_crawl_item_tag (item_seq_no,tag_name,sort_order) "
                    "VALUES(%s,%s,%s)", (seq, str(tag)[:100], i))
    except Exception:
        pass


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200); _cors(self); self.end_headers()

    def do_GET(self):
        params    = parse_qs(urlparse(self.path).query)
        topic_key = params.get("topic", [None])[0]
        limit     = min(50, int(params.get("limit", ["20"])[0]))
        force     = params.get("force", ["0"])[0] == "1"
        wait      = params.get("wait", ["0"])[0] == "1"  # 동기 대기 모드

        if not topic_key:
            return _json(self, 400, {"error": "topic parameter required"})

        if force:
            cache = _load_cache()
            cache.pop(topic_key, None)
            _save_cache(cache)

        # ── 1순위: 신선한 캐시 → 즉시 반환 (~200ms) ──────
        cached = _get_cached(topic_key) if not force else None
        if cached is not None and len(cached) > 0:
            return _json(self, 200, {"items": cached, "count": len(cached), "source": "cache"})

        # ── 2순위: stale 캐시 즉시 반환 (cron이 다음 사이클에 갱신) ──
        # 30분 지난 데이터라도 즉시 반환 - cron이 10분마다 모든 토픽 갱신
        stale = _get_cached(topic_key, allow_stale=True) if not force else None
        if stale is not None and len(stale) > 0:
            return _json(self, 200, {"items": stale, "count": len(stale), "source": "stale"})

        # ── 3순위: wait=1이면 동기 대기 (관리자/cron용) ────
        if wait:
            try:
                db_items = _db_items(topic_key, limit)
                if db_items and len(db_items) > 0:
                    _set_cached(topic_key, db_items)
                    return _json(self, 200, {"items": db_items, "count": len(db_items), "source": "db"})
                from crawl import TOPIC_CRAWLERS, enrich
                fn = TOPIC_CRAWLERS.get(topic_key)
                if not fn:
                    return _json(self, 200, {"items": [], "count": 0, "source": "empty"})
                raw   = fn()
                label = topic_key.split(".")[-1].replace("_", " ").title()
                items = enrich(raw[:limit], topic_key, label, topic_key.split(".")[0])
                if items:
                    _set_cached(topic_key, items)
                    _save_to_db(items, topic_key)
                return _json(self, 200, {"items": items, "count": len(items), "source": "fresh"})
            except Exception as e:
                return _json(self, 200, {"items": [], "count": 0, "source": "error", "error": str(e)[:100]})

        # ── 4순위: 캐시 없음 + DB 없음 → 동기 크롤링 (10초 제한) ──
        # Vercel 서버리스는 응답 후 즉시 종료 → 백그라운드 불가
        # 빠른 크롤링만 시도 (DB 우선)
        try:
            db_items = _db_items(topic_key, limit)
            if db_items is not None and len(db_items) > 0:
                _set_cached(topic_key, db_items)
                return _json(self, 200, {"items": db_items, "count": len(db_items), "source": "db"})
            # 크롤링 - 빠른 토픽만 (느리면 timeout 발생)
            from crawl import TOPIC_CRAWLERS, enrich
            fn = TOPIC_CRAWLERS.get(topic_key)
            if not fn:
                return _json(self, 200, {"items": [], "count": 0, "source": "empty"})
            raw   = fn()
            label = topic_key.split(".")[-1].replace("_", " ").title()
            items = enrich(raw[:limit], topic_key, label, topic_key.split(".")[0])
            if items:
                _set_cached(topic_key, items)
                # DB 저장은 다음 cron이 처리 (응답 차단 없도록 생략)
            return _json(self, 200, {"items": items, "count": len(items), "source": "fresh"})
        except Exception as e:
            return _json(self, 200, {"items": [], "count": 0, "source": "error", "error": str(e)[:100]})

    def log_message(self, *a): pass
