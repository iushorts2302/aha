"""
/api/blocked.py — 게시글 차단 목록 서버사이드 관리
GET  /api/blocked        → 차단 목록 반환
POST /api/blocked        → 차단 추가 { "id": "p1", "action": "block"|"unblock" }
"""

import json, os
from http.server import BaseHTTPRequestHandler

# 서버 인메모리 차단 목록 (warm instance 재사용 시 유지)
# Vercel serverless는 인스턴스가 유지되는 동안 상태 보존
_BLOCKED: set = set()

CORS_HEADERS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        for k, v in CORS_HEADERS.items():
            self.send_header(k, v)
        self.end_headers()

    def do_GET(self):
        self._json(200, {"blocked": list(_BLOCKED), "count": len(_BLOCKED)})

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body   = json.loads(self.rfile.read(length)) if length else {}
            post_id = body.get("id", "").strip()
            action  = body.get("action", "block")  # "block" | "unblock"

            if not post_id:
                return self._json(400, {"error": "id is required"})

            if action == "block":
                _BLOCKED.add(post_id)
            elif action == "unblock":
                _BLOCKED.discard(post_id)
            else:
                return self._json(400, {"error": "action must be block or unblock"})

            self._json(200, {"ok": True, "id": post_id, "action": action, "blocked": list(_BLOCKED)})

        except Exception as e:
            self._json(500, {"error": str(e)})

    def _json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        for k, v in CORS_HEADERS.items():
            self.send_header(k, v)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass
