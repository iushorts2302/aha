"""
/api/crawl.py — Vercel Serverless Function (Python)
메뉴별 실제 웹 크롤링
접근 가능 소스: github.com, registry.npmjs.org, pypi.org, vercel.com
"""

import json, re, random, time, datetime, sys, os
from http.server import BaseHTTPRequestHandler
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError
from urllib.parse import urlencode

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

# ── 헬퍼 ─────────────────────────────────────────────────

def fetch(url, extra_headers=None):
    headers = {"User-Agent": UA, "Accept": "text/html,*/*", "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8"}
    if extra_headers:
        headers.update(extra_headers)
    req = Request(url, headers=headers)
    with urlopen(req, timeout=12) as r:
        return r.read().decode("utf-8", errors="ignore")

def fetch_json(url):
    return json.loads(fetch(url, {"Accept": "application/json"}))

def clean(text):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', text or '')).strip()

def enrich(items, topic_key, topic_label, category, limit=8):
    result = []
    ts = int(time.time())
    for i, item in enumerate(items[:limit]):
        title = (item.get("title") or "").strip()
        if not title:
            continue
        result.append({
            "id": f"{topic_key}_{ts}_{i}",
            "topicKey": topic_key,
            "category": category,
            "topicLabel": topic_label,
            "title": title[:80],
            "summary": (item.get("summary") or "")[:120],
            "tags": (item.get("tags") or [])[:4],
            "views": 0,
            "likes": 0,
            "comments": 0,
            "hot": False,
            "crawledAt": datetime.datetime.utcnow().isoformat() + "Z",
            "type": "crawled",
            "source": item.get("source", ""),
        })
    return result


# ── 크롤러 함수 ───────────────────────────────────────────

def github_trending(lang="", since="daily", limit=10):
    """GitHub Trending — 홈/개발/오픈소스"""
    url = f"https://github.com/trending/{lang}?since={since}"
    html = fetch(url)
    items = []
    for art in re.findall(r'<article[^>]*Box-row[^>]*>(.*?)</article>', html, re.DOTALL)[:limit]:
        name_m = re.search(r'href="/([^"]+)"[^>]*>\s*\n?\s*<span', art)
        if not name_m:
            name_m = re.search(r'<h2[^>]*>.*?href="(/[^"]+)"', art, re.DOTALL)
        desc_m  = re.search(r'<p[^>]*col-9[^>]*>(.*?)</p>', art, re.DOTALL)
        star_m  = re.search(r'octicon-star[^>]*>.*?</svg>\s*([\d,k]+)', art, re.DOTALL)
        lang_m  = re.search(r'itemprop="programmingLanguage"[^>]*>(.*?)<', art)

        repo  = (name_m.group(1) if name_m else "").strip("/")
        if not repo or "/" not in repo:
            continue
        desc  = clean(desc_m.group(1)) if desc_m else "GitHub 인기 저장소"
        stars = (star_m.group(1) if star_m else "").strip()
        pl    = clean(lang_m.group(1)) if lang_m else ""

        items.append({
            "title":   f"[GitHub] {repo.replace('/', ' / ')}",
            "summary": f"{desc[:90]}" + (f" ⭐{stars}" if stars else "") + (f" ({pl})" if pl else ""),
            "tags":    list(filter(None, ["GitHub", "오픈소스", pl]))[:4],
            "source":  f"https://github.com/{repo}",
        })
    return items


def github_topic(topic, limit=10):
    """GitHub 토픽별 저장소 — AI/게임/디자인/스타트업/학습/금융"""
    html = fetch(f"https://github.com/topics/{topic}")
    items = []
    for art in re.findall(r'<article[^>]*>(.*?)</article>', html, re.DOTALL)[:limit]:
        href_m = re.search(r'href="(/[a-zA-Z0-9_\-]+/[a-zA-Z0-9_\-]+)"', art)
        desc_m = re.search(r'<p[^>]*color-fg-muted[^>]*>(.*?)</p>', art, re.DOTALL)
        star_m = re.search(r'octicon-star[^>]*>.*?</svg>\s*([\d,k]+)', art, re.DOTALL)
        if not href_m:
            continue
        repo  = href_m.group(1).strip("/")
        if "/" not in repo:
            continue
        desc  = clean(desc_m.group(1)) if desc_m else f"{topic} 관련 저장소"
        stars = (star_m.group(1) if star_m else "").strip()
        items.append({
            "title":   f"[GitHub/{topic}] {repo.replace('/', ' / ')}",
            "summary": f"{desc[:90]}" + (f" ⭐{stars}" if stars else ""),
            "tags":    ["GitHub", topic, "오픈소스"],
            "source":  f"https://github.com/{repo}",
        })
    return items


def npm_search(keyword, limit=10):
    """NPM 패키지 검색 — 개발/AI도구/디자인"""
    from urllib.parse import quote_plus
    url = f"https://registry.npmjs.org/-/v1/search?text={quote_plus(keyword)}&size={limit}&popularity=1.0"
    data = fetch_json(url)
    items = []
    for obj in data.get("objects", []):
        p = obj.get("package", {})
        name = p.get("name", "")
        ver  = p.get("version", "")
        desc = (p.get("description") or "NPM 패키지")[:100]
        kws  = p.get("keywords") or []
        items.append({
            "title":   f"[NPM] {name} v{ver}",
            "summary": desc,
            "tags":    (["NPM", "JavaScript"] + kws[:2])[:4],
            "source":  f"https://www.npmjs.com/package/{name}",
        })
    return items


def pypi_rss(limit=10):
    """PyPI 최신 패키지 RSS — 개발/논문/AI"""
    html = fetch("https://pypi.org/rss/updates.xml")
    items = []
    for raw in re.findall(r'<item>(.*?)</item>', html, re.DOTALL)[:limit]:
        t = re.search(r'<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>', raw)
        d = re.search(r'<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</description>', raw, re.DOTALL)
        l = re.search(r'<link>(.*?)</link>', raw)
        title = clean(t.group(1)) if t else ""
        desc  = clean(d.group(1))[:100] if d else "Python 패키지"
        if title:
            items.append({
                "title":   f"[PyPI] {title}",
                "summary": desc or "Python 패키지 업데이트",
                "tags":    ["Python", "PyPI", "패키지"],
                "source":  (l.group(1).strip() if l else ""),
            })
    return items


def pypi_search(keyword, limit=10):
    """PyPI 키워드 검색"""
    html = fetch(f"https://pypi.org/search/?q={keyword}&o=-created")
    items = []
    for card in re.findall(r'<a class="package-snippet"[^>]*href="([^"]*)"[^>]*>(.*?)</a>', html, re.DOTALL)[:limit]:
        href, body = card
        name_m = re.search(r'package-snippet__name[^>]*>(.*?)<', body)
        ver_m  = re.search(r'package-snippet__version[^>]*>(.*?)<', body)
        desc_m = re.search(r'package-snippet__description[^>]*>(.*?)<', body)
        name = clean(name_m.group(1)) if name_m else href
        ver  = clean(ver_m.group(1)) if ver_m else ""
        desc = clean(desc_m.group(1))[:100] if desc_m else "Python 패키지"
        if name:
            items.append({
                "title":   f"[PyPI] {name}" + (f" {ver}" if ver else ""),
                "summary": desc,
                "tags":    ["Python", keyword, "패키지"],
                "source":  f"https://pypi.org{href}",
            })
    return items


def vercel_changelog(limit=8):
    """Vercel Changelog — IT 뉴스"""
    html = fetch("https://vercel.com/changelog")
    items = []
    for m in re.finditer(r'<h[23][^>]*>(.*?)</h[23]>', html, re.DOTALL)[:limit*2]:
        title = clean(m.group(1))
        if len(title) > 10 and not any(x in title.lower() for x in ["cookie", "privacy"]):
            items.append({
                "title":   f"[Vercel] {title[:70]}",
                "summary": "Vercel 플랫폼 최신 업데이트",
                "tags":    ["Vercel", "IT뉴스", "개발"],
                "source":  "https://vercel.com/changelog",
            })
    return items[:limit]


def combine(*args):
    """여러 크롤러 결과 합치기"""
    result = []
    for items in args:
        result.extend(items)
    random.shuffle(result)
    return result


# ── 토픽 → 크롤러 매핑 (전체 메뉴 구조) ──────────────────

TOPIC_CRAWLERS = {

    # ── 홈(Home) ─────────────────────────────────────────
    "home.trending":      lambda: combine(github_trending(since="daily", limit=6), npm_search("trending", 4)),
    "home.rising":        lambda: combine(github_trending(since="weekly", limit=5), github_topic("startup", 5)),
    "home.ai_feed":       lambda: combine(github_topic("llm", 5), github_topic("artificial-intelligence", 5)),
    "home.shortform":     lambda: combine(github_topic("awesome-list", 5), npm_search("cli", 4)),
    "home.following":     lambda: github_trending(since="daily", limit=8),

    # ── AI 뉴스 ───────────────────────────────────────────
    "ai.news":            lambda: combine(github_topic("llm", 5), github_topic("gpt", 5)),
    "ai.tools":           lambda: combine(npm_search("ai tool", 5), github_topic("ai-tools", 5)),
    "ai.trend":           lambda: combine(github_topic("artificial-intelligence", 5), pypi_search("llm", 5)),
    "ai.summary":         lambda: combine(github_topic("nlp", 5), pypi_search("transformers", 5)),
    "ai.research":        lambda: combine(pypi_search("machine-learning", 5), github_topic("deep-learning", 5)),

    # ── 스타트업 ──────────────────────────────────────────
    "startup.new":        lambda: combine(github_topic("startup", 6), npm_search("saas", 4)),
    "startup.funding":    lambda: combine(github_topic("fintech", 5), github_topic("startup", 5)),
    "startup.product":    lambda: combine(npm_search("product", 5), github_topic("open-source", 5)),

    # ── 개발 ─────────────────────────────────────────────
    "dev.trending":       lambda: github_trending(since="daily", limit=10),
    "dev.opensource":     lambda: combine(github_topic("awesome-list", 5), github_trending("python", "daily", 5)),
    "dev.javascript":     lambda: combine(github_trending("javascript", "daily", 5), npm_search("react", 5)),
    "dev.python":         lambda: combine(github_trending("python", "daily", 5), pypi_rss(5)),
    "dev.devops":         lambda: combine(github_topic("devops", 5), npm_search("cli tool", 5)),
    "dev.tools":          lambda: combine(npm_search("developer-tools", 5), pypi_search("devtools", 5)),

    # ── 오픈소스 ──────────────────────────────────────────
    "oss.trending":       lambda: github_trending(since="daily", limit=10),
    "oss.awesome":        lambda: github_topic("awesome-list", 10),
    "oss.new":            lambda: combine(pypi_rss(5), npm_search("open source", 5)),

    # ── 디자인 ────────────────────────────────────────────
    "design.ui":          lambda: combine(npm_search("ui components", 5), github_topic("design-system", 5)),
    "design.ux":          lambda: combine(github_topic("ux", 5), npm_search("ux", 5)),
    "design.tools":       lambda: combine(npm_search("design tool", 5), github_topic("design-tools", 5)),
    "design.css":         lambda: combine(github_trending("css", "daily", 5), npm_search("css framework", 5)),

    # ── IT 뉴스 ───────────────────────────────────────────
    "it.news":            lambda: combine(github_topic("web-development", 5), github_topic("developer-tools", 5)),
    "it.security":        lambda: combine(github_topic("security", 5), pypi_search("security", 5)),
    "it.cloud":           lambda: combine(github_topic("cloud", 5), npm_search("cloud", 5)),
    "it.mobile":          lambda: combine(github_topic("mobile", 5), npm_search("react-native", 5)),

    # ── 커뮤니티(게시판) ──────────────────────────────────
    "board.free":         lambda: combine(github_trending(since="daily", limit=5), npm_search("popular", 5)),
    "board.question":     lambda: combine(pypi_search("tutorial", 5), npm_search("guide", 5)),
    "board.info":         lambda: combine(pypi_rss(5), github_topic("tutorial", 4)),
    "board.humor":        lambda: github_topic("awesome-list", 10),
    "board.it":           lambda: github_trending("python", "daily", 10),
    "board.game":         lambda: combine(github_topic("game", 5), npm_search("game", 5)),
    "board.sports":       lambda: combine(github_topic("sports", 5), npm_search("sports", 5)),
    "board.politics":     lambda: combine(github_topic("government", 5), pypi_rss(5)),
    "board.anon":         lambda: github_trending(since="weekly", limit=8),

    # ── 유머/밈 ───────────────────────────────────────────
    "humor.meme":         lambda: github_topic("awesome-list", 10),
    "humor.funny":        lambda: combine(github_topic("fun", 5), npm_search("funny", 5)),

    # ── 게임 ─────────────────────────────────────────────
    "game.news":          lambda: combine(github_topic("game", 5), npm_search("game engine", 5)),
    "game.indie":         lambda: github_topic("indie-game", 8),
    "game.review":        lambda: combine(github_topic("gaming", 5), npm_search("game", 5)),

    # ── 주식/코인 ─────────────────────────────────────────
    "finance.stock":      lambda: combine(github_topic("finance", 5), pypi_search("trading", 5)),
    "finance.crypto":     lambda: combine(github_topic("blockchain", 5), pypi_search("cryptocurrency", 5)),
    "finance.invest":     lambda: combine(github_topic("finance", 5), npm_search("finance", 5)),

    # ── 쇼핑/핫딜 ─────────────────────────────────────────
    "market.deal":        lambda: combine(github_topic("ecommerce", 5), npm_search("shop", 5)),
    "market.coupon":      lambda: combine(npm_search("coupon", 4), pypi_search("discount", 4)),
    "market.used":        lambda: combine(github_topic("marketplace", 5), npm_search("marketplace", 5)),

    # ── 취업 ─────────────────────────────────────────────
    "job.dev":            lambda: combine(github_topic("jobs", 5), npm_search("career", 4)),
    "job.startup":        lambda: combine(github_topic("startup", 5), pypi_search("jobs", 4)),
    "job.remote":         lambda: combine(github_topic("remote-work", 5), npm_search("remote", 4)),

    # ── 학습/강의 ─────────────────────────────────────────
    "learn.tutorial":     lambda: combine(github_topic("tutorial", 5), pypi_search("tutorial", 5)),
    "learn.course":       lambda: combine(github_topic("learning", 5), npm_search("education", 5)),
    "learn.book":         lambda: combine(github_topic("book", 5), pypi_search("book", 5)),

    # ── 논문/리서치 ───────────────────────────────────────
    "research.ai":        lambda: combine(pypi_search("machine-learning", 5), github_topic("research", 5)),
    "research.paper":     lambda: combine(pypi_search("scientific", 5), github_topic("paper", 5)),
    "research.data":      lambda: combine(pypi_search("data-science", 5), github_topic("data-science", 5)),

    # ── 영상 ─────────────────────────────────────────────
    "video.trending":     lambda: combine(github_topic("video", 5), npm_search("video player", 5)),
    "video.shorts":       lambda: combine(github_topic("streaming", 5), npm_search("media", 5)),

    # ── 이미지 ────────────────────────────────────────────
    "image.trending":     lambda: combine(github_topic("image-processing", 5), npm_search("image", 5)),
    "image.ai":           lambda: combine(github_topic("stable-diffusion", 5), github_topic("image-generation", 5)),
    "image.design":       lambda: combine(github_topic("svg", 5), npm_search("icon", 5)),

    # ── AI 허브 (기존 호환) ───────────────────────────────
    "aihub.trend":        lambda: combine(github_topic("llm", 5), github_topic("artificial-intelligence", 5)),
    "aihub.summary":      lambda: combine(github_topic("nlp", 5), pypi_search("transformers", 5)),

    # ── 기존 메뉴 호환 ────────────────────────────────────
    "trending.realtime":  lambda: github_trending(since="daily", limit=10),
    "trending.daily":     lambda: github_trending(since="daily", limit=10),
    "trending.weekly":    lambda: github_trending(since="weekly", limit=10),
    "trending.debate":    lambda: combine(github_topic("controversial", 5), npm_search("debate", 4)),
    "community.dev":      lambda: github_trending("python", "daily", 8),
    "community.invest":   lambda: combine(github_topic("finance", 5), pypi_search("trading", 4)),
    "community.travel":   lambda: combine(github_topic("travel", 5), npm_search("travel", 4)),
    "community.fashion":  lambda: combine(github_topic("fashion", 4), npm_search("style", 4)),
    "community.fitness":  lambda: combine(pypi_search("health", 4), npm_search("fitness", 4)),
    "knowledge.news":     lambda: combine(github_topic("web-development", 5), pypi_rss(5)),
    "knowledge.tips":     lambda: combine(github_topic("tips", 5), pypi_search("productivity", 4)),
    "knowledge.review":   lambda: combine(npm_search("review", 4), pypi_search("benchmark", 4)),
    "knowledge.tutorial": lambda: combine(github_topic("tutorial", 5), pypi_search("tutorial", 4)),
    "gallery.image":      lambda: combine(github_topic("image-processing", 5), npm_search("image", 4)),
    "gallery.meme":       lambda: github_topic("awesome-list", 8),
    "gallery.ai":         lambda: combine(github_topic("stable-diffusion", 5), github_topic("image-generation", 4)),
    "feed.latest":        lambda: combine(pypi_rss(5), npm_search("latest", 4)),
    "feed.recommended":   lambda: github_trending(since="monthly" if False else "weekly", limit=8),
}


# ── Vercel Handler ────────────────────────────────────────

class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}
            topic_key = body.get("topicKey", "")

            if not topic_key:
                return self._json(400, {"error": "topicKey is required"})

            fn = TOPIC_CRAWLERS.get(topic_key)
            if not fn:
                return self._json(400, {"error": f"Unknown topicKey: {topic_key}"})

            raw = fn()
            label = TOPIC_LABELS.get(topic_key, topic_key.split(".")[-1].replace("_", " ").title())
            category = topic_key.split(".")[0]
            items = enrich(raw, topic_key, label, category)

            self._json(200, {"items": items, "count": len(items)})

        except HTTPError as e:
            self._json(503, {"error": f"크롤링 실패: HTTP {e.code}"})
        except Exception as e:
            import traceback
            self._json(500, {"error": str(e), "trace": traceback.format_exc()[-300:]})

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


# ── 토픽 레이블 매핑 ──────────────────────────────────────

TOPIC_LABELS = {
    "home.trending": "오늘의 인기글", "home.rising": "실시간 급상승",
    "home.ai_feed": "AI 추천 피드", "home.shortform": "숏폼 콘텐츠",
    "ai.news": "AI 뉴스", "ai.tools": "AI 도구", "ai.trend": "AI 트렌드",
    "ai.summary": "AI 요약", "ai.research": "AI 리서치",
    "startup.new": "신규 스타트업", "startup.funding": "투자/펀딩", "startup.product": "신제품",
    "dev.trending": "개발 트렌딩", "dev.opensource": "오픈소스",
    "dev.javascript": "JavaScript", "dev.python": "Python",
    "dev.devops": "DevOps", "dev.tools": "개발 도구",
    "oss.trending": "OSS 트렌딩", "oss.awesome": "Awesome 리스트", "oss.new": "신규 OSS",
    "design.ui": "UI 컴포넌트", "design.ux": "UX 디자인",
    "design.tools": "디자인 도구", "design.css": "CSS/스타일",
    "it.news": "IT 뉴스", "it.security": "보안", "it.cloud": "클라우드", "it.mobile": "모바일",
    "board.free": "자유게시판", "board.question": "질문게시판",
    "board.info": "정보게시판", "board.humor": "유머게시판",
    "board.it": "IT게시판", "board.game": "게임게시판",
    "board.sports": "스포츠게시판", "board.politics": "정치게시판", "board.anon": "익명게시판",
    "humor.meme": "밈", "humor.funny": "유머",
    "game.news": "게임 뉴스", "game.indie": "인디게임", "game.review": "게임 리뷰",
    "finance.stock": "주식", "finance.crypto": "코인", "finance.invest": "투자",
    "market.deal": "핫딜", "market.coupon": "쿠폰/할인", "market.used": "중고거래",
    "job.dev": "개발 채용", "job.startup": "스타트업 채용", "job.remote": "원격 근무",
    "learn.tutorial": "튜토리얼", "learn.course": "강의/코스", "learn.book": "도서",
    "research.ai": "AI 논문", "research.paper": "최신 논문", "research.data": "데이터 사이언스",
    "video.trending": "인기 영상", "video.shorts": "숏폼",
    "image.trending": "인기 이미지", "image.ai": "AI 이미지", "image.design": "디자인 에셋",
    "aihub.trend": "AI 트렌드", "aihub.summary": "AI 요약",
    "trending.realtime": "실시간 인기", "trending.daily": "일간 베스트",
    "trending.weekly": "주간 베스트", "trending.debate": "논쟁중",
}
