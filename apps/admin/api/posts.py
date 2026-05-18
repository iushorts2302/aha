"""
/api/posts — 게시글 CRUD
GET    /api/posts?id=<seq>                단일 게시글
GET    /api/posts?author=<uid>            작성자별
GET    /api/posts?category=<cat_id>       카테고리별
GET    /api/posts?page=1&limit=20         페이지 목록
POST   /api/posts                         게시글 작성
PATCH  /api/posts                         게시글 수정/상태변경
DELETE /api/posts                         게시글 삭제(소프트)
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

def _attach(post):
    """post dict에 tags, like_count 첨부"""
    if not post: return post
    pid = post["seq_no"]
    post["tags"] = [r["tag_name"] for r in db.query(
        "SELECT tag_name FROM tb_post_tag WHERE post_seq_no=%s ORDER BY sort_order", (pid,))]
    post["like_count"] = db.query_one(
        "SELECT COUNT(*) c FROM tb_post_like WHERE post_seq_no=%s", (pid,))["c"]
    post["comment_count"] = db.query_one(
        "SELECT COUNT(*) c FROM tb_comment WHERE post_seq_no=%s AND status='active'", (pid,))["c"]
    return post

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200); _cors(self); self.end_headers()

    def do_GET(self):
        try:
            params = parse_qs(urlparse(self.path).query)
            # 단일 조회
            if "id" in params:
                row = db.query_one(
                    "SELECT p.*,u.nickname author_nickname,c.label category_name "
                    "FROM tb_post p "
                    "LEFT JOIN tb_user u ON u.seq_no=p.author_seq_no "
                    "LEFT JOIN tb_category c ON c.seq_no=p.category_seq_no "
                    "WHERE p.seq_no=%s AND p.deleted_at IS NULL", (params["id"][0],))
                if not row: return _json(self, 404, {"error": "not found"})
                # 조회수 증가
                db.execute("UPDATE tb_post SET view_count=view_count+1 WHERE seq_no=%s", (params["id"][0],))
                row["view_count"] = (row["view_count"] or 0) + 1
                return _json(self, 200, _attach(row))

            # 목록
            where, args = ["p.deleted_at IS NULL", "p.status='published'"], []
            if "author" in params:
                where.append("p.author_seq_no=%s"); args.append(params["author"][0])
            if "category" in params:
                where.append("c.category_id=%s"); args.append(params["category"][0])
            if "status" in params:  # 관리자: 상태 필터
                where[-1] = f"p.status=%s"; args.append(params["status"][0])

            page  = max(1, int(params.get("page",  ["1"])[0]))
            limit = min(50, int(params.get("limit", ["20"])[0]))
            offset = (page - 1) * limit
            sql = ("SELECT p.seq_no,p.title,p.post_type,p.status,p.view_count,p.like_count,"
                   "p.comment_count,p.created_at,u.nickname author_nickname,c.label category_name "
                   "FROM tb_post p "
                   "LEFT JOIN tb_user u ON u.seq_no=p.author_seq_no "
                   "LEFT JOIN tb_category c ON c.seq_no=p.category_seq_no "
                   f"WHERE {' AND '.join(where)} "
                   "ORDER BY p.created_at DESC LIMIT %s OFFSET %s")
            rows = db.query(sql, args + [limit, offset])
            total = db.query_one(
                f"SELECT COUNT(*) c FROM tb_post p "
                f"LEFT JOIN tb_category c ON c.seq_no=p.category_seq_no "
                f"WHERE {' AND '.join(where)}", args)["c"]

            # 태그 일괄 첨부
            for row in rows:
                row["tags"] = [r["tag_name"] for r in db.query(
                    "SELECT tag_name FROM tb_post_tag WHERE post_seq_no=%s ORDER BY sort_order",
                    (row["seq_no"],))]
            _json(self, 200, {"posts": rows, "total": total, "page": page, "limit": limit})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            author = body.get("author_id")
            title  = (body.get("title","")).strip()
            if not author or not title:
                return _json(self, 400, {"error": "author_id, title 필수"})
            # 카테고리 seq 조회
            cat_seq = None
            if body.get("category_id"):
                cat = db.query_one("SELECT seq_no FROM tb_category WHERE category_id=%s", (body["category_id"],))
                if cat: cat_seq = cat["seq_no"]
            seq = db.execute(
                "INSERT INTO tb_post (author_seq_no,category_seq_no,title,body,post_type,status) "
                "VALUES(%s,%s,%s,%s,%s,'published')",
                (author, cat_seq, title, body.get("body",""), body.get("post_type","user")))
            # 태그
            for i, tag in enumerate(body.get("tags", [])):
                db.execute("INSERT IGNORE INTO tb_post_tag (post_seq_no,tag_name,sort_order) VALUES(%s,%s,%s)",
                           (seq, tag.strip(), i))
            _json(self, 201, {"seq_no": seq})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def do_PATCH(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            pid = body.get("id")
            if not pid: return _json(self, 400, {"error": "id 필수"})
            sets, args = [], []
            for col in ("title","body","status"):
                if col in body: sets.append(f"{col}=%s"); args.append(body[col])
            if body.get("status") == "deleted":
                sets.append("deleted_at=NOW()")
            if sets:
                args.append(pid)
                db.execute(f"UPDATE tb_post SET {','.join(sets)} WHERE seq_no=%s", args)
            if "tags" in body:
                db.execute("DELETE FROM tb_post_tag WHERE post_seq_no=%s", (pid,))
                for i, tag in enumerate(body["tags"]):
                    db.execute("INSERT IGNORE INTO tb_post_tag (post_seq_no,tag_name,sort_order) VALUES(%s,%s,%s)",
                               (pid, tag.strip(), i))
            _json(self, 200, {"ok": True})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def do_DELETE(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            pid = body.get("id")
            if not pid: return _json(self, 400, {"error": "id 필수"})
            db.execute("UPDATE tb_post SET status='deleted',deleted_at=NOW() WHERE seq_no=%s", (pid,))
            _json(self, 200, {"ok": True})
        except Exception as e:
            _json(self, 500, {"error": str(e)})

    def log_message(self, *a): pass
