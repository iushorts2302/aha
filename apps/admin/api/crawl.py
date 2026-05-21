"""
/api/crawl — 토픽별 크롤링
허용 도메인: github.com, api.github.com, registry.npmjs.org, pypi.org

[토픽 설계 원칙]
- 37개 명확한 토픽 (중복/모순 제거)
- 카테고리당 2~4개 토픽으로 정리
- 각 토픽은 서로 다른 소스/쿼리 사용
"""

import json, re, random, time, datetime, sys, os
from http.server import BaseHTTPRequestHandler
from urllib.request import urlopen, Request
from urllib.error import HTTPError
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


# ═══════════════════════════════════════════════════════════
# 다양한 외부 데이터 소스 (Vercel에서 검증 완료)
# ═══════════════════════════════════════════════════════════

def hn_top(tags="story", limit=8):
    """Hacker News (Algolia API) — IT/개발 인기 글"""
    try:
        url = f"https://hn.algolia.com/api/v1/search?tags={tags}&hitsPerPage={limit}"
        d = fetch_json(url)
        return [{
            "title":   h.get("title") or h.get("story_title","")[:100],
            "summary": f"📰 HN · {h.get('points',0)}점 · 💬 {h.get('num_comments',0)}",
            "tags":    ["HackerNews", "IT"] + ([h.get("author","")] if h.get("author") else []),
            "source":  h.get("url") or f"https://news.ycombinator.com/item?id={h.get('objectID','')}",
        } for h in d.get("hits", []) if h.get("title") or h.get("story_title")][:limit]
    except Exception:
        return []

def hn_search(query, limit=8):
    """HN 검색"""
    try:
        url = f"https://hn.algolia.com/api/v1/search?query={quote_plus(query)}&tags=story&hitsPerPage={limit}"
        d = fetch_json(url)
        return [{
            "title":   h.get("title","")[:100],
            "summary": f"📰 HN · {h.get('points',0)}점 · 💬 {h.get('num_comments',0)}",
            "tags":    ["HackerNews", query],
            "source":  h.get("url") or f"https://news.ycombinator.com/item?id={h.get('objectID','')}",
        } for h in d.get("hits", []) if h.get("title")][:limit]
    except Exception:
        return []

def devto_articles(tag=None, limit=8):
    """dev.to 개발자 글"""
    try:
        url = f"https://dev.to/api/articles?per_page={limit}"
        if tag: url += f"&tag={tag}"
        d = fetch_json(url)
        return [{
            "title":   a.get("title","")[:100],
            "summary": f"📝 dev.to · ❤️ {a.get('positive_reactions_count',0)} · 💬 {a.get('comments_count',0)}",
            "tags":    ["dev.to"] + (a.get("tag_list") or [])[:3],
            "source":  a.get("url",""),
        } for a in d if a.get("title")][:limit]
    except Exception:
        return []

def arxiv_recent(category="cs.AI", limit=6):
    """ArXiv 최신 논문 (Atom 피드 파싱)"""
    try:
        html = fetch(f"http://export.arxiv.org/api/query?search_query=cat:{category}&sortBy=submittedDate&sortOrder=descending&max_results={limit}")
        items = []
        for entry in re.findall(r'<entry>(.*?)</entry>', html, re.DOTALL)[:limit]:
            t = re.search(r'<title>(.*?)</title>', entry, re.DOTALL)
            s = re.search(r'<summary>(.*?)</summary>', entry, re.DOTALL)
            l = re.search(r'<id>(.*?)</id>', entry)
            au = re.findall(r'<name>(.*?)</name>', entry)
            title = clean(t.group(1)) if t else ""
            if title:
                items.append({
                    "title":   title[:100],
                    "summary": (clean(s.group(1))[:120] if s else "") + (f" · {len(au)}명 저자" if au else ""),
                    "tags":    ["arXiv", category, "논문"],
                    "source":  l.group(1).strip() if l else "",
                })
        return items
    except Exception:
        return []

def coingecko_top(limit=8):
    """CoinGecko 시가총액 상위 코인"""
    try:
        url = f"https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page={limit}&page=1"
        d = fetch_json(url)
        return [{
            "title":   f"{c.get('name','?')} ({c.get('symbol','').upper()})",
            "summary": f"💰 ${c.get('current_price',0):,.2f} · {c.get('price_change_percentage_24h',0):+.2f}% (24h)",
            "tags":    ["코인", c.get("symbol","").upper()],
            "source":  f"https://www.coingecko.com/en/coins/{c.get('id','')}",
        } for c in d if c.get("id")][:limit]
    except Exception:
        return []

def velog_recent(limit=8):
    """Velog (한국 개발자 블로그) 최근 글"""
    try:
        # GraphQL 호출 대신 HTML 파싱 — velog.io는 SSR 사용
        html = fetch("https://velog.io/")
        items = []
        for m in re.findall(r'<a[^>]*href="(/@[^"]+)"[^>]*>.*?<h2[^>]*>(.*?)</h2>.*?<p[^>]*>(.*?)</p>', html, re.DOTALL)[:limit]:
            href, title, desc = m
            title = clean(title)
            if title:
                items.append({
                    "title":   title[:100],
                    "summary": f"📝 Velog · {clean(desc)[:90]}",
                    "tags":    ["Velog", "한국개발자"],
                    "source":  f"https://velog.io{href}",
                })
        return items
    except Exception:
        return []

def dribbble_popular(limit=6):
    """Dribbble 인기 디자인 — RSS"""
    try:
        html = fetch("https://dribbble.com/shots/popular.rss")
        items = []
        for item in re.findall(r'<item>(.*?)</item>', html, re.DOTALL)[:limit]:
            t = re.search(r'<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>', item)
            l = re.search(r'<link>(.*?)</link>', item)
            d = re.search(r'<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</description>', item, re.DOTALL)
            title = clean(t.group(1)) if t else ""
            if title:
                items.append({
                    "title":   title[:100],
                    "summary": "🎨 Dribbble 인기 디자인",
                    "tags":    ["Dribbble", "디자인"],
                    "source":  l.group(1).strip() if l else "",
                })
        return items
    except Exception:
        return []

def stackoverflow_qa(tag="javascript", limit=8):
    """StackOverflow 인기 질문"""
    try:
        url = f"https://api.stackexchange.com/2.3/questions?order=desc&sort=hot&tagged={tag}&site=stackoverflow&pagesize={limit}"
        d = fetch_json(url)
        return [{
            "title":   q.get("title","")[:100],
            "summary": f"❓ StackOverflow · 👁 {q.get('view_count',0):,} · ⬆ {q.get('score',0)}",
            "tags":    ["StackOverflow"] + (q.get("tags") or [])[:3],
            "source":  q.get("link",""),
        } for q in d.get("items", []) if q.get("title")][:limit]
    except Exception:
        return []

def disquiet_makers(limit=6):
    """Disquiet — 한국 스타트업/메이커 커뮤니티"""
    try:
        # disquiet.io 메인에서 최신 프로젝트 추출 (간단한 HTML 파싱)
        html = fetch("https://disquiet.io/")
        items = []
        for m in re.findall(r'<a[^>]*href="(/product/[^"]+)"[^>]*>.*?<(?:h\d|span)[^>]*>(.*?)<', html, re.DOTALL)[:limit*2]:
            href, title = m
            title = clean(title)
            if title and 5 < len(title) < 80:
                items.append({
                    "title":   f"🚀 {title}",
                    "summary": "Disquiet · 한국 메이커 프로젝트",
                    "tags":    ["Disquiet", "스타트업", "한국"],
                    "source":  f"https://disquiet.io{href}",
                })
                if len(items) >= limit: break
        return items
    except Exception:
        return []

def rubygems_popular(limit=6):
    """RubyGems 인기 패키지"""
    try:
        url = f"https://rubygems.org/api/v1/search.json?query=rails"
        d = fetch_json(url)
        return [{
            "title":   f"{g.get('name','')}  v{g.get('version','')}",
            "summary": (g.get("info","") or "")[:100],
            "tags":    ["Ruby", "RubyGems"],
            "source":  f"https://rubygems.org/gems/{g.get('name','')}",
        } for g in d[:limit]]
    except Exception:
        return []

def packagist_php(limit=6):
    """Packagist PHP 패키지"""
    try:
        d = fetch_json("https://packagist.org/explore/popular.json?per_page=6")
        return [{
            "title":   f"{p.get('name','')}",
            "summary": (p.get("description","") or "")[:100] + f"  ⭐{p.get('favers',0)}",
            "tags":    ["PHP", "Packagist"],
            "source":  f"https://packagist.org/packages/{p.get('name','')}",
        } for p in d.get("packages", [])[:limit]]
    except Exception:
        return []


# ── GitHub ────────────────────────────────────────────────

def gh_trending(lang="", since="daily", limit=8):
    html = fetch(f"https://github.com/trending/{lang}?since={since}")
    items = []
    for art in re.findall(r'<article[^>]*>(.*?)</article>', html, re.DOTALL)[:limit+3]:
        nm = re.search(r'href="(/[^"]+)"', art)
        ds = re.search(r'<p[^>]*col-9[^>]*>(.*?)</p>', art, re.DOTALL)
        st = re.search(r'octicon-star[^>]*>.*?</svg>\s*([\d,k]+)', art, re.DOTALL)
        lg = re.search(r'itemprop="programmingLanguage"[^>]*>(.*?)<', art)
        repo = (nm.group(1) if nm else "").strip("/")
        if not repo or "/" not in repo or repo.startswith("sponsors/"): continue
        desc  = clean(ds.group(1)) if ds else ""
        stars = (st.group(1) if st else "").strip()
        pl    = clean(lg.group(1)) if lg else ""
        items.append({
            "title":   repo,
            "summary": f"{desc[:100]}" + (f"  ⭐{stars}" if stars else "") + (f"  [{pl}]" if pl else ""),
            "tags":    list(filter(None, ["GitHub", pl, "Trending"]))[:4],
            "source":  f"https://github.com/{repo}",
        })
        if len(items) >= limit: break
    return items

def gh_api(q, sort="stars", limit=8):
    url = f"https://api.github.com/search/repositories?q={quote_plus(q)}&sort={sort}&order=desc&per_page={limit}"
    try:
        d = fetch_json(url)
        return [{
            "title":   r["full_name"],
            "summary": f"{r.get('description','')[:100]}  ⭐{r.get('stargazers_count',0):,}" +
                       (f"  [{r.get('language','')}]" if r.get("language") else ""),
            "tags":    list(filter(None, ["GitHub", r.get("language",""),
                       (r.get("topics") or [""])[0]]))[:4],
            "source":  r["html_url"],
        } for r in d.get("items", [])[:limit]]
    except Exception:
        return []

def gh_org(org, label, tags=None, limit=5):
    try:
        d = fetch_json(f"https://api.github.com/orgs/{org}/repos?sort=updated&per_page={limit+3}")
        items = []
        for r in d:
            if r.get("private") or r.get("fork"): continue
            items.append({
                "title":   f"[{label}] {r['name']}",
                "summary": f"{r.get('description','')[:100]}  ⭐{r.get('stargazers_count',0):,}",
                "tags":    (tags or [label, "오픈소스"])[:4],
                "source":  r["html_url"],
            })
            if len(items) >= limit: break
        return items
    except Exception:
        return []

def gh_orgs(orgs, each=3):
    items = []
    for org, label, tags in orgs:
        try: items.extend(gh_org(org, label, tags, each))
        except: pass
    random.shuffle(items)
    return items

# ── NPM / PyPI ────────────────────────────────────────────

def npm(q, limit=6):
    d = fetch_json(f"https://registry.npmjs.org/-/v1/search?text={quote_plus(q)}&size={limit}&popularity=1.0")
    return [{
        "title":   f"{p.get('name','')}  v{p.get('version','')}",
        "summary": (p.get("description") or "")[:100],
        "tags":    (["NPM"] + (p.get("keywords") or [])[:2])[:4],
        "source":  f"https://www.npmjs.com/package/{p.get('name','')}",
    } for p in [o.get("package",{}) for o in d.get("objects",[])]]

def pypi_rss(limit=6):
    html = fetch("https://pypi.org/rss/updates.xml")
    items = []
    for raw in re.findall(r'<item>(.*?)</item>', html, re.DOTALL)[:limit]:
        t = re.search(r'<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>', raw)
        d = re.search(r'<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</description>', raw, re.DOTALL)
        l = re.search(r'<link>(.*?)</link>', raw)
        title = clean(t.group(1)) if t else ""
        if title:
            items.append({
                "title": title,
                "summary": clean(d.group(1))[:100] if d else "",
                "tags": ["Python", "PyPI"],
                "source": l.group(1).strip() if l else "",
            })
    return items

def pypi(q, limit=6):
    html = fetch(f"https://pypi.org/search/?q={quote_plus(q)}&o=-created")
    items = []
    for href, body in re.findall(r'<a class="package-snippet"[^>]*href="([^"]*)"[^>]*>(.*?)</a>', html, re.DOTALL)[:limit]:
        nm = re.search(r'package-snippet__name[^>]*>(.*?)<', body)
        vr = re.search(r'package-snippet__version[^>]*>(.*?)<', body)
        ds = re.search(r'package-snippet__description[^>]*>(.*?)<', body)
        name = clean(nm.group(1)) if nm else ""
        if name:
            items.append({
                "title":   f"{name}" + (f"  {clean(vr.group(1))}" if vr else ""),
                "summary": clean(ds.group(1))[:100] if ds else "",
                "tags":    ["Python", "PyPI"],
                "source":  f"https://pypi.org{href}",
            })
    return items

def mix(*args):
    r = []
    for a in args: r.extend(a)
    random.shuffle(r)
    return r


# ── 한국 기업 그룹 ─────────────────────────────────────────

KR_STARTUPS = [
    ("toss",        "토스",       ["핀테크","토스","오픈소스"]),
    ("daangn",      "당근마켓",   ["C2C","당근","오픈소스"]),
    ("woowabros",   "배달의민족", ["배달앱","우아한형제","오픈소스"]),
    ("hyperconnect","하이퍼커넥트",["미디어","스타트업","오픈소스"]),
    ("coupang",     "쿠팡",       ["이커머스","쿠팡","오픈소스"]),
]

KR_BIG_TECH = [
    ("kakao", "카카오", ["카카오","한국기업","오픈소스"]),
    ("naver", "네이버", ["네이버","한국기업","오픈소스"]),
    ("line",  "라인",   ["라인","메신저","오픈소스"]),
    ("nhn",   "NHN",    ["NHN","한국기업","오픈소스"]),
]

KR_AI = [
    ("kakao",           "카카오AI",        ["카카오","AI","한국AI"]),
    ("naver",           "네이버AI",        ["네이버","CLOVA","한국AI"]),
    ("krafton-ai",      "크래프톤AI",      ["게임AI","크래프톤","한국AI"]),
    ("kakaoenterprise", "카카오엔터프라이즈",["카카오","엔터프라이즈","AI"]),
]

KR_GAME = [
    ("ncsoft",    "엔씨소프트", ["MMORPG","엔씨","한국게임"]),
    ("krafton-ai","크래프톤",  ["배그","크래프톤","한국게임"]),
    ("nexon",     "넥슨",      ["메이플","넥슨","한국게임"]),
]

# ═══════════════════════════════════════════════════════════
# TOPIC_CRAWLERS — 37개 (중복·모순 제거)
#
# 카테고리 구성:
#   home    (3): trending · rising · ai_feed
#   dev     (5): trending · javascript · python · devops · tools
#   ai      (4): news · tools · trend · research
#   startup (3): new · funding · product
#   oss     (3): trending · awesome · new
#   it      (4): news · security · cloud · mobile
#   design  (3): ui · ux · css
#   game    (3): news · indie · review
#   finance (3): stock · crypto · invest
#   market  (2): deal · used
#   job     (3): dev · startup · algorithm
#   learn   (4): tutorial · course · book · korean
#   board   (3): free · it · question
# ═══════════════════════════════════════════════════════════

TOPIC_CRAWLERS = {

    # ── home (3) — 종합 피드 ──────────────────────────────
    # trending: HN top + GitHub 트렌딩 (가장 인기있는 글)
    "home.trending":   lambda: mix(
        hn_top("front_page", 5),
        gh_api("stars:>5000 pushed:>2025-01-01", "updated", 3)),
    # rising: 주간 인기 + 한국 스타트업
    "home.rising":     lambda: mix(
        gh_api("stars:>1000 pushed:>2025-01-01", "updated", 5),
        gh_orgs(KR_STARTUPS[:2], 2)),
    # ai_feed: arxiv AI 논문 + huggingface
    "home.ai_feed":    lambda: mix(
        arxiv_recent("cs.AI", 5),
        gh_api("topic:llm stars:>1000", "updated", 3)),

    # ── dev (5) — 개발 ───────────────────────────────────
    # trending: GitHub Trending + HN
    "dev.trending":    lambda: mix(
        gh_api("stars:>5000 pushed:>2025-01-01", "updated", 5),
        hn_top("ask_hn", 3)),
    # javascript: dev.to JS 태그 + NPM
    "dev.javascript":  lambda: mix(
        devto_articles("javascript", 5),
        npm("javascript popular", 3)),
    # python: dev.to Python + PyPI
    "dev.python":      lambda: mix(
        devto_articles("python", 5),
        pypi_rss(3)),
    # devops: HN + GitHub
    "dev.devops":      lambda: mix(
        hn_search("devops kubernetes", 4),
        gh_api("topic:devops stars:>1000", "stars", 4)),
    # tools: dev.to + GitHub
    "dev.tools":       lambda: mix(
        devto_articles("tools", 4),
        npm("developer tools cli", 4)),

    # ── ai (4) — AI ──────────────────────────────────────
    # news: HN AI 검색 + GitHub LLM
    "ai.news":         lambda: mix(
        hn_search("AI OR LLM OR GPT", 4),
        gh_api("topic:large-language-model stars:>500", "updated", 4)),
    # tools: dev.to AI 태그 + GitHub
    "ai.tools":        lambda: mix(
        devto_articles("ai", 4),
        gh_api("topic:ai-tools stars:>200", "stars", 4)),
    # trend: HN + GitHub generative
    "ai.trend":        lambda: mix(
        hn_search("generative ai diffusion", 4),
        gh_api("topic:stable-diffusion stars:>1000", "updated", 4)),
    # research: arxiv 논문
    "ai.research":     lambda: mix(
        arxiv_recent("cs.AI", 4),
        arxiv_recent("cs.LG", 4)),

    # ── startup (3) — 스타트업 ─────────────────────────────
    # new: Disquiet (한국 메이커) + 한국 스타트업
    "startup.new":     lambda: mix(
        disquiet_makers(4),
        gh_orgs(KR_STARTUPS, 2)),
    # funding: HN + GitHub fintech
    "startup.funding": lambda: mix(
        hn_search("startup funding", 4),
        gh_api("topic:fintech stars:>500", "updated", 4)),
    # product: HN Show + Disquiet
    "startup.product": lambda: mix(
        hn_top("show_hn", 4),
        disquiet_makers(4)),

    # ── oss (3) — 오픈소스 ──────────────────────────────
    "oss.trending":    lambda: mix(
        gh_api("stars:>5000 pushed:>2025-01-01", "updated", 5),
        hn_search("open source", 3)),
    "oss.awesome":     lambda: mix(
        gh_api("awesome topic:awesome stars:>5000", "stars", 5),
        gh_api("topic:awesome-list stars:>3000", "stars", 3)),
    "oss.new":         lambda: mix(pypi_rss(4), npm("popular new", 4)),

    # ── it (4) — IT ─────────────────────────────────────
    # news: HN + dev.to
    "it.news":         lambda: mix(
        hn_top("front_page", 5),
        devto_articles("webdev", 3)),
    # security: HN security + GitHub
    "it.security":     lambda: mix(
        hn_search("security vulnerability", 4),
        gh_api("topic:cybersecurity stars:>500", "updated", 4)),
    # cloud: HN cloud + GitHub
    "it.cloud":        lambda: mix(
        hn_search("cloud aws kubernetes", 4),
        gh_api("topic:cloud-native stars:>1000", "updated", 4)),
    # mobile: dev.to mobile + GitHub
    "it.mobile":       lambda: mix(
        devto_articles("flutter", 4),
        devto_articles("ios", 4)),

    # ── design (3) — 디자인 ─────────────────────────────
    # ui: Dribbble + GitHub UI
    "design.ui":       lambda: mix(
        dribbble_popular(4),
        gh_api("topic:ui-components stars:>1000", "stars", 4)),
    # ux: dev.to UX + Dribbble
    "design.ux":       lambda: mix(
        devto_articles("design", 4),
        dribbble_popular(4)),
    # css: dev.to CSS + GitHub
    "design.css":      lambda: mix(
        devto_articles("css", 5),
        gh_trending("css", "daily", 3)),

    # ── game (3) — 게임 ──────────────────────────────────
    # news: GitHub game-engine + 한국 게임사
    "game.news":       lambda: mix(
        gh_api("topic:game-engine stars:>500", "updated", 4),
        gh_orgs(KR_GAME, 2)),
    # indie: HN indiehackers + GitHub
    "game.indie":      lambda: mix(
        hn_search("indie game", 4),
        gh_api("topic:indie-game stars:>100", "stars", 4)),
    # review: dev.to gaming + GitHub
    "game.review":     lambda: mix(
        devto_articles("gamedev", 4),
        gh_api("topic:game-development stars:>50", "updated", 4)),

    # ── finance (3) — 금융 ──────────────────────────────
    # stock: HN + GitHub trading
    "finance.stock":   lambda: mix(
        hn_search("stock market trading", 4),
        gh_api("topic:algorithmic-trading stars:>100", "stars", 4)),
    # crypto: CoinGecko 시세 + GitHub blockchain
    "finance.crypto":  lambda: mix(
        coingecko_top(4),
        gh_api("topic:blockchain stars:>200", "updated", 4)),
    # invest: CoinGecko + GitHub 퀀트
    "finance.invest":  lambda: mix(
        coingecko_top(3),
        gh_api("topic:quantitative-finance stars:>100", "stars", 5)),

    # ── market (2) — 마켓 ───────────────────────────────
    "market.deal":     lambda: mix(
        gh_api("topic:ecommerce stars:>500", "updated", 4),
        devto_articles("ecommerce", 4)),
    "market.used":     lambda: mix(
        gh_org("daangn", "당근마켓", ["C2C","중고거래"], 4),
        gh_api("topic:marketplace stars:>300", "stars", 4)),

    # ── job (3) — 취업 ──────────────────────────────────
    # dev: HN job + GitHub 인터뷰
    "job.dev":         lambda: mix(
        hn_search("interview job", 3),
        gh_api("topic:coding-interview stars:>500", "stars", 5)),
    # startup: HN startup + Disquiet
    "job.startup":     lambda: mix(
        hn_top("job", 4),
        disquiet_makers(4)),
    # algorithm: GitHub + StackOverflow
    "job.algorithm":   lambda: mix(
        gh_api("topic:algorithms stars:>500", "stars", 4),
        stackoverflow_qa("algorithm", 4)),

    # ── learn (4) — 학습 ────────────────────────────────
    # tutorial: dev.to + GitHub
    "learn.tutorial":  lambda: mix(
        devto_articles("tutorial", 4),
        gh_api("topic:tutorial stars:>500", "stars", 4)),
    # course: GitHub + dev.to
    "learn.course":    lambda: mix(
        gh_api("topic:course stars:>300", "stars", 4),
        devto_articles("learning", 4)),
    # book: GitHub awesome books
    "learn.book":      lambda: mix(
        gh_api("topic:book stars:>200", "stars", 4),
        gh_api("topic:programming-book stars:>100", "stars", 4)),
    # korean: Velog (한국 개발자) + GitHub Korean
    "learn.korean":    lambda: mix(
        velog_recent(5),
        gh_api("topic:korean language:Python stars:>10", "stars", 3)),

    # ── board (3) — 게시판 ──────────────────────────────
    # free: HN + GitHub
    "board.free":      lambda: mix(
        hn_top("front_page", 5),
        gh_api("stars:>3000 pushed:>2025-01-01", "updated", 3)),
    # it: StackOverflow + HN
    "board.it":        lambda: mix(
        stackoverflow_qa("javascript", 4),
        hn_top("ask_hn", 4)),
    # question: StackOverflow + dev.to
    "board.question":  lambda: mix(
        stackoverflow_qa("python", 4),
        devto_articles("help", 4)),
}
TOPIC_LABELS = {
    # home
    "home.trending": "오늘의 인기",  "home.rising": "이번 주 급상승",
    "home.ai_feed":  "AI 추천 피드",
    # dev
    "dev.trending":   "개발 트렌딩", "dev.javascript": "JavaScript/NPM",
    "dev.python":     "Python/PyPI", "dev.devops":     "DevOps/인프라",
    "dev.tools":      "개발 도구",
    # ai
    "ai.news":    "AI 뉴스",    "ai.tools":    "AI 도구",
    "ai.trend":   "AI 트렌드", "ai.research": "AI 논문/연구",
    # startup
    "startup.new":     "신규 스타트업",  "startup.funding": "핀테크/투자",
    "startup.product": "앱/서비스",
    # oss
    "oss.trending": "OSS 트렌딩",  "oss.awesome": "Awesome 목록",
    "oss.new":      "신규 패키지",
    # it
    "it.news":     "IT 동향",  "it.security": "보안/해킹",
    "it.cloud":    "클라우드", "it.mobile":   "모바일",
    # design
    "design.ui":  "UI 컴포넌트", "design.ux": "UX/디자인 시스템",
    "design.css": "CSS/스타일",
    # game
    "game.news":   "게임 뉴스", "game.indie":  "인디게임",
    "game.review": "Unity/Unreal",
    # finance
    "finance.stock":  "주식/퀀트", "finance.crypto": "블록체인/코인",
    "finance.invest": "투자 분석",
    # market
    "market.deal": "이커머스", "market.used": "중고마켓",
    # job
    "job.dev":       "개발자 면접", "job.startup":   "스타트업 취업",
    "job.algorithm": "알고리즘",
    # learn
    "learn.tutorial": "튜토리얼",     "learn.course": "강의/커리큘럼",
    "learn.book":     "프로그래밍 책", "learn.korean": "한국어 자료",
    # board
    "board.free":     "자유",  "board.it":       "IT 토론",
    "board.question": "Q&A",
}

# ── Vercel Handler ─────────────────────────────────────────

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200); self._cors(); self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body   = json.loads(self.rfile.read(length)) if length else {}
            key    = body.get("topicKey", "")
            if not key:
                return self._json(400, {"error": "topicKey required"})
            fn = TOPIC_CRAWLERS.get(key)
            if not fn:
                return self._json(400, {"error": f"Unknown topic: {key}"})
            raw   = fn()
            label = TOPIC_LABELS.get(key, key.split(".")[-1].title())
            cat   = key.split(".")[0]
            items = enrich(raw, key, label, cat)
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
