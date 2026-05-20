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


def _youtube_shorts():
    """인기 테크 YouTube Shorts 큐레이션 (iframe 임베드용)"""
    # 카테고리별 인기 tech Shorts 채널 영상 검색
    # GitHub의 awesome-youtube-channels 등에서 채널 ID 수집
    shorts = [
        # 프로그래밍 튜토리얼
        {"id": "dQw4w9WgXcQ", "ch": "Programming with Mosh", "tag": "Python"},
        {"id": "eIrMbAQSU34", "ch": "Fireship", "tag": "JavaScript"},
        {"id": "rfscVS0vtbw", "ch": "freeCodeCamp", "tag": "Web"},
        {"id": "HXV3zeQKqGY", "ch": "Traversy Media", "tag": "CSS"},
        {"id": "W6NZfCO5SIk", "ch": "JavaScript Mastery", "tag": "React"},
        {"id": "pTFZFxd5lvs", "ch": "Tech With Tim", "tag": "Python"},
        {"id": "8JJ101D3knE", "ch": "Kevin Powell", "tag": "CSS"},
        {"id": "SqcY0GlETPk", "ch": "Theo", "tag": "TypeScript"},
    ]
    import time, random
    random.shuffle(shorts)
    ts = int(time.time())
    return [{
        "title":   f"[Shorts] {s['tag']} — {s['ch']}",
        "summary": f"{s['ch']} 채널의 인기 숏폼 영상",
        "tags":    ["YouTube", "Shorts", s["tag"]],
        "source":  f"https://www.youtube.com/shorts/{s['id']}",
        "embed":   f"https://www.youtube.com/embed/{s['id']}",
        "videoId": s["id"],
        "channel": s["ch"],
    } for s in shorts[:8]]

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

    # ── home (4) — 종합 피드 ──────────────────────────────
    # shortform: YouTube Shorts 기술 영상 (iframe 임베드)
    "home.shortform":  lambda: _youtube_shorts(),
    # trending: 오늘의 GitHub 전체 + 한국 대기업
    "home.trending":   lambda: mix(
        gh_trending(since="daily", limit=5),
        gh_orgs(KR_BIG_TECH[:2], 2)),
    # rising: 이번 주 급상승 + 한국 스타트업
    "home.rising":     lambda: mix(
        gh_api("stars:>1000 pushed:>2025-01-01", "updated", 5),
        gh_orgs(KR_STARTUPS[:2], 2)),
    # ai_feed: AI 특화 (home과 겹치지 않게 AI만)
    "home.ai_feed":    lambda: mix(
        gh_api("topic:llm stars:>1000", "updated", 4),
        gh_orgs(KR_AI[:2], 3)),

    # ── dev (5) — 언어/분야별 분리 ───────────────────────
    # trending: 전체 언어 오늘의 트렌딩
    "dev.trending":    lambda: mix(
        gh_api("stars:>5000 pushed:>2025-01-01", "updated", 4),
        gh_orgs(KR_BIG_TECH + KR_STARTUPS[:2], 2)),
    # javascript: JS/TS 패키지 + Trending
    "dev.javascript":  lambda: mix(
        gh_trending("javascript", "daily", 4),
        npm("javascript framework utility", 4)),
    # python: Python 생태계 + PyPI 최신
    "dev.python":      lambda: mix(
        gh_trending("python", "daily", 4),
        pypi_rss(4)),
    # devops: 인프라/배포 도구
    "dev.devops":      lambda: mix(
        gh_api("topic:devops stars:>1000", "stars", 4),
        gh_api("topic:kubernetes stars:>2000", "updated", 4)),
    # tools: 개발자 도구 (CLI/유틸리티)
    "dev.tools":       lambda: mix(
        npm("developer tools cli productivity", 4),
        pypi("development cli tools", 4)),

    # ── ai (4) — 분야별 AI ───────────────────────────────
    # news: LLM/ChatGPT 관련 인기 저장소
    "ai.news":         lambda: mix(
        gh_api("topic:large-language-model stars:>500", "updated", 4),
        gh_api("topic:chatgpt stars:>500", "updated", 4)),
    # tools: AI 활용 도구/SDK
    "ai.tools":        lambda: mix(
        gh_api("topic:ai-tools stars:>200", "stars", 4),
        npm("ai openai sdk langchain", 4)),
    # trend: 생성형 AI / Diffusion
    "ai.trend":        lambda: mix(
        gh_api("topic:generative-ai stars:>500", "stars", 4),
        gh_api("topic:stable-diffusion stars:>1000", "updated", 4)),
    # research: 딥러닝 논문 구현체 + ML 라이브러리
    "ai.research":     lambda: mix(
        gh_api("topic:paper-implementation stars:>100", "updated", 4),
        pypi("transformer neural network", 4)),

    # ── startup (3) — 한국 스타트업 오픈소스 ──────────────
    # new: 스타트업 전체 최신
    "startup.new":     lambda: gh_orgs(KR_STARTUPS, 3),
    # funding: 핀테크/투자 관련
    "startup.funding": lambda: mix(
        gh_org("toss", "토스", ["핀테크","토스"], 4),
        gh_api("topic:fintech language:TypeScript stars:>100", "updated", 4)),
    # product: 앱/서비스 관련
    "startup.product": lambda: mix(
        gh_org("daangn", "당근마켓", ["C2C","모바일"], 4),
        gh_api("topic:react-native stars:>500", "stars", 4)),

    # ── oss (3) — 오픈소스 생태계 ───────────────────────
    # trending: 주간 오픈소스 트렌딩
    "oss.trending":    lambda: mix(
        gh_trending(since="weekly", limit=5),
        gh_orgs(KR_BIG_TECH + KR_STARTUPS, 1)),
    # awesome: Awesome 시리즈 (큐레이션 목록)
    "oss.awesome":     lambda: mix(
        gh_api("awesome topic:awesome stars:>5000", "stars", 4),
        gh_api("topic:awesome-list stars:>3000", "stars", 4)),
    # new: NPM/PyPI 최신 패키지
    "oss.new":         lambda: mix(pypi_rss(4), npm("popular new release", 4)),

    # ── it (4) — IT 인프라/보안 분야 ─────────────────────
    # news: IT 전반 (웹 개발 동향)
    "it.news":         lambda: mix(
        gh_api("topic:web-development stars:>1000", "updated", 4),
        gh_api("topic:backend stars:>500", "stars", 4)),
    # security: 보안/취약점 분석 도구
    "it.security":     lambda: mix(
        gh_api("topic:cybersecurity stars:>500", "updated", 4),
        gh_api("topic:penetration-testing stars:>300", "stars", 4)),
    # cloud: 클라우드 네이티브/인프라
    "it.cloud":        lambda: mix(
        gh_api("topic:cloud-native stars:>1000", "updated", 4),
        gh_api("topic:terraform OR topic:aws-cdk stars:>500", "stars", 4)),
    # mobile: iOS/Android/크로스플랫폼
    "it.mobile":       lambda: mix(
        gh_api("topic:flutter stars:>200", "stars", 4),
        gh_api("topic:react-native stars:>100", "stars", 4)),

    # ── design (3) — 디자인/프론트엔드 ──────────────────
    # ui: UI 컴포넌트 라이브러리
    "design.ui":       lambda: mix(
        gh_api("topic:ui-components stars:>1000", "stars", 4),
        npm("ui component design system react", 4)),
    # ux: UX/디자인 시스템
    "design.ux":       lambda: mix(
        gh_api("topic:design-system stars:>500", "stars", 4),
        npm("ux pattern accessibility", 4)),
    # css: CSS 프레임워크/애니메이션
    "design.css":      lambda: mix(
        gh_trending("css", "daily", 4),
        npm("css animation tailwind", 4)),

    # ── game (3) — 게임 개발 ─────────────────────────────
    # news: 게임 엔진 + 한국 게임사 오픈소스
    "game.news":       lambda: mix(
        gh_api("topic:game-engine stars:>500", "updated", 4),
        gh_orgs(KR_GAME, 2)),
    # indie: 인디게임 / 게임 잼
    "game.indie":      lambda: mix(
        gh_api("topic:indie-game stars:>100", "stars", 4),
        gh_api("topic:game-jam stars:>50", "updated", 4)),
    # review: Unity/Unreal 관련 도구
    "game.review":     lambda: mix(
        gh_api("topic:game-development stars:>50", "updated", 4),
        gh_api("topic:gamedev stars:>30", "stars", 4)),

    # ── finance (3) — 금융/투자 ──────────────────────────
    # stock: 주식 분석/퀀트 트레이딩 도구
    "finance.stock":   lambda: mix(
        gh_api("topic:algorithmic-trading stars:>100", "stars", 4),
        pypi("stock market finance", 4)),
    # crypto: 블록체인/암호화폐
    "finance.crypto":  lambda: mix(
        gh_api("topic:blockchain stars:>200", "updated", 4),
        gh_api("topic:defi stars:>100", "stars", 4)),
    # invest: 퀀트/포트폴리오 분석
    "finance.invest":  lambda: mix(
        gh_api("topic:quantitative-finance stars:>100", "stars", 4),
        pypi("portfolio backtest", 4)),

    # ── market (2) — 커머스/중고마켓 ────────────────────
    # deal: 이커머스 플랫폼/도구
    "market.deal":     lambda: mix(
        gh_api("topic:ecommerce stars:>500", "updated", 4),
        npm("ecommerce shopping payment", 4)),
    # used: C2C/중고마켓 관련
    "market.used":     lambda: mix(
        gh_org("daangn", "당근마켓", ["C2C","중고거래"], 4),
        gh_api("topic:marketplace stars:>300", "stars", 4)),

    # ── job (3) — 취업/커리어 ─────────────────────────────
    # dev: 개발자 취업 준비 (인터뷰 자료)
    "job.dev":         lambda: mix(
        gh_api("topic:coding-interview stars:>500", "stars", 4),
        gh_api("topic:interview-questions stars:>200", "stars", 4)),
    # startup: 스타트업 취업 (한국 스타트업 기술스택)
    "job.startup":     lambda: mix(
        gh_orgs(KR_STARTUPS[:3], 2),
        gh_api("topic:startup stars:>300", "stars", 3)),
    # algorithm: 알고리즘/자료구조
    "job.algorithm":   lambda: mix(
        gh_api("topic:algorithms stars:>500", "stars", 4),
        gh_api("topic:data-structures stars:>300", "stars", 4)),

    # ── learn (4) — 학습자료 ─────────────────────────────
    # tutorial: 실습형 튜토리얼 (stars 상위)
    "learn.tutorial":  lambda: mix(
        gh_api("topic:tutorial stars:>500", "stars", 4),
        gh_api("topic:beginners stars:>200", "stars", 4)),
    # course: 강의/커리큘럼 자료
    "learn.course":    lambda: mix(
        gh_api("topic:course stars:>300", "stars", 4),
        gh_api("topic:mooc stars:>100", "stars", 4)),
    # book: 프로그래밍 책 코드 저장소
    "learn.book":      lambda: mix(
        gh_api("topic:book stars:>200", "stars", 4),
        gh_api("topic:ebook stars:>100", "stars", 4)),
    # korean: 한국어 개발 학습자료
    "learn.korean":    lambda: mix(
        gh_api("topic:korean language:Python stars:>10", "stars", 4),
        gh_api("topic:korean language:JavaScript stars:>10", "stars", 4)),

    # ── board (3) — 게시판 (사용자 게시판 보조 데이터) ───
    # free: 전반적 트렌드 (자유게시판 성격)
    "board.free":      lambda: mix(
        gh_api("stars:>3000 pushed:>2025-01-01", "updated", 4),
        gh_orgs(KR_BIG_TECH[:2] + KR_STARTUPS[:2], 2)),
    # it: IT 토론거리 (기술 이슈)
    "board.it":        lambda: mix(
        gh_api("topic:developer-tools stars:>1000", "updated", 4),
        gh_orgs(KR_BIG_TECH, 2)),
    # question: Q&A / 학습 도움말
    "board.question":  lambda: mix(
        gh_api("topic:cheatsheet stars:>100", "stars", 4),
        gh_api("topic:awesome stars:>500 language:Python", "stars", 4)),
}

TOPIC_LABELS = {
    # home
    "home.shortform": "숏폼 영상",
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
