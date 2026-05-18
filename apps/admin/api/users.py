"""
/api/users — 사용자 CRUD
GET    /api/users            관리자: 전체 목록
GET    /api/users?id=<seq>   단일 조회
POST   /api/users            회원가입 { email, password, nickname, bio? }
PATCH  /api/users            정보 수정 { id, nickname?, bio?, status? }
DELETE /api/users            탈퇴     { id }
"""
import json, hashlib, os, sys, datetime
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, os.path.dirname(__file__))
import db

def _hash(pw): return hashlib.sha256(pw.encode()).hexdigest()
def _serial(obj):
    if isinstance(obj, (datetime.date, datetime.datetime)):
        return obj.isoformat()
    raise TypeError

def _cors(h):
    h.send_header("Access-Control-Allow-Origin",  "*")
    h.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
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
            uid = params.get("id", [None])[0]
            if uid:
                row = db.query_one(
                    "SELECT seq_no,email,nickname,bio,avatar_url,role,status,"
                    "created_at,last_login_at FROM tb_user WHERE seq_no=%s", (uid,))
                if not row: return _json(self, 404, {"error": "not found"})
                # 관심분야
                row["expertise"] = [r["expertise_name"] for r in db.query(
                    "SELECT expertise_name FROM tb_user_expertise WHERE user_seq_no=%s ORDER BY seq_no", (uid,))]
                # 팔로워/팔로잉 수
                row["follower_count"]  = db.query_one("SELECT COUNT(*) c FROM tb_user_follow WHERE followee_seq_no=%s", (uid,))["c"]
                row["following_count"] = db.query_one("SELECT COUNT(*) c FROM tb_user_follow WHERE follower_seq_no=%s", (uid,))["c"]
                return _json(self, 200, row)
            # 전체 목록 (관리자용)
            rows = db.query(
                "SELECT seq_no,email,nickname,role,status,created_at,"
                "(SELECT COUNT(*) FROM tb_post WHERE author_seq_no=u.seq_no AND status='published') post_count "
                "FROM tb_user u ORDER BY seq_no DESC LIMIT 500")
            _json(self, 200, {"users": rows, "count": len(rows)})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            email    = body.get("email","").strip()
            password = body.get("password","")
            nickname = body.get("nickname","").strip()
            if not email or not password or not nickname:
                return _json(self, 400, {"error": "email, password, nickname 필수"})
            if len(password) < 6:
                return _json(self, 400, {"error": "비밀번호는 6자 이상"})
            # 중복 체크
            exist = db.query_one("SELECT seq_no FROM tb_user WHERE email=%s", (email,))
            if exist: return _json(self, 409, {"error": "이미 사용 중인 이메일"})
            seq = db.execute(
                "INSERT INTO tb_user (email,password_hash,nickname,bio,role,status) VALUES(%s,%s,%s,%s,'user','active')",
                (email, _hash(password), nickname, body.get("bio",""))
            )
            # 관심분야
            for exp in body.get("expertise", []):
                db.execute("INSERT IGNORE INTO tb_user_expertise (user_seq_no,expertise_name) VALUES(%s,%s)", (seq, exp))
            _json(self, 201, {"seq_no": seq, "email": email, "nickname": nickname})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def do_PATCH(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            uid = body.get("id")
            if not uid: return _json(self, 400, {"error": "id 필수"})
            sets, args = [], []
            for col in ("nickname","bio","avatar_url","status"):
                if col in body: sets.append(f"{col}=%s"); args.append(body[col])
            if "password" in body:
                sets.append("password_hash=%s"); args.append(_hash(body["password"]))
            if sets:
                args.append(uid)
                db.execute(f"UPDATE tb_user SET {','.join(sets)} WHERE seq_no=%s", args)
            if "expertise" in body:
                db.execute("DELETE FROM tb_user_expertise WHERE user_seq_no=%s", (uid,))
                for exp in body["expertise"]:
                    db.execute("INSERT IGNORE INTO tb_user_expertise (user_seq_no,expertise_name) VALUES(%s,%s)", (uid, exp))
            _json(self, 200, {"ok": True})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def do_DELETE(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            uid = body.get("id")
            if not uid: return _json(self, 400, {"error": "id 필수"})
            db.execute("UPDATE tb_user SET status='deleted' WHERE seq_no=%s", (uid,))
            _json(self, 200, {"ok": True})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def log_message(self, *a): pass
