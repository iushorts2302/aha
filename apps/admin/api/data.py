"""
/api/data.py — 크롤링 데이터 조회 API
브라우저(사용자/관리자 앱)에서 30초마다 폴링
cron.py가 갱신한 캐시를 반환. 없으면 즉시 크롤링.
"""

import json
import os
import sys
import time
from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))
from crawl import TOPIC_CRAWLERS, enrich

# cron.py와 캐시 공유 (같은 프로세스 인스턴스일 때)
try:
    from cron import get_cache, set_cache
except ImportError:
    _LOCAL_CACHE: dict = {}
    _LOCAL_TS: dict = {}
    def get_cache(): return _LOCAL_CACHE
    def set_cache(k, v):
        _LOCAL_CACHE[k] = v
        _LOCAL_TS[k] = time.time()


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors()
        self.end_headers()

    def do_GET(self):
        # ?topic=board.it 파싱
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        topic_key = params.get("topic", [""])[0]

        if not topic_key:
            # 전체 캐시 반환
            cache = get_cache()
            self._json(200, {
                "topics": list(cache.keys()),
                "counts": {k: len(v) for k, v in cache.items()},
            })
            return

        cache = get_cache()

        if topic_key in cache and cache[topic_key]:
            # 캐시 히트
            self._json(200, {
                "items": cache[topic_key],
                "source": "cache",
                "count": len(cache[topic_key]),
            })
            return

        # 캐시 미스 → 즉시 크롤링
        crawler_fn = TOPIC_CRAWLERS.get(topic_key)
        if not crawler_fn:
            self._json(404, {"error": f"Unknown topic: {topic_key}"})
            return

        try:
            raw = crawler_fn()
            label = topic_key.split(".")[-1].replace("_", " ").title()
            category = topic_key.split(".")[0]
            items = enrich(raw[:8], topic_key, label, category)
            set_cache(topic_key, items)
            self._json(200, {
                "items": items,
                "source": "fresh",
                "count": len(items),
            })
        except Exception as e:
            self._json(500, {"error": str(e)})

    def _set_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._set_cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass
