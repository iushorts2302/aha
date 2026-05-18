"""
/api/bookmarks — 북마크 토글
POST   /api/bookmarks { user_id, post_id }  → { bookmarked: bool }
GET    /api/bookmarks?user_id=<uid>         → { bookmarks: [post_seq_no, ...] }
"""
import json, os, sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
sys.path.insert(0, os.path.dirname(__file__))
import db

def _cors(h):
    h.send_header("Access-Control-Allow-Origin",  "*")
    h.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    h.send_header("Access-Control-Allow-Headers", "Content-Type")

def _json(h, status, data):
    body = json.dumps(data, ensure_ascii=False).encode()
    h.send_response(status); _cors(h)
    h.send_header("Content-Type", "application/json; charset=utf-8")
    h.send_header("Content-Length", str(len(body)))
    h.end_headers(); h.wfile.write(body)

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200); _cors(self); self.end_headers()

    def do_GET(self):
        try:
            params = parse_qs(urlparse(self.path).query)
            uid = params.get("user_id", [None])[0]
            if not uid: return _json(self, 400, {"error": "user_id 필수"})
            rows = db.query("SELECT post_seq_no FROM tb_user_bookmark WHERE user_seq_no=%s ORDER BY seq_no DESC", (uid,))
            _json(self, 200, {"bookmarks": [r["post_seq_no"] for r in rows]})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            uid = body.get("user_id"); pid = body.get("post_id")
            if not uid or not pid: return _json(self, 400, {"error": "user_id, post_id 필수"})
            exist = db.query_one("SELECT seq_no FROM tb_user_bookmark WHERE user_seq_no=%s AND post_seq_no=%s", (uid, pid))
            if exist:
                db.execute("DELETE FROM tb_user_bookmark WHERE user_seq_no=%s AND post_seq_no=%s", (uid, pid))
                return _json(self, 200, {"bookmarked": False})
            db.execute("INSERT INTO tb_user_bookmark (user_seq_no,post_seq_no) VALUES(%s,%s)", (uid, pid))
            _json(self, 200, {"bookmarked": True})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def log_message(self, *a): pass
