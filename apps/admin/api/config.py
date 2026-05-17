"""
/api/config.py — 크롤링 설정 관리 API
관리자앱: GET(조회) / POST(저장)
사용자앱: 폴링으로 설정 읽기
"""
import json, os
from http.server import BaseHTTPRequestHandler

# 기본 설정 — 사용자웹 MENU_TOPICS 전체 반영
DEFAULT_CONFIG = {
    "categories": [
        {"id":"home",    "label":"홈",        "icon":"🏠"},
        {"id":"ai",      "label":"AI 뉴스",   "icon":"🤖"},
        {"id":"startup", "label":"스타트업",  "icon":"🚀"},
        {"id":"dev",     "label":"개발",      "icon":"💻"},
        {"id":"oss",     "label":"오픈소스",  "icon":"📦"},
        {"id":"design",  "label":"디자인",    "icon":"🎨"},
        {"id":"it",      "label":"IT 뉴스",   "icon":"📰"},
        {"id":"board",   "label":"게시판",    "icon":"📋"},
        {"id":"game",    "label":"게임",      "icon":"🎮"},
        {"id":"finance", "label":"주식/코인", "icon":"💰"},
        {"id":"market",  "label":"마켓",      "icon":"🛒"},
        {"id":"job",     "label":"취업",      "icon":"💼"},
        {"id":"learn",   "label":"학습",      "icon":"📚"},
        {"id":"research","label":"논문",      "icon":"🔬"},
        {"id":"video",   "label":"영상",      "icon":"📹"},
        {"id":"humor",   "label":"유머",      "icon":"😂"},
        {"id":"trending","label":"인기",      "icon":"🔥"},
        {"id":"image",   "label":"이미지",    "icon":"🖼"},
        {"id":"aihub",   "label":"AI허브",    "icon":"🧠"},
    ],
    "topics": [
        # home
        {"key":"home.trending",    "catId":"home",    "label":"오늘의 인기글",  "active":True},
        {"key":"home.rising",      "catId":"home",    "label":"실시간 급상승",  "active":True},
        {"key":"home.ai_feed",     "catId":"home",    "label":"AI 추천 피드",   "active":True},
        {"key":"home.shortform",   "catId":"home",    "label":"숏폼 콘텐츠",    "active":True},
        # ai
        {"key":"ai.news",          "catId":"ai",      "label":"AI 뉴스",        "active":True},
        {"key":"ai.tools",         "catId":"ai",      "label":"AI 도구",        "active":True},
        {"key":"ai.trend",         "catId":"ai",      "label":"AI 트렌드",      "active":True},
        {"key":"ai.summary",       "catId":"ai",      "label":"AI 요약",        "active":True},
        {"key":"ai.research",      "catId":"ai",      "label":"AI 리서치",      "active":True},
        # startup
        {"key":"startup.new",      "catId":"startup", "label":"신규 스타트업",  "active":True},
        {"key":"startup.funding",  "catId":"startup", "label":"투자/펀딩",      "active":True},
        {"key":"startup.product",  "catId":"startup", "label":"신제품",         "active":True},
        # dev
        {"key":"dev.trending",     "catId":"dev",     "label":"개발 트렌딩",    "active":True},
        {"key":"dev.opensource",   "catId":"dev",     "label":"오픈소스",       "active":True},
        {"key":"dev.javascript",   "catId":"dev",     "label":"JavaScript",     "active":True},
        {"key":"dev.python",       "catId":"dev",     "label":"Python",         "active":True},
        {"key":"dev.devops",       "catId":"dev",     "label":"DevOps",         "active":True},
        {"key":"dev.tools",        "catId":"dev",     "label":"개발 도구",      "active":True},
        # oss
        {"key":"oss.trending",     "catId":"oss",     "label":"OSS 트렌딩",     "active":True},
        {"key":"oss.awesome",      "catId":"oss",     "label":"Awesome 리스트", "active":True},
        {"key":"oss.new",          "catId":"oss",     "label":"신규 OSS",       "active":True},
        # design
        {"key":"design.ui",        "catId":"design",  "label":"UI 컴포넌트",    "active":True},
        {"key":"design.ux",        "catId":"design",  "label":"UX 디자인",      "active":True},
        {"key":"design.tools",     "catId":"design",  "label":"디자인 도구",    "active":True},
        {"key":"design.css",       "catId":"design",  "label":"CSS/스타일",     "active":True},
        # it
        {"key":"it.news",          "catId":"it",      "label":"IT 뉴스",        "active":True},
        {"key":"it.security",      "catId":"it",      "label":"보안",           "active":True},
        {"key":"it.cloud",         "catId":"it",      "label":"클라우드",       "active":True},
        {"key":"it.mobile",        "catId":"it",      "label":"모바일",         "active":True},
        # board
        {"key":"board.free",       "catId":"board",   "label":"자유게시판",     "active":True},
        {"key":"board.question",   "catId":"board",   "label":"질문게시판",     "active":True},
        {"key":"board.info",       "catId":"board",   "label":"정보게시판",     "active":True},
        {"key":"board.humor",      "catId":"board",   "label":"유머게시판",     "active":True},
        {"key":"board.it",         "catId":"board",   "label":"IT게시판",       "active":True},
        {"key":"board.game",       "catId":"board",   "label":"게임게시판",     "active":True},
        {"key":"board.sports",     "catId":"board",   "label":"스포츠게시판",   "active":True},
        {"key":"board.politics",   "catId":"board",   "label":"정치게시판",     "active":True},
        {"key":"board.anon",       "catId":"board",   "label":"익명게시판",     "active":True},
        # game
        {"key":"game.news",        "catId":"game",    "label":"게임 뉴스",      "active":True},
        {"key":"game.indie",       "catId":"game",    "label":"인디게임",       "active":True},
        {"key":"game.review",      "catId":"game",    "label":"게임 리뷰",      "active":True},
        # finance
        {"key":"finance.stock",    "catId":"finance", "label":"주식",           "active":True},
        {"key":"finance.crypto",   "catId":"finance", "label":"코인",           "active":True},
        {"key":"finance.invest",   "catId":"finance", "label":"투자",           "active":True},
        # market
        {"key":"market.deal",      "catId":"market",  "label":"핫딜",           "active":True},
        {"key":"market.coupon",    "catId":"market",  "label":"쿠폰/할인",      "active":True},
        {"key":"market.used",      "catId":"market",  "label":"중고거래",       "active":True},
        # job
        {"key":"job.dev",          "catId":"job",     "label":"개발 채용",      "active":True},
        {"key":"job.startup",      "catId":"job",     "label":"스타트업 채용",  "active":True},
        {"key":"job.remote",       "catId":"job",     "label":"원격 근무",      "active":True},
        # learn
        {"key":"learn.tutorial",   "catId":"learn",   "label":"튜토리얼",       "active":True},
        {"key":"learn.course",     "catId":"learn",   "label":"강의/코스",      "active":True},
        {"key":"learn.book",       "catId":"learn",   "label":"도서",           "active":True},
        # research
        {"key":"research.ai",      "catId":"research","label":"AI 논문",        "active":True},
        {"key":"research.paper",   "catId":"research","label":"최신 논문",      "active":True},
        {"key":"research.data",    "catId":"research","label":"데이터 사이언스","active":True},
        # video
        {"key":"video.trending",   "catId":"video",   "label":"인기 영상",      "active":True},
        {"key":"video.shorts",     "catId":"video",   "label":"숏폼",           "active":True},
        # humor
        {"key":"humor.meme",       "catId":"humor",   "label":"밈",             "active":True},
        {"key":"humor.funny",      "catId":"humor",   "label":"유머",           "active":True},
        # trending
        {"key":"trending.realtime","catId":"trending","label":"실시간 인기",    "active":True},
        {"key":"trending.daily",   "catId":"trending","label":"일간 베스트",    "active":True},
        {"key":"trending.weekly",  "catId":"trending","label":"주간 베스트",    "active":True},
    ],
    "sources": [
        # GitHub 한국 기업
        {"id":"src_kakao",    "topicKeys":["dev.trending","ai.news","oss.trending"], "type":"github_org", "value":"kakao",       "label":"카카오 GitHub",    "active":True},
        {"id":"src_naver",    "topicKeys":["dev.trending","ai.news","dev.javascript"],"type":"github_org","value":"naver",       "label":"네이버 GitHub",    "active":True},
        {"id":"src_line",     "topicKeys":["dev.trending","it.mobile"],              "type":"github_org", "value":"line",        "label":"라인 GitHub",      "active":True},
        {"id":"src_toss",     "topicKeys":["startup.new","dev.trending"],             "type":"github_org", "value":"toss",        "label":"토스 GitHub",      "active":True},
        {"id":"src_woowa",    "topicKeys":["startup.new","dev.trending"],             "type":"github_org", "value":"woowabros",   "label":"배달의민족 GitHub","active":True},
        {"id":"src_coupang",  "topicKeys":["startup.new","market.deal"],             "type":"github_org", "value":"coupang",     "label":"쿠팡 GitHub",      "active":True},
        {"id":"src_ncsoft",   "topicKeys":["game.news","oss.trending"],              "type":"github_org", "value":"ncsoft",       "label":"엔씨소프트 GitHub","active":True},
        {"id":"src_krafton",  "topicKeys":["game.news","ai.trend"],                  "type":"github_org", "value":"krafton-ai",  "label":"크래프톤AI GitHub","active":True},
        {"id":"src_nexon",    "topicKeys":["game.news","game.review"],               "type":"github_org", "value":"nexon",       "label":"넥슨 GitHub",      "active":True},
        {"id":"src_daangn",   "topicKeys":["startup.new","market.used"],             "type":"github_org", "value":"daangn",      "label":"당근마켓 GitHub",  "active":True},
        {"id":"src_nhn",      "topicKeys":["dev.trending","oss.trending"],            "type":"github_org", "value":"nhn",         "label":"NHN GitHub",       "active":True},
        # GitHub Topics
        {"id":"src_llm",      "topicKeys":["ai.news","ai.trend"],                    "type":"github_topic","value":"llm",        "label":"GitHub LLM 토픽",  "active":True},
        {"id":"src_korean",   "topicKeys":["learn.tutorial","oss.awesome"],          "type":"github_topic","value":"korean",     "label":"GitHub Korean 토픽","active":True},
        {"id":"src_blockchain","topicKeys":["finance.crypto"],                       "type":"github_topic","value":"blockchain", "label":"GitHub Blockchain", "active":True},
        {"id":"src_ds",       "topicKeys":["research.data","research.ai"],           "type":"github_topic","value":"data-science","label":"GitHub Data Science","active":True},
        # NPM
        {"id":"src_npm_kr",   "topicKeys":["dev.javascript","dev.tools"],            "type":"npm",         "value":"korean",     "label":"NPM korean",       "active":True},
        # PyPI
        {"id":"src_pypi",     "topicKeys":["dev.python","research.data"],            "type":"pypi",        "value":"",           "label":"PyPI RSS",         "active":True},
    ],
    "version": 1
}

# 인메모리 캐시 (Vercel 서버리스 - 영속 스토리지 없음)
_config_cache = None

def get_config():
    global _config_cache
    return _config_cache if _config_cache else DEFAULT_CONFIG.copy()

def set_config(cfg):
    global _config_cache
    _config_cache = cfg


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200); self._cors(); self.end_headers()

    def do_GET(self):
        body = json.dumps(get_config(), ensure_ascii=False).encode()
        self.send_response(200); self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers(); self.wfile.write(body)

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            set_config(body)
            resp = json.dumps({"ok": True}, ensure_ascii=False).encode()
            self.send_response(200); self._cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(resp)))
            self.end_headers(); self.wfile.write(resp)
        except Exception as e:
            err = json.dumps({"error": str(e)}).encode()
            self.send_response(500); self._cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(err)))
            self.end_headers(); self.wfile.write(err)

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, *a): pass
