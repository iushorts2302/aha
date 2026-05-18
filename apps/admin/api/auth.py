"""
/api/auth — 로그인 / 관리자 로그인
POST /api/auth  { email, password, type: "user"|"admin" }
→ { seq_no, email, nickname/name, role, token(임시) }
"""
import json, hashlib, os, sys, datetime, secrets
from http.server import BaseHTTPRequestHandler
sys.path.insert(0, os.path.dirname(__file__))
import db

def _hash(pw): return hashlib.sha256(pw.encode()).hexdigest()
def _serial(obj):
    if isinstance(obj, (datetime.date, datetime.datetime)): return obj.isoformat()
    raise TypeError

def _cors(h):
    h.send_header("Access-Control-Allow-Origin",  "*")
    h.send_header("Access-Control-Allow-Methods", "POST,OPTIONS")
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

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            email    = body.get("email","").strip()
            password = body.get("password","")
            kind     = body.get("type","user")   # "user" | "admin"

            if kind == "admin":
                row = db.query_one(
                    "SELECT seq_no,email,name,role,status FROM tb_admin WHERE email=%s AND password_hash=%s",
                    (email, _hash(password)))
                if not row: return _json(self, 401, {"error": "이메일 또는 비밀번호가 올바르지 않습니다."})
                if row["status"] != "active": return _json(self, 403, {"error": "비활성 계정"})
                db.execute("UPDATE tb_admin SET last_login_at=NOW() WHERE seq_no=%s", (row["seq_no"],))
                return _json(self, 200, {
                    "seq_no": row["seq_no"], "email": row["email"],
                    "name": row["name"], "role": row["role"],
                    "token": secrets.token_hex(32),
                })
            else:
                row = db.query_one(
                    "SELECT seq_no,email,nickname,bio,avatar_url,role,status FROM tb_user WHERE email=%s AND password_hash=%s",
                    (email, _hash(password)))
                if not row: return _json(self, 401, {"error": "이메일 또는 비밀번호가 올바르지 않습니다."})
                if row["status"] != "active": return _json(self, 403, {"error": "정지된 계정"})
                db.execute("UPDATE tb_user SET last_login_at=NOW() WHERE seq_no=%s", (row["seq_no"],))
                row["expertise"] = [r["expertise_name"] for r in db.query(
                    "SELECT expertise_name FROM tb_user_expertise WHERE user_seq_no=%s", (row["seq_no"],))]
                row["bookmarks"] = [r["post_seq_no"] for r in db.query(
                    "SELECT post_seq_no FROM tb_user_bookmark WHERE user_seq_no=%s", (row["seq_no"],))]
                row["following"] = [r["followee_seq_no"] for r in db.query(
                    "SELECT followee_seq_no FROM tb_user_follow WHERE follower_seq_no=%s", (row["seq_no"],))]
                row["token"] = secrets.token_hex(32)
                return _json(self, 200, row)
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def log_message(self, *a): pass
