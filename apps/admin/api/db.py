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
    "connect_timeout": 3,   # 콜드스타트 3초 제한
    "read_timeout":    8,
    "write_timeout":   8,
    "autocommit": False,
    "ssl": {"ssl": {}},     # Aiven 필수
}

def get_conn():
    return pymysql.connect(**DB_CONFIG)

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
