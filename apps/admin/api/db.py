"""
db.py — MariaDB/MySQL 연결 공통 모듈
Aiven Cloud MySQL (SSL 필수)
환경변수 우선, 없으면 하드코딩 기본값 사용
"""
import os
import pymysql
import pymysql.cursors

DB_CONFIG = {
    "host":     os.environ.get("DB_HOST",     "mysql-aha-db-aha.a.aivencloud.com"),
    "port":     int(os.environ.get("DB_PORT", "14157")),
    "user":     os.environ.get("DB_USER",     "avnadmin"),
    "password": os.environ.get("DB_PASSWORD", ""),      # Vercel 환경변수에서 주입
    "database": os.environ.get("DB_NAME",     "defaultdb"),
    "charset":  "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
    "connect_timeout": 10,
    "autocommit": False,
    # Aiven Cloud: SSL 필수
    "ssl": {"ssl": {}},
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
