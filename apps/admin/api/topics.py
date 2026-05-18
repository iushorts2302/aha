"""
/api/topics — 토픽 CRUD (관리자)
GET    /api/topics?category_id=<seq>   카테고리별 목록
POST   /api/topics                     추가 { topic_key, category_id, label, sort_order? }
PATCH  /api/topics                     수정 { id, label?, active_yn?, sort_order? }
DELETE /api/topics                     삭제 { id }
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
            where, args = [], []
            if "category_id" in params:
                where.append("category_seq_no=%s"); args.append(params["category_id"][0])
            sql = "SELECT t.*,c.category_id,c.label cat_label FROM tb_topic t JOIN tb_category c ON c.seq_no=t.category_seq_no"
            if where: sql += f" WHERE {' AND '.join(where)}"
            sql += " ORDER BY t.sort_order,t.seq_no"
            rows = db.query(sql, args)
            _json(self, 200, {"topics": rows})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            key   = body.get("topic_key","").strip()
            cat   = body.get("category_id")
            label = body.get("label","").strip()
            if not key or not cat or not label:
                return _json(self, 400, {"error": "topic_key, category_id, label 필수"})
            exist = db.query_one("SELECT seq_no FROM tb_topic WHERE topic_key=%s", (key,))
            if exist: return _json(self, 409, {"error": "이미 존재하는 topic_key"})
            seq = db.execute(
                "INSERT INTO tb_topic (topic_key,category_seq_no,label,sort_order,active_yn) VALUES(%s,%s,%s,%s,%s)",
                (key, cat, label, body.get("sort_order",0), "Y" if body.get("active",True) else "N"))
            _json(self, 201, {"seq_no": seq})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def do_PATCH(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            tid = body.get("id")
            if not tid: return _json(self, 400, {"error": "id 필수"})
            sets, args = [], []
            for col in ("label","active_yn","sort_order"):
                if col in body: sets.append(f"{col}=%s"); args.append(body[col])
            if sets:
                args.append(tid)
                db.execute(f"UPDATE tb_topic SET {','.join(sets)} WHERE seq_no=%s", args)
            _json(self, 200, {"ok": True})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def do_DELETE(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            tid = body.get("id")
            if not tid: return _json(self, 400, {"error": "id 필수"})
            db.execute("DELETE FROM tb_topic WHERE seq_no=%s", (tid,))
            _json(self, 200, {"ok": True})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def log_message(self, *a): pass
