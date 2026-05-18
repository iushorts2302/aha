"""
db.py — MariaDB 연결 공통 모듈
환경변수 우선, 없으면 하드코딩 기본값 사용
"""
import os
import pymysql
import pymysql.cursors

# DB 접속 정보 — 환경변수 > 기본값
DB_CONFIG = {
    "host":     os.environ.get("DB_HOST",     "172.30.8.82"),
    "port":     int(os.environ.get("DB_PORT", "3306")),
    "user":     os.environ.get("DB_USER",     "srvaha"),
    "password": os.environ.get("DB_PASSWORD", ""),
    "database": os.environ.get("DB_NAME",     "aha_db"),
    "charset":  "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
    "connect_timeout": 5,
    "autocommit": False,
}

def get_conn():
    """DB 커넥션 반환. 실패 시 예외 발생."""
    return pymysql.connect(**DB_CONFIG)

def query(sql, args=None):
    """SELECT — 결과 list[dict] 반환"""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, args or ())
            return cur.fetchall()
    finally:
        conn.close()

def query_one(sql, args=None):
    """SELECT — 단일 행 dict 반환 (없으면 None)"""
    rows = query(sql, args)
    return rows[0] if rows else None

def execute(sql, args=None):
    """INSERT/UPDATE/DELETE — lastrowid 반환"""
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
    """executemany — 영향받은 행 수 반환"""
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
