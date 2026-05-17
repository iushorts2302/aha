"""
/api/cron.py — GitHub Actions 10분 자동 크롤링
한국 기업 기반 우선순위 토픽 순차 실행
"""

import json, os, sys, time, datetime
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))
from crawl import TOPIC_CRAWLERS, enrich, TOPIC_LABELS

_CACHE: dict = {}
_CACHE_TS: dict = {}

PRIORITY_TOPICS = [
    # 홈 — 한국 기업 트렌딩
    "home.trending", "home.rising", "home.ai_feed",
    # 개발 — 네이버/카카오/라인/토스
    "dev.trending", "dev.javascript", "dev.python",
    # AI — 크래프톤/카카오/네이버 AI
    "ai.news", "ai.trend",
    # 스타트업 — 토스/당근/배민
    "startup.new",
    # IT 뉴스
    "it.news", "it.cloud",
    # 오픈소스
    "oss.trending",
    # 게임 — 엔씨/크래프톤/넥슨
    "game.news",
    # 금융
    "finance.crypto",
    # 학습
    "learn.tutorial",
    # 취업
    "job.dev",
    # 인기
    "trending.realtime",
    # 게시판
    "board.it",
]

def get_cache(): return _CACHE
def set_cache(k, v):
    _CACHE[k] = v
    _CACHE_TS[k] = time.time()


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
