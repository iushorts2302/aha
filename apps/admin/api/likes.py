"""
/api/likes — 게시글 좋아요 토글
POST /api/likes { post_id, user_id }
→ { liked: bool, like_count: int }
"""
import json, os, sys
from http.server import BaseHTTPRequestHandler
sys.path.insert(0, os.path.dirname(__file__))
import db

def _cors(h):
    h.send_header("Access-Control-Allow-Origin",  "*")
    h.send_header("Access-Control-Allow-Methods", "POST,OPTIONS")
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

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            pid = body.get("post_id"); uid = body.get("user_id")
            if not pid or not uid:
                return _json(self, 400, {"error": "post_id, user_id 필수"})
            exist = db.query_one(
                "SELECT seq_no FROM tb_post_like WHERE post_seq_no=%s AND user_seq_no=%s", (pid, uid))
            if exist:
                db.execute("DELETE FROM tb_post_like WHERE post_seq_no=%s AND user_seq_no=%s", (pid, uid))
                db.execute("UPDATE tb_post SET like_count=GREATEST(0,like_count-1) WHERE seq_no=%s", (pid,))
                liked = False
            else:
                db.execute("INSERT INTO tb_post_like (post_seq_no,user_seq_no) VALUES(%s,%s)", (pid, uid))
                db.execute("UPDATE tb_post SET like_count=like_count+1 WHERE seq_no=%s", (pid,))
                liked = True
            row = db.query_one("SELECT like_count FROM tb_post WHERE seq_no=%s", (pid,))
            _json(self, 200, {"liked": liked, "like_count": row["like_count"]})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def log_message(self, *a): pass
