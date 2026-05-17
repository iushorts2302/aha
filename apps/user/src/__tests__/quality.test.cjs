/**
 * quality.test.js — aha! 게시글 상세 품질 테스트
 */
const fs = require('fs'), path = require('path')
const SRC = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(SRC, rel), 'utf8')

const RESULTS = []
function test(id, desc, fn) {
  try { const ok = fn(); RESULTS.push({ id, desc, pass: !!ok, reason: ok === true ? '' : String(ok) }) }
  catch(e) { RESULTS.push({ id, desc, pass: false, reason: e.message }) }
}

const app    = read('App.jsx')
const ctx    = read('context/AppContext.jsx')
const detail = read('pages/PostDetailPage.jsx')
const react  = read('components/ReactionBar.jsx')
const comment= read('components/CommentSection.jsx')
const store  = read('store/reactionStore.js')

// TC-05-2-03 뒤로가기
test('TC-05-2-03-1','App.jsx useRef prevRoute 추적',()=> app.includes('useRef(') && app.includes('prevRouteRef'))
test('TC-05-2-03-2','navigate 전 ref에 현재 route 기록',()=> app.includes('prevRouteRef.current = route'))
test('TC-05-2-03-3','PostDetailPage prevPage prop 전달',()=> app.includes('prevPage={prevRouteRef.current}'))
test('TC-05-2-03-4','PostDetailPage prevPage prop 수신',()=> detail.includes('prevPage'))
test('TC-05-2-03-5','goBack에서 navigate(prevPage) 사용',()=> detail.includes('navigate(prevPage'))
test('TC-05-2-03-6','board 폴백 존재',()=> detail.includes("|| 'board'"))
test('TC-05-2-03-7','history.back() 미사용 (SPA 안전)',()=> !detail.includes('history.back()'))
test('TC-05-2-04-1','뒤로가기 버튼 배경 투명',()=> detail.includes("'transparent'"))
test('TC-05-2-04-2','뒤로가기 버튼 border none',()=> detail.includes("'none'"))

// TC-05-2-01/02 조회수
test('TC-05-2-01-1','incrementView 존재',()=> ctx.includes('incrementView'))
test('TC-05-2-01-2','views + 1 로직',()=> ctx.includes('views: (p.views || 0) + 1'))
test('TC-05-2-01-3','함수형 업데이트',()=> ctx.includes('setPosts(prev =>'))
test('TC-05-2-01-4','localStorage 즉시 저장',()=> ctx.includes('writeLS(POSTS_KEY'))
test('TC-05-2-02-1','useRef(false) 중복방지',()=> detail.includes('useRef(false)'))
test('TC-05-2-02-2','hasViewed.current 체크',()=> detail.includes('hasViewed.current'))
test('TC-05-2-02-3','useEffect 빈배열(1회)',()=> detail.includes('}, [])'))

// TC-05-3 좋아요
test('TC-05-3-01-1','toggleLike useCallback',()=> ctx.includes('useCallback') && ctx.includes('toggleLike'))
test('TC-05-3-01-2','allPosts Context에서 공개',()=> ctx.includes('allPosts'))
test('TC-05-3-01-3','PostDetailPage allPosts 사용',()=> detail.includes('allPosts'))
test('TC-05-3-01-4','Array.isArray 안전 체크',()=> ctx.includes('Array.isArray('))
test('TC-05-3-01-5','likes.includes 토글',()=> ctx.includes('likes.includes(userId)'))
test('TC-05-3-01-6','writeLS 즉시 저장',()=> ctx.includes('writeLS(POSTS_KEY'))
test('TC-05-3-02-1','좋아요 취소 filter 로직',()=> ctx.includes('likes.filter(id => id !== userId)'))
test('TC-05-3-03-1','비로그인 login 유도',()=> detail.includes("navigate('login')"))

// TC-06 이모지 반응
test('TC-06-01-1','6종 REACTIONS 정의',()=> ['fire','lol','like','wow','sad','angry'].every(k=> store.includes(k)))
test('TC-06-02-1','type="button" 명시',()=> react.includes('type="button"'))
test('TC-06-02-2','handleReact 함수 존재',()=> react.includes('function handleReact'))
test('TC-06-02-3','Bootstrap .btn 클래스 미사용',()=> !react.includes('className="btn'))
test('TC-06-02-4','outline:none 명시',()=> react.includes("outline: 'none'") || react.includes('outline:'))
test('TC-06-03-1','toggleReaction 사용',()=> react.includes('toggleReaction'))
test('TC-06-03-2','같은 반응 취소 로직',()=> store.includes('current === reactionKey'))
test('TC-06-04-1','userReactions per user',()=> store.includes('userReactions'))
test('TC-06-04-2','기존 반응 취소 후 새 반응',()=> store.includes('if (current)'))
test('TC-06-05-1','비로그인 안내 문구',()=> react.includes('로그인 후 반응'))
test('TC-06-05-2','handleReact early return',()=> react.includes('if (!currentUser) return'))

// TC-05-4 댓글
test('TC-05-4-01-1','addComment 함수',()=> ctx.includes('function addComment'))
test('TC-05-4-02-1','빈댓글 방지 trim()',()=> comment.includes('.trim()'))
test('TC-05-4-03-1','deleteComment 함수',()=> ctx.includes('function deleteComment'))
test('TC-05-4-04-1','isOwner 타인 삭제 불가',()=> comment.includes('isOwner'))
test('TC-05-4-05-1','비로그인 댓글 안내',()=> comment.includes('로그인'))

// TC-11 관리자 연동
test('TC-11-01-1','blockedIds Context 노출',()=> ctx.includes('blockedIds'))
test('TC-11-01-2','PostDetailPage blockedIds 사용',()=> detail.includes('blockedIds'))
test('TC-11-01-3','서버 폴링 setInterval',()=> ctx.includes('setInterval') && ctx.includes('10000'))
test('TC-11-04-1','차단 게시글 null 처리',()=> detail.includes('.has(postId)'))

// TC-12 영속성
test('TC-12-01-1','POSTS_KEY localStorage',()=> ctx.includes('aha_posts_v1') || ctx.includes('POSTS_KEY'))
test('TC-12-02-1','COMMENTS_KEY localStorage',()=> ctx.includes('aha_comments_v1') || ctx.includes('COMMENTS_KEY'))
test('TC-12-05-1','reactions localStorage',()=> store.includes('localStorage.setItem'))
test('TC-12-08-1','storage 이벤트 리스너',()=> ctx.includes("'storage'"))

// 결과
const pass = RESULTS.filter(r=>r.pass).length
const fail = RESULTS.filter(r=>!r.pass).length
console.log(`\n${'═'.repeat(58)}`)
console.log(` aha! 품질 테스트  ${pass} PASS / ${fail} FAIL / ${RESULTS.length} 총계`)
console.log(`${'═'.repeat(58)}\n`)
RESULTS.forEach(r => console.log(`  ${r.pass?'✓':'✗'} [${r.id}] ${r.desc}${r.reason?' → '+r.reason:''}`))
if(fail>0){console.log('\n❌ FAIL 항목:');RESULTS.filter(r=>!r.pass).forEach(r=>console.log(`  [${r.id}] ${r.desc}`))}
else console.log('\n✅ 전체 PASS')
process.exit(fail>0?1:0)
