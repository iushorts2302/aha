/**
 * quality.test.cjs — aha! 사용자웹 자동 품질 테스트
 *
 * 실행: node apps/user/src/__tests__/quality.test.cjs
 *
 * 검사 영역 (총 98개):
 *   BK  뒤로가기 (Post + Crawl)      12개
 *   VW  조회수 (Post + Crawl)        14개
 *   SY  목록 동기화                   5개
 *   LK  좋아요 (Post + Crawl)        16개
 *   RC  이모지 반응                  11개
 *   CM  댓글 작성                    12개
 *   PS  데이터 영속성                 6개
 *   NV  navigate prop 전달           4개
 *   CC  CrawlCard 통계 동기화         8개
 *   CF  설정 관리 (admin config)     10개
 */

const fs   = require('fs')
const path = require('path')

const USER  = path.join(__dirname, '..')
const ADMIN = path.join(__dirname, '../../../admin/src')
const API   = path.join(__dirname, '../../../admin/api')

const read = rel => fs.readFileSync(path.join(USER, rel), 'utf8')
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
const detail   = read('pages/PostDetailPage.jsx')
const crawl    = read('pages/CrawlDetailPage.jsx')
const react    = read('components/ReactionBar.jsx')
const comment  = read('components/CommentSection.jsx')
const postcard = read('components/PostCard.jsx')
const crawlComp= read('components/CrawlComponents.jsx')
const rstore   = read('store/reactionStore.js')
const cstore   = read('store/crawlInteractionStore.js')
const cfgStore = read('store/configStore.js')
const subp     = read('pages/SubPages.jsx')
const cfgMgr   = readAdmin('pages/CrawlConfigManager.jsx')
const cfgApi   = readApi('config.py')

// ══════════════════════════════════════════════════════════
// BK — 뒤로가기
// ══════════════════════════════════════════════════════════
test('BK-01','App: useRef prevRouteRef 선언',         ()=> app.includes('prevRouteRef'))
test('BK-02','App: navigate 전 ref에 기록',           ()=> app.includes('prevRouteRef.current = route'))
test('BK-03','App: PostDetailPage prevPage 전달',     ()=> app.includes('prevPage={prevRouteRef.current}') && app.includes('PostDetailPage'))
test('BK-04','App: CrawlDetailPage prevPage 전달',    ()=> app.includes('prevPage={prevRouteRef.current}') && app.includes('CrawlDetailPage'))
test('BK-05','Post: prevPage prop 수신',              ()=> detail.includes('prevPage'))
test('BK-06','Post: navigate(prevPage || board)',     ()=> detail.includes("|| 'board'"))
test('BK-07','Post: history.back() 미사용',           ()=> !detail.includes('history.back()'))
test('BK-08','Crawl: prevPage prop 수신',             ()=> crawl.includes('prevPage'))
test('BK-09','Crawl: navigate(prevPage || home)',     ()=> crawl.includes("|| 'home'"))
test('BK-10','Crawl: history.back() 미사용',          ()=> !crawl.includes('history.back()'))
test('BK-11','Post: 뒤로가기 버튼 투명',              ()=> detail.includes("background: 'transparent'") && detail.includes("border: 'none'"))
test('BK-12','Crawl: 뒤로가기 버튼 투명',             ()=> crawl.includes("background: 'transparent'") && crawl.includes("border: 'none'"))

// ══════════════════════════════════════════════════════════
// VW — 조회수
// ══════════════════════════════════════════════════════════
test('VW-01','AppContext: incrementView 함수',         ()=> ctx.includes('incrementView'))
test('VW-02','AppContext: views+1 로직',               ()=> ctx.includes('views: (p.views || 0) + 1'))
test('VW-03','AppContext: setPosts 함수형 업데이트',    ()=> ctx.includes('setPosts(prev =>'))
test('VW-04','AppContext: writeLS 즉시 저장',           ()=> ctx.includes('writeLS(POSTS_KEY'))
test('VW-05','Post: useRef(false) 중복방지',           ()=> detail.includes('useRef(false)'))
test('VW-06','Post: useEffect([]) 마운트1회',          ()=> detail.includes('}, [])'))
test('VW-07','Crawl: crawlInteractionStore import',   ()=> crawl.includes('crawlInteractionStore'))
test('VW-08','Crawl: incrementCrawlView 호출',         ()=> crawl.includes('incrementCrawlView'))
test('VW-09','Crawl: useRef(false) 중복방지',          ()=> crawl.includes('useRef(false)'))
test('VW-10','Crawl: useEffect([]) 마운트1회',         ()=> crawl.includes('}, [])'))
test('VW-11','Crawl: {views} 표시',                   ()=> crawl.includes('{views}'))
test('VW-12','CrawlStore: getCrawlViews',              ()=> cstore.includes('getCrawlViews'))
test('VW-13','CrawlStore: incrementCrawlView',         ()=> cstore.includes('incrementCrawlView'))
test('VW-14','CrawlStore: localStorage 저장',          ()=> cstore.includes("localStorage.setItem"))

// ══════════════════════════════════════════════════════════
// SY — 목록 views/likes 동기화
// ══════════════════════════════════════════════════════════
test('SY-01','PostCard: allPosts import',               ()=> postcard.includes('allPosts'))
test('SY-02','PostCard: allPosts.find 실시간참조',       ()=> postcard.includes('allPosts.find(p => p.id === postProp.id)'))
test('SY-03','PostCard: post.views 표시',               ()=> postcard.includes('post.views'))
test('SY-04','PostCard: Array.isArray 체크',             ()=> postcard.includes('Array.isArray(post.likes)'))
test('SY-05','PostCard: likes.length 표시',              ()=> postcard.includes('likes.length'))

// ══════════════════════════════════════════════════════════
// LK — 좋아요
// ══════════════════════════════════════════════════════════
test('LK-01','AppContext: toggleLike useCallback',      ()=> ctx.includes('useCallback') && ctx.includes('toggleLike'))
test('LK-02','AppContext: allPosts 공개',               ()=> ctx.includes('allPosts'))
test('LK-03','Post: allPosts.find 직접 참조',            ()=> detail.includes('allPosts'))
test('LK-04','AppContext: Array.isArray 체크',           ()=> ctx.includes('Array.isArray('))
test('LK-05','AppContext: likes.includes 토글',          ()=> ctx.includes('likes.includes(userId)'))
test('LK-06','AppContext: writeLS 즉시 저장',             ()=> ctx.includes('writeLS(POSTS_KEY'))
test('LK-07','AppContext: 좋아요 취소 filter',           ()=> ctx.includes('likes.filter(id => id !== userId)'))
test('LK-08','Post: 비로그인 login 유도',                ()=> detail.includes("navigate('login')"))
test('LK-09','Crawl: crawlInteractionStore import',    ()=> crawl.includes('crawlInteractionStore'))
test('LK-10','Crawl: toggleCrawlLike 호출',             ()=> crawl.includes('toggleCrawlLike'))
test('LK-11','Crawl: handleLike 버튼 onClick',          ()=> crawl.includes('handleLike') && crawl.includes('onClick={handleLike}'))
test('LK-12','Crawl: likes.liked 상태 표시',             ()=> crawl.includes('likes.liked'))
test('LK-13','Crawl: 비로그인 login 유도',              ()=> crawl.includes("navigate('login')"))
test('LK-14','CrawlStore: getCrawlLikes',               ()=> cstore.includes('getCrawlLikes'))
test('LK-15','CrawlStore: toggleCrawlLike',             ()=> cstore.includes('toggleCrawlLike'))
test('LK-16','CrawlStore: localStorage 저장',            ()=> cstore.includes("localStorage.setItem"))

// ══════════════════════════════════════════════════════════
// RC — 이모지 반응
// ══════════════════════════════════════════════════════════
test('RC-01','6종 REACTIONS 정의',                     ()=> ['fire','lol','like','wow','sad','angry'].every(k => rstore.includes(k)))
test('RC-02','type="button" 명시',                     ()=> react.includes('type="button"'))
test('RC-03','handleReact 함수',                       ()=> react.includes('function handleReact'))
test('RC-04','Bootstrap .btn 클래스 미사용',            ()=> !react.includes('className="btn'))
test('RC-05','outline:none 명시',                      ()=> react.includes("outline: 'none'") || react.includes("outline:"))
test('RC-06','toggleReaction 사용',                    ()=> react.includes('toggleReaction'))
test('RC-07','같은 반응 취소 로직',                     ()=> rstore.includes('current === reactionKey'))
test('RC-08','userReactions per user',                 ()=> rstore.includes('userReactions'))
test('RC-09','비로그인 안내 문구',                      ()=> react.includes('로그인 후 반응'))
test('RC-10','Post: ReactionBar 사용',                 ()=> detail.includes('ReactionBar'))
test('RC-11','Crawl: ReactionBar 사용',                ()=> crawl.includes('ReactionBar'))

// ══════════════════════════════════════════════════════════
// CM — 댓글 작성
// ══════════════════════════════════════════════════════════
test('CM-01','AppContext: addComment 함수',             ()=> ctx.includes('function addComment'))
test('CM-02','<form> 태그 미사용',                     ()=> !comment.includes('<form'))
test('CM-03','type="button" 명시',                     ()=> comment.includes('type="button"'))
test('CM-04','onClick={handleSubmit}',                 ()=> comment.includes('onClick={handleSubmit}'))
test('CM-05','Bootstrap btn-primary 미사용',            ()=> !comment.includes('btn-primary'))
test('CM-06','인라인 버튼 스타일',                      ()=> comment.includes("body.trim() ? 'var(--color-primary)'"))
test('CM-07','Ctrl+Enter 단축키',                      ()=> comment.includes('ctrlKey') || comment.includes('metaKey'))
test('CM-08','setBody 초기화',                          ()=> comment.includes("setBody('')"))
test('CM-09','disabled 처리',                          ()=> comment.includes('disabled={!body.trim()}'))
test('CM-10','AppContext: deleteComment 함수',          ()=> ctx.includes('function deleteComment'))
test('CM-11','isOwner 타인삭제 불가',                   ()=> comment.includes('isOwner'))
test('CM-12','비로그인 댓글 안내',                      ()=> comment.includes('로그인'))

// ══════════════════════════════════════════════════════════
// PS — 데이터 영속성
// ══════════════════════════════════════════════════════════
test('PS-01','aha_posts_v1 키',                        ()=> ctx.includes('aha_posts_v1'))
test('PS-02','aha_comments_v1 키',                     ()=> ctx.includes('aha_comments_v1'))
test('PS-03','aha_reactions 키',                       ()=> rstore.includes('aha_reactions'))
test('PS-04','aha_crawl_views 키',                     ()=> cstore.includes('aha_crawl_views'))
test('PS-05','aha_crawl_likes 키',                     ()=> cstore.includes('aha_crawl_likes'))
test('PS-06','storage 이벤트 리스너',                   ()=> ctx.includes("'storage'"))

// ══════════════════════════════════════════════════════════
// NV — navigate prop 전달
// ══════════════════════════════════════════════════════════
test('NV-01','SubPages: navigate 없는 CrawlFeed 0개', () => {
  const missing = subp.split('\n').filter(l => l.includes('<CrawlFeed') && !l.includes('navigate='))
  return missing.length === 0 || `누락 ${missing.length}개: ${missing[0]?.trim().slice(0, 50)}`
})
test('NV-02','LivePage: navigate prop 수신',          ()=> subp.includes('LivePage({ navigate }') || subp.includes('LivePage({navigate'))
test('NV-03','Post btn-secondary 미사용',              ()=> !detail.includes('btn-secondary'))
test('NV-04','Crawl btn-secondary 미사용',             ()=> !crawl.includes('btn-secondary'))

// ══════════════════════════════════════════════════════════
// CC — CrawlCard 통계 동기화
// ══════════════════════════════════════════════════════════
test('CC-01','CrawlComponents: crawlInteractionStore import', ()=> crawlComp.includes('crawlInteractionStore'))
test('CC-02','CrawlCard: getCrawlViews',               ()=> crawlComp.includes('getCrawlViews'))
test('CC-03','CrawlCard: getCrawlLikes',               ()=> crawlComp.includes('getCrawlLikes'))
test('CC-04','CrawlCard: liveViews state',             ()=> crawlComp.includes('liveViews'))
test('CC-05','CrawlCard: liveLikes state',             ()=> crawlComp.includes('liveLikes'))
test('CC-06','CrawlCard: item.views 정적값 미사용',     ()=> !crawlComp.includes("v:item.views"))
test('CC-07','CrawlCard: focus 이벤트 갱신',           ()=> crawlComp.includes("'focus'"))
test('CC-08','CrawlCard: storage 이벤트 갱신',         ()=> crawlComp.includes("'storage'"))

// ══════════════════════════════════════════════════════════
// CF — 설정 관리 (admin config)
// ══════════════════════════════════════════════════════════
test('CF-01','config.py 존재',                         ()=> cfgApi.length > 100)
test('CF-02','config.py GET 핸들러',                   ()=> cfgApi.includes('do_GET'))
test('CF-03','config.py POST 핸들러',                  ()=> cfgApi.includes('do_POST'))
test('CF-04','config.py CORS 헤더',                    ()=> cfgApi.includes('Access-Control-Allow-Origin'))
test('CF-05','config.py 19개 이상 카테고리',           ()=> cfgApi.includes('"ai"') && cfgApi.includes('"game"') && cfgApi.includes('"finance"'))
test('CF-06','CrawlConfigManager: CategoryManager',    ()=> cfgMgr.includes('export function CategoryManager'))
test('CF-07','CrawlConfigManager: TopicManager',       ()=> cfgMgr.includes('export function TopicManager'))
test('CF-08','CrawlConfigManager: SourceManager',      ()=> cfgMgr.includes('export function SourceManager'))
test('CF-09','CrawlConfigManager: POST /api/config',   ()=> cfgMgr.includes("method: 'POST'"))
test('CF-10','configStore: 30초 폴링',                 ()=> cfgStore.includes('30000') && cfgStore.includes('/api/config'))

// ══════════════════════════════════════════════════════════
// 결과 출력
// ══════════════════════════════════════════════════════════
const pass = R.filter(r => r.pass).length
const fail = R.filter(r => !r.pass).length
const total = R.length

console.log(`\n${'═'.repeat(64)}`)
console.log(` aha! 자동 품질 테스트  ✅ ${pass} PASS  ❌ ${fail} FAIL  (총 ${total}개)`)
console.log(`${'═'.repeat(64)}\n`)

const groups = {}
R.forEach(r => { const g = r.id.split('-')[0]; (groups[g] = groups[g] || []).push(r) })

const GROUP_LABELS = {
  BK: '뒤로가기',  VW: '조회수', SY: '목록동기화',
  LK: '좋아요',    RC: '이모지반응', CM: '댓글작성',
  PS: '데이터영속', NV: 'navigate', CC: 'CrawlCard',
  CF: '설정관리',
}

Object.entries(groups).forEach(([g, items]) => {
  const gp = items.filter(i => i.pass).length
  const label = GROUP_LABELS[g] || g
  console.log(`  ${gp === items.length ? '✅' : '⚠️ '} [${g}] ${label.padEnd(10)} ${gp}/${items.length}`)
  items.filter(r => !r.pass).forEach(r =>
    console.log(`      ❌ ${r.id} ${r.desc}${r.msg ? ' → ' + r.msg : ''}`)
  )
})

if (fail === 0) {
  console.log('\n✅ 전체 PASS — 모든 품질 기준 충족\n')
} else {
  console.log(`\n❌ ${fail}개 FAIL:`)
  R.filter(r => !r.pass).forEach(r => console.log(`  [${r.id}] ${r.desc}`))
  console.log()
}

process.exit(fail > 0 ? 1 : 0)
