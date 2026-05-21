"""
/api/cron — GitHub Actions 10분 자동 크롤링
크롤링 결과를 tb_crawl_item에 DB 저장
"""
import json, os, sys, time, datetime
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))
from crawl import TOPIC_CRAWLERS, enrich

PRIORITY_TOPICS = [
    # AI 우선 (홈 최상단 섹션)
    "ai.agents",
    "ai.trend",
    "ai.tools",
    "ai.research",
    "ai.news",
    "home.ai_feed",
    # 홈/개발
    "home.trending",
    "home.rising",
    "dev.trending",
    "dev.javascript",
    "dev.python",
    "dev.devops",
    "dev.tools",
    "startup.new",
    "startup.funding",
    "startup.product",
    "oss.trending",
    "oss.awesome",
    "oss.new",
    "it.news",
    "it.security",
    "it.cloud",
    "it.mobile",
    "design.ui",
    "design.ux",
    "design.css",
    "game.news",
    "game.indie",
    "game.review",
    "finance.stock",
    "finance.crypto",
    "finance.invest",
    "market.deal",
    "market.used",
    "job.dev",
    "job.startup",
    "job.algorithm",
    "learn.tutorial",
    "learn.course",
    "learn.book",
    "learn.korean",
    "board.free",
    "board.it",
    "board.question",
]

def _save_to_db(items, topic_key):
    try:
        import db
        topic = db.query_one("SELECT seq_no FROM tb_topic WHERE topic_key=%s", (topic_key,))
        if not topic: return 0
        saved = 0
        for item in items:
            exist = db.query_one("SELECT seq_no FROM tb_crawl_item WHERE item_id=%s", (item.get("id",""),))
            if exist:
                # 업데이트
                db.execute("UPDATE tb_crawl_item SET title=%s,summary=%s,source_url=%s,crawled_at=NOW() WHERE seq_no=%s",
                    (item.get("title","")[:500], item.get("summary","")[:1000],
                     item.get("source","")[:2000], exist["seq_no"]))
                seq = exist["seq_no"]
            else:
                seq = db.execute(
                    "INSERT INTO tb_crawl_item "
                    "(item_id,topic_seq_no,title,summary,source_url,topic_label,category_id,hot_yn) "
                    "VALUES(%s,%s,%s,%s,%s,%s,%s,'N')",
                    (item.get("id","")[:200], topic["seq_no"],
                     item.get("title","")[:500], item.get("summary","")[:1000],
                     item.get("source","")[:2000], item.get("topicLabel","")[:100],
                     item.get("category","")[:50]))
                saved += 1
            # 태그
            if item.get("tags") and not exist:
                for i, tag in enumerate(item["tags"][:5]):
                    db.execute("INSERT IGNORE INTO tb_crawl_item_tag (item_seq_no,tag_name,sort_order) VALUES(%s,%s,%s)",
                               (seq, str(tag)[:100], i))
        return saved
    except Exception as e:
        return 0

def _log_cron(*args, **kwargs):
    pass  # tb_cron_log 제거됨

