"""
/api/cron.py — Vercel Cron Job Handler (GET)
10분마다 자동 실행: 모든 토픽 크롤링 → 인메모리 캐시 갱신
"""

import json
import os
import time
import sys
from http.server import BaseHTTPRequestHandler

# crawl.py와 같은 디렉터리에서 임포트
sys.path.insert(0, os.path.dirname(__file__))
from crawl import TOPIC_CRAWLERS, enrich

# ─── 인메모리 캐시 (프로세스 생존 동안 유지) ─────────────
# Vercel Serverless는 warm instance 재사용 시 캐시 활용
_CACHE: dict = {}
_CACHE_TS: dict = {}

# 우선순위 높은 토픽 (매 Cron 실행 시 반드시 갱신)
PRIORITY_TOPICS = [
    "home.trending", "home.rising", "home.ai_feed",
    "trending.realtime", "trending.daily",
    "board.it", "board.free",
    "knowledge.news", "aihub.trend",
    "community.dev",
]


def get_cache():
    return _CACHE

def set_cache(topic_key, items):
    _CACHE[topic_key] = items
    _CACHE_TS[topic_key] = time.time()


class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        # Vercel Cron 인증 헤더 검증
        auth = self.headers.get("Authorization", "")
        cron_secret = os.environ.get("CRON_SECRET", "")
        if cron_secret and auth != f"Bearer {cron_secret}":
            self._json(401, {"error": "Unauthorized"})
            return

        start_ts = time.time()
        results = {}
        errors = {}

        for topic_key in PRIORITY_TOPICS:
            try:
                crawler_fn = TOPIC_CRAWLERS.get(topic_key)
                if not crawler_fn:
                    continue

                raw = crawler_fn()
                if not raw:
                    continue

                label = topic_key.split(".")[-1].replace("_", " ").title()
                category = topic_key.split(".")[0]
                items = enrich(raw[:8], topic_key, label, category)

                set_cache(topic_key, items)
                results[topic_key] = len(items)

                # 각 토픽 간 짧은 대기 (서버 부하 방지)
                time.sleep(0.3)

            except Exception as e:
                errors[topic_key] = str(e)

        elapsed = round(time.time() - start_ts, 2)

        self._json(200, {
            "ok": True,
            "elapsed": elapsed,
            "crawled": results,
            "errors": errors,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        })

    def _json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass
