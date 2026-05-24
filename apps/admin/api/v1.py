"""
/api/v1 — MariaDB CRUD 통합 라우터
Path: /api/v1?resource=<resource>&action=<action>
또는 /api/v1/<resource> 형식

resource: auth | users | posts | comments | likes | bookmarks
          reactions | follows | categories | topics | sources
"""
import json, os, sys, hashlib, datetime, secrets
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, os.path.dirname(__file__))
import db

# ── 유틸 ─────────────────────────────────────────────────
def _hash(pw): return hashlib.sha256(pw.encode()).hexdigest()
def _serial(obj):
    if isinstance(obj, (datetime.date, datetime.datetime)): return obj.isoformat()
    raise TypeError

# ── 라우터 ────────────────────────────────────────────────
def route(resource, method, params, body):
    r = ROUTES.get(resource)
    if not r: return 404, {"error": f"unknown resource: {resource}"}
    fn = r.get(method)
    if not fn: return 405, {"error": f"method {method} not allowed"}
    return fn(params, body)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AUTH
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def auth_post(p, b):
    email = b.get("email","").strip(); pw = b.get("password","")
    kind  = b.get("type","user")
    if kind == "admin":
        row = db.query_one(
            "SELECT seq_no,email,name,role,status FROM tb_admin WHERE email=%s AND password_hash=%s",
            (email, _hash(pw)))
        if not row: return 401, {"error": "이메일 또는 비밀번호가 올바르지 않습니다."}
        if row["status"] != "active": return 403, {"error": "비활성 계정"}
        db.execute("UPDATE tb_admin SET last_login_at=NOW() WHERE seq_no=%s", (row["seq_no"],))
        return 200, {**row, "token": secrets.token_hex(32)}
    row = db.query_one(
        "SELECT seq_no,email,nickname,bio,avatar_url,role,status FROM tb_user WHERE email=%s AND password_hash=%s",
        (email, _hash(pw)))
    if not row: return 401, {"error": "이메일 또는 비밀번호가 올바르지 않습니다."}
    if row["status"] != "active": return 403, {"error": "정지된 계정"}
    db.execute("UPDATE tb_user SET last_login_at=NOW() WHERE seq_no=%s", (row["seq_no"],))

    # ── 개인화 데이터 동기화 (로그인 시 한 번에 로드) ──
    uid = row["seq_no"]
    row["bookmarks"] = [
        {"target_type": b["target_type"], "target_seq_no": b["target_seq_no"],
         "target_key":  b["target_key"],  "target_title":  b["target_title"]}
        for b in db.query(
            "SELECT target_type,target_seq_no,target_key,target_title "
            "FROM tb_user_bookmark WHERE user_seq_no=%s ORDER BY created_at DESC LIMIT 500", (uid,))
    ]
    row["following"] = [r["followee_seq_no"] for r in db.query(
        "SELECT followee_seq_no FROM tb_user_follow WHERE follower_seq_no=%s", (uid,))]
    row["followers"] = [r["follower_seq_no"] for r in db.query(
        "SELECT follower_seq_no FROM tb_user_follow WHERE followee_seq_no=%s", (uid,))]
    row["preferences"] = {r["pref_key"]: r["pref_value"] for r in db.query(
        "SELECT pref_key,pref_value FROM tb_user_preference WHERE user_seq_no=%s", (uid,))}

    row["token"] = secrets.token_hex(32)
    return 200, row

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# USERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def users_get(p, b):
    uid = p.get("id", [None])[0]
    if uid:
        row = db.query_one("SELECT seq_no,email,nickname,bio,avatar_url,role,status,created_at,last_login_at FROM tb_user WHERE seq_no=%s", (uid,))
        if not row: return 404, {"error": "not found"}
        return 200, row
    rows = db.query("SELECT seq_no,email,nickname,role,status,created_at FROM tb_user ORDER BY seq_no DESC LIMIT 500")
    return 200, {"users": rows, "count": len(rows)}

def users_post(p, b):
    email = b.get("email","").strip(); pw = b.get("password",""); nick = b.get("nickname","").strip()
    if not email or not pw or not nick: return 400, {"error": "email, password, nickname 필수"}
    if len(pw) < 6: return 400, {"error": "비밀번호는 6자 이상"}
    if db.query_one("SELECT seq_no FROM tb_user WHERE email=%s", (email,)): return 409, {"error": "이미 사용 중인 이메일"}
    seq = db.execute("INSERT INTO tb_user (email,password_hash,nickname,bio,role,status) VALUES(%s,%s,%s,%s,'user','active')",
                     (email, _hash(pw), nick, b.get("bio","")))
    return 201, {"seq_no": seq, "email": email, "nickname": nick}

def users_patch(p, b):
    uid = b.get("id")
    if not uid: return 400, {"error": "id 필수"}
    sets, args = [], []
    for col in ("nickname","bio","avatar_url","status"):
        if col in b: sets.append(f"{col}=%s"); args.append(b[col])
    if "password" in b: sets.append("password_hash=%s"); args.append(_hash(b["password"]))
    if sets: db.execute(f"UPDATE tb_user SET {','.join(sets)} WHERE seq_no=%s", args + [uid])
    return 200, {"ok": True}

def users_delete(p, b):
    uid = b.get("id")
    if not uid: return 400, {"error": "id 필수"}
    db.execute("UPDATE tb_user SET status='deleted' WHERE seq_no=%s", (uid,))
    return 200, {"ok": True}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# POSTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def _post_tags(pid):
    return []  # tb_post_tag 제거됨

def posts_get(p, b):
    if "id" in p:
        row = db.query_one(
            "SELECT p.*,u.nickname author_nickname,c.label category_name,c.category_id "
            "FROM tb_post p LEFT JOIN tb_user u ON u.seq_no=p.author_seq_no "
            "LEFT JOIN tb_category c ON c.seq_no=p.category_seq_no "
            "WHERE p.seq_no=%s AND p.deleted_at IS NULL", (p["id"][0],))
        if not row: return 404, {"error": "not found"}
        db.execute("UPDATE tb_post SET view_count=view_count+1 WHERE seq_no=%s", (p["id"][0],))
        row["view_count"] = (row["view_count"] or 0) + 1
        row["tags"] = _post_tags(row["seq_no"])
        return 200, row
    where, args = ["p.deleted_at IS NULL"], []
    if "status" in p: where.append("p.status=%s"); args.append(p["status"][0])
    else:             where.append("p.status='published'")
    if "author" in p: where.append("p.author_seq_no=%s"); args.append(p["author"][0])
    page = max(1, int(p.get("page",["1"])[0])); limit = min(50, int(p.get("limit",["20"])[0]))
    rows = db.query(
        "SELECT p.seq_no,p.title,p.post_type,p.status,p.view_count,p.like_count,p.comment_count,"
        "p.created_at,u.nickname author_nickname,c.label category_name "
        "FROM tb_post p LEFT JOIN tb_user u ON u.seq_no=p.author_seq_no "
        "LEFT JOIN tb_category c ON c.seq_no=p.category_seq_no "
        f"WHERE {' AND '.join(where)} ORDER BY p.created_at DESC LIMIT %s OFFSET %s",
        args + [limit, (page-1)*limit])
    for row in rows:
        row["tags"] = _post_tags(row["seq_no"])
    total = db.query_one(f"SELECT COUNT(*) c FROM tb_post p WHERE {' AND '.join(where)}", args)["c"]
    return 200, {"posts": rows, "total": total, "page": page, "limit": limit}

def posts_post(p, b):
    author = b.get("author_id"); title = (b.get("title","")).strip()
    if not author or not title: return 400, {"error": "author_id, title 필수"}
    cat_seq = None
    if b.get("category_id"):
        cat = db.query_one("SELECT seq_no FROM tb_category WHERE category_id=%s", (b["category_id"],))
        if cat: cat_seq = cat["seq_no"]
    seq = db.execute("INSERT INTO tb_post (author_seq_no,category_seq_no,title,body,post_type,status) VALUES(%s,%s,%s,%s,%s,'published')",
                     (author, cat_seq, title, b.get("body",""), b.get("post_type","user")))
    return 201, {"seq_no": seq}

def posts_patch(p, b):
    _log_target = b.get("id")
    pid = b.get("id")
    if not pid: return 400, {"error": "id 필수"}
    sets, args = [], []
    for col in ("title","body","status"):
        if col in b: sets.append(f"{col}=%s"); args.append(b[col])
    if b.get("status") == "deleted": sets.append("deleted_at=NOW()")
    if sets: db.execute(f"UPDATE tb_post SET {','.join(sets)} WHERE seq_no=%s", args + [pid])
    return 200, {"ok": True}

def posts_delete(p, b):
    pid = b.get("id")
    if not pid: return 400, {"error": "id 필수"}
    _log_admin("post_delete", "post", pid)
    db.execute("UPDATE tb_post SET status='deleted',deleted_at=NOW() WHERE seq_no=%s", (pid,))
    return 200, {"ok": True}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COMMENTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def comments_get(p, b):
    pid    = p.get("post_id", [None])[0]
    limit  = min(100, int(p.get("limit", ["50"])[0]))
    status = p.get("status", ["all"])[0]

    where = []
    args  = []
    if pid:
        where.append("c.post_seq_no=%s"); args.append(pid)
    if status != "all":
        where.append("c.status=%s"); args.append(status)
    where_sql = "WHERE " + " AND ".join(where) if where else ""
    args.append(limit)

    rows = db.query(
        "SELECT c.seq_no,c.post_seq_no,c.parent_seq_no,c.body,c.like_count,c.status,"
        "c.created_at,u.nickname author_nickname,u.seq_no author_seq_no,"
        "p.title post_title "
        "FROM tb_comment c "
        "LEFT JOIN tb_user u ON u.seq_no=c.author_seq_no "
        "LEFT JOIN tb_post p ON p.seq_no=c.post_seq_no "
        f"{where_sql} "
        "ORDER BY c.created_at DESC LIMIT %s",
        tuple(args)
    )
    return 200, {"comments": rows, "count": len(rows)}

def comments_post(p, b):
    pid = b.get("post_id"); aid = b.get("author_id"); content = (b.get("body","")).strip()
    if not pid or not aid or not content: return 400, {"error": "post_id, author_id, body 필수"}
    seq = db.execute("INSERT INTO tb_comment (post_seq_no,author_seq_no,parent_seq_no,body) VALUES(%s,%s,%s,%s)",
                     (pid, aid, b.get("parent_id"), content))
    db.execute("UPDATE tb_post SET comment_count=comment_count+1 WHERE seq_no=%s", (pid,))
    return 201, {"seq_no": seq}

def comments_delete(p, b):
    cid = b.get("id")
    if not cid: return 400, {"error": "id 필수"}
    row = db.query_one("SELECT post_seq_no FROM tb_comment WHERE seq_no=%s AND status='active'", (cid,))
    if not row: return 404, {"error": "not found"}
    db.execute("UPDATE tb_comment SET status='deleted',deleted_at=NOW() WHERE seq_no=%s", (cid,))
    _log_admin("comment_delete", "comment", cid)
    db.execute("UPDATE tb_post SET comment_count=GREATEST(0,comment_count-1) WHERE seq_no=%s", (row["post_seq_no"],))
    return 200, {"ok": True}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LIKES (게시글 좋아요)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BOOKMARKS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# REACTIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALID_REACTIONS = {"fire","lol","like","wow","sad","angry"}



# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FOLLOWS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CATEGORIES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def categories_get(p, b):
    cats = db.query("SELECT * FROM tb_category ORDER BY sort_order,seq_no")
    topics = db.query("SELECT * FROM tb_topic ORDER BY sort_order,seq_no")
    tmap = {}
    for t in topics: tmap.setdefault(t["category_seq_no"], []).append(t)
    for c in cats: c["topics"] = tmap.get(c["seq_no"], [])
    return 200, {"categories": cats}

def categories_post(p, b):
    cid = b.get("category_id","").strip(); label = b.get("label","").strip()
    if not cid or not label: return 400, {"error": "category_id, label 필수"}
    if db.query_one("SELECT seq_no FROM tb_category WHERE category_id=%s", (cid,)): return 409, {"error": "이미 존재하는 category_id"}
    seq = db.execute("INSERT INTO tb_category (category_id,label,icon,sort_order) VALUES(%s,%s,%s,%s)", (cid, label, b.get("icon",""), b.get("sort_order",0)))
    return 201, {"seq_no": seq}

def categories_patch(p, b):
    cid = b.get("id")
    if not cid: return 400, {"error": "id 필수"}
    sets, args = [], []
    for col in ("label","icon","sort_order","active_yn"):
        if col in b: sets.append(f"{col}=%s"); args.append(b[col])
    if sets: db.execute(f"UPDATE tb_category SET {','.join(sets)} WHERE seq_no=%s", args + [cid])
    return 200, {"ok": True}

def categories_delete(p, b):
    cid = b.get("id")
    if not cid: return 400, {"error": "id 필수"}
    db.execute("DELETE FROM tb_category WHERE seq_no=%s", (cid,))
    return 200, {"ok": True}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TOPICS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def topics_get(p, b):
    where, args = [], []
    if "category_id" in p: where.append("t.category_seq_no=%s"); args.append(p["category_id"][0])
    sql = "SELECT t.*,c.category_id,c.label cat_label FROM tb_topic t JOIN tb_category c ON c.seq_no=t.category_seq_no"
    if where: sql += f" WHERE {' AND '.join(where)}"
    return 200, {"topics": db.query(sql + " ORDER BY t.sort_order,t.seq_no", args)}

def topics_post(p, b):
    key = b.get("topic_key","").strip()
    label = b.get("label","").strip()
    # category_seq_no(숫자) 또는 category_id(문자) 모두 허용
    cat = b.get("category_seq_no") or b.get("category_id")
    if not key or not cat or not label: return 400, {"error": "topic_key, category, label 필수"}
    # 문자열 category_id로 들어왔으면 seq_no로 변환
    if isinstance(cat, str) and not cat.isdigit():
        row = db.query_one("SELECT seq_no FROM tb_category WHERE category_id=%s", (cat,))
        if not row: return 400, {"error": f"카테고리 '{cat}' 없음"}
        cat = row["seq_no"]
    if db.query_one("SELECT seq_no FROM tb_topic WHERE topic_key=%s", (key,)): return 409, {"error": "이미 존재하는 topic_key"}
    seq = db.execute("INSERT INTO tb_topic (topic_key,category_seq_no,label,sort_order,active_yn) VALUES(%s,%s,%s,%s,%s)",
                     (key, cat, label, b.get("sort_order",0), "Y" if b.get("active",True) else "N"))
    return 201, {"seq_no": seq}

def topics_patch(p, b):
    tid = b.get("id")
    if not tid: return 400, {"error": "id 필수"}
    sets, args = [], []
    for col in ("label","active_yn","sort_order"):
        if col in b: sets.append(f"{col}=%s"); args.append(b[col])
    if sets: db.execute(f"UPDATE tb_topic SET {','.join(sets)} WHERE seq_no=%s", args + [tid])
    return 200, {"ok": True}

def topics_delete(p, b):
    tid = b.get("id")
    if not tid: return 400, {"error": "id 필수"}
    # 1) 연결된 crawl_item 먼저 삭제 (외래키 제약 해결)
    try:
        db.execute("DELETE FROM tb_crawl_item WHERE topic_seq_no=%s", (tid,))
    except Exception:
        pass
    # 2) topic 삭제
    db.execute("DELETE FROM tb_topic WHERE seq_no=%s", (tid,))
    return 200, {"ok": True}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SOURCES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def _attach_src_topics(sources):
    if not sources: return sources
    ids = [s["seq_no"] for s in sources]
    ph  = ",".join(["%s"]*len(ids))
    lmap = {}
    for l in links: lmap.setdefault(l["source_seq_no"], []).append(l["topic_key"])
    for s in sources: s["topic_keys"] = lmap.get(s["seq_no"], [])
    return sources

def _save_src_topics(source_seq, topic_keys):
    for key in topic_keys:
        t = db.query_one("SELECT seq_no FROM tb_topic WHERE topic_key=%s", (key,))





# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CRAWL_ITEMS — 크롤링 아이템 CRUD + 통계
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def crawl_items_get(p, b):
    topic_key  = p.get("topic_key",  [None])[0]
    count_only = p.get("count_only", [None])[0]
    limit = int(p.get("limit", ["20"])[0])
    offset = int(p.get("offset", ["0"])[0])

    where, args = ["blocked_yn='N'"], []
    if topic_key:
        where.append("t.topic_key=%s"); args.append(topic_key)

    base = ("FROM tb_crawl_item ci LEFT JOIN tb_topic t ON t.seq_no=ci.topic_seq_no "
            f"WHERE {' AND '.join(where)}")

    # 수집 수 + 마지막 수집일만 반환
    if count_only:
        row = db.query_one(f"SELECT COUNT(*) cnt, MAX(ci.crawled_at) last_crawled {base}", args)
        return 200, {"count": row["cnt"] or 0, "last_crawled": row["last_crawled"]}

    rows = db.query(
        f"SELECT ci.*,t.topic_key,t.label topic_label "
        f"{base} ORDER BY ci.crawled_at DESC LIMIT %s OFFSET %s",
        args + [limit, offset])

    # 태그 첨부
    for row in rows:
        row["tags"] = [r["tag_name"] for r in db.query(
            "SELECT tag_name FROM tb_crawl_item_tag WHERE item_seq_no=%s ORDER BY sort_order",
            (row["seq_no"],))]

    total = db.query_one(f"SELECT COUNT(*) c {base}", args)["c"]
    return 200, {"items": rows, "total": total}

def crawl_items_post(p, b):
    """크롤링 아이템 저장 (cron에서 호출)"""
    items = b.get("items", [])
    if not items: return 400, {"error": "items 필수"}
    inserted = 0
    for item in items:
        topic = db.query_one("SELECT seq_no FROM tb_topic WHERE topic_key=%s", (item.get("topicKey",""),))
        if not topic: continue
        source = None
        if item.get("source"):
            if src: source = src["seq_no"]
        # UPSERT
        exist = db.query_one("SELECT seq_no FROM tb_crawl_item WHERE item_id=%s", (item.get("id",""),))
        if exist:
            db.execute("UPDATE tb_crawl_item SET title=%s,summary=%s,source_url=%s,topic_label=%s,category_id=%s WHERE seq_no=%s",
                (item.get("title","")[:500], item.get("summary","")[:1000],
                 item.get("source","")[:2000], item.get("topicLabel","")[:100],
                 item.get("category","")[:50], exist["seq_no"]))
            seq = exist["seq_no"]
        else:
            seq = db.execute(
                "INSERT INTO tb_crawl_item (item_id,topic_seq_no,source_seq_no,title,summary,source_url,topic_label,category_id,hot_yn) "
                "VALUES(%s,%s,%s,%s,%s,%s,%s,%s,'N')",
                (item.get("id","")[:200], topic["seq_no"], source,
                 item.get("title","")[:500], item.get("summary","")[:1000],
                 item.get("source","")[:2000], item.get("topicLabel","")[:100],
                 item.get("category","")[:50]))
            inserted += 1
        # 태그
        if item.get("tags"):
            db.execute("DELETE FROM tb_crawl_item_tag WHERE item_seq_no=%s", (seq,))
            for i, tag in enumerate(item["tags"][:5]):
                db.execute("INSERT IGNORE INTO tb_crawl_item_tag (item_seq_no,tag_name,sort_order) VALUES(%s,%s,%s)",
                           (seq, str(tag)[:100], i))
    return 201, {"ok": True, "inserted": inserted, "total": len(items)}

def crawl_items_patch(p, b):
    iid = b.get("id")
    if not iid: return 400, {"error": "id 필수"}
    sets, args = [], []
    for col in ("blocked_yn","hot_yn","title","summary"):
        if col in b: sets.append(f"{col}=%s"); args.append(b[col])
    if sets: db.execute(f"UPDATE tb_crawl_item SET {','.join(sets)} WHERE seq_no=%s", args + [iid])
    return 200, {"ok": True}

def crawl_items_delete(p, b):
    iid = b.get("id")
    if not iid: return 400, {"error": "id 필수"}
    db.execute("UPDATE tb_crawl_item SET blocked_yn='Y' WHERE seq_no=%s", (iid,))
    return 200, {"ok": True}



# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ADMIN LOG (활동 감사)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _log_admin(action_type, target_type=None, target_seq_no=None, detail=None, admin_seq_no=None):
    """관리자 액션 자동 로깅. 실패해도 본 작업에 영향 없음"""
    try:
        db.execute(
            "INSERT INTO tb_admin_log (admin_seq_no, action_type, target_type, target_seq_no, detail) "
            "VALUES(%s,%s,%s,%s,%s)",
            (admin_seq_no, action_type, target_type, target_seq_no, (detail or "")[:500]))
    except Exception:
        pass

def admin_logs_get(p, b):
    limit       = min(200, int(p.get("limit", ["100"])[0]))
    action_type = p.get("action_type", ["all"])[0]

    where, args = [], []
    if action_type != "all":
        where.append("l.action_type=%s"); args.append(action_type)
    where_sql = "WHERE " + " AND ".join(where) if where else ""
    args.append(limit)

    rows = db.query(
        "SELECT l.seq_no, l.admin_seq_no, l.action_type, l.target_type, l.target_seq_no, "
        "l.detail, l.created_at, a.email admin_email "
        "FROM tb_admin_log l LEFT JOIN tb_admin a ON a.seq_no=l.admin_seq_no "
        f"{where_sql} ORDER BY l.created_at DESC LIMIT %s",
        tuple(args))
    return 200, {"logs": rows, "count": len(rows)}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# REPORTS (신고)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REPORT_REASONS = {
    "spam":    "스팸/광고",
    "abuse":   "욕설/괴롭힘",
    "nsfw":    "음란/혐오",
    "misinfo": "허위 정보",
    "etc":     "기타",
}

def reports_get(p, b):
    """관리자용 신고 목록 조회"""
    status      = p.get("status", ["pending"])[0]
    target_type = p.get("target_type", ["all"])[0]
    limit       = min(200, int(p.get("limit", ["100"])[0]))

    where, args = [], []
    if status != "all":
        where.append("r.status=%s"); args.append(status)
    if target_type != "all":
        where.append("r.target_type=%s"); args.append(target_type)
    where_sql = "WHERE " + " AND ".join(where) if where else ""
    args.append(limit)

    rows = db.query(
        "SELECT r.seq_no, r.target_type, r.target_seq_no, r.reporter_seq_no, "
        "r.reason_code, r.reason_text, r.status, r.resolved_at, r.resolved_action, "
        "r.created_at, u.nickname reporter_nickname "
        "FROM tb_report r LEFT JOIN tb_user u ON u.seq_no=r.reporter_seq_no "
        f"{where_sql} ORDER BY r.created_at DESC LIMIT %s",
        tuple(args)
    )

    # 신고 대상 미리보기 (제목/본문 일부)
    for r in rows:
        if r["target_type"] == "post":
            post = db.query_one("SELECT title, body, status FROM tb_post WHERE seq_no=%s", (r["target_seq_no"],))
            r["target_preview"] = post["title"] if post else "(삭제됨)"
            r["target_status"]  = post["status"] if post else "deleted"
        elif r["target_type"] == "comment":
            cm = db.query_one("SELECT body, status FROM tb_comment WHERE seq_no=%s", (r["target_seq_no"],))
            r["target_preview"] = (cm["body"] or "")[:80] if cm else "(삭제됨)"
            r["target_status"]  = cm["status"] if cm else "deleted"
        r["reason_label"] = REPORT_REASONS.get(r["reason_code"], r["reason_code"])

    # 통계
    stats = db.query("SELECT status, COUNT(*) c FROM tb_report GROUP BY status")
    stats_dict = {s["status"]: s["c"] for s in stats}

    return 200, {"reports": rows, "count": len(rows), "stats": stats_dict, "reasons": REPORT_REASONS}

def reports_post(p, b):
    """사용자 신고 등록"""
    target_type = b.get("target_type")     # 'post' | 'comment'
    target_id   = b.get("target_id")
    reporter_id = b.get("reporter_id")
    reason_code = b.get("reason_code", "etc")
    reason_text = (b.get("reason_text", "") or "")[:500]

    if target_type not in ("post", "comment"):
        return 400, {"error": "target_type은 post 또는 comment"}
    if not target_id:
        return 400, {"error": "target_id 필수"}
    if reason_code not in REPORT_REASONS:
        return 400, {"error": "유효하지 않은 reason_code"}

    # 동일 사용자가 동일 대상에 중복 신고 방지 (24시간 내)
    if reporter_id:
        existing = db.query_one(
            "SELECT seq_no FROM tb_report WHERE target_type=%s AND target_seq_no=%s "
            "AND reporter_seq_no=%s AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)",
            (target_type, target_id, reporter_id))
        if existing:
            return 409, {"error": "이미 신고하셨습니다"}

    seq = db.execute(
        "INSERT INTO tb_report (target_type, target_seq_no, reporter_seq_no, reason_code, reason_text) "
        "VALUES(%s,%s,%s,%s,%s)",
        (target_type, target_id, reporter_id, reason_code, reason_text))
    return 201, {"seq_no": seq, "ok": True}

def reports_patch(p, b):
    """관리자 — 신고 처리 (resolve/reject + 대상 액션)"""
    rid    = b.get("id")
    action = b.get("action")  # 'resolve' | 'reject' | 'hide_target' | 'delete_target'
    if not rid or not action:
        return 400, {"error": "id, action 필수"}

    rep = db.query_one("SELECT * FROM tb_report WHERE seq_no=%s", (rid,))
    if not rep: return 404, {"error": "신고 없음"}

    # 대상 처리 액션
    if action == "hide_target":
        if rep["target_type"] == "post":
            db.execute("UPDATE tb_post SET status='hidden' WHERE seq_no=%s", (rep["target_seq_no"],))
        elif rep["target_type"] == "comment":
            db.execute("UPDATE tb_comment SET status='deleted', deleted_at=NOW() WHERE seq_no=%s", (rep["target_seq_no"],))
        resolved_action = "hide"
        new_status = "resolved"
    elif action == "delete_target":
        if rep["target_type"] == "post":
            db.execute("UPDATE tb_post SET status='deleted', deleted_at=NOW() WHERE seq_no=%s", (rep["target_seq_no"],))
        elif rep["target_type"] == "comment":
            db.execute("UPDATE tb_comment SET status='deleted', deleted_at=NOW() WHERE seq_no=%s", (rep["target_seq_no"],))
        resolved_action = "delete"
        new_status = "resolved"
    elif action == "resolve":
        resolved_action = "none"
        new_status = "resolved"
    elif action == "reject":
        resolved_action = "none"
        new_status = "rejected"
    else:
        return 400, {"error": f"알 수 없는 action: {action}"}

    db.execute(
        "UPDATE tb_report SET status=%s, resolved_at=NOW(), resolved_action=%s WHERE seq_no=%s",
        (new_status, resolved_action, rid))
    _log_admin(f"report_{action}", rep["target_type"], rep["target_seq_no"],
               f"reason={rep['reason_code']}")

    # 같은 대상에 대한 다른 pending 신고도 함께 처리
    if new_status == "resolved":
        db.execute(
            "UPDATE tb_report SET status='resolved', resolved_at=NOW(), resolved_action=%s "
            "WHERE target_type=%s AND target_seq_no=%s AND status='pending' AND seq_no!=%s",
            (resolved_action, rep["target_type"], rep["target_seq_no"], rid))

    return 200, {"ok": True, "status": new_status}



# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BOOKMARKS (즐겨찾기)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def bookmarks_get(p, b):
    uid = p.get("user_id", [None])[0]
    if not uid: return 400, {"error": "user_id 필수"}
    rows = db.query(
        "SELECT seq_no,target_type,target_seq_no,target_key,target_title,created_at "
        "FROM tb_user_bookmark WHERE user_seq_no=%s ORDER BY created_at DESC LIMIT 500",
        (uid,))
    return 200, {"bookmarks": rows, "count": len(rows)}

def bookmarks_post(p, b):
    """즐겨찾기 토글: 있으면 삭제, 없으면 추가"""
    uid    = b.get("user_id")
    ttype  = b.get("target_type", "post")  # 'post' or 'crawl_item'
    tseq   = b.get("target_seq_no")        # post일 때
    tkey   = b.get("target_key")           # crawl_item일 때
    title  = (b.get("target_title", "") or "")[:500]
    if not uid: return 400, {"error": "user_id 필수"}
    if ttype not in ("post", "crawl_item"): return 400, {"error": "target_type은 post|crawl_item"}
    if not tseq and not tkey: return 400, {"error": "target_seq_no 또는 target_key 필수"}

    # 기존 항목 조회 (post는 seq, crawl_item은 key 기준)
    if tseq:
        existing = db.query_one(
            "SELECT seq_no FROM tb_user_bookmark "
            "WHERE user_seq_no=%s AND target_type=%s AND target_seq_no=%s",
            (uid, ttype, tseq))
    else:
        existing = db.query_one(
            "SELECT seq_no FROM tb_user_bookmark "
            "WHERE user_seq_no=%s AND target_type=%s AND target_key=%s",
            (uid, ttype, tkey))

    if existing:
        db.execute("DELETE FROM tb_user_bookmark WHERE seq_no=%s", (existing["seq_no"],))
        return 200, {"bookmarked": False}
    else:
        db.execute(
            "INSERT INTO tb_user_bookmark (user_seq_no,target_type,target_seq_no,target_key,target_title) "
            "VALUES(%s,%s,%s,%s,%s)",
            (uid, ttype, tseq, tkey, title))
        return 201, {"bookmarked": True}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FOLLOWS (팔로우)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def follows_get(p, b):
    uid  = p.get("user_id", [None])[0]
    typ  = p.get("type", ["following"])[0]
    if not uid: return 400, {"error": "user_id 필수"}
    if typ == "following":
        rows = db.query(
            "SELECT u.seq_no,u.nickname,u.bio,u.avatar_url,f.created_at "
            "FROM tb_user_follow f JOIN tb_user u ON u.seq_no=f.followee_seq_no "
            "WHERE f.follower_seq_no=%s ORDER BY f.created_at DESC", (uid,))
    else:
        rows = db.query(
            "SELECT u.seq_no,u.nickname,u.bio,u.avatar_url,f.created_at "
            "FROM tb_user_follow f JOIN tb_user u ON u.seq_no=f.follower_seq_no "
            "WHERE f.followee_seq_no=%s ORDER BY f.created_at DESC", (uid,))
    return 200, {"users": rows, "count": len(rows)}

def follows_post(p, b):
    """팔로우 토글"""
    follower = b.get("follower_id")
    followee = b.get("followee_id")
    if not follower or not followee: return 400, {"error": "follower_id, followee_id 필수"}
    if str(follower) == str(followee): return 400, {"error": "자기 자신 팔로우 불가"}

    existing = db.query_one(
        "SELECT seq_no FROM tb_user_follow WHERE follower_seq_no=%s AND followee_seq_no=%s",
        (follower, followee))
    if existing:
        db.execute("DELETE FROM tb_user_follow WHERE seq_no=%s", (existing["seq_no"],))
        return 200, {"following": False}
    else:
        db.execute(
            "INSERT INTO tb_user_follow (follower_seq_no,followee_seq_no) VALUES(%s,%s)",
            (follower, followee))
        return 201, {"following": True}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PREFERENCES (개인화 설정)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def preferences_get(p, b):
    uid = p.get("user_id", [None])[0]
    if not uid: return 400, {"error": "user_id 필수"}
    rows = db.query(
        "SELECT pref_key,pref_value FROM tb_user_preference WHERE user_seq_no=%s", (uid,))
    return 200, {"preferences": {r["pref_key"]: r["pref_value"] for r in rows}}

def preferences_post(p, b):
    """단일 또는 다중 설정 일괄 저장 (upsert)"""
    uid   = b.get("user_id")
    prefs = b.get("preferences", {})  # { key: value, ... }
    if not uid: return 400, {"error": "user_id 필수"}
    if not isinstance(prefs, dict) or not prefs:
        return 400, {"error": "preferences는 비어있지 않은 dict"}

    for k, v in prefs.items():
        k = str(k)[:50]
        v = str(v)[:500]
        db.execute(
            "INSERT INTO tb_user_preference (user_seq_no,pref_key,pref_value) VALUES(%s,%s,%s) "
            "ON DUPLICATE KEY UPDATE pref_value=VALUES(pref_value)",
            (uid, k, v))
    return 200, {"saved": len(prefs)}



# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# OAUTH (카카오 / 구글 간편 로그인 — 관리자 전용)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import os, json as _json_mod
from urllib.parse import urlencode
from urllib.request import urlopen, Request as _Req

KAKAO_REST_KEY     = os.environ.get("KAKAO_REST_KEY", "")
KAKAO_REDIRECT_URI = os.environ.get("KAKAO_REDIRECT_URI", "")  # https://admin-vert-psi.vercel.app/oauth/kakao
GOOGLE_CLIENT_ID     = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI  = os.environ.get("GOOGLE_REDIRECT_URI", "")  # https://admin-vert-psi.vercel.app/oauth/google

def _fetch_json(url, data=None, headers=None):
    """헬퍼: JSON GET/POST"""
    h = headers or {}
    if data and isinstance(data, dict):
        data = urlencode(data).encode()
        h.setdefault("Content-Type", "application/x-www-form-urlencoded")
    req = _Req(url, data=data, headers=h)
    with urlopen(req, timeout=10) as r:
        return _json_mod.loads(r.read().decode())

def _admin_login_or_register(email, name, provider, provider_id, avatar=None):
    """OAuth 로그인 또는 자동 등록 (화이트리스트 기반)"""
    # 1) provider_id로 기존 사용자 매칭
    row = db.query_one(
        "SELECT seq_no,email,name,role,status,auth_provider FROM tb_admin "
        "WHERE auth_provider=%s AND provider_id=%s",
        (provider, provider_id))

    # 2) 없으면 이메일로 매칭 (local → oauth 연동)
    if not row and email:
        row = db.query_one(
            "SELECT seq_no,email,name,role,status,auth_provider FROM tb_admin WHERE email=%s",
            (email,))
        if row:
            # 기존 계정에 OAuth 연동
            db.execute(
                "UPDATE tb_admin SET auth_provider=%s, provider_id=%s, avatar_url=%s WHERE seq_no=%s",
                (provider, provider_id, avatar, row["seq_no"]))

    # 3) 그래도 없으면 화이트리스트 확인 후 자동 생성
    if not row:
        if not email:
            return 400, {"error": "이메일을 가져올 수 없습니다 (provider 동의 항목 확인 필요)"}
        allow = db.query_one(
            "SELECT role FROM tb_admin_allowlist WHERE email=%s", (email,))
        if not allow:
            return 403, {"error": f"등록되지 않은 이메일입니다: {email}\n관리자 화이트리스트에 추가 후 다시 시도하세요."}
        seq = db.execute(
            "INSERT INTO tb_admin (email,password_hash,name,role,status,auth_provider,provider_id,avatar_url) "
            "VALUES(%s, NULL, %s, %s, 'active', %s, %s, %s)",
            (email, name or email.split("@")[0], allow["role"], provider, provider_id, avatar))
        row = {
            "seq_no": seq, "email": email, "name": name or email.split("@")[0],
            "role": allow["role"], "status": "active", "auth_provider": provider
        }

    # 4) 정지 계정 차단
    if row["status"] != "active":
        return 403, {"error": "비활성 계정"}

    # 5) 마지막 로그인 시각 갱신
    db.execute("UPDATE tb_admin SET last_login_at=NOW() WHERE seq_no=%s", (row["seq_no"],))
    _log_admin("admin_oauth_login", "admin", row["seq_no"], f"provider={provider}", admin_seq_no=row["seq_no"])

    return 200, {**row, "token": secrets.token_hex(32)}

def oauth_post(p, b):
    """OAuth code → access_token → user info → 관리자 로그인"""
    provider = b.get("provider")  # 'kakao' or 'google'
    code     = b.get("code")
    redirect = b.get("redirect_uri", "")

    if provider not in ("kakao", "google"):
        return 400, {"error": "provider는 kakao 또는 google"}
    if not code:
        return 400, {"error": "code 필수"}

    try:
        if provider == "kakao":
            if not KAKAO_REST_KEY:
                return 500, {"error": "KAKAO_REST_KEY 환경변수 미설정"}
            # 1) code → access_token
            tok = _fetch_json("https://kauth.kakao.com/oauth/token", {
                "grant_type":   "authorization_code",
                "client_id":    KAKAO_REST_KEY,
                "redirect_uri": redirect or KAKAO_REDIRECT_URI,
                "code":         code,
            })
            access_token = tok.get("access_token")
            if not access_token: return 400, {"error": f"kakao token error: {tok}"}
            # 2) access_token → user info
            user = _fetch_json("https://kapi.kakao.com/v2/user/me",
                headers={"Authorization": f"Bearer {access_token}"})
            kakao_id = str(user.get("id", ""))
            account  = user.get("kakao_account", {}) or {}
            profile  = account.get("profile", {}) or {}
            email    = account.get("email", "")
            name     = profile.get("nickname", "")
            avatar   = profile.get("profile_image_url", "")
            return _admin_login_or_register(email, name, "kakao", kakao_id, avatar)

        else:  # google
            if not GOOGLE_CLIENT_ID:
                return 500, {"error": "GOOGLE_CLIENT_ID 환경변수 미설정"}
            # 1) code → access_token
            tok = _fetch_json("https://oauth2.googleapis.com/token", {
                "grant_type":    "authorization_code",
                "client_id":     GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri":  redirect or GOOGLE_REDIRECT_URI,
                "code":          code,
            })
            access_token = tok.get("access_token")
            if not access_token: return 400, {"error": f"google token error: {tok}"}
            # 2) access_token → userinfo
            user = _fetch_json("https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"})
            google_id = str(user.get("sub", ""))
            email     = user.get("email", "")
            name      = user.get("name", "")
            avatar    = user.get("picture", "")
            return _admin_login_or_register(email, name, "google", google_id, avatar)

    except Exception as e:
        return 500, {"error": f"OAuth 처리 실패: {str(e)[:200]}"}

def oauth_config_get(p, b):
    """프론트가 OAuth 활성화 여부를 확인하기 위한 공개 정보 (시크릿은 제외)"""
    return 200, {
        "kakao":  {"enabled": bool(KAKAO_REST_KEY), "client_id": KAKAO_REST_KEY,
                   "redirect_uri": KAKAO_REDIRECT_URI},
        "google": {"enabled": bool(GOOGLE_CLIENT_ID), "client_id": GOOGLE_CLIENT_ID,
                   "redirect_uri": GOOGLE_REDIRECT_URI},
    }


# ── 라우팅 테이블 ──────────────────────────────────────────
ROUTES = {
    "auth":       {"POST": auth_post},
    "users":      {"GET": users_get, "POST": users_post, "PATCH": users_patch, "DELETE": users_delete},
    "posts":      {"GET": posts_get, "POST": posts_post, "PATCH": posts_patch, "DELETE": posts_delete},
    "comments":   {"GET": comments_get, "POST": comments_post, "DELETE": comments_delete},
    "categories": {"GET": categories_get, "POST": categories_post, "PATCH": categories_patch, "DELETE": categories_delete},
    "topics":     {"GET": topics_get, "POST": topics_post, "PATCH": topics_patch, "DELETE": topics_delete},
    "crawl_items":{"GET": crawl_items_get, "POST": crawl_items_post, "PATCH": crawl_items_patch, "DELETE": crawl_items_delete},
    "reports":    {"GET": reports_get, "POST": reports_post, "PATCH": reports_patch},
    "admin_logs":  {"GET": admin_logs_get},
    "bookmarks":   {"GET": bookmarks_get,   "POST": bookmarks_post},
    "follows":     {"GET": follows_get,     "POST": follows_post},
    "preferences":   {"GET": preferences_get, "POST": preferences_post},
    "oauth":         {"POST": oauth_post},
    "oauth_config":  {"GET": oauth_config_get},
}

# ── Vercel Handler ─────────────────────────────────────────
class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _handle(self, method):
        try:
            parsed  = urlparse(self.path)
            params  = parse_qs(parsed.query)
            # /api/v1?resource=posts 또는 ?resource= 에서 추출
            resource = params.get("resource", [None])[0]
            if not resource:
                # path 마지막 세그먼트에서 추출: /api/v1/posts
                parts = [p for p in parsed.path.split("/") if p]
                resource = parts[-1] if parts else None
            if not resource:
                return self._json(400, {"error": "resource parameter required"})
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length > 0 else {}
            status, data = route(resource, method, params, body)
            self._json(status, data)
        except Exception as e:
            import traceback
            err_msg = str(e)
            # DB 연결 실패(2003) → resource별 빈 기본값으로 200 반환 (서비스 무중단)
            if "2003" in err_msg or "Can't connect" in err_msg or "timed out" in err_msg or "Connection" in err_msg:
                    # 캐시된 연결 무효화
                    global _conn_cache; _conn_cache = None
                # config.py DEFAULT_CONFIG에서 기본값 로드
                    try:
                        from config import DEFAULT_CONFIG as _DC
                    except Exception:
                        _DC = {}
                    EMPTY = {
                        "auth":       {"error": "DB unavailable"},
                        "users":      {"users": [], "count": 0},
                        "posts":      {"posts": [], "total": 0, "page": 1, "limit": 20},
                        "comments":   {"comments": [], "count": 0},
                        "reports":    {"reports": [], "count": 0, "stats": {}, "reasons": {}},
                        "admin_logs":  {"logs": [], "count": 0},
                        "bookmarks":   {"bookmarks": [], "count": 0},
                        "follows":     {"users": [], "count": 0},
                        "preferences": {"preferences": {}},
                        "oauth": {"error": "DB unavailable"},
                        "oauth_config": {"kakao": {"enabled": False}, "google": {"enabled": False}},
                                                                "reactions":  {"counts": {}, "user_reaction": None},
                                            # DB 없어도 config 기본값으로 19개/63개 반환
                        "categories": {"categories": _DC.get("categories", [])},
                        "topics":     {"topics":     [
                            {**t, "seq_no": i+1, "category_seq_no": None}
                            for i, t in enumerate(_DC.get("topics", []))
                        ]},
                                            "crawl_items":{"items": [], "total": 0, "count": 0},
                    }
                    fallback = EMPTY.get(resource, {"error": "DB unavailable", "db_down": True})
                    status = 401 if resource == "auth" else 200
                    return self._json(status, {**fallback, "db_down": True})
            self._json(500, {"error": err_msg, "trace": traceback.format_exc()[-300:]})

    def do_GET(self):    self._handle("GET")
    def do_POST(self):   self._handle("POST")
    def do_PATCH(self):  self._handle("PATCH")
    def do_DELETE(self): self._handle("DELETE")

    def _json(self, status, data):
        body = json.dumps(data, default=_serial, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers(); self.wfile.write(body)

    def log_message(self, *a): pass
