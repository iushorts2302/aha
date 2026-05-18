"""
/api/reactions — 이모지 반응 (게시글/크롤링 공용)
GET  /api/reactions?target_type=post&target_id=<seq>   집계 + 사용자 반응
POST /api/reactions { target_type, target_id, user_id, reaction_key }  → 토글
"""
import json, os, sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
sys.path.insert(0, os.path.dirname(__file__))
import db

VALID_KEYS = {"fire","lol","like","wow","sad","angry"}

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
            ttype = params.get("target_type", ["post"])[0]
            tid   = params.get("target_id",   [None])[0]
            uid   = params.get("user_id",     [None])[0]
            if not tid: return _json(self, 400, {"error": "target_id 필수"})
            # 집계
            rows = db.query(
                "SELECT reaction_key, COUNT(*) cnt FROM tb_reaction "
                "WHERE target_type=%s AND target_seq_no=%s GROUP BY reaction_key", (ttype, tid))
            counts = {r["reaction_key"]: r["cnt"] for r in rows}
            user_reaction = None
            if uid:
                row = db.query_one(
                    "SELECT reaction_key FROM tb_reaction WHERE target_type=%s AND target_seq_no=%s AND user_seq_no=%s",
                    (ttype, tid, uid))
                user_reaction = row["reaction_key"] if row else None
            _json(self, 200, {"counts": counts, "user_reaction": user_reaction})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            ttype = body.get("target_type","post")
            tid   = body.get("target_id")
            uid   = body.get("user_id")
            key   = body.get("reaction_key")
            if not tid or not uid or not key:
                return _json(self, 400, {"error": "target_id, user_id, reaction_key 필수"})
            if key not in VALID_KEYS:
                return _json(self, 400, {"error": f"reaction_key must be one of {VALID_KEYS}"})
            # 기존 반응 조회
            exist = db.query_one(
                "SELECT seq_no,reaction_key FROM tb_reaction WHERE target_type=%s AND target_seq_no=%s AND user_seq_no=%s",
                (ttype, tid, uid))
            if exist:
                if exist["reaction_key"] == key:
                    # 같은 반응 → 취소
                    db.execute("DELETE FROM tb_reaction WHERE seq_no=%s", (exist["seq_no"],))
                    new_key = None
                else:
                    # 다른 반응 → 변경
                    db.execute("UPDATE tb_reaction SET reaction_key=%s WHERE seq_no=%s", (key, exist["seq_no"]))
                    new_key = key
            else:
                db.execute("INSERT INTO tb_reaction (target_type,target_seq_no,user_seq_no,reaction_key) VALUES(%s,%s,%s,%s)",
                           (ttype, tid, uid, key))
                new_key = key
            # 최신 집계 반환
            rows = db.query(
                "SELECT reaction_key, COUNT(*) cnt FROM tb_reaction "
                "WHERE target_type=%s AND target_seq_no=%s GROUP BY reaction_key", (ttype, tid))
            _json(self, 200, {"user_reaction": new_key, "counts": {r["reaction_key"]: r["cnt"] for r in rows}})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def log_message(self, *a): pass
