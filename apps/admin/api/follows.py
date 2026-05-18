"""
/api/follows — 팔로우 토글
POST /api/follows { follower_id, followee_id }  → { following: bool }
GET  /api/follows?user_id=<uid>&type=followers|following
"""
import json, os, sys, datetime
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
sys.path.insert(0, os.path.dirname(__file__))
import db

def _serial(obj):
    if isinstance(obj, (datetime.date, datetime.datetime)): return obj.isoformat()
    raise TypeError

def _cors(h):
    h.send_header("Access-Control-Allow-Origin",  "*")
    h.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    h.send_header("Access-Control-Allow-Headers", "Content-Type")

def _json(h, status, data):
    body = json.dumps(data, default=_serial, ensure_ascii=False).encode()
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
            uid  = params.get("user_id", [None])[0]
            kind = params.get("type", ["following"])[0]
            if not uid: return _json(self, 400, {"error": "user_id 필수"})
            if kind == "followers":
                rows = db.query(
                    "SELECT u.seq_no,u.nickname,u.avatar_url FROM tb_user_follow f "
                    "JOIN tb_user u ON u.seq_no=f.follower_seq_no WHERE f.followee_seq_no=%s", (uid,))
            else:
                rows = db.query(
                    "SELECT u.seq_no,u.nickname,u.avatar_url FROM tb_user_follow f "
                    "JOIN tb_user u ON u.seq_no=f.followee_seq_no WHERE f.follower_seq_no=%s", (uid,))
            _json(self, 200, {"users": rows, "count": len(rows)})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            fr = body.get("follower_id"); fe = body.get("followee_id")
            if not fr or not fe: return _json(self, 400, {"error": "follower_id, followee_id 필수"})
            if str(fr) == str(fe): return _json(self, 400, {"error": "자기 자신 팔로우 불가"})
            exist = db.query_one(
                "SELECT seq_no FROM tb_user_follow WHERE follower_seq_no=%s AND followee_seq_no=%s", (fr, fe))
            if exist:
                db.execute("DELETE FROM tb_user_follow WHERE follower_seq_no=%s AND followee_seq_no=%s", (fr, fe))
                return _json(self, 200, {"following": False})
            db.execute("INSERT INTO tb_user_follow (follower_seq_no,followee_seq_no) VALUES(%s,%s)", (fr, fe))
            _json(self, 200, {"following": True})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def log_message(self, *a): pass
