"""
/api/cron.py — Vercel Cron / GitHub Actions 10분 자동 크롤링
우선순위 토픽 순차 실행
"""

import json, os, sys, time, datetime
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))
from crawl import TOPIC_CRAWLERS, enrich, TOPIC_LABELS

_CACHE: dict = {}
_CACHE_TS: dict = {}

# 10분 Cron 실행 시 갱신할 우선순위 토픽
PRIORITY_TOPICS = [
    # 홈
    "home.trending", "home.rising", "home.ai_feed",
    # AI
    "ai.news", "ai.tools", "ai.trend",
    # 개발
    "dev.trending", "dev.javascript", "dev.python",
    # IT 뉴스
    "it.news", "it.security",
    # 스타트업
    "startup.new",
    # 오픈소스
    "oss.trending", "oss.awesome",
    # 인기
    "trending.realtime", "trending.daily",
    # 게시판
    "board.it", "board.free",
    # 학습
    "learn.tutorial",
]

def get_cache(): return _CACHE
def set_cache(k, v): _CACHE[k] = v; _CACHE_TS[k] = time.time()


class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        secret = os.environ.get("CRON_SECRET", "")
        auth   = self.headers.get("Authorization", "")
        if secret and auth != f"Bearer {secret}":
            return self._json(401, {"error": "Unauthorized"})

        start = time.time()
        crawled, errors = {}, {}

        for key in PRIORITY_TOPICS:
            fn = TOPIC_CRAWLERS.get(key)
            if not fn:
                continue
            try:
                raw   = fn()
                label = TOPIC_LABELS.get(key, key)
                cat   = key.split(".")[0]
                items = enrich(raw[:8], key, label, cat)
                set_cache(key, items)
                crawled[key] = len(items)
                time.sleep(0.3)
            except Exception as e:
                errors[key] = str(e)

        self._json(200, {
            "ok": True,
            "elapsed": round(time.time() - start, 2),
            "crawled": crawled,
            "errors": errors,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        })

    def _json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args): pass
