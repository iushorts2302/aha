/**
 * quality.test.cjs — aha! 품질 테스트
 * 게시글 상세 + 크롤링 상세 뒤로가기/조회수/좋아요/반응 검사
 */
const fs   = require('fs')
const path = require('path')
const SRC  = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(SRC, rel), 'utf8')

const R = []
function test(id, desc, fn) {
  try { const ok = fn(); R.push({ id, desc, pass: !!ok, msg: ok === true ? '' : String(ok) }) }
  catch(e) { R.push({ id, desc, pass: false, msg: e.message }) }
}

// 파일 로드
const app     = read('App.jsx')
const ctx     = read('context/AppContext.jsx')
const detail  = read('pages/PostDetailPage.jsx')
const crawl   = read('pages/CrawlDetailPage.jsx')
const react   = read('components/ReactionBar.jsx')
const comment = read('components/CommentSection.jsx')
const rstore  = read('store/reactionStore.js')
const cstore  = read('store/crawlInteractionStore.js')
const subp    = read('pages/SubPages.jsx')

// ══════════════════════════════════════════════════════
// 1. 뒤로가기
// ══════════════════════════════════════════════════════
test('BK-01','App: useRef prevRouteRef 선언',    ()=> app.includes('prevRouteRef'))
test('BK-02','App: navigate 전 ref 기록',        ()=> app.includes('prevRouteRef.current = route'))
test('BK-03','App: PostDetailPage prevPage 전달', ()=> app.includes('prevPage={prevRouteRef.current}'))
test('BK-04','App: CrawlDetailPage prevPage 전달',()=> app.includes('prevPage={prevRouteRef.current}') && app.includes('CrawlDetailPage'))
test('BK-05','Post: prevPage prop 수신',         ()=> detail.includes('prevPage'))
test('BK-06','Post: navigate(prevPage||board)',   ()=> detail.includes("navigate(prevPage || 'board')") || detail.includes("prevPage || 'board'"))
test('BK-07','Post: history.back() 미사용',       ()=> !detail.includes('history.back()'))
test('BK-08','Crawl: prevPage prop 수신',        ()=> crawl.includes('prevPage'))
test('BK-09','Crawl: navigate(prevPage||home)',   ()=> crawl.includes("navigate(prevPage || 'home')") || crawl.includes("prevPage ||"))
test('BK-10','Crawl: history.back() 미사용',      ()=> !crawl.includes('history.back()'))
test('BK-11','Post: 뒤로가기 버튼 배경 투명',      ()=> detail.includes("background: 'transparent'") && detail.includes("border: 'none'"))
test('BK-12','Crawl: 뒤로가기 버튼 배경 투명',     ()=> crawl.includes("background: 'transparent'") && crawl.includes("border: 'none'"))

// ══════════════════════════════════════════════════════
// 2. 조회수 (view)
// ══════════════════════════════════════════════════════
test('VW-01','Post: incrementView useCallback',   ()=> ctx.includes('incrementView'))
test('VW-02','Post: views+1 로직',                ()=> ctx.includes('views: (p.views || 0) + 1'))
test('VW-03','Post: setPosts 함수형 업데이트',     ()=> ctx.includes('setPosts(prev =>'))
test('VW-04','Post: writeLS 즉시 저장',           ()=> ctx.includes('writeLS(POSTS_KEY'))
test('VW-05','Post: useRef(false) 중복방지',      ()=> detail.includes('useRef(false)'))
test('VW-06','Post: useEffect([]) 마운트1회',     ()=> detail.includes('}, [])'))
test('VW-07','Crawl: crawlInteractionStore import',()=> crawl.includes('crawlInteractionStore'))
test('VW-08','Crawl: incrementCrawlView 호출',    ()=> crawl.includes('incrementCrawlView'))
test('VW-09','Crawl: useRef(false) 중복방지',     ()=> crawl.includes('useRef(false)'))
test('VW-10','Crawl: useEffect([]) 마운트1회',    ()=> crawl.includes('}, [])'))
test('VW-11','Crawl: views 상태 표시',            ()=> crawl.includes('{views}'))
test('VW-12','CrawlStore: getCrawlViews 함수',    ()=> cstore.includes('getCrawlViews'))
test('VW-13','CrawlStore: incrementCrawlView',    ()=> cstore.includes('incrementCrawlView'))
test('VW-14','CrawlStore: localStorage 저장',     ()=> cstore.includes("localStorage.setItem"))

// ══════════════════════════════════════════════════════
// 3. 좋아요 (like)
// ══════════════════════════════════════════════════════
test('LK-01','Post: toggleLike useCallback',       ()=> ctx.includes('useCallback') && ctx.includes('toggleLike'))
test('LK-02','Post: allPosts 공개',                ()=> ctx.includes('allPosts'))
test('LK-03','Post: allPosts.find 직접 참조',       ()=> detail.includes('allPosts'))
test('LK-04','Post: Array.isArray 안전 체크',       ()=> ctx.includes('Array.isArray('))
test('LK-05','Post: likes.includes 토글',          ()=> ctx.includes('likes.includes(userId)'))
test('LK-06','Post: writeLS 즉시 저장',            ()=> ctx.includes('writeLS(POSTS_KEY'))
test('LK-07','Post: 좋아요 취소 filter',           ()=> ctx.includes('likes.filter(id => id !== userId)'))
test('LK-08','Post: 비로그인 login 유도',          ()=> detail.includes("navigate('login')"))
test('LK-09','Crawl: crawlInteractionStore import',()=> crawl.includes('crawlInteractionStore'))
test('LK-10','Crawl: toggleCrawlLike 호출',        ()=> crawl.includes('toggleCrawlLike'))
test('LK-11','Crawl: 좋아요 클릭 버튼 존재',        ()=> crawl.includes('handleLike') && crawl.includes('onClick={handleLike}'))
test('LK-12','Crawl: 좋아요 상태 표시',            ()=> crawl.includes('likes.liked') && crawl.includes('likes.count'))
test('LK-13','Crawl: 비로그인 login 유도',         ()=> crawl.includes("navigate('login')"))
test('LK-14','CrawlStore: getCrawlLikes 함수',     ()=> cstore.includes('getCrawlLikes'))
test('LK-15','CrawlStore: toggleCrawlLike 함수',   ()=> cstore.includes('toggleCrawlLike'))
test('LK-16','CrawlStore: localStorage 저장',      ()=> cstore.includes("localStorage.setItem"))

// ══════════════════════════════════════════════════════
// 4. 이모지 반응 (reaction)
// ══════════════════════════════════════════════════════
test('RC-01','ReactionBar: 6종 정의',             ()=> ['fire','lol','like','wow','sad','angry'].every(k => rstore.includes(k)))
test('RC-02','ReactionBar: type="button" 명시',   ()=> react.includes('type="button"'))
test('RC-03','ReactionBar: handleReact 함수',     ()=> react.includes('function handleReact'))
test('RC-04','ReactionBar: Bootstrap .btn 미사용',()=> !react.includes('className="btn'))
test('RC-05','ReactionBar: outline:none',         ()=> react.includes("outline: 'none'") || react.includes("outline:"))
test('RC-06','ReactionBar: toggleReaction 사용',  ()=> react.includes('toggleReaction'))
test('RC-07','ReactionBar: 같은 반응 취소',        ()=> rstore.includes('current === reactionKey'))
test('RC-08','ReactionBar: 1인 1반응 userReactions',()=> rstore.includes('userReactions'))
test('RC-09','ReactionBar: 비로그인 안내',         ()=> react.includes('로그인 후 반응'))
test('RC-10','Post: ReactionBar 사용',            ()=> detail.includes('ReactionBar'))
test('RC-11','Crawl: ReactionBar 사용',           ()=> crawl.includes('ReactionBar'))

// ══════════════════════════════════════════════════════
// 5. 댓글
// ══════════════════════════════════════════════════════
test('CM-01','댓글: addComment 함수',             ()=> ctx.includes('function addComment'))
test('CM-02','댓글: body.trim() 빈댓글 방지',     ()=> comment.includes('.trim()'))
test('CM-03','댓글: deleteComment 함수',          ()=> ctx.includes('function deleteComment'))
test('CM-04','댓글: isOwner 타인삭제 불가',        ()=> comment.includes('isOwner'))
test('CM-05','댓글: 비로그인 안내',               ()=> comment.includes('로그인'))

// ══════════════════════════════════════════════════════
// 6. 영속성
// ══════════════════════════════════════════════════════
test('PS-01','게시글: aha_posts_v1',              ()=> ctx.includes('aha_posts_v1'))
test('PS-02','댓글: aha_comments_v1',             ()=> ctx.includes('aha_comments_v1'))
test('PS-03','반응: aha_reactions',               ()=> rstore.includes('aha_reactions'))
test('PS-04','크롤 조회수: localStorage',         ()=> cstore.includes('aha_crawl_views'))
test('PS-05','크롤 좋아요: localStorage',         ()=> cstore.includes('aha_crawl_likes'))
test('PS-06','storage 이벤트 리스너',             ()=> ctx.includes("'storage'"))

// ══════════════════════════════════════════════════════
// 7. navigate prop 전달
// ══════════════════════════════════════════════════════
test('NV-01','SubPages: navigate 없는 CrawlFeed 0개', () => {
  const missing = subp.split('\n').filter(l => l.includes('<CrawlFeed') && !l.includes('navigate='))
  return missing.length === 0 || `누락 ${missing.length}개: ${missing[0]?.trim().slice(0,60)}`
})
test('NV-02','SubPages: LivePage navigate 수신', ()=> subp.includes("function LivePage({ navigate }") || subp.includes('LivePage({navigate'))
test('NV-03','App: CrawlDetailPage prevPage 전달',()=> app.includes('prevPage={prevRouteRef.current}'))
test('NV-04','Crawl: btn-secondary 미사용',       ()=> !crawl.includes('btn-secondary'))
test('NV-05','Post: btn-secondary 미사용',        ()=> !detail.includes('btn-secondary'))

// ══════════════════════════════════════════════════════
// 결과 출력
// ══════════════════════════════════════════════════════
const pass = R.filter(r => r.pass).length
const fail = R.filter(r => !r.pass).length

console.log(`\n${'═'.repeat(60)}`)
console.log(` aha! 품질 테스트  ✅ ${pass} PASS  ❌ ${fail} FAIL  (총 ${R.length}개)`)
console.log(`${'═'.repeat(60)}\n`)

const groups = {}
R.forEach(r => { const g = r.id.split('-')[0]; (groups[g] = groups[g]||[]).push(r) })
Object.entries(groups).forEach(([g, items]) => {
  const gp = items.filter(i => i.pass).length
  console.log(`  ${gp === items.length ? '✅' : '⚠️ '} [${g}] ${gp}/${items.length}`)
  items.filter(r => !r.pass).forEach(r => console.log(`      ❌ ${r.id} ${r.desc}${r.msg?' → '+r.msg:''}`))
})

if (fail === 0) console.log('\n✅ 전체 PASS')
else { console.log('\n❌ FAIL 상세:'); R.filter(r=>!r.pass).forEach(r=>console.log(`  [${r.id}] ${r.desc}`)) }
process.exit(fail > 0 ? 1 : 0)
