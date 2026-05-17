const fs = require('fs'), path = require('path')
const SRC = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(SRC, rel), 'utf8')
const R = []
function test(id, desc, fn) {
  try { const ok = fn(); R.push({ id, desc, pass: !!ok, msg: ok === true ? '' : String(ok) }) }
  catch(e) { R.push({ id, desc, pass: false, msg: e.message }) }
}

const app      = read('App.jsx')
const ctx      = read('context/AppContext.jsx')
const detail   = read('pages/PostDetailPage.jsx')
const crawl    = read('pages/CrawlDetailPage.jsx')
const react    = read('components/ReactionBar.jsx')
const comment  = read('components/CommentSection.jsx')
const postcard = read('components/PostCard.jsx')
const rstore   = read('store/reactionStore.js')
const cstore   = read('store/crawlInteractionStore.js')
const subp     = read('pages/SubPages.jsx')

// ── 뒤로가기 ──────────────────────────────────────────
test('BK-01','App useRef prevRouteRef',       ()=> app.includes('prevRouteRef'))
test('BK-02','navigate 전 ref 기록',          ()=> app.includes('prevRouteRef.current = route'))
test('BK-03','Post prevPage 전달',            ()=> app.includes('prevPage={prevRouteRef.current}') && app.includes('PostDetailPage'))
test('BK-04','Crawl prevPage 전달',           ()=> app.includes('prevPage={prevRouteRef.current}') && app.includes('CrawlDetailPage'))
test('BK-05','Post prevPage 수신',            ()=> detail.includes('prevPage'))
test('BK-06','Post navigate(prevPage||board)',()=> detail.includes("|| 'board'"))
test('BK-07','Post history.back 미사용',      ()=> !detail.includes('history.back()'))
test('BK-08','Crawl prevPage 수신',           ()=> crawl.includes('prevPage'))
test('BK-09','Crawl navigate(prevPage||home)',()=> crawl.includes("|| 'home'"))
test('BK-10','Crawl history.back 미사용',     ()=> !crawl.includes('history.back()'))
test('BK-11','Post 뒤로가기 투명 버튼',       ()=> detail.includes("background: 'transparent'") && detail.includes("border: 'none'"))
test('BK-12','Crawl 뒤로가기 투명 버튼',      ()=> crawl.includes("background: 'transparent'") && crawl.includes("border: 'none'"))

// ── 조회수 (Post) ─────────────────────────────────────
test('VW-01','incrementView 함수',            ()=> ctx.includes('incrementView'))
test('VW-02','views+1 로직',                  ()=> ctx.includes('views: (p.views || 0) + 1'))
test('VW-03','setPosts 함수형 업데이트',       ()=> ctx.includes('setPosts(prev =>'))
test('VW-04','writeLS 즉시 저장',             ()=> ctx.includes('writeLS(POSTS_KEY'))
test('VW-05','Post useRef(false)',            ()=> detail.includes('useRef(false)'))
test('VW-06','Post useEffect([])',            ()=> detail.includes('}, [])'))
// 조회수 (Crawl)
test('VW-07','Crawl crawlInteractionStore',  ()=> crawl.includes('crawlInteractionStore'))
test('VW-08','Crawl incrementCrawlView',     ()=> crawl.includes('incrementCrawlView'))
test('VW-09','Crawl useRef(false)',           ()=> crawl.includes('useRef(false)'))
test('VW-10','Crawl useEffect([])',           ()=> crawl.includes('}, [])'))
test('VW-11','Crawl {views} 표시',           ()=> crawl.includes('{views}'))
test('VW-12','CrawlStore getCrawlViews',     ()=> cstore.includes('getCrawlViews'))
test('VW-13','CrawlStore incrementCrawlView',()=> cstore.includes('incrementCrawlView'))
test('VW-14','CrawlStore localStorage',      ()=> cstore.includes("localStorage.setItem"))

// ── 조회수 목록 동기화 ────────────────────────────────
test('SY-01','PostCard allPosts import',         ()=> postcard.includes('allPosts'))
test('SY-02','PostCard allPosts.find 실시간참조', ()=> postcard.includes('allPosts.find(p => p.id === postProp.id)'))
test('SY-03','PostCard post.views 표시',          ()=> postcard.includes('post.views'))
test('SY-04','PostCard Array.isArray 체크',       ()=> postcard.includes('Array.isArray(post.likes)'))
test('SY-05','PostCard likes.length 표시',        ()=> postcard.includes('likes.length'))

// ── 좋아요 (Post) ─────────────────────────────────────
test('LK-01','toggleLike useCallback',       ()=> ctx.includes('useCallback') && ctx.includes('toggleLike'))
test('LK-02','allPosts 공개',                ()=> ctx.includes('allPosts'))
test('LK-03','Post allPosts.find 참조',      ()=> detail.includes('allPosts'))
test('LK-04','Array.isArray 체크',           ()=> ctx.includes('Array.isArray('))
test('LK-05','likes.includes 토글',          ()=> ctx.includes('likes.includes(userId)'))
test('LK-06','writeLS 즉시 저장',            ()=> ctx.includes('writeLS(POSTS_KEY'))
test('LK-07','좋아요 취소 filter',           ()=> ctx.includes('likes.filter(id => id !== userId)'))
test('LK-08','Post 비로그인 login',          ()=> detail.includes("navigate('login')"))
// 좋아요 (Crawl)
test('LK-09','Crawl crawlInteractionStore',  ()=> crawl.includes('crawlInteractionStore'))
test('LK-10','Crawl toggleCrawlLike',        ()=> crawl.includes('toggleCrawlLike'))
test('LK-11','Crawl handleLike 버튼',        ()=> crawl.includes('handleLike') && crawl.includes('onClick={handleLike}'))
test('LK-12','Crawl likes.liked 표시',       ()=> crawl.includes('likes.liked'))
test('LK-13','Crawl 비로그인 login',         ()=> crawl.includes("navigate('login')"))
test('LK-14','CrawlStore getCrawlLikes',     ()=> cstore.includes('getCrawlLikes'))
test('LK-15','CrawlStore toggleCrawlLike',   ()=> cstore.includes('toggleCrawlLike'))
test('LK-16','CrawlStore localStorage',      ()=> cstore.includes("localStorage.setItem"))

// ── 이모지 반응 ───────────────────────────────────────
test('RC-01','6종 REACTIONS',               ()=> ['fire','lol','like','wow','sad','angry'].every(k => rstore.includes(k)))
test('RC-02','type="button" 명시',          ()=> react.includes('type="button"'))
test('RC-03','handleReact 함수',            ()=> react.includes('function handleReact'))
test('RC-04','Bootstrap .btn 미사용',       ()=> !react.includes('className="btn'))
test('RC-05','outline:none',               ()=> react.includes("outline: 'none'") || react.includes("outline:"))
test('RC-06','toggleReaction',             ()=> react.includes('toggleReaction'))
test('RC-07','같은 반응 취소',              ()=> rstore.includes('current === reactionKey'))
test('RC-08','userReactions per user',     ()=> rstore.includes('userReactions'))
test('RC-09','비로그인 안내',              ()=> react.includes('로그인 후 반응'))
test('RC-10','Post ReactionBar',           ()=> detail.includes('ReactionBar'))
test('RC-11','Crawl ReactionBar',          ()=> crawl.includes('ReactionBar'))

// ── 댓글 작성 ─────────────────────────────────────────
test('CM-01','addComment 함수',            ()=> ctx.includes('function addComment'))
test('CM-02','form 태그 미사용',           ()=> !comment.includes('<form'))
test('CM-03','type="button" 명시',         ()=> comment.includes('type="button"'))
test('CM-04','onClick={handleSubmit}',     ()=> comment.includes('onClick={handleSubmit}'))
test('CM-05','Bootstrap btn-primary 없음', ()=> !comment.includes('btn-primary'))
test('CM-06','인라인 버튼 스타일',         ()=> comment.includes("body.trim() ? 'var(--color-primary)'"))
test('CM-07','Ctrl+Enter 단축키',         ()=> comment.includes('ctrlKey') || comment.includes('metaKey'))
test('CM-08','setBody 초기화',             ()=> comment.includes("setBody('')"))
test('CM-09','disabled 처리',             ()=> comment.includes('disabled={!body.trim()}'))
test('CM-10','deleteComment',             ()=> ctx.includes('function deleteComment'))
test('CM-11','isOwner 타인삭제 불가',      ()=> comment.includes('isOwner'))
test('CM-12','비로그인 안내',             ()=> comment.includes('로그인'))

// ── 영속성 ────────────────────────────────────────────
test('PS-01','aha_posts_v1',              ()=> ctx.includes('aha_posts_v1'))
test('PS-02','aha_comments_v1',           ()=> ctx.includes('aha_comments_v1'))
test('PS-03','aha_reactions',             ()=> rstore.includes('aha_reactions'))
test('PS-04','crawl views localStorage', ()=> cstore.includes('aha_crawl_views'))
test('PS-05','crawl likes localStorage', ()=> cstore.includes('aha_crawl_likes'))
test('PS-06','storage 이벤트',           ()=> ctx.includes("'storage'"))

// ── navigate 전달 ─────────────────────────────────────
test('NV-01','CrawlFeed navigate 누락 0개', () => {
  const missing = subp.split('\n').filter(l => l.includes('<CrawlFeed') && !l.includes('navigate='))
  return missing.length === 0 || `누락 ${missing.length}개`
})
test('NV-02','LivePage navigate 수신', ()=> subp.includes('LivePage({ navigate }') || subp.includes('LivePage({navigate'))
test('NV-03','Crawl btn-secondary 없음', ()=> !crawl.includes('btn-secondary'))
test('NV-04','Post btn-secondary 없음',  ()=> !detail.includes('btn-secondary'))


// ── CrawlCard 통계 동기화 ─────────────────────────────
const crawlcomp = read('components/CrawlComponents.jsx')
test('CC-01','CrawlCard crawlInteractionStore import',  ()=> crawlcomp.includes('crawlInteractionStore'))
test('CC-02','CrawlCard getCrawlViews 사용',            ()=> crawlcomp.includes('getCrawlViews'))
test('CC-03','CrawlCard getCrawlLikes 사용',            ()=> crawlcomp.includes('getCrawlLikes'))
test('CC-04','CrawlCard liveViews state',               ()=> crawlcomp.includes('liveViews'))
test('CC-05','CrawlCard liveLikes state',               ()=> crawlcomp.includes('liveLikes'))
test('CC-06','CrawlCard item.views 정적값 미사용',       ()=> !crawlcomp.includes("v:item.views"))
test('CC-07','CrawlCard focus 이벤트 갱신',             ()=> crawlcomp.includes("'focus'"))
test('CC-08','CrawlCard storage 이벤트 갱신',           ()=> crawlcomp.includes("'storage'"))

// ── 결과 출력 ─────────────────────────────────────────
const pass = R.filter(r => r.pass).length
const fail = R.filter(r => !r.pass).length
console.log(`\n${'═'.repeat(62)}`)
console.log(` aha! 품질 테스트  ✅ ${pass} PASS  ❌ ${fail} FAIL  (총 ${R.length}개)`)
console.log(`${'═'.repeat(62)}\n`)
const groups = {}
R.forEach(r => { const g = r.id.split('-')[0]; (groups[g]=groups[g]||[]).push(r) })
Object.entries(groups).forEach(([g, items]) => {
  const gp = items.filter(i=>i.pass).length
  console.log(`  ${gp===items.length?'✅':'⚠️ '} [${g}] ${gp}/${items.length}`)
  items.filter(r=>!r.pass).forEach(r => console.log(`      ❌ ${r.id} ${r.desc}${r.msg?' → '+r.msg:''}`))
})
if (fail === 0) console.log('\n✅ 전체 PASS')
else { console.log('\n❌ FAIL:'); R.filter(r=>!r.pass).forEach(r=>console.log(`  [${r.id}] ${r.desc}`)) }
process.exit(fail > 0 ? 1 : 0)
