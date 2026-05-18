"""
/api/sources — 크롤링 소스 CRUD (관리자)
GET    /api/sources                 전체 목록 (연결 토픽 포함)
POST   /api/sources                 추가 { source_id, label, source_type, source_value, topic_keys:[] }
PATCH  /api/sources                 수정 { id, label?, source_value?, active_yn? }
DELETE /api/sources                 삭제 { id }
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

def _attach_topics(sources):
    """소스별 연결 토픽 키 목록 첨부"""
    if not sources: return sources
    src_ids = [s["seq_no"] for s in sources]
    if not src_ids: return sources
    placeholders = ",".join(["%s"] * len(src_ids))
    links = db.query(
        f"SELECT st.source_seq_no, t.topic_key FROM tb_crawl_source_topic st "
        f"JOIN tb_topic t ON t.seq_no=st.topic_seq_no "
        f"WHERE st.source_seq_no IN ({placeholders})", src_ids)
    link_map = {}
    for l in links:
        link_map.setdefault(l["source_seq_no"], []).append(l["topic_key"])
    for s in sources:
        s["topic_keys"] = link_map.get(s["seq_no"], [])
    return sources

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200); _cors(self); self.end_headers()

    def do_GET(self):
        try:
            sources = db.query("SELECT * FROM tb_crawl_source ORDER BY seq_no")
            _json(self, 200, {"sources": _attach_topics(sources)})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def _save_topic_links(self, source_seq, topic_keys):
        db.execute("DELETE FROM tb_crawl_source_topic WHERE source_seq_no=%s", (source_seq,))
        for key in topic_keys:
            topic = db.query_one("SELECT seq_no FROM tb_topic WHERE topic_key=%s", (key,))
            if topic:
                db.execute("INSERT IGNORE INTO tb_crawl_source_topic (source_seq_no,topic_seq_no) VALUES(%s,%s)",
                           (source_seq, topic["seq_no"]))

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            sid   = body.get("source_id","").strip()
            label = body.get("label","").strip()
            stype = body.get("source_type","github_org")
            sval  = body.get("source_value","").strip()
            if not sid or not label:
                return _json(self, 400, {"error": "source_id, label 필수"})
            exist = db.query_one("SELECT seq_no FROM tb_crawl_source WHERE source_id=%s", (sid,))
            if exist: return _json(self, 409, {"error": "이미 존재하는 source_id"})
            seq = db.execute(
                "INSERT INTO tb_crawl_source (source_id,label,source_type,source_value,active_yn) VALUES(%s,%s,%s,%s,'Y')",
                (sid, label, stype, sval))
            self._save_topic_links(seq, body.get("topic_keys", []))
            _json(self, 201, {"seq_no": seq})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def do_PATCH(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            sid = body.get("id")
            if not sid: return _json(self, 400, {"error": "id 필수"})
            sets, args = [], []
            for col in ("label","source_value","active_yn"):
                if col in body: sets.append(f"{col}=%s"); args.append(body[col])
            if sets:
                args.append(sid)
                db.execute(f"UPDATE tb_crawl_source SET {','.join(sets)} WHERE seq_no=%s", args)
            if "topic_keys" in body:
                self._save_topic_links(sid, body["topic_keys"])
            _json(self, 200, {"ok": True})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def do_DELETE(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            sid = body.get("id")
            if not sid: return _json(self, 400, {"error": "id 필수"})
            db.execute("DELETE FROM tb_crawl_source WHERE seq_no=%s", (sid,))
            _json(self, 200, {"ok": True})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def log_message(self, *a): pass
