"""
/api/comments
GET    /api/comments?post_id=<seq>   게시글 댓글 목록
POST   /api/comments                 댓글 작성 { post_id, author_id, body, parent_id? }
DELETE /api/comments                 댓글 삭제 { id, author_id }
POST   /api/comments/like            댓글 좋아요 토글 { comment_id, user_id }
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
    h.send_header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
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
            post_id = params.get("post_id", [None])[0]
            if not post_id: return _json(self, 400, {"error": "post_id 필수"})
            rows = db.query(
                "SELECT c.seq_no,c.post_seq_no,c.parent_seq_no,c.body,c.like_count,"
                "c.status,c.created_at,u.nickname author_nickname,u.seq_no author_seq_no "
                "FROM tb_comment c "
                "LEFT JOIN tb_user u ON u.seq_no=c.author_seq_no "
                "WHERE c.post_seq_no=%s AND c.status='active' "
                "ORDER BY c.created_at ASC", (post_id,))
            _json(self, 200, {"comments": rows, "count": len(rows)})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def do_POST(self):
        try:
            path = urlparse(self.path).path
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))

            # 댓글 좋아요 토글
            if path.endswith("/like"):
                cid = body.get("comment_id"); uid = body.get("user_id")
                if not cid or not uid: return _json(self, 400, {"error": "comment_id, user_id 필수"})
                exist = db.query_one("SELECT seq_no FROM tb_comment_like WHERE comment_seq_no=%s AND user_seq_no=%s", (cid, uid))
                if exist:
                    db.execute("DELETE FROM tb_comment_like WHERE comment_seq_no=%s AND user_seq_no=%s", (cid, uid))
                    db.execute("UPDATE tb_comment SET like_count=GREATEST(0,like_count-1) WHERE seq_no=%s", (cid,))
                    return _json(self, 200, {"liked": False})
                db.execute("INSERT INTO tb_comment_like (comment_seq_no,user_seq_no) VALUES(%s,%s)", (cid, uid))
                db.execute("UPDATE tb_comment SET like_count=like_count+1 WHERE seq_no=%s", (cid,))
                return _json(self, 200, {"liked": True})

            # 댓글 작성
            post_id   = body.get("post_id")
            author_id = body.get("author_id")
            content   = (body.get("body","")).strip()
            if not post_id or not author_id or not content:
                return _json(self, 400, {"error": "post_id, author_id, body 필수"})
            seq = db.execute(
                "INSERT INTO tb_comment (post_seq_no,author_seq_no,parent_seq_no,body) VALUES(%s,%s,%s,%s)",
                (post_id, author_id, body.get("parent_id"), content))
            # 게시글 댓글수 캐시 업데이트
            db.execute("UPDATE tb_post SET comment_count=comment_count+1 WHERE seq_no=%s", (post_id,))
            _json(self, 201, {"seq_no": seq})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def do_DELETE(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            cid = body.get("id"); uid = body.get("author_id")
            if not cid: return _json(self, 400, {"error": "id 필수"})
            # 본인 또는 관리자만 삭제
            row = db.query_one("SELECT post_seq_no FROM tb_comment WHERE seq_no=%s AND status='active'", (cid,))
            if not row: return _json(self, 404, {"error": "not found"})
            db.execute("UPDATE tb_comment SET status='deleted',deleted_at=NOW() WHERE seq_no=%s", (cid,))
            db.execute("UPDATE tb_post SET comment_count=GREATEST(0,comment_count-1) WHERE seq_no=%s", (row["post_seq_no"],))
            _json(self, 200, {"ok": True})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def log_message(self, *a): pass
