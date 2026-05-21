"""
db.py — MySQL 연결 모듈 (Aiven Cloud, SSL 필수)
- connect_timeout 3초로 단축 (빠른 실패)
- 쿼리 실행 타임아웃 추가
"""
import os
import pymysql
import pymysql.cursors

DB_CONFIG = {
    "host":     os.environ.get("DB_HOST",     "mysql-aha-db-aha.a.aivencloud.com"),
    "port":     int(os.environ.get("DB_PORT", "14157")),
    "user":     os.environ.get("DB_USER",     "avnadmin"),
    "password": os.environ.get("DB_PASSWORD", ""),
    "database": os.environ.get("DB_NAME",     "defaultdb"),
    "charset":  "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
    "connect_timeout": 10,  # Aiven SSL 핸드셰이크 3.5s + 여유
    "read_timeout":    20,
    "write_timeout":   20,
    "autocommit": False,
    "ssl": {"ssl": {}},     # Aiven 필수
}

def get_conn():
    """DB 연결. Aiven socket EAGAIN 대비 짧은 백오프 재시도"""
    import time as _t
    last_err = None
    for attempt in range(3):
        try:
            return pymysql.connect(**DB_CONFIG)
        except (pymysql.err.OperationalError, OSError) as e:
            last_err = e
            # Errno 16 (resource busy) / 11 (EAGAIN) → 짧은 대기 후 재시도
            msg = str(e)
            if 'Errno 16' in msg or 'Errno 11' in msg or 'EAGAIN' in msg:
                _t.sleep(0.3 * (attempt + 1))
                continue
            raise
    raise last_err

def query(sql, args=None):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, args or ())
            return cur.fetchall()
    finally:
        conn.close()

def query_one(sql, args=None):
    rows = query(sql, args)
    return rows[0] if rows else None

def execute(sql, args=None):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, args or ())
            conn.commit()
            return cur.lastrowid
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def execute_many(sql, args_list):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.executemany(sql, args_list)
            conn.commit()
            return cur.rowcount
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
