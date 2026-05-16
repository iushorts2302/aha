"""
Vercel Serverless Function (Python)
각 토픽별 실제 웹 크롤링 수행
허용 도메인: github.com, registry.npmjs.org, pypi.org, vercel.com
"""

import json
import random
import sys
from http.server import BaseHTTPRequestHandler
from urllib.request import urlopen, Request
from urllib.error import URLError
from html.parser import HTMLParser
import re


# ─── 헬퍼 ────────────────────────────────────────────────

def fetch(url, headers=None):
    req = Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; AhaBot/1.0)",
        **(headers or {}),
    })
    with urlopen(req, timeout=10) as resp:
        return resp.read().decode("utf-8", errors="ignore")


def fetch_json(url):
    html = fetch(url, {"Accept": "application/json"})
    return json.loads(html)


def enrich(items, topic_key, topic_label, category):
    """크롤링 결과에 메타 정보 추가"""
    result = []
    base_ts = __import__("time").time()
    for i, item in enumerate(items):
        result.append({
            "id": f"{topic_key}_{int(base_ts)}_{i}",
            "topicKey": topic_key,
            "category": category,
            "topicLabel": topic_label,
            "title": item.get("title", ""),
            "summary": item.get("summary", ""),
            "tags": item.get("tags", []),
            "views": random.randint(150, 8000),
            "likes": random.randint(10, 500),
            "comments": random.randint(3, 150),
            "hot": i == 0,  # 첫 번째 항목은 HOT
            "crawledAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
            "type": "crawled",
            "source": item.get("source", ""),
        })
    return result


# ─── 크롤러 함수들 ────────────────────────────────────────

def crawl_github_trending(lang="", since="daily", limit=8):
    """GitHub Trending 크롤링"""
    url = f"https://github.com/trending/{lang}?since={since}"
    html = fetch(url)
    items = []

    # article.Box-row 패턴 파싱 (정규식)
    articles = re.findall(r'<article[^>]*class="[^"]*Box-row[^"]*"[^>]*>(.*?)</article>', html, re.DOTALL)
    for article in articles[:limit]:
        # 저장소 이름
        name_m = re.search(r'<h2[^>]*>.*?href="([^"]+)"', article, re.DOTALL)
        repo = name_m.group(1).strip("/") if name_m else ""
        if not repo:
            continue
        # 설명
        desc_m = re.search(r'<p[^>]*class="[^"]*col-9[^"]*"[^>]*>(.*?)</p>', article, re.DOTALL)
        desc = re.sub(r'<[^>]+>', '', desc_m.group(1)).strip() if desc_m else ""
        desc = desc or "GitHub 인기 저장소"
        # 스타
        star_m = re.search(r'octicon-star.*?</svg>\s*([\d,]+)', article, re.DOTALL)
        stars = star_m.group(1).strip() if star_m else "0"
        # 언어
        lang_m = re.search(r'itemprop="programmingLanguage"[^>]*>(.*?)<', article)
        pl = lang_m.group(1).strip() if lang_m else ""

        name_clean = repo.replace("/", " / ")
        items.append({
            "title": f"[GitHub] {name_clean}",
            "summary": f"{desc[:90]} ⭐{stars}" + (f" ({pl})" if pl else ""),
            "tags": list(filter(None, ["GitHub", "오픈소스", pl]))[:4],
            "source": f"https://github.com/{repo}",
        })
    return items


def crawl_npm_search(keyword, limit=8):
    """NPM 패키지 검색"""
    url = f"https://registry.npmjs.org/-/v1/search?text={keyword}&size={limit}&popularity=1.0"
    data = fetch_json(url)
    items = []
    for obj in data.get("objects", []):
        p = obj.get("package", {})
        name = p.get("name", "")
        version = p.get("version", "")
        desc = p.get("description", "") or "NPM 패키지"
        keywords = p.get("keywords", [])
        items.append({
            "title": f"[NPM] {name} v{version}",
            "summary": desc[:100],
            "tags": (["NPM", "JavaScript"] + keywords[:2])[:4],
            "source": f"https://www.npmjs.com/package/{name}",
        })
    return items


def crawl_pypi_rss(limit=8):
    """PyPI 최신 패키지 RSS"""
    html = fetch("https://pypi.org/rss/updates.xml")
    items_raw = re.findall(r'<item>(.*?)</item>', html, re.DOTALL)
    items = []
    for raw in items_raw[:limit]:
        title_m = re.search(r'<title><!\[CDATA\[(.*?)\]\]></title>|<title>(.*?)</title>', raw)
        desc_m  = re.search(r'<description><!\[CDATA\[(.*?)\]\]></description>|<description>(.*?)</description>', raw)
        link_m  = re.search(r'<link>(.*?)</link>', raw)

        title = (title_m.group(1) or title_m.group(2) or "").strip() if title_m else ""
        desc  = (desc_m.group(1) or desc_m.group(2) or "").strip() if desc_m else ""
        desc  = re.sub(r'<[^>]+>', '', desc).strip()[:100] or "Python 패키지 업데이트"
        link  = link_m.group(1).strip() if link_m else ""

        if title:
            items.append({
                "title": f"[PyPI] {title}",
                "summary": desc,
                "tags": ["Python", "PyPI", "패키지"],
                "source": link,
            })
    return items


def crawl_pypi_top(keyword, limit=8):
    """PyPI 패키지 검색"""
    url = f"https://pypi.org/search/?q={keyword}&o=-created"
    html = fetch(url)
    items = []
    # 패키지 카드 파싱
    cards = re.findall(r'<a class="package-snippet"[^>]*href="([^"]*)"[^>]*>(.*?)</a>', html, re.DOTALL)
    for href, body in cards[:limit]:
        name_m = re.search(r'class="package-snippet__name"[^>]*>(.*?)<', body)
        ver_m  = re.search(r'class="package-snippet__version"[^>]*>(.*?)<', body)
        desc_m = re.search(r'class="package-snippet__description"[^>]*>(.*?)<', body)
        name = (name_m.group(1) or "").strip() if name_m else href
        ver  = (ver_m.group(1) or "").strip() if ver_m else ""
        desc = (desc_m.group(1) or "").strip()[:100] if desc_m else "Python 패키지"
        if name:
            items.append({
                "title": f"[PyPI] {name}" + (f" {ver}" if ver else ""),
                "summary": desc or "Python 패키지",
                "tags": ["Python", keyword, "패키지"],
                "source": f"https://pypi.org{href}",
            })
    return items


def crawl_github_topic(topic, limit=8):
    """GitHub 토픽별 저장소"""
    url = f"https://github.com/topics/{topic}"
    html = fetch(url)
    items = []
    # article 패턴
    articles = re.findall(r'<article[^>]*>(.*?)</article>', html, re.DOTALL)
    for article in articles[:limit]:
        link_m = re.search(r'href="(/[^"/][^"]+)"[^>]*>\s*\n?\s*<h3', article)
        if not link_m:
            link_m = re.search(r'data-hydro-click[^>]*href="(/[^"]+)"', article)
        desc_m = re.search(r'<p[^>]*class="[^"]*color-fg-muted[^"]*"[^>]*>(.*?)</p>', article, re.DOTALL)
        star_m = re.search(r'octicon-star[^>]*>.*?</svg>\s*([\d,k]+)', article, re.DOTALL)

        if not link_m:
            continue
        repo = link_m.group(1).strip("/")
        desc = re.sub(r'<[^>]+>', '', desc_m.group(1)).strip() if desc_m else f"GitHub {topic} 저장소"
        stars = star_m.group(1).strip() if star_m else ""

        items.append({
            "title": f"[GitHub/{topic}] {repo.replace('/', ' / ')}",
            "summary": f"{desc[:80]}" + (f" ⭐{stars}" if stars else ""),
            "tags": ["GitHub", topic, "오픈소스"],
            "source": f"https://github.com/{repo}",
        })
    return items[:limit]


# ─── 토픽 → 크롤러 매핑 ──────────────────────────────────

TOPIC_CRAWLERS = {
    # 홈
    "home.trending":     lambda: crawl_github_trending(since="daily"),
    "home.rising":       lambda: crawl_github_trending(since="weekly"),
    "home.ai_feed":      lambda: crawl_github_topic("artificial-intelligence"),
    "home.shortform":    lambda: crawl_npm_search("react", 6) + crawl_pypi_rss(2),

    # 인기
    "trending.realtime": lambda: crawl_github_trending(since="daily"),
    "trending.daily":    lambda: crawl_github_trending(since="daily"),
    "trending.weekly":   lambda: crawl_github_trending(since="weekly"),
    "trending.debate":   lambda: crawl_npm_search("webpack vs vite", 5) + crawl_pypi_rss(3),

    # 피드
    "feed.latest":       lambda: crawl_pypi_rss(5) + crawl_npm_search("latest", 3),
    "feed.recommended":  lambda: crawl_github_trending(since="monthly"),

    # 게시판
    "board.free":        lambda: crawl_github_trending(since="weekly"),
    "board.question":    lambda: crawl_npm_search("how-to", 4) + crawl_pypi_top("tutorial", 4),
    "board.info":        lambda: crawl_pypi_rss(4) + crawl_npm_search("guide", 4),
    "board.humor":       lambda: crawl_github_topic("awesome"),
    "board.it":          lambda: crawl_github_trending(lang="python", since="daily"),
    "board.game":        lambda: crawl_github_topic("game"),
    "board.sports":      lambda: crawl_github_topic("sports"),
    "board.politics":    lambda: crawl_pypi_rss(8),

    # 갤러리
    "gallery.image":     lambda: crawl_github_topic("image-processing"),
    "gallery.meme":      lambda: crawl_github_topic("awesome"),
    "gallery.ai":        lambda: crawl_github_topic("stable-diffusion"),

    # 커뮤니티
    "community.dev":     lambda: crawl_github_trending(lang="python", since="daily"),
    "community.invest":  lambda: crawl_npm_search("finance", 5) + crawl_pypi_top("finance", 3),
    "community.travel":  lambda: crawl_github_topic("travel"),
    "community.fashion": lambda: crawl_github_topic("design"),
    "community.fitness": lambda: crawl_pypi_top("health", 5) + crawl_npm_search("health", 3),

    # 정보
    "knowledge.news":    lambda: crawl_pypi_rss(5) + crawl_npm_search("news", 3),
    "knowledge.tips":    lambda: crawl_github_topic("tips"),
    "knowledge.review":  lambda: crawl_npm_search("review", 4) + crawl_pypi_top("review", 4),
    "knowledge.tutorial":lambda: crawl_github_topic("tutorial"),

    # 마켓
    "market.deal":       lambda: crawl_npm_search("free", 5) + crawl_pypi_top("free", 3),
    "market.coupon":     lambda: crawl_github_topic("awesome"),

    # AI 허브
    "aihub.trend":       lambda: crawl_github_topic("llm"),
    "aihub.summary":     lambda: crawl_github_topic("nlp"),
}


# ─── Vercel Handler ───────────────────────────────────────

class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors()
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}
            topic_key = body.get("topicKey", "")

            if not topic_key:
                self._json(400, {"error": "topicKey is required"})
                return

            crawler_fn = TOPIC_CRAWLERS.get(topic_key)
            if not crawler_fn:
                self._json(400, {"error": f"Unknown topicKey: {topic_key}"})
                return

            raw_items = crawler_fn()
            random.shuffle(raw_items)

            # MENU_TOPICS 메타 정보 (간소화)
            topic_meta = {
                "label": topic_key.split(".")[-1].replace("_", " ").title(),
                "category": topic_key.split(".")[0],
            }

            items = enrich(raw_items[:8], topic_key,
                           topic_meta["label"], topic_meta["category"])

            self._json(200, {"items": items, "count": len(items)})

        except URLError as e:
            self._json(503, {"error": f"크롤링 실패: {str(e)}"})
        except Exception as e:
            import traceback
            self._json(500, {"error": str(e), "trace": traceback.format_exc()[-300:]})

    def _set_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._set_cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass  # 로그 억제
