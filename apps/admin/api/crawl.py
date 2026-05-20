"""
/api/crawl — 토픽별 크롤링 엔드포인트
허용 도메인: github.com, api.github.com, registry.npmjs.org, pypi.org

[설계 원칙]
- 각 토픽의 성격에 맞는 소스 사용
- 중복 최소화: 토픽마다 서로 다른 쿼리/소스
- dev.*     → 실제 개발 관련 (언어별 GitHub Trending, NPM/PyPI 패키지)
- ai.*      → AI/ML 특화 (LLM, ML 토픽, AI 프레임워크)
- game.*    → 게임 개발 관련 저장소
- finance.* → 금융/투자/블록체인 코드 프로젝트
- startup.* → 한국 스타트업 오픈소스
- oss.*     → 순수 오픈소스 트렌드
- learn.*   → 학습자료/튜토리얼
- job.*     → 채용/커리어 관련 리소스
- it.*      → IT 인프라/보안/클라우드
"""

import json, re, random, time, datetime, sys, os
from http.server import BaseHTTPRequestHandler
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError
from urllib.parse import quote_plus

UA = "Mozilla/5.0 (compatible; AhaBot/1.0)"

# ── 공통 헬퍼 ─────────────────────────────────────────────

def fetch(url, extra=None):
    h = {"User-Agent": UA, "Accept": "application/json,text/html,*/*"}
    if extra: h.update(extra)
    with urlopen(Request(url, headers=h), timeout=12) as r:
        return r.read().decode("utf-8", errors="ignore")

def fetch_json(url):
    return json.loads(fetch(url, {"Accept": "application/json"}))

def clean(t):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', t or '')).strip()

def enrich(items, topic_key, label, category, limit=8):
    out, ts = [], int(time.time())
    for i, item in enumerate(items[:limit]):
        title = (item.get("title") or "").strip()
        if not title: continue
        out.append({
            "id":         f"{topic_key}_{ts}_{i}",
            "topicKey":   topic_key,
            "category":   category,
            "topicLabel": label,
            "title":      title[:100],
            "summary":    (item.get("summary") or "")[:150],
            "tags":       (item.get("tags") or [])[:5],
            "views": 0, "likes": 0, "comments": 0, "hot": False,
            "crawledAt":  datetime.datetime.utcnow().isoformat() + "Z",
            "type":       "crawled",
            "source":     item.get("source", ""),
        })
    return out

# ── GitHub API ────────────────────────────────────────────

def gh_trending(lang="", since="daily", limit=8):
    """GitHub Trending — 언어별"""
    url = f"https://github.com/trending/{lang}?since={since}"
    html = fetch(url)
    items = []
    for art in re.findall(r'<article[^>]*>(.*?)</article>', html, re.DOTALL)[:limit]:
        name_m = re.search(r'href="(/[^"]+)"', art)
        desc_m = re.search(r'<p[^>]*col-9[^>]*>(.*?)</p>', art, re.DOTALL)
        star_m = re.search(r'octicon-star[^>]*>.*?</svg>\s*([\d,k]+)', art, re.DOTALL)
        lang_m = re.search(r'itemprop="programmingLanguage"[^>]*>(.*?)<', art)
        repo = (name_m.group(1) if name_m else "").strip("/")
        if not repo or "/" not in repo: continue
        desc  = clean(desc_m.group(1)) if desc_m else ""
        stars = (star_m.group(1) if star_m else "").strip()
        pl    = clean(lang_m.group(1)) if lang_m else ""
        items.append({
            "title":   f"{repo.replace('/', ' / ')}",
            "summary": f"{desc[:100]}" + (f"  ⭐{stars}" if stars else "") + (f"  [{pl}]" if pl else ""),
            "tags":    list(filter(None, ["GitHub", pl, "Trending"]))[:4],
            "source":  f"https://github.com/{repo}",
        })
    return items

def gh_topic(topic, limit=8):
    """GitHub Topic 검색"""
    html = fetch(f"https://github.com/topics/{topic}")
    items = []
    for art in re.findall(r'<article[^>]*>(.*?)</article>', html, re.DOTALL)[:limit]:
        href_m = re.search(r'href="(/[a-zA-Z0-9_\-]+/[a-zA-Z0-9_\-\.]+)"', art)
        desc_m = re.search(r'<p[^>]*color-fg-muted[^>]*>(.*?)</p>', art, re.DOTALL)
        star_m = re.search(r'octicon-star[^>]*>.*?</svg>\s*([\d,k]+)', art, re.DOTALL)
        if not href_m: continue
        repo  = href_m.group(1).strip("/")
        if "/" not in repo: continue
        desc  = clean(desc_m.group(1)) if desc_m else ""
        stars = (star_m.group(1) if star_m else "").strip()
        items.append({
            "title":   f"{repo.replace('/', ' / ')}",
            "summary": f"{desc[:100]}" + (f"  ⭐{stars}" if stars else ""),
            "tags":    ["GitHub", topic],
            "source":  f"https://github.com/{repo}",
        })
    return items[:limit]

def gh_search_api(q, sort="stars", limit=8):
    """GitHub API 검색"""
    url = f"https://api.github.com/search/repositories?q={quote_plus(q)}&sort={sort}&order=desc&per_page={limit}"
    try:
        d = fetch_json(url)
        items = []
        for r in d.get("items", [])[:limit]:
            items.append({
                "title":   f"{r['full_name']}",
                "summary": f"{r.get('description','')[:100]}  ⭐{r.get('stargazers_count',0):,}  [{r.get('language','')}]",
                "tags":    list(filter(None, ["GitHub", r.get("language",""), r.get("topics",[""])[0] if r.get("topics") else ""]))[:4],
                "source":  r["html_url"],
            })
        return items
    except Exception:
        return []

def gh_releases(owner, repo, limit=5):
    """GitHub 릴리즈 — 특정 프로젝트의 최신 릴리즈"""
    try:
        d = fetch_json(f"https://api.github.com/repos/{owner}/{repo}/releases?per_page={limit}")
        items = []
        for r in d[:limit]:
            items.append({
                "title":   f"[{owner}/{repo}] {r.get('name') or r.get('tag_name','')}",
                "summary": (r.get("body") or "")[:120].replace("\n", " "),
                "tags":    ["릴리즈", owner, repo],
                "source":  r.get("html_url",""),
            })
        return items
    except Exception:
        return []

def gh_org_repos(org, label, tags=None, limit=6):
    """특정 GitHub 조직의 최근 업데이트 저장소"""
    try:
        d = fetch_json(f"https://api.github.com/orgs/{org}/repos?sort=updated&per_page={limit}")
        items = []
        for r in d[:limit]:
            if r.get("private") or r.get("fork"): continue
            items.append({
                "title":   f"[{label}] {r['name']}",
                "summary": f"{r.get('description','')[:100]}  ⭐{r.get('stargazers_count',0):,}",
                "tags":    (tags or [label, "오픈소스"])[:4],
                "source":  r["html_url"],
            })
        return items
    except Exception:
        return []

# ── NPM / PyPI ────────────────────────────────────────────

def npm_search(q, limit=8):
    d = fetch_json(f"https://registry.npmjs.org/-/v1/search?text={quote_plus(q)}&size={limit}&popularity=1.0")
    items = []
    for obj in d.get("objects", []):
        p = obj.get("package", {})
        name, ver = p.get("name",""), p.get("version","")
        desc = (p.get("description") or "")[:100]
        kws  = (p.get("keywords") or [])[:3]
        items.append({
            "title":   f"{name}  v{ver}",
            "summary": desc,
            "tags":    (["NPM"] + kws)[:4],
            "source":  f"https://www.npmjs.com/package/{name}",
        })
    return items

def npm_new(limit=8):
    """NPM 최신 패키지"""
    d = fetch_json(f"https://registry.npmjs.org/-/v1/search?text=*&size={limit}&quality=1.0&maintenance=1.0")
    items = []
    for obj in d.get("objects", []):
        p = obj.get("package", {})
        name, ver = p.get("name",""), p.get("version","")
        desc = (p.get("description") or "")[:100]
        items.append({
            "title":   f"{name}  v{ver}",
            "summary": desc,
            "tags":    ["NPM", "JavaScript", "패키지"],
            "source":  f"https://www.npmjs.com/package/{name}",
        })
    return items

def pypi_rss(limit=8):
    html = fetch("https://pypi.org/rss/updates.xml")
    items = []
    for raw in re.findall(r'<item>(.*?)</item>', html, re.DOTALL)[:limit]:
        t = re.search(r'<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>', raw)
        d = re.search(r'<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</description>', raw, re.DOTALL)
        l = re.search(r'<link>(.*?)</link>', raw)
        title = clean(t.group(1)) if t else ""
        desc  = clean(d.group(1))[:100] if d else ""
        if title:
            items.append({
                "title":   f"{title}",
                "summary": desc or "PyPI 패키지 업데이트",
                "tags":    ["Python", "PyPI"],
                "source":  (l.group(1).strip() if l else ""),
            })
    return items

def pypi_search(q, limit=8):
    html = fetch(f"https://pypi.org/search/?q={quote_plus(q)}&o=-created")
    items = []
    for href, body in re.findall(r'<a class="package-snippet"[^>]*href="([^"]*)"[^>]*>(.*?)</a>', html, re.DOTALL)[:limit]:
        nm = re.search(r'package-snippet__name[^>]*>(.*?)<', body)
        vr = re.search(r'package-snippet__version[^>]*>(.*?)<', body)
        ds = re.search(r'package-snippet__description[^>]*>(.*?)<', body)
        name = clean(nm.group(1)) if nm else href
        ver  = clean(vr.group(1)) if vr else ""
        desc = clean(ds.group(1))[:100] if ds else ""
        if name:
            items.append({
                "title":   f"{name}" + (f"  {ver}" if ver else ""),
                "summary": desc,
                "tags":    ["Python", "PyPI", q],
                "source":  f"https://pypi.org{href}",
            })
    return items

# ── 믹서 ─────────────────────────────────────────────────

def mix(*args, shuffle=True):
    r = []
    for a in args: r.extend(a)
    if shuffle: random.shuffle(r)
    return r

# ── 한국 기업 그룹 ─────────────────────────────────────────

KR_STARTUPS = [  # 스타트업/유니콘
    ("toss",       "토스",       ["핀테크","토스","오픈소스"]),
    ("daangn",     "당근마켓",   ["중고거래","당근","오픈소스"]),
    ("woowabros",  "배달의민족", ["배달앱","우아한형제","오픈소스"]),
    ("hyperconnect","하이퍼커넥트",["영상통화","스타트업","오픈소스"]),
    ("coupang",    "쿠팡",       ["이커머스","쿠팡","오픈소스"]),
]

KR_BIG_TECH = [  # 대기업
    ("kakao",     "카카오",  ["카카오","한국기업","오픈소스"]),
    ("naver",     "네이버",  ["네이버","한국기업","오픈소스"]),
    ("line",      "라인",    ["라인","메신저","오픈소스"]),
    ("ncsoft",    "엔씨소프트",["게임","엔씨","오픈소스"]),
    ("nhn",       "NHN",     ["NHN","한국기업","오픈소스"]),
]

KR_AI = [
    ("kakao",            "카카오AI",  ["카카오","AI","한국AI"]),
    ("naver",            "네이버AI",  ["네이버","CLOVA","한국AI"]),
    ("krafton-ai",       "크래프톤AI",["게임AI","크래프톤","한국AI"]),
    ("kakaoenterprise",  "카카오엔터프라이즈",["카카오","엔터프라이즈","AI"]),
]

KR_GAME = [
    ("ncsoft",    "엔씨소프트",["MMORPG","엔씨","한국게임"]),
    ("krafton-ai","크래프톤", ["배틀그라운드","크래프톤","한국게임"]),
    ("nexon",     "넥슨",     ["메이플","넥슨","한국게임"]),
    ("netmarble", "넷마블",   ["모바일게임","넷마블","한국게임"]),
]

def kr_orgs(orgs, limit_each=4):
    """여러 한국 기업 저장소 합치기 (API 기반, 최신 업데이트순)"""
    items = []
    for org, label, tags in orgs:
        try:
            items.extend(gh_org_repos(org, label, tags, limit_each))
        except Exception:
            pass
    random.shuffle(items)
    return items

# ═══════════════════════════════════════════════════════════
# TOPIC_CRAWLERS — 토픽별 크롤러 매핑
# 각 토픽의 성격에 맞는 소스만 사용
# ═══════════════════════════════════════════════════════════

TOPIC_CRAWLERS = {

    # ── 홈 (종합 피드) ────────────────────────────────────
    # 전체 GitHub Trending + 한국 기업 혼합
    "home.trending":   lambda: mix(
        gh_trending(since="daily", limit=5),
        kr_orgs(KR_BIG_TECH[:3], 2)),
    "home.rising":     lambda: mix(
        gh_trending(since="weekly", limit=5),
        kr_orgs(KR_STARTUPS[:3], 2)),
    "home.ai_feed":    lambda: mix(
        gh_search_api("topic:llm stars:>500", "stars", 5),
        kr_orgs(KR_AI[:2], 3)),
    "home.shortform":  lambda: mix(
        gh_trending(since="daily", limit=4),
        npm_search("javascript popular", 4)),
    "home.following":  lambda: gh_trending(since="daily", limit=8),

    # ── AI 뉴스 ─────────────────────────────────────────
    # LLM/ML/AI 프레임워크 실제 저장소
    "ai.news":         lambda: mix(
        gh_search_api("topic:large-language-model stars:>1000", "updated", 4),
        gh_search_api("topic:chatgpt stars:>500", "updated", 4)),
    "ai.tools":        lambda: mix(
        gh_search_api("topic:ai-tools stars:>200", "stars", 4),
        npm_search("ai llm openai", 4)),
    "ai.trend":        lambda: mix(
        gh_search_api("topic:generative-ai stars:>500", "stars", 4),
        gh_search_api("topic:diffusion-model stars:>300", "stars", 4)),
    "ai.research":     lambda: mix(
        gh_search_api("topic:deep-learning stars:>1000", "updated", 4),
        pypi_search("transformer", 4)),
    "ai.summary":      lambda: mix(
        gh_search_api("topic:nlp stars:>500", "stars", 4),
        pypi_search("llm", 4)),

    # ── 스타트업 ─────────────────────────────────────────
    # 한국 스타트업 실제 오픈소스 프로젝트
    "startup.new":     lambda: kr_orgs(KR_STARTUPS, 3),
    "startup.funding": lambda: mix(
        kr_orgs([("toss","토스",["핀테크","투자"])], 4),
        gh_search_api("topic:fintech language:TypeScript stars:>100", "updated", 4)),
    "startup.product": lambda: mix(
        kr_orgs([("daangn","당근마켓",["C2C","앱"]),("hyperconnect","하이퍼커넥트",["영상","앱"])], 3),
        gh_search_api("topic:mobile-app language:Swift stars:>200", "stars", 4)),

    # ── 개발 (Dev) ──────────────────────────────────────
    # 언어별 실제 Trending
    "dev.trending":    lambda: gh_trending(since="daily", limit=8),
    "dev.javascript":  lambda: mix(
        gh_trending("javascript", "daily", 5),
        npm_search("javascript framework", 4)),
    "dev.typescript":  lambda: mix(
        gh_trending("typescript", "daily", 5),
        npm_search("typescript utility", 4)),
    "dev.python":      lambda: mix(
        gh_trending("python", "daily", 5),
        pypi_rss(4)),
    "dev.rust":        lambda: mix(
        gh_trending("rust", "daily", 5),
        gh_search_api("topic:rust-lang stars:>500", "stars", 3)),
    "dev.go":          lambda: mix(
        gh_trending("go", "daily", 5),
        gh_search_api("topic:golang stars:>500", "stars", 3)),
    "dev.opensource":  lambda: mix(
        gh_topic("open-source", 4),
        kr_orgs(KR_BIG_TECH, 2)),
    "dev.devops":      lambda: mix(
        gh_search_api("topic:devops stars:>1000", "stars", 4),
        gh_search_api("topic:kubernetes stars:>1000", "updated", 4)),
    "dev.tools":       lambda: mix(
        npm_search("developer tools cli", 4),
        pypi_search("development tools", 4)),

    # ── 오픈소스 ─────────────────────────────────────────
    "oss.trending":    lambda: mix(
        gh_trending(since="weekly", limit=5),
        kr_orgs(KR_BIG_TECH + KR_STARTUPS, 2)),
    "oss.awesome":     lambda: mix(
        gh_topic("awesome-list", 5),
        gh_search_api("awesome topic:awesome stars:>5000", "stars", 4)),
    "oss.new":         lambda: mix(
        pypi_rss(5),
        npm_new(4)),

    # ── IT 뉴스 ─────────────────────────────────────────
    # 인프라/클라우드/보안 실제 프로젝트
    "it.news":         lambda: mix(
        gh_search_api("topic:web-development stars:>1000", "updated", 4),
        gh_trending(since="daily", limit=4)),
    "it.security":     lambda: mix(
        gh_search_api("topic:security topic:cybersecurity stars:>500", "updated", 4),
        gh_search_api("topic:penetration-testing stars:>300", "stars", 4)),
    "it.cloud":        lambda: mix(
        gh_search_api("topic:cloud-native stars:>1000", "updated", 4),
        gh_search_api("topic:aws OR topic:gcp OR topic:azure stars:>500", "stars", 4)),
    "it.mobile":       lambda: mix(
        gh_search_api("topic:ios OR topic:android stars:>500", "updated", 4),
        gh_trending("swift", "daily", 4)),
    "it.database":     lambda: mix(
        gh_search_api("topic:database stars:>1000", "stars", 4),
        gh_search_api("topic:sql stars:>500", "updated", 4)),

    # ── 디자인 ──────────────────────────────────────────
    "design.ui":       lambda: mix(
        gh_search_api("topic:ui-components stars:>500", "stars", 4),
        npm_search("ui component design system", 4)),
    "design.ux":       lambda: mix(
        gh_search_api("topic:design-system stars:>500", "stars", 4),
        npm_search("ux design tool", 4)),
    "design.tools":    lambda: mix(
        gh_search_api("topic:design-tools stars:>300", "stars", 4),
        npm_search("figma sketch design", 4)),
    "design.css":      lambda: mix(
        gh_trending("css", "daily", 5),
        npm_search("css framework", 4)),

    # ── 게임 ──────────────────────────────────────────
    # 게임 엔진/개발 도구 + 한국 게임사 오픈소스
    "game.news":       lambda: mix(
        gh_search_api("topic:game-engine stars:>500", "updated", 4),
        kr_orgs(KR_GAME, 3)),
    "game.indie":      lambda: mix(
        gh_search_api("topic:indie-game stars:>100", "stars", 4),
        gh_search_api("topic:game-jam stars:>50", "updated", 4)),
    "game.review":     lambda: mix(
        kr_orgs(KR_GAME, 4),
        gh_search_api("topic:unity OR topic:unreal stars:>500", "updated", 4)),
    "game.dev":        lambda: mix(
        gh_trending(since="daily", limit=4),
        gh_search_api("topic:gamedev stars:>300", "stars", 4)),

    # ── 주식/코인 ───────────────────────────────────────
    # 금융 분석 도구/퀀트/블록체인 프로젝트
    "finance.stock":   lambda: mix(
        gh_search_api("topic:algorithmic-trading stars:>300", "stars", 4),
        pypi_search("stock market trading", 4)),
    "finance.crypto":  lambda: mix(
        gh_search_api("topic:blockchain stars:>500", "updated", 4),
        gh_search_api("topic:defi stars:>300", "stars", 4)),
    "finance.invest":  lambda: mix(
        gh_search_api("topic:quantitative-finance stars:>300", "stars", 4),
        pypi_search("investment portfolio", 4)),
    "finance.data":    lambda: mix(
        gh_search_api("topic:financial-data stars:>200", "stars", 4),
        pypi_search("finance data", 4)),

    # ── 마켓/쇼핑 ───────────────────────────────────────
    "market.deal":     lambda: mix(
        gh_search_api("topic:ecommerce stars:>500", "updated", 4),
        npm_search("ecommerce shopping cart", 4)),
    "market.coupon":   lambda: mix(
        gh_search_api("topic:price-tracking stars:>100", "stars", 4),
        npm_search("discount coupon promo", 4)),
    "market.used":     lambda: mix(
        gh_org_repos("daangn", "당근마켓", ["C2C","중고거래"], 4),
        gh_search_api("topic:marketplace stars:>300", "stars", 4)),

    # ── 취업 ───────────────────────────────────────────
    # 취업 준비 리소스/알고리즘/인터뷰
    "job.dev":         lambda: mix(
        gh_search_api("topic:coding-interview stars:>5000", "stars", 4),
        gh_search_api("topic:interview-questions stars:>3000", "stars", 4)),
    "job.startup":     lambda: mix(
        kr_orgs(KR_STARTUPS, 3),
        gh_search_api("topic:startup stars:>300", "stars", 3)),
    "job.remote":      lambda: mix(
        gh_search_api("topic:remote-work stars:>500", "stars", 4),
        npm_search("productivity workflow", 4)),
    "job.algorithm":   lambda: mix(
        gh_search_api("topic:algorithms stars:>5000", "stars", 4),
        gh_search_api("topic:data-structures stars:>3000", "stars", 4)),

    # ── 학습 ───────────────────────────────────────────
    # 튜토리얼/강의자료/책 코드
    "learn.tutorial":  lambda: mix(
        gh_search_api("topic:tutorial stars:>3000", "stars", 4),
        gh_search_api("topic:learning stars:>2000", "stars", 4)),
    "learn.course":    lambda: mix(
        gh_search_api("topic:course stars:>2000", "stars", 4),
        gh_search_api("topic:education stars:>1000", "stars", 4)),
    "learn.book":      lambda: mix(
        gh_search_api("topic:book stars:>2000", "stars", 4),
        gh_search_api("topic:programming-books stars:>1000", "stars", 4)),
    "learn.korean":    lambda: mix(
        gh_search_api("topic:korean stars:>100", "stars", 4),
        gh_search_api("language:korean stars:>50", "stars", 4)),

    # ── 논문/리서치 ────────────────────────────────────
    "research.ai":     lambda: mix(
        gh_search_api("topic:paper-implementation stars:>500", "updated", 4),
        pypi_search("machine learning research", 4)),
    "research.paper":  lambda: mix(
        gh_search_api("topic:research stars:>1000", "stars", 4),
        pypi_search("scientific computing", 4)),
    "research.data":   lambda: mix(
        gh_search_api("topic:data-science stars:>1000", "stars", 4),
        pypi_search("data analysis pandas", 4)),

    # ── 영상/미디어 ────────────────────────────────────
    "video.trending":  lambda: mix(
        gh_search_api("topic:video-streaming stars:>300", "stars", 4),
        npm_search("video player streaming", 4)),
    "video.shorts":    lambda: mix(
        gh_search_api("topic:short-video stars:>100", "stars", 4),
        npm_search("media clip trim", 4)),

    # ── 이미지/AI 이미지 ───────────────────────────────
    "image.trending":  lambda: mix(
        gh_search_api("topic:image-processing stars:>500", "stars", 4),
        npm_search("image optimization", 4)),
    "image.ai":        lambda: mix(
        gh_search_api("topic:stable-diffusion stars:>1000", "updated", 4),
        gh_search_api("topic:image-generation stars:>500", "stars", 4)),
    "image.design":    lambda: mix(
        gh_search_api("topic:svg stars:>500", "stars", 4),
        npm_search("icon svg design", 4)),

    # ── 유머/밈 ────────────────────────────────────────
    "humor.meme":      lambda: gh_search_api("topic:awesome-list stars:>5000", "stars", 8),
    "humor.funny":     lambda: mix(
        gh_search_api("topic:fun project:>100", "stars", 4),
        gh_search_api("topic:joke stars:>100", "stars", 4)),

    # ── 게시판 ─────────────────────────────────────────
    "board.free":      lambda: mix(
        gh_trending(since="daily", limit=4),
        kr_orgs(KR_BIG_TECH[:3], 2)),
    "board.question":  lambda: mix(
        gh_search_api("topic:tutorial stars:>1000", "stars", 4),
        gh_search_api("topic:faq stars:>200", "stars", 4)),
    "board.info":      lambda: mix(
        gh_search_api("topic:awesome stars:>5000", "stars", 4),
        npm_search("utility helper", 4)),
    "board.humor":     lambda: gh_search_api("topic:awesome-list stars:>5000", "stars", 8),
    "board.it":        lambda: mix(
        gh_trending(since="daily", limit=4),
        kr_orgs(KR_BIG_TECH, 2)),
    "board.game":      lambda: mix(
        kr_orgs(KR_GAME, 4),
        gh_search_api("topic:game stars:>500", "updated", 4)),
    "board.sports":    lambda: gh_search_api("topic:sports stats:>100", "stars", 8),
    "board.politics":  lambda: gh_search_api("topic:open-government stars:>300", "stars", 8),
    "board.anon":      lambda: gh_trending(since="weekly", limit=8),

    # ── AI 허브 ────────────────────────────────────────
    "aihub.trend":     lambda: mix(
        gh_search_api("topic:llm stars:>1000", "updated", 4),
        kr_orgs(KR_AI, 2)),
    "aihub.summary":   lambda: mix(
        gh_search_api("topic:nlp stars:>1000", "stars", 4),
        pypi_search("llm transformer", 4)),

    # ── 인기 트렌딩 ────────────────────────────────────
    "trending.realtime": lambda: gh_trending(since="daily", limit=8),
    "trending.daily":    lambda: mix(
        gh_trending(since="daily", limit=5),
        kr_orgs(KR_BIG_TECH[:3], 2)),
    "trending.weekly":   lambda: mix(
        gh_trending(since="weekly", limit=5),
        kr_orgs(KR_STARTUPS[:3], 2)),
    "trending.debate":   lambda: gh_search_api("topic:discussion stars:>1000", "updated", 8),

    # ── 피드 ───────────────────────────────────────────
    "feed.latest":     lambda: mix(pypi_rss(4), npm_new(4)),
    "feed.recommended":lambda: mix(
        gh_trending(since="daily", limit=4),
        kr_orgs(KR_BIG_TECH[:3], 2)),

    # ── 커뮤니티 ───────────────────────────────────────
    "community.dev":    lambda: mix(
        gh_trending("python", "daily", 4),
        kr_orgs(KR_BIG_TECH[:3], 2)),
    "community.invest": lambda: mix(
        gh_search_api("topic:quantitative-finance stars:>300", "stars", 4),
        pypi_search("trading finance", 4)),
    "community.travel": lambda: gh_search_api("topic:travel stars:>200", "stars", 8),
    "community.fashion":lambda: gh_search_api("topic:fashion stars:>100", "stars", 8),
    "community.fitness":lambda: mix(
        pypi_search("health fitness", 4),
        npm_search("fitness health", 4)),

    # ── 갤러리 ─────────────────────────────────────────
    "gallery.image":   lambda: mix(
        gh_search_api("topic:image-processing stars:>500", "stars", 4),
        npm_search("image gallery", 4)),
    "gallery.meme":    lambda: gh_search_api("topic:awesome-list stars:>5000", "stars", 8),
    "gallery.ai":      lambda: mix(
        gh_search_api("topic:stable-diffusion stars:>1000", "updated", 4),
        gh_search_api("topic:midjourney stars:>100", "stars", 4)),

    # ── 정보/지식 ──────────────────────────────────────
    "knowledge.news":   lambda: mix(
        gh_trending(since="daily", limit=4),
        kr_orgs(KR_BIG_TECH[:3], 2)),
    "knowledge.tips":   lambda: mix(
        gh_search_api("topic:tips stars:>1000", "stars", 4),
        gh_search_api("topic:cheatsheet stars:>2000", "stars", 4)),
    "knowledge.review": lambda: mix(
        npm_search("review benchmark comparison", 4),
        pypi_search("benchmark evaluation", 4)),
    "knowledge.tutorial":lambda: mix(
        gh_search_api("topic:tutorial stars:>3000", "stars", 4),
        gh_topic("korean", 4)),
}

TOPIC_LABELS = {
    "home.trending":"오늘의 인기", "home.rising":"급상승",
    "home.ai_feed":"AI 추천", "home.shortform":"숏폼",
    "ai.news":"AI 뉴스", "ai.tools":"AI 도구", "ai.trend":"AI 트렌드",
    "ai.research":"AI 리서치", "ai.summary":"AI 요약",
    "startup.new":"신규 스타트업", "startup.funding":"투자/펀딩", "startup.product":"신제품",
    "dev.trending":"개발 트렌딩", "dev.javascript":"JavaScript",
    "dev.typescript":"TypeScript", "dev.python":"Python",
    "dev.rust":"Rust", "dev.go":"Go",
    "dev.opensource":"오픈소스", "dev.devops":"DevOps", "dev.tools":"개발 도구",
    "oss.trending":"OSS 트렌딩", "oss.awesome":"Awesome", "oss.new":"신규 OSS",
    "design.ui":"UI 컴포넌트", "design.ux":"UX 디자인",
    "design.tools":"디자인 도구", "design.css":"CSS",
    "it.news":"IT 뉴스", "it.security":"보안", "it.cloud":"클라우드",
    "it.mobile":"모바일", "it.database":"데이터베이스",
    "game.news":"게임 뉴스", "game.indie":"인디게임", "game.review":"게임 리뷰", "game.dev":"게임개발",
    "finance.stock":"주식 도구", "finance.crypto":"블록체인/코인",
    "finance.invest":"투자 분석", "finance.data":"금융 데이터",
    "market.deal":"이커머스", "market.coupon":"할인/쿠폰", "market.used":"중고마켓",
    "job.dev":"개발 면접", "job.startup":"스타트업", "job.remote":"원격근무", "job.algorithm":"알고리즘",
    "learn.tutorial":"튜토리얼", "learn.course":"강의", "learn.book":"프로그래밍 책", "learn.korean":"한국어 자료",
    "research.ai":"AI 논문", "research.paper":"논문 구현", "research.data":"데이터 사이언스",
    "video.trending":"영상 도구", "video.shorts":"숏폼 미디어",
    "image.trending":"이미지 처리", "image.ai":"AI 이미지", "image.design":"디자인 에셋",
    "humor.meme":"Awesome 목록", "humor.funny":"재미있는 프로젝트",
    "board.free":"자유", "board.question":"Q&A", "board.info":"정보",
    "board.humor":"유머", "board.it":"IT", "board.game":"게임",
    "board.sports":"스포츠", "board.politics":"정치", "board.anon":"익명",
    "aihub.trend":"AI 트렌드", "aihub.summary":"AI 요약",
    "trending.realtime":"실시간", "trending.daily":"일간",
    "trending.weekly":"주간", "trending.debate":"토론",
    "feed.latest":"최신", "feed.recommended":"추천",
    "community.dev":"개발", "community.invest":"투자",
    "community.travel":"여행", "community.fashion":"패션", "community.fitness":"운동",
    "gallery.image":"이미지", "gallery.meme":"밈", "gallery.ai":"AI 이미지",
    "knowledge.news":"뉴스", "knowledge.tips":"팁",
    "knowledge.review":"리뷰", "knowledge.tutorial":"튜토리얼",
}

# ── Vercel Handler ─────────────────────────────────────────

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200); self._cors(); self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}
            topic_key = body.get("topicKey", "")
            if not topic_key:
                return self._json(400, {"error": "topicKey required"})
            fn = TOPIC_CRAWLERS.get(topic_key)
            if not fn:
                return self._json(400, {"error": f"Unknown topic: {topic_key}"})
            raw   = fn()
            label = TOPIC_LABELS.get(topic_key, topic_key.split(".")[-1].title())
            cat   = topic_key.split(".")[0]
            items = enrich(raw, topic_key, label, cat)
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
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status); self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers(); self.wfile.write(body)

    def log_message(self, *a): pass
