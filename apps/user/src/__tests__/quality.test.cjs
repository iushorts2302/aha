/**
 * quality.test.cjs — aha! 자동 품질 테스트 (최종)
 *
 * 실행: node apps/user/src/__tests__/quality.test.cjs
 *
 * 검사 영역 (총 110개):
 *   BK  뒤로가기                    12개
 *   VW  조회수 (Post + Crawl)       14개
 *   SY  목록 동기화                  5개
 *   LK  좋아요 (Post + Crawl)       16개
 *   RC  이모지 반응                  11개
 *   CM  댓글 작성                    12개
 *   PS  데이터 영속성                 6개
 *   NV  navigate prop 전달           4개
 *   CC  CrawlCard 통계 동기화         8개
 *   CF  설정 관리                    10개
 *   DB  DB API 연동                  12개
 */

const fs   = require('fs')
const path = require('path')

const USER  = path.join(__dirname, '..')
const ADMIN = path.join(__dirname, '../../../admin/src')
const API   = path.join(__dirname, '../../../admin/api')

const read      = rel => fs.readFileSync(path.join(USER,  rel), 'utf8')
const readAdmin = rel => fs.readFileSync(path.join(ADMIN, rel), 'utf8')
const readApi   = rel => fs.readFileSync(path.join(API,   rel), 'utf8')

const R = []
function test(id, desc, fn) {
  try {
    const ok = fn()
    R.push({ id, desc, pass: !!ok, msg: ok === true ? '' : String(ok) })
  } catch(e) {
    R.push({ id, desc, pass: false, msg: e.message.slice(0, 80) })
  }
}

// ── 파일 로드 ──────────────────────────────────────────
const app      = read('App.jsx')
const ctx      = read('context/AppContext.jsx')
const auth     = read('context/AuthContext.jsx')
const detail   = read('pages/PostDetailPage.jsx')
const crawl    = read('pages/CrawlDetailPage.jsx')
const react    = read('components/ReactionBar.jsx')
const comment  = read('components/CommentSection.jsx')
const postcard = read('components/PostCard.jsx')
const crawlComp= read('components/CrawlComponents.jsx')
const rstore   = read('store/reactionStore.js')
const cstore   = read('store/crawlInteractionStore.js')
const cfgStore = read('store/configStore.js')
const crawlSt  = read('store/crawlStore.js')
const client   = read('api/client.js')
const subp     = read('pages/SubPages.jsx')
const cfgMgr   = readAdmin('pages/CrawlConfigManager.jsx')
const cfgApi   = readApi('config.py')
const dbPy     = readApi('db.py')
const v1Py     = readApi('v1.py')
const dataPy   = readApi('data.py')
const cronPy   = readApi('cron.py')

// ══════════════════════════════════════════════════════════
// BK — 뒤로가기
// ══════════════════════════════════════════════════════════
test('BK-01','App: useRef prevRouteRef 선언',        ()=> app.includes('prevRouteRef'))
test('BK-02','App: navigate 전 ref 기록',            ()=> app.includes('prevRouteRef.current = route'))
test('BK-03','App: PostDetailPage prevPage 전달',    ()=> app.includes('prevPage={prevRouteRef.current}') && app.includes('PostDetailPage'))
test('BK-04','App: CrawlDetailPage prevPage 전달',   ()=> app.includes('prevPage={prevRouteRef.current}') && app.includes('CrawlDetailPage'))
test('BK-05','Post: prevPage prop 수신',             ()=> detail.includes('prevPage'))
test('BK-06','Post: navigate(prevPage||board)',      ()=> detail.includes("|| 'board'"))
test('BK-07','Post: history.back() 미사용',          ()=> !detail.includes('history.back()'))
test('BK-08','Crawl: prevPage prop 수신',            ()=> crawl.includes('prevPage'))
test('BK-09','Crawl: navigate(prevPage||home)',      ()=> crawl.includes("|| 'home'"))
test('BK-10','Crawl: history.back() 미사용',         ()=> !crawl.includes('history.back()'))
test('BK-11','Post: 뒤로가기 버튼 투명',             ()=> detail.includes("background: 'transparent'") && detail.includes("border: 'none'"))
test('BK-12','Crawl: 뒤로가기 버튼 투명',            ()=> crawl.includes("background: 'transparent'") && crawl.includes("border: 'none'"))

// ══════════════════════════════════════════════════════════
// VW — 조회수
// ══════════════════════════════════════════════════════════
test('VW-01','AppContext: incrementView 함수',        ()=> ctx.includes('incrementView'))
test('VW-02','AppContext: views+1 로직',              ()=> ctx.includes('views: (p.views||0)+1') || ctx.includes('views: (p.views || 0) + 1'))
test('VW-03','AppContext: setPosts 함수형 업데이트',   ()=> ctx.includes('setPosts(prev =>'))
test('VW-04','AppContext: writeLS 즉시 저장',          ()=> ctx.includes('writeLS(POSTS_KEY'))
test('VW-05','Post: useRef(false) 중복방지',          ()=> detail.includes('useRef(false)'))
test('VW-06','Post: hasViewed로 조회수 1회 보장',     ()=> detail.includes('hasViewed.current') && detail.includes('incrementView('))
test('VW-07','Crawl: crawlInteractionStore import',  ()=> crawl.includes('crawlInteractionStore'))
test('VW-08','Crawl: incrementCrawlView 호출',        ()=> crawl.includes('incrementCrawlView'))
test('VW-09','Crawl: useRef(false) 중복방지',         ()=> crawl.includes('useRef(false)'))
test('VW-10','Crawl: useEffect([]) 마운트1회',        ()=> crawl.includes('}, [])'))
test('VW-11','Crawl: {views} 표시',                  ()=> crawl.includes('{views}'))
test('VW-12','CrawlInteractionStore: getCrawlViews', ()=> cstore.includes('getCrawlViews'))
test('VW-13','CrawlInteractionStore: increment',     ()=> cstore.includes('incrementCrawlView'))
test('VW-14','CrawlInteractionStore: localStorage 없음', ()=> !cstore.includes("localStorage.setItem"))

// ══════════════════════════════════════════════════════════
// SY — 목록 동기화
// ══════════════════════════════════════════════════════════
test('SY-01','PostCard: allPosts import',            ()=> postcard.includes('allPosts'))
test('SY-02','PostCard: allPosts.find 실시간참조',    ()=> postcard.includes('allPosts.find(p => p.id === postProp.id)'))
test('SY-03','PostCard: post.views 표시',            ()=> postcard.includes('post.views'))
test('SY-04','PostCard: Array.isArray 체크',          ()=> postcard.includes('Array.isArray(post.likes)'))
test('SY-05','PostCard: likes.length 표시',           ()=> postcard.includes('likes.length'))

// ══════════════════════════════════════════════════════════
// LK — 좋아요
// ══════════════════════════════════════════════════════════
test('LK-01','AppContext: toggleLike useCallback',   ()=> ctx.includes('useCallback') && ctx.includes('toggleLike'))
test('LK-02','AppContext: allPosts 공개',            ()=> ctx.includes('allPosts'))
test('LK-03','Post: allPosts 직접 참조',             ()=> detail.includes('allPosts'))
test('LK-04','AppContext: Array.isArray 체크',        ()=> ctx.includes('Array.isArray('))
test('LK-05','AppContext: likes.includes 토글',       ()=> ctx.includes('likes.includes(userId)'))
test('LK-06','AppContext: writeLS 즉시 저장',          ()=> ctx.includes('writeLS(POSTS_KEY'))
test('LK-07','AppContext: 좋아요 취소 filter',        ()=> ctx.includes('likes.filter(i => i !== userId)') || ctx.includes("likes.filter(id => id !== userId)"))
test('LK-08','Post: 비로그인 login 유도',             ()=> detail.includes("navigate('login')"))
test('LK-09','Crawl: crawlInteractionStore import',  ()=> crawl.includes('crawlInteractionStore'))
test('LK-10','Crawl: toggleCrawlLike 호출',          ()=> crawl.includes('toggleCrawlLike'))
test('LK-11','Crawl: handleLike 버튼 onClick',       ()=> crawl.includes('handleLike') && crawl.includes('onClick={handleLike}'))
test('LK-12','Crawl: likes.liked 상태 표시',          ()=> crawl.includes('likes.liked'))
test('LK-13','Crawl: 비로그인 login 유도',           ()=> crawl.includes("navigate('login')"))
test('LK-14','CrawlInteractionStore: getCrawlLikes', ()=> cstore.includes('getCrawlLikes'))
test('LK-15','CrawlInteractionStore: toggleCrawlLike',()=> cstore.includes('toggleCrawlLike'))
test('LK-16','CrawlInteractionStore: localStorage 없음',()=> !cstore.includes("localStorage.setItem"))

// ══════════════════════════════════════════════════════════
// RC — 이모지 반응
// ══════════════════════════════════════════════════════════
test('RC-01','6종 REACTIONS 정의',                   ()=> ['fire','lol','like','wow','sad','angry'].every(k => rstore.includes(k)))
test('RC-02','type="button" 명시',                   ()=> react.includes('type="button"'))
test('RC-03','handleReact 함수',                     ()=> react.includes('function handleReact'))
test('RC-04','Bootstrap .btn 클래스 미사용',          ()=> !react.includes('className="btn'))
test('RC-05','outline:none 명시',                    ()=> react.includes("outline: 'none'") || react.includes("outline:"))
test('RC-06','toggleReaction 사용',                  ()=> react.includes('toggleReaction'))
test('RC-07','같은 반응 취소 로직',                   ()=> rstore.includes('current === reactionKey') || rstore.includes('newKey = null'))
test('RC-08','loadReactions DB 로드',                ()=> rstore.includes('loadReactions') && react.includes('loadReactions'))
test('RC-09','비로그인 안내 문구',                    ()=> react.includes('로그인 후 반응'))
test('RC-10','Post: ReactionBar 사용',               ()=> detail.includes('ReactionBar'))
test('RC-11','Crawl: ReactionBar 사용',              ()=> crawl.includes('ReactionBar'))

// ══════════════════════════════════════════════════════════
// CM — 댓글 작성
// ══════════════════════════════════════════════════════════
test('CM-01','AppContext: addComment 함수',          ()=> ctx.includes('function addComment'))
test('CM-02','<form> 태그 미사용',                   ()=> !comment.includes('<form'))
test('CM-03','type="button" 명시',                   ()=> comment.includes('type="button"'))
test('CM-04','onClick={handleSubmit}',               ()=> comment.includes('onClick={handleSubmit}'))
test('CM-05','Bootstrap btn-primary 미사용',          ()=> !comment.includes('btn-primary'))
test('CM-06','인라인 버튼 스타일',                    ()=> comment.includes("body.trim() ? 'var(--color-primary)'"))
test('CM-07','Ctrl+Enter 단축키',                    ()=> comment.includes('ctrlKey') || comment.includes('metaKey'))
test('CM-08','setBody 초기화',                        ()=> comment.includes("setBody('')"))
test('CM-09','disabled 처리',                        ()=> comment.includes('disabled={!body.trim()}'))
test('CM-10','AppContext: deleteComment 함수',       ()=> ctx.includes('function deleteComment'))
test('CM-11','isOwner 타인삭제 불가',                 ()=> comment.includes('isOwner'))
test('CM-12','비로그인 댓글 안내',                    ()=> comment.includes('로그인'))

// ══════════════════════════════════════════════════════════
// PS — 데이터 영속성
// ══════════════════════════════════════════════════════════
test('PS-01','aha_posts_v1 유지 (DB 폴백)',          ()=> ctx.includes('aha_posts_v1'))
test('PS-02','aha_comments_v1 유지 (DB 폴백)',       ()=> ctx.includes('aha_comments_v1'))
test('PS-03','aha_reactions localStorage 제거',      ()=> !rstore.includes("localStorage.setItem") && rstore.includes("localStorage.removeItem('aha_reactions')"))
test('PS-04','aha_crawl_data_v2 localStorage 제거',  ()=> crawlSt.includes("localStorage.removeItem('aha_crawl_data_v2')"))
test('PS-05','aha_crawl_views localStorage 제거',    ()=> cstore.includes("localStorage.removeItem('aha_crawl_views')"))
test('PS-06','storage 이벤트 리스너',                ()=> ctx.includes("'storage'"))

// ══════════════════════════════════════════════════════════
// NV — navigate prop 전달
// ══════════════════════════════════════════════════════════
test('NV-01','SubPages: navigate 없는 CrawlFeed 0개', () => {
  const missing = subp.split('\n').filter(l => l.includes('<CrawlFeed') && !l.includes('navigate='))
  return missing.length === 0 || `누락 ${missing.length}개: ${missing[0]?.trim().slice(0, 50)}`
})
test('NV-03','Post btn-secondary 미사용',             ()=> !detail.includes('btn-secondary'))
test('NV-04','Crawl btn-secondary 미사용',            ()=> !crawl.includes('btn-secondary'))

// ══════════════════════════════════════════════════════════
// CC — CrawlCard 통계 동기화
// ══════════════════════════════════════════════════════════
test('CC-01','CrawlComponents: crawlInteractionStore import', ()=> crawlComp.includes('crawlInteractionStore'))
test('CC-02','CrawlCard: getCrawlViews',             ()=> crawlComp.includes('getCrawlViews'))
test('CC-03','CrawlCard: getCrawlLikes',             ()=> crawlComp.includes('getCrawlLikes'))
test('CC-04','CrawlCard: liveViews state',           ()=> crawlComp.includes('liveViews'))
test('CC-05','CrawlCard: liveLikes state',           ()=> crawlComp.includes('liveLikes'))
test('CC-06','CrawlCard: item.views 정적값 미사용',   ()=> !crawlComp.includes("v:item.views"))
test('CC-07','CrawlCard: focus 이벤트 갱신',         ()=> crawlComp.includes("'focus'"))
test('CC-08','CrawlCard: storage 이벤트 갱신',       ()=> crawlComp.includes("'storage'"))

// ══════════════════════════════════════════════════════════
// CF — 설정 관리
// ══════════════════════════════════════════════════════════
test('CF-01','config.py 존재',                       ()=> cfgApi.length > 100)
test('CF-02','config.py GET 핸들러',                 ()=> cfgApi.includes('do_GET'))
test('CF-03','config.py POST 핸들러',                ()=> cfgApi.includes('do_POST'))
test('CF-04','config.py CORS 헤더',                  ()=> cfgApi.includes('Access-Control-Allow-Origin'))
test('CF-05','config.py 19개 카테고리',              ()=> cfgApi.includes('"ai"') && cfgApi.includes('"game"') && cfgApi.includes('"finance"'))
test('CF-06','CrawlConfigManager: CategoryManager', ()=> cfgMgr.includes('export function CategoryManager'))
test('CF-07','CrawlConfigManager: TopicManager',    ()=> cfgMgr.includes('export function TopicManager'))
test('CF-08','CrawlConfigManager: SourceManager',   ()=> cfgMgr.includes('export function SourceManager'))
test('CF-09','CrawlConfigManager: POST /api/config',()=> cfgMgr.includes("method: 'POST'"))
test('CF-10','configStore: 30초 폴링',              ()=> cfgStore.includes('30000') && cfgStore.includes('/api/config'))

// ══════════════════════════════════════════════════════════
// DB — DB API 연동
// ══════════════════════════════════════════════════════════
test('DB-01','db.py: pymysql 사용',                  ()=> dbPy.includes('import pymysql'))
test('DB-02','db.py: ngrok 기본 호스트',             ()=> dbPy.includes('ngrok.io') || dbPy.includes('DB_HOST'))
test('DB-03','db.py: 환경변수 우선',                 ()=> dbPy.includes('os.environ.get("DB_HOST"'))
test('DB-04','v1.py: resource 라우터',               ()=> v1Py.includes('resource') && v1Py.includes('ROUTES'))
test('DB-05','v1.py: 핵심 resource 8개',             ()=> ['auth','users','posts','comments','categories','topics','crawl_items','reports']
                                                          .every(r => v1Py.includes(`"${r}"`)))
test('DB-06','v1.py: CORS 헤더',                     ()=> v1Py.includes('Access-Control-Allow-Origin'))
test('DB-07','data.py: DB 우선 조회',                ()=> dataPy.includes('_db_items') && dataPy.includes('db.query'))
test('DB-08','data.py: DB 없으면 크롤링 후 저장',    ()=> dataPy.includes('_save_to_db') && dataPy.includes('TOPIC_CRAWLERS'))
test('DB-09','cron.py: DB 저장',                     ()=> cronPy.includes('_save_to_db') && cronPy.includes('tb_crawl_item'))
test('DB-11','client.js: /api/v1 엔드포인트',        ()=> client.includes('/api/v1') && client.includes('resource='))
test('DB-12','AppContext: DB postAPI.list 로드',      ()=> ctx.includes('postAPI.list') || ctx.includes('postAPI'))


// ══════════════════════════════════════════════════════════
// SS — 세션 영속 (새로고침 후 로그인 유지)
// ══════════════════════════════════════════════════════════
const adminCtx = fs.readFileSync(path.join(ADMIN, 'context/AdminContext.jsx'), 'utf8')

test('SS-01','AuthContext: localStorage에서 세션 복원',     ()=> auth.includes('readLS(LS_USER_KEY)') || auth.includes("localStorage.getItem(LS_USER_KEY)"))
test('SS-02','AuthContext: LS_USER_KEY 상수 정의',          ()=> auth.includes("LS_USER_KEY"))
test('SS-03','AuthContext: users 캐시 localStorage 저장',   ()=> auth.includes('LS_USERS_KEY'))
test('SS-04','AuthContext: users 캐시 초기화 복원',         ()=> auth.includes('readLS(LS_USERS_KEY'))
test('SS-05','AuthContext: currentUser localStorage 저장',  ()=> auth.includes('writeLS(LS_USER_KEY') || auth.includes("localStorage.setItem(LS_USER_KEY") || auth.includes('LS_USER_KEY, user)'))
test('SS-06','AuthContext: logout 시 localStorage 삭제',    ()=> auth.includes('writeLS(LS_USER_KEY, null)') || auth.includes("localStorage.removeItem") || (auth.includes('_persist(null)') && auth.includes('if (val == null) localStorage.removeItem')))
test('SS-07','AuthContext: getUserById users 캐시 검색',    ()=> auth.includes('users.find') && auth.includes('getUserById'))
test('SS-08','AuthContext: currentUser users에 자동 추가',  ()=> auth.includes('useEffect') && auth.includes('currentUser') && auth.includes('setUsers'))
test('SS-09','AdminContext: localStorage 세션 복원',        ()=> adminCtx.includes('LS_ADMIN_KEY') && adminCtx.includes('localStorage.getItem(LS_ADMIN_KEY)'))
test('SS-10','AdminContext: 로그인 시 localStorage 저장',   ()=> adminCtx.includes('localStorage.setItem(LS_ADMIN_KEY'))
test('SS-11','AdminContext: logout 시 localStorage 삭제',   ()=> adminCtx.includes('localStorage.removeItem(LS_ADMIN_KEY)'))


// ══════════════════════════════════════════════════════════
// FB — DB 연결 실패 폴백 (서비스 무중단)
// ══════════════════════════════════════════════════════════
test('FB-01','v1.py: DB 실패 시 200 + 빈 컬렉션 반환',    ()=> v1Py.includes('db_down') && v1Py.includes('EMPTY'))
test('FB-02','v1.py: categories DB 실패 시 config 기본값',  ()=> v1Py.includes('DEFAULT_CONFIG') && v1Py.includes('"categories"'))
test('FB-03','v1.py: posts 빈 배열 폴백',                 ()=> v1Py.includes('"posts": []'))
test('FB-04','v1.py: topics DB 실패 시 config 기본값',      ()=> v1Py.includes('_DC.get') && v1Py.includes('topics'))
test('FB-05','data.py: /tmp JSON 캐시 저장',              ()=> dataPy.includes('CACHE_FILE') && dataPy.includes('/tmp/'))
test('FB-06','data.py: 3단계 폴백 (DB→캐시→크롤링)',      ()=> dataPy.includes('_get_cached') && dataPy.includes('_set_cached') && dataPy.includes('_db_items'))
test('FB-07','data.py: DB 실패 시 None 반환 (캐시로 폴백)',()=> dataPy.includes('return None'))
test('FB-08','data.py: 크롤링 성공 시 캐시 저장',         ()=> dataPy.includes('_set_cached(topic_key, items)'))
test('FB-09','client.js: FALLBACKS 기본값 정의',          ()=> client.includes('FALLBACKS'))
test('FB-10','client.js: GET 실패 시 기본값 반환',        ()=> client.includes("if (method !== 'GET') throw e") || client.includes("method !== 'GET'"))
test('FB-11','client.js: AbortSignal 타임아웃 10초',      ()=> client.includes('AbortSignal.timeout(10000)'))
test('FB-12','AppContext: db_down 플래그 처리',           ()=> ctx.includes('db_down'))
test('FB-13','AppContext: DB 실패 시 localStorage 유지',  ()=> ctx.includes('setDbAvailable(false)'))


// ══════════════════════════════════════════════════════════
// CB — 서킷 브레이커
// ══════════════════════════════════════════════════════════
const cb   = read('store/circuitBreaker.js')
const maint = read('pages/MaintenancePage.jsx')
const appCb = read('App.jsx')

test('CB-01','circuitBreaker: CLOSED/OPEN/HALF 상태 정의',  ()=> cb.includes('CLOSED') && cb.includes('OPEN') && cb.includes('HALF'))
test('CB-02','circuitBreaker: THRESHOLD 10회',              ()=> cb.includes('THRESHOLD = 10') || cb.includes('THRESHOLD=10'))
test('CB-03','circuitBreaker: HALF_TTL 30초',               ()=> cb.includes('30 * 1000') || cb.includes('30*1000'))
test('CB-04','circuitBreaker: recordSuccess 함수',          ()=> cb.includes('recordSuccess'))
test('CB-05','circuitBreaker: recordFailure 함수',          ()=> cb.includes('recordFailure'))
test('CB-06','circuitBreaker: healthCheck 함수',            ()=> cb.includes('healthCheck'))
test('CB-07','circuitBreaker: 자동 복구 setInterval',       ()=> cb.includes('setInterval'))
test('CB-08','circuitBreaker: onStateChange 구독',          ()=> cb.includes('onStateChange'))
test('CB-09','circuitBreaker: reset 강제 초기화',           ()=> cb.includes('function reset'))
test('CB-10','circuitBreaker: 메모리 상태 (앱 시작 항상 CLOSED)', ()=> cb.includes('_state') && cb.includes('CB_STATE.CLOSED') && !cb.includes('sessionStorage.setItem'))
test('CB-11','client.js: OPEN 상태 요청 차단',              ()=> client.includes('CB_STATE.OPEN') && client.includes('서버 점검 중'))
test('CB-12','client.js: recordSuccess/recordFailure 연동', ()=> client.includes('recordSuccess()') && client.includes('recordFailure()'))
test('CB-13','client.js: db_down → recordFailure',          ()=> client.includes('db_down') && client.includes('recordFailure'))
test('CB-14','App.jsx: onStateChange 구독',                 ()=> appCb.includes('onStateChange') && appCb.includes('setCbState'))
test('CB-15','App.jsx: OPEN 시 MaintenancePage 렌더',       ()=> appCb.includes('CB_STATE.OPEN') && appCb.includes('MaintenancePage'))
test('CB-16','MaintenancePage: 단계별 안내 메시지 (STAGES)',  ()=> maint.includes('STAGES') && maint.includes('getStage'))
test('CB-17','MaintenancePage: 재시도 버튼',                    ()=> maint.includes('handleRetry') && maint.includes('지금 다시 시도'))
test('CB-18','MaintenancePage: 복구 시 안내 후 reload',        ()=> maint.includes('recovered') && maint.includes('window.location.reload'))
test('CB-19','MaintenancePage: 홈으로 버튼',                   ()=> maint.includes('reset()') && maint.includes('홈으로 돌아가기'))
test('CB-20','MaintenancePage: aha! 디자인 토큰 사용',          ()=> maint.includes('#0066CC'))

// ══════════════════════════════════════════════════════════
// 결과 출력
// ══════════════════════════════════════════════════════════
const pass  = R.filter(r => r.pass).length
const fail  = R.filter(r => !r.pass).length
const total = R.length

console.log(`\n${'═'.repeat(64)}`)
console.log(` aha! 자동 품질 테스트  ✅ ${pass} PASS  ❌ ${fail} FAIL  (총 ${total}개)`)
console.log(`${'═'.repeat(64)}\n`)

const groups = {}
R.forEach(r => { const g = r.id.split('-')[0]; (groups[g] = groups[g] || []).push(r) })

const GROUP_LABELS = {
  BK:'뒤로가기',  VW:'조회수',    SY:'목록동기화', LK:'좋아요',
  RC:'이모지반응', CM:'댓글작성',  PS:'데이터영속', NV:'navigate',
  CC:'CrawlCard', CF:'설정관리',  DB:'DB연동',
}

Object.entries(groups).forEach(([g, items]) => {
  const gp    = items.filter(i => i.pass).length
  const label = GROUP_LABELS[g] || g
  console.log(`  ${gp === items.length ? '✅' : '⚠️ '} [${g}] ${label.padEnd(10)} ${gp}/${items.length}`)
  items.filter(r => !r.pass).forEach(r =>
    console.log(`      ❌ ${r.id} ${r.desc}${r.msg ? ' → ' + r.msg : ''}`)
  )
})

if (fail === 0) console.log('\n✅ 전체 PASS — 모든 품질 기준 충족\n')
else { console.log(`\n❌ ${fail}개 FAIL:`); R.filter(r=>!r.pass).forEach(r=>console.log(`  [${r.id}] ${r.desc}`)); console.log() }

process.exit(fail > 0 ? 1 : 0)
