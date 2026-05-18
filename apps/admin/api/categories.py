"""
/api/categories — 카테고리 + 토픽 CRUD (관리자)
GET    /api/categories              전체 목록 + topics
POST   /api/categories              추가 { category_id, label, icon, sort_order? }
PATCH  /api/categories              수정 { id, label?, icon?, sort_order?, active_yn? }
DELETE /api/categories              삭제 { id }
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
            cats = db.query("SELECT * FROM tb_category ORDER BY sort_order,seq_no")
            topics = db.query("SELECT * FROM tb_topic ORDER BY sort_order,seq_no")
            # 카테고리별 토픽 그룹핑
            tmap = {}
            for t in topics:
                tmap.setdefault(t["category_seq_no"], []).append(t)
            for c in cats:
                c["topics"] = tmap.get(c["seq_no"], [])
            _json(self, 200, {"categories": cats})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            cid   = body.get("category_id","").strip()
            label = body.get("label","").strip()
            if not cid or not label: return _json(self, 400, {"error": "category_id, label 필수"})
            exist = db.query_one("SELECT seq_no FROM tb_category WHERE category_id=%s", (cid,))
            if exist: return _json(self, 409, {"error": "이미 존재하는 category_id"})
            seq = db.execute(
                "INSERT INTO tb_category (category_id,label,icon,sort_order) VALUES(%s,%s,%s,%s)",
                (cid, label, body.get("icon",""), body.get("sort_order",0)))
            _json(self, 201, {"seq_no": seq})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def do_PATCH(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            cid = body.get("id")
            if not cid: return _json(self, 400, {"error": "id 필수"})
            sets, args = [], []
            for col in ("label","icon","sort_order","active_yn"):
                if col in body: sets.append(f"{col}=%s"); args.append(body[col])
            if sets:
                args.append(cid)
                db.execute(f"UPDATE tb_category SET {','.join(sets)} WHERE seq_no=%s", args)
            _json(self, 200, {"ok": True})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def do_DELETE(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            cid = body.get("id")
            if not cid: return _json(self, 400, {"error": "id 필수"})
            db.execute("DELETE FROM tb_category WHERE seq_no=%s", (cid,))
            _json(self, 200, {"ok": True})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def log_message(self, *a): pass
