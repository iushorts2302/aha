"""
/api/crawl.py — Vercel Serverless Function (Python)
한국 웹사이트 기반 메뉴별 크롤링
접근 가능 소스: github.com, registry.npmjs.org, pypi.org
"""

import json, re, random, time, datetime, sys, os
from http.server import BaseHTTPRequestHandler
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError
from urllib.parse import quote_plus

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

# ── 헬퍼 ─────────────────────────────────────────────────

def fetch(url, extra=None):
    headers = {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,*/*",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    }
    if extra:
        headers.update(extra)
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
            "id":         f"{topic_key}_{ts}_{i}",
            "topicKey":   topic_key,
            "category":   category,
            "topicLabel": topic_label,
            "title":      title[:80],
            "summary":    (item.get("summary") or "")[:120],
            "tags":       (item.get("tags") or [])[:4],
            "views": 0, "likes": 0, "comments": 0, "hot": False,
            "crawledAt":  datetime.datetime.utcnow().isoformat() + "Z",
            "type":       "crawled",
            "source":     item.get("source", ""),
        })
    return result


# ── 크롤러 함수 ───────────────────────────────────────────

def github_trending(lang="", since="daily", limit=10):
    """GitHub Trending"""
    url = f"https://github.com/trending/{lang}?since={since}"
    html = fetch(url)
    items = []
    for art in re.findall(r'<article[^>]*Box-row[^>]*>(.*?)</article>', html, re.DOTALL)[:limit]:
        name_m = re.search(r'<h2[^>]*>.*?href="(/[^"]+)"', art, re.DOTALL)
        desc_m  = re.search(r'<p[^>]*col-9[^>]*>(.*?)</p>', art, re.DOTALL)
        star_m  = re.search(r'octicon-star[^>]*>.*?</svg>\s*([\d,k]+)', art, re.DOTALL)
        lang_m  = re.search(r'itemprop="programmingLanguage"[^>]*>(.*?)<', art)
        repo = (name_m.group(1) if name_m else "").strip("/")
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
    """GitHub Topic"""
    html = fetch(f"https://github.com/topics/{topic}")
    items = []
    for art in re.findall(r'<article[^>]*>(.*?)</article>', html, re.DOTALL)[:limit]:
        href_m = re.search(r'href="(/[a-zA-Z0-9_\-]+/[a-zA-Z0-9_\-\.]+)"', art)
        desc_m = re.search(r'<p[^>]*color-fg-muted[^>]*>(.*?)</p>', art, re.DOTALL)
        star_m = re.search(r'octicon-star[^>]*>.*?</svg>\s*([\d,k]+)', art, re.DOTALL)
        if not href_m:
            continue
        repo  = href_m.group(1).strip("/")
        if "/" not in repo:
            continue
        desc  = clean(desc_m.group(1)) if desc_m else f"{topic} 저장소"
        stars = (star_m.group(1) if star_m else "").strip()
        items.append({
            "title":   f"[GitHub/{topic}] {repo.replace('/', ' / ')}",
            "summary": f"{desc[:90]}" + (f" ⭐{stars}" if stars else ""),
            "tags":    ["GitHub", topic, "오픈소스"],
            "source":  f"https://github.com/{repo}",
        })
    return items[:limit]


def github_org(org, org_label, tags=None, limit=8):
    """한국 기업 GitHub 조직 저장소"""
    html = fetch(f"https://github.com/orgs/{org}/repositories?type=public")
    skip = {'followers','following','repositories','stars','packages','projects',
            'sponsoring','orgs','settings','issues','pulls','actions','security'}
    names = re.findall(r'href="/' + re.escape(org) + r'/([a-zA-Z0-9_\-\.]+)"', html)
    names = list(dict.fromkeys(n for n in names if n.lower() not in skip))[:limit]
    items = []
    for name in names:
        items.append({
            "title":   f"[{org_label}] {name}",
            "summary": f"{org_label}({org})의 공개 오픈소스 저장소",
            "tags":    (tags or [org_label, "한국기업", "오픈소스"])[:4],
            "source":  f"https://github.com/{org}/{name}",
        })
    return items


def github_org_multi(orgs, limit_each=3):
    """여러 기업 저장소 합치기"""
    items = []
    for org, label, tags in orgs:
        try:
            items.extend(github_org(org, label, tags, limit_each))
        except Exception:
            pass
    random.shuffle(items)
    return items


def npm_search(keyword, limit=8):
    """NPM 패키지 검색"""
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


def pypi_rss(limit=8):
    """PyPI 최신 패키지 RSS"""
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


def pypi_search(keyword, limit=8):
    """PyPI 검색"""
    html = fetch(f"https://pypi.org/search/?q={quote_plus(keyword)}&o=-created")
    items = []
    for href, body in re.findall(r'<a class="package-snippet"[^>]*href="([^"]*)"[^>]*>(.*?)</a>', html, re.DOTALL)[:limit]:
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


def combine(*args, shuffle=True):
    result = []
    for a in args:
        result.extend(a)
    if shuffle:
        random.shuffle(result)
    return result


# ── 한국 기업 그룹 ─────────────────────────────────────────

KR_DEV_ORGS = [
    ("kakao",       "카카오",     ["카카오", "한국기업", "오픈소스"]),
    ("naver",       "네이버",     ["네이버", "한국기업", "오픈소스"]),
    ("line",        "라인",       ["라인", "한국기업", "오픈소스"]),
    ("toss",        "토스",       ["토스", "한국기업", "오픈소스"]),
    ("woowabros",   "우아한형제", ["배달의민족", "한국기업", "오픈소스"]),
    ("coupang",     "쿠팡",       ["쿠팡", "한국기업", "오픈소스"]),
    ("ncsoft",      "엔씨소프트", ["엔씨소프트", "게임기업", "오픈소스"]),
    ("skplanet",    "SK플래닛",   ["SK", "한국기업", "오픈소스"]),
    ("krafton-ai",  "크래프톤AI", ["크래프톤", "AI", "게임AI"]),
    ("nhn",         "NHN",        ["NHN", "한국기업", "오픈소스"]),
]

KR_AI_ORGS = [
    ("krafton-ai",  "크래프톤AI", ["AI", "게임AI", "한국"]),
    ("kakao",       "카카오",     ["카카오AI", "한국AI", "오픈소스"]),
    ("naver",       "네이버",     ["네이버AI", "HyperCLOVA", "한국AI"]),
    ("kakaoenterprise", "카카오엔터프라이즈", ["카카오", "AI", "한국"]),
]

KR_STARTUP_ORGS = [
    ("toss",        "토스",       ["핀테크", "스타트업", "한국"]),
    ("coupang",     "쿠팡",       ["이커머스", "스타트업", "한국"]),
    ("woowabros",   "배달의민족", ["배달앱", "스타트업", "한국"]),
    ("daangn",      "당근마켓",   ["당근마켓", "스타트업", "한국"]),
    ("hyperconnect","하이퍼커넥트",["하이퍼커넥트", "스타트업", "한국"]),
]

KR_GAME_ORGS = [
    ("ncsoft",      "엔씨소프트", ["MMORPG", "게임", "한국게임"]),
    ("krafton-ai",  "크래프톤",   ["배틀그라운드", "게임", "한국게임"]),
    ("nexon",       "넥슨",       ["메이플", "게임", "한국게임"]),
    ("netmarble",   "넷마블",     ["모바일게임", "게임", "한국게임"]),
]


# ── 토픽 → 크롤러 매핑 (메뉴 표 기반) ────────────────────

TOPIC_CRAWLERS = {

    # ── 홈(Home) ─────────────────────────────────────────
    "home.trending":      lambda: combine(
        github_org_multi(KR_DEV_ORGS[:5], 2),
        github_trending(since="daily", limit=4)),
    "home.rising":        lambda: combine(
        github_org_multi(KR_STARTUP_ORGS, 2),
        github_trending(since="weekly", limit=4)),
    "home.ai_feed":       lambda: combine(
        github_org_multi(KR_AI_ORGS, 3),
        github_topic("llm", 4)),
    "home.shortform":     lambda: combine(
        github_org_multi(KR_DEV_ORGS[:4], 2),
        npm_search("korean", 4)),
    "home.following":     lambda: github_trending(since="daily", limit=8),

    # ── AI 뉴스 ───────────────────────────────────────────
    # 카카오 클라우드, 네이버 클로바, 크래프톤 AI, 뤼튼(wrtn) 등
    "ai.news":            lambda: combine(
        github_org_multi(KR_AI_ORGS, 3),
        github_topic("llm", 4)),
    "ai.tools":           lambda: combine(
        npm_search("ai korean", 4),
        github_topic("chatbot", 4)),
    "ai.trend":           lambda: combine(
        github_org("krafton-ai", "크래프톤AI", ["AI", "게임AI"], 4),
        github_topic("generative-ai", 4)),
    "ai.summary":         lambda: combine(
        github_topic("nlp", 4),
        pypi_search("nlp", 4)),
    "ai.research":        lambda: combine(
        pypi_search("machine-learning", 4),
        github_topic("deep-learning", 4)),

    # ── 스타트업 ──────────────────────────────────────────
    # 토스, 쿠팡, 배민, 당근마켓, 하이퍼커넥트
    "startup.new":        lambda: github_org_multi(KR_STARTUP_ORGS, 3),
    "startup.funding":    lambda: combine(
        github_org("toss", "토스", ["핀테크", "스타트업"], 4),
        github_topic("fintech", 4)),
    "startup.product":    lambda: combine(
        github_org("daangn", "당근마켓", ["당근마켓", "스타트업"], 4),
        github_topic("open-source", 4)),

    # ── 개발(Dev) ─────────────────────────────────────────
    # GeekNews(403대체) → 네이버/카카오/라인 GitHub
    "dev.trending":       lambda: combine(
        github_org_multi(KR_DEV_ORGS[:6], 2),
        github_trending(since="daily", limit=2)),
    "dev.opensource":     lambda: combine(
        github_org_multi(KR_DEV_ORGS, 2),
        github_topic("awesome-list", 3)),
    "dev.javascript":     lambda: combine(
        github_org("naver", "네이버", ["JavaScript", "네이버", "프론트엔드"], 4),
        npm_search("korean javascript", 4)),
    "dev.python":         lambda: combine(
        github_trending("python", "daily", 5),
        pypi_rss(5)),
    "dev.devops":         lambda: combine(
        github_org("kakao", "카카오", ["DevOps", "클라우드", "카카오"], 4),
        github_topic("kubernetes", 4)),
    "dev.tools":          lambda: combine(
        npm_search("korean cli", 4),
        pypi_search("korean", 4)),

    # ── 오픈소스(OSS) ─────────────────────────────────────
    "oss.trending":       lambda: github_org_multi(KR_DEV_ORGS, 2),
    "oss.awesome":        lambda: combine(
        github_topic("awesome-list", 5),
        github_topic("korean", 5)),
    "oss.new":            lambda: combine(
        pypi_rss(4),
        npm_search("korean open source", 4)),

    # ── IT 뉴스 ───────────────────────────────────────────
    # ZDNet Korea(403) → 네이버/카카오 기술 블로그 대체
    "it.news":            lambda: combine(
        github_org_multi(KR_DEV_ORGS[:4], 2),
        github_topic("web-development", 4)),
    "it.security":        lambda: combine(
        github_topic("security", 5),
        pypi_search("security", 4)),
    "it.cloud":           lambda: combine(
        github_org("kakao", "카카오클라우드", ["클라우드", "카카오", "인프라"], 4),
        github_topic("cloud-native", 4)),
    "it.mobile":          lambda: combine(
        github_org("line", "라인", ["모바일", "iOS", "Android"], 4),
        npm_search("react-native korean", 4)),

    # ── 디자인 ────────────────────────────────────────────
    # Dribbble/Behance(403) → GitHub 디자인 시스템
    "design.ui":          lambda: combine(
        npm_search("korean ui component", 4),
        github_topic("design-system", 4)),
    "design.ux":          lambda: combine(
        github_topic("ux", 5),
        npm_search("korean ux", 4)),
    "design.tools":       lambda: combine(
        npm_search("design tool", 4),
        github_topic("design-tools", 4)),
    "design.css":         lambda: combine(
        github_trending("css", "daily", 5),
        npm_search("korean css", 4)),

    # ── 게시판 ────────────────────────────────────────────
    # 클리앙/에펨코리아(403) → GitHub 한국 관련
    "board.free":         lambda: combine(
        github_org_multi(KR_DEV_ORGS[:4], 2),
        npm_search("popular", 4)),
    "board.question":     lambda: combine(
        pypi_search("tutorial", 4),
        npm_search("guide", 4)),
    "board.info":         lambda: combine(
        pypi_rss(4),
        github_topic("tutorial", 4)),
    "board.humor":        lambda: github_topic("awesome-list", 8),
    "board.it":           lambda: combine(
        github_org_multi(KR_DEV_ORGS[:5], 2),
        github_trending("python", "daily", 2)),
    "board.game":         lambda: combine(
        github_org_multi(KR_GAME_ORGS, 3),
        github_topic("game", 3)),
    "board.sports":       lambda: combine(
        github_topic("sports", 5),
        npm_search("sports", 4)),
    "board.politics":     lambda: combine(
        github_topic("government", 5),
        pypi_rss(4)),
    "board.anon":         lambda: github_trending(since="weekly", limit=8),

    # ── 유머/밈 ───────────────────────────────────────────
    "humor.meme":         lambda: github_topic("awesome-list", 8),
    "humor.funny":        lambda: combine(
        github_topic("fun", 5),
        npm_search("funny", 4)),

    # ── 게임 ─────────────────────────────────────────────
    # 인벤(403) → 한국 게임사 GitHub
    "game.news":          lambda: combine(
        github_org_multi(KR_GAME_ORGS, 3),
        github_topic("game-development", 3)),
    "game.indie":         lambda: github_topic("indie-game", 8),
    "game.review":        lambda: combine(
        github_org_multi(KR_GAME_ORGS, 2),
        npm_search("game", 4)),

    # ── 주식/코인 ─────────────────────────────────────────
    # TradingView/CoinMarketCap(403) → GitHub 금융/블록체인
    "finance.stock":      lambda: combine(
        github_topic("finance", 5),
        pypi_search("trading", 5)),
    "finance.crypto":     lambda: combine(
        github_topic("blockchain", 5),
        pypi_search("cryptocurrency", 4)),
    "finance.invest":     lambda: combine(
        github_topic("quantitative-finance", 4),
        npm_search("finance korea", 4)),

    # ── 쇼핑/핫딜 ─────────────────────────────────────────
    # 뽐뿌/퀘이사존(403) → 쿠팡 GitHub
    "market.deal":        lambda: combine(
        github_org("coupang", "쿠팡", ["이커머스", "쇼핑", "쿠팡"], 4),
        github_topic("ecommerce", 4)),
    "market.coupon":      lambda: combine(
        npm_search("coupon discount", 4),
        pypi_search("discount", 4)),
    "market.used":        lambda: combine(
        github_org("daangn", "당근마켓", ["중고거래", "당근마켓", "P2P"], 4),
        github_topic("marketplace", 4)),

    # ── 취업 ─────────────────────────────────────────────
    # 원티드/로켓펀치(403) → 한국 기업 채용 관련 GitHub
    "job.dev":            lambda: combine(
        github_org_multi(KR_DEV_ORGS[:4], 2),
        npm_search("career developer", 4)),
    "job.startup":        lambda: combine(
        github_org_multi(KR_STARTUP_ORGS, 2),
        github_topic("startup", 4)),
    "job.remote":         lambda: combine(
        github_topic("remote-work", 5),
        npm_search("remote work", 4)),

    # ── 학습/강의 ─────────────────────────────────────────
    # Inflearn(403) → GitHub 한국어 학습자료
    "learn.tutorial":     lambda: combine(
        github_topic("tutorial", 5),
        github_topic("korean", 5)),
    "learn.course":       lambda: combine(
        github_topic("learning", 5),
        npm_search("education korean", 4)),
    "learn.book":         lambda: combine(
        github_topic("book", 5),
        pypi_search("book", 4)),

    # ── 논문/리서치 ───────────────────────────────────────
    # arXiv(403) → GitHub 논문 구현체
    "research.ai":        lambda: combine(
        pypi_search("machine-learning", 4),
        github_topic("research", 4)),
    "research.paper":     lambda: combine(
        pypi_search("scientific", 4),
        github_topic("paper-implementation", 4)),
    "research.data":      lambda: combine(
        pypi_search("data-science", 4),
        github_topic("data-science", 4)),

    # ── 영상 ─────────────────────────────────────────────
    "video.trending":     lambda: combine(
        github_topic("video", 5),
        npm_search("video player", 4)),
    "video.shorts":       lambda: combine(
        github_topic("streaming", 5),
        npm_search("media", 4)),

    # ── 이미지 ────────────────────────────────────────────
    "image.trending":     lambda: combine(
        github_topic("image-processing", 5),
        npm_search("image", 4)),
    "image.ai":           lambda: combine(
        github_topic("stable-diffusion", 5),
        github_topic("image-generation", 4)),
    "image.design":       lambda: combine(
        github_topic("svg", 5),
        npm_search("icon korean", 4)),

    # ── AI 허브 (기존 호환) ───────────────────────────────
    "aihub.trend":        lambda: combine(
        github_org_multi(KR_AI_ORGS, 3),
        github_topic("llm", 4)),
    "aihub.summary":      lambda: combine(
        github_topic("nlp", 5),
        pypi_search("transformers", 4)),

    # ── 기존 메뉴 호환 ────────────────────────────────────
    "trending.realtime":  lambda: combine(
        github_org_multi(KR_DEV_ORGS[:5], 2),
        github_trending(since="daily", limit=2)),
    "trending.daily":     lambda: github_org_multi(KR_DEV_ORGS, 2),
    "trending.weekly":    lambda: combine(
        github_org_multi(KR_STARTUP_ORGS, 2),
        github_trending(since="weekly", limit=4)),
    "trending.debate":    lambda: combine(
        github_topic("controversial", 4),
        npm_search("popular", 4)),
    "community.dev":      lambda: github_org_multi(KR_DEV_ORGS, 2),
    "community.invest":   lambda: combine(
        github_topic("finance", 4),
        pypi_search("trading", 4)),
    "community.travel":   lambda: combine(
        github_topic("travel", 5),
        npm_search("travel", 4)),
    "community.fashion":  lambda: combine(
        github_topic("fashion", 4),
        npm_search("style", 4)),
    "community.fitness":  lambda: combine(
        pypi_search("health", 4),
        npm_search("fitness", 4)),
    "knowledge.news":     lambda: combine(
        github_org_multi(KR_DEV_ORGS[:4], 2),
        github_topic("web-development", 4)),
    "knowledge.tips":     lambda: combine(
        github_topic("tips", 5),
        pypi_search("productivity", 4)),
    "knowledge.review":   lambda: combine(
        npm_search("review", 4),
        pypi_search("benchmark", 4)),
    "knowledge.tutorial": lambda: combine(
        github_topic("tutorial", 5),
        github_topic("korean", 4)),
    "gallery.image":      lambda: combine(
        github_topic("image-processing", 5),
        npm_search("image", 4)),
    "gallery.meme":       lambda: github_topic("awesome-list", 8),
    "gallery.ai":         lambda: combine(
        github_topic("stable-diffusion", 5),
        github_topic("image-generation", 4)),
    "feed.latest":        lambda: combine(pypi_rss(5), npm_search("korean", 4)),
    "feed.recommended":   lambda: github_org_multi(KR_DEV_ORGS[:5], 2),
}


# ── 토픽 레이블 ───────────────────────────────────────────

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


# ── Vercel Handler ────────────────────────────────────────

class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors(); self.end_headers()

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

            raw   = fn()
            label = TOPIC_LABELS.get(topic_key, topic_key.split(".")[-1].replace("_", " ").title())
            cat   = topic_key.split(".")[0]
            items = enrich(raw, topic_key, label, cat)

            self._json(200, {"items": items, "count": len(items)})

        except HTTPError as e:
            self._json(503, {"error": f"크롤링 실패: HTTP {e.code}"})
        except Exception as e:
            import traceback
            self._json(500, {"error": str(e), "trace": traceback.format_exc()[-400:]})

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

    def log_message(self, *args): pass
