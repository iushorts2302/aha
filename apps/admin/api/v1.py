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
    row["expertise"] = [r["expertise_name"] for r in db.query(
        "SELECT expertise_name FROM tb_user_expertise WHERE user_seq_no=%s", (row["seq_no"],))]
    row["bookmarks"] = [r["post_seq_no"] for r in db.query(
        "SELECT post_seq_no FROM tb_user_bookmark WHERE user_seq_no=%s", (row["seq_no"],))]
    row["following"] = [r["followee_seq_no"] for r in db.query(
        "SELECT followee_seq_no FROM tb_user_follow WHERE follower_seq_no=%s", (row["seq_no"],))]
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
        row["expertise"] = [r["expertise_name"] for r in db.query("SELECT expertise_name FROM tb_user_expertise WHERE user_seq_no=%s ORDER BY seq_no", (uid,))]
        row["follower_count"]  = db.query_one("SELECT COUNT(*) c FROM tb_user_follow WHERE followee_seq_no=%s", (uid,))["c"]
        row["following_count"] = db.query_one("SELECT COUNT(*) c FROM tb_user_follow WHERE follower_seq_no=%s", (uid,))["c"]
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
    for exp in b.get("expertise", []):
        db.execute("INSERT IGNORE INTO tb_user_expertise (user_seq_no,expertise_name) VALUES(%s,%s)", (seq, exp))
    return 201, {"seq_no": seq, "email": email, "nickname": nick}

def users_patch(p, b):
    uid = b.get("id")
    if not uid: return 400, {"error": "id 필수"}
    sets, args = [], []
    for col in ("nickname","bio","avatar_url","status"):
        if col in b: sets.append(f"{col}=%s"); args.append(b[col])
    if "password" in b: sets.append("password_hash=%s"); args.append(_hash(b["password"]))
    if sets: db.execute(f"UPDATE tb_user SET {','.join(sets)} WHERE seq_no=%s", args + [uid])
    if "expertise" in b:
        db.execute("DELETE FROM tb_user_expertise WHERE user_seq_no=%s", (uid,))
        for exp in b["expertise"]:
            db.execute("INSERT IGNORE INTO tb_user_expertise (user_seq_no,expertise_name) VALUES(%s,%s)", (uid, exp))
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
    return [r["tag_name"] for r in db.query("SELECT tag_name FROM tb_post_tag WHERE post_seq_no=%s ORDER BY sort_order", (pid,))]

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
    for i, tag in enumerate(b.get("tags",[])):
        db.execute("INSERT IGNORE INTO tb_post_tag (post_seq_no,tag_name,sort_order) VALUES(%s,%s,%s)", (seq, tag.strip(), i))
    return 201, {"seq_no": seq}

def posts_patch(p, b):
    pid = b.get("id")
    if not pid: return 400, {"error": "id 필수"}
    sets, args = [], []
    for col in ("title","body","status"):
        if col in b: sets.append(f"{col}=%s"); args.append(b[col])
    if b.get("status") == "deleted": sets.append("deleted_at=NOW()")
    if sets: db.execute(f"UPDATE tb_post SET {','.join(sets)} WHERE seq_no=%s", args + [pid])
    if "tags" in b:
        db.execute("DELETE FROM tb_post_tag WHERE post_seq_no=%s", (pid,))
        for i, tag in enumerate(b["tags"]):
            db.execute("INSERT IGNORE INTO tb_post_tag (post_seq_no,tag_name,sort_order) VALUES(%s,%s,%s)", (pid, tag.strip(), i))
    return 200, {"ok": True}

def posts_delete(p, b):
    pid = b.get("id")
    if not pid: return 400, {"error": "id 필수"}
    db.execute("UPDATE tb_post SET status='deleted',deleted_at=NOW() WHERE seq_no=%s", (pid,))
    return 200, {"ok": True}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COMMENTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def comments_get(p, b):
    pid = p.get("post_id", [None])[0]
    if not pid: return 400, {"error": "post_id 필수"}
    rows = db.query("SELECT c.seq_no,c.post_seq_no,c.parent_seq_no,c.body,c.like_count,c.status,c.created_at,u.nickname author_nickname,u.seq_no author_seq_no FROM tb_comment c LEFT JOIN tb_user u ON u.seq_no=c.author_seq_no WHERE c.post_seq_no=%s AND c.status='active' ORDER BY c.created_at", (pid,))
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
    db.execute("UPDATE tb_post SET comment_count=GREATEST(0,comment_count-1) WHERE seq_no=%s", (row["post_seq_no"],))
    return 200, {"ok": True}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LIKES (게시글 좋아요)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def likes_post(p, b):
    pid = b.get("post_id"); uid = b.get("user_id")
    if not pid or not uid: return 400, {"error": "post_id, user_id 필수"}
    exist = db.query_one("SELECT seq_no FROM tb_post_like WHERE post_seq_no=%s AND user_seq_no=%s", (pid, uid))
    if exist:
        db.execute("DELETE FROM tb_post_like WHERE post_seq_no=%s AND user_seq_no=%s", (pid, uid))
        db.execute("UPDATE tb_post SET like_count=GREATEST(0,like_count-1) WHERE seq_no=%s", (pid,))
        liked = False
    else:
        db.execute("INSERT INTO tb_post_like (post_seq_no,user_seq_no) VALUES(%s,%s)", (pid, uid))
        db.execute("UPDATE tb_post SET like_count=like_count+1 WHERE seq_no=%s", (pid,))
        liked = True
    cnt = db.query_one("SELECT like_count FROM tb_post WHERE seq_no=%s", (pid,))
    return 200, {"liked": liked, "like_count": cnt["like_count"]}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BOOKMARKS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def bookmarks_get(p, b):
    uid = p.get("user_id", [None])[0]
    if not uid: return 400, {"error": "user_id 필수"}
    rows = db.query("SELECT post_seq_no FROM tb_user_bookmark WHERE user_seq_no=%s ORDER BY seq_no DESC", (uid,))
    return 200, {"bookmarks": [r["post_seq_no"] for r in rows]}

def bookmarks_post(p, b):
    uid = b.get("user_id"); pid = b.get("post_id")
    if not uid or not pid: return 400, {"error": "user_id, post_id 필수"}
    exist = db.query_one("SELECT seq_no FROM tb_user_bookmark WHERE user_seq_no=%s AND post_seq_no=%s", (uid, pid))
    if exist:
        db.execute("DELETE FROM tb_user_bookmark WHERE user_seq_no=%s AND post_seq_no=%s", (uid, pid))
        return 200, {"bookmarked": False}
    db.execute("INSERT INTO tb_user_bookmark (user_seq_no,post_seq_no) VALUES(%s,%s)", (uid, pid))
    return 200, {"bookmarked": True}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# REACTIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALID_REACTIONS = {"fire","lol","like","wow","sad","angry"}

def reactions_get(p, b):
    ttype = p.get("target_type",["post"])[0]
    tid   = p.get("target_id", [None])[0]
    uid   = p.get("user_id",  [None])[0]
    if not tid: return 400, {"error": "target_id 필수"}
    rows = db.query("SELECT reaction_key,COUNT(*) cnt FROM tb_reaction WHERE target_type=%s AND target_seq_no=%s GROUP BY reaction_key", (ttype, tid))
    counts = {r["reaction_key"]: r["cnt"] for r in rows}
    user_reaction = None
    if uid:
        row = db.query_one("SELECT reaction_key FROM tb_reaction WHERE target_type=%s AND target_seq_no=%s AND user_seq_no=%s", (ttype, tid, uid))
        user_reaction = row["reaction_key"] if row else None
    return 200, {"counts": counts, "user_reaction": user_reaction}

def reactions_post(p, b):
    ttype = b.get("target_type","post"); tid = b.get("target_id"); uid = b.get("user_id"); key = b.get("reaction_key")
    if not tid or not uid or not key: return 400, {"error": "target_id, user_id, reaction_key 필수"}
    if key not in VALID_REACTIONS: return 400, {"error": f"invalid reaction_key"}
    exist = db.query_one("SELECT seq_no,reaction_key FROM tb_reaction WHERE target_type=%s AND target_seq_no=%s AND user_seq_no=%s", (ttype, tid, uid))
    if exist:
        if exist["reaction_key"] == key:
            db.execute("DELETE FROM tb_reaction WHERE seq_no=%s", (exist["seq_no"],)); new_key = None
        else:
            db.execute("UPDATE tb_reaction SET reaction_key=%s WHERE seq_no=%s", (key, exist["seq_no"])); new_key = key
    else:
        db.execute("INSERT INTO tb_reaction (target_type,target_seq_no,user_seq_no,reaction_key) VALUES(%s,%s,%s,%s)", (ttype, tid, uid, key)); new_key = key
    rows = db.query("SELECT reaction_key,COUNT(*) cnt FROM tb_reaction WHERE target_type=%s AND target_seq_no=%s GROUP BY reaction_key", (ttype, tid))
    return 200, {"user_reaction": new_key, "counts": {r["reaction_key"]: r["cnt"] for r in rows}}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FOLLOWS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def follows_get(p, b):
    uid = p.get("user_id", [None])[0]; kind = p.get("type",["following"])[0]
    if not uid: return 400, {"error": "user_id 필수"}
    if kind == "followers":
        rows = db.query("SELECT u.seq_no,u.nickname,u.avatar_url FROM tb_user_follow f JOIN tb_user u ON u.seq_no=f.follower_seq_no WHERE f.followee_seq_no=%s", (uid,))
    else:
        rows = db.query("SELECT u.seq_no,u.nickname,u.avatar_url FROM tb_user_follow f JOIN tb_user u ON u.seq_no=f.followee_seq_no WHERE f.follower_seq_no=%s", (uid,))
    return 200, {"users": rows, "count": len(rows)}

def follows_post(p, b):
    fr = b.get("follower_id"); fe = b.get("followee_id")
    if not fr or not fe: return 400, {"error": "follower_id, followee_id 필수"}
    if str(fr) == str(fe): return 400, {"error": "자기 자신 팔로우 불가"}
    exist = db.query_one("SELECT seq_no FROM tb_user_follow WHERE follower_seq_no=%s AND followee_seq_no=%s", (fr, fe))
    if exist:
        db.execute("DELETE FROM tb_user_follow WHERE follower_seq_no=%s AND followee_seq_no=%s", (fr, fe)); return 200, {"following": False}
    db.execute("INSERT INTO tb_user_follow (follower_seq_no,followee_seq_no) VALUES(%s,%s)", (fr, fe))
    return 200, {"following": True}

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
    key = b.get("topic_key","").strip(); cat = b.get("category_id"); label = b.get("label","").strip()
    if not key or not cat or not label: return 400, {"error": "topic_key, category_id, label 필수"}
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
    db.execute("DELETE FROM tb_topic WHERE seq_no=%s", (tid,))
    return 200, {"ok": True}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SOURCES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def _attach_src_topics(sources):
    if not sources: return sources
    ids = [s["seq_no"] for s in sources]
    ph  = ",".join(["%s"]*len(ids))
    links = db.query(f"SELECT st.source_seq_no,t.topic_key FROM tb_crawl_source_topic st JOIN tb_topic t ON t.seq_no=st.topic_seq_no WHERE st.source_seq_no IN ({ph})", ids)
    lmap = {}
    for l in links: lmap.setdefault(l["source_seq_no"], []).append(l["topic_key"])
    for s in sources: s["topic_keys"] = lmap.get(s["seq_no"], [])
    return sources

def _save_src_topics(source_seq, topic_keys):
    db.execute("DELETE FROM tb_crawl_source_topic WHERE source_seq_no=%s", (source_seq,))
    for key in topic_keys:
        t = db.query_one("SELECT seq_no FROM tb_topic WHERE topic_key=%s", (key,))
        if t: db.execute("INSERT IGNORE INTO tb_crawl_source_topic (source_seq_no,topic_seq_no) VALUES(%s,%s)", (source_seq, t["seq_no"]))

def sources_get(p, b):
    return 200, {"sources": _attach_src_topics(db.query("SELECT * FROM tb_crawl_source ORDER BY seq_no"))}

def sources_post(p, b):
    sid = b.get("source_id","").strip(); label = b.get("label","").strip()
    if not sid or not label: return 400, {"error": "source_id, label 필수"}
    if db.query_one("SELECT seq_no FROM tb_crawl_source WHERE source_id=%s", (sid,)): return 409, {"error": "이미 존재하는 source_id"}
    seq = db.execute("INSERT INTO tb_crawl_source (source_id,label,source_type,source_value,active_yn) VALUES(%s,%s,%s,%s,'Y')",
                     (sid, label, b.get("source_type","github_org"), b.get("source_value","")))
    _save_src_topics(seq, b.get("topic_keys",[]))
    return 201, {"seq_no": seq}

def sources_patch(p, b):
    sid = b.get("id")
    if not sid: return 400, {"error": "id 필수"}
    sets, args = [], []
    for col in ("label","source_value","active_yn"):
        if col in b: sets.append(f"{col}=%s"); args.append(b[col])
    if sets: db.execute(f"UPDATE tb_crawl_source SET {','.join(sets)} WHERE seq_no=%s", args + [sid])
    if "topic_keys" in b: _save_src_topics(sid, b["topic_keys"])
    return 200, {"ok": True}

def sources_delete(p, b):
    sid = b.get("id")
    if not sid: return 400, {"error": "id 필수"}
    db.execute("DELETE FROM tb_crawl_source WHERE seq_no=%s", (sid,))
    return 200, {"ok": True}

# ── 라우팅 테이블 ──────────────────────────────────────────
ROUTES = {
    "auth":       {"POST": auth_post},
    "users":      {"GET": users_get, "POST": users_post, "PATCH": users_patch, "DELETE": users_delete},
    "posts":      {"GET": posts_get, "POST": posts_post, "PATCH": posts_patch, "DELETE": posts_delete},
    "comments":   {"GET": comments_get, "POST": comments_post, "DELETE": comments_delete},
    "likes":      {"POST": likes_post},
    "bookmarks":  {"GET": bookmarks_get, "POST": bookmarks_post},
    "reactions":  {"GET": reactions_get, "POST": reactions_post},
    "follows":    {"GET": follows_get, "POST": follows_post},
    "categories": {"GET": categories_get, "POST": categories_post, "PATCH": categories_patch, "DELETE": categories_delete},
    "topics":     {"GET": topics_get, "POST": topics_post, "PATCH": topics_patch, "DELETE": topics_delete},
    "sources":    {"GET": sources_get, "POST": sources_post, "PATCH": sources_patch, "DELETE": sources_delete},
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
            self._json(500, {"error": str(e), "trace": traceback.format_exc()[-300:]})

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
