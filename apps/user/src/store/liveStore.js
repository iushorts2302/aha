/**
 * liveStore.js — 실시간 라이브 채팅 시뮬레이션
 * localStorage + setInterval로 실시간 느낌 구현
 */

const CHAT_KEY = 'aha_live_chat'
const MAX_MSGS = 200

const BOT_NAMES = ['김민준', '이지은', '박서연', '최도현', '정수빈', '강태양', '임하늘', '조유리']
const BOT_MESSAGES = {
  free:    ['ㅋㅋㅋㅋ 진짜요?', '오 이거 꿀팁이네', '저도 해봐야겠다', '레전드 ㄷㄷ', '이거 실화임?', '공감 100%', '진짜 맞는 말', 'ㅋㅋㅋ 웃겨죽겠네'],
  it:      ['오 이거 써봤는데 좋더라', 'GPT-5 나오면 다 바뀔듯', '개발자 입장에서 완전 공감', 'AI가 다 대체하겠네', 'ㄷㄷ 기술 발전 무섭다', '아 이거 블로그에서 봤는데'],
  sports:  ['오늘 경기 봤어?', '우리팀 이길 수 있다!!', '레전드 플레이 ㄷㄷ', '작년이 그리워', '이번 시즌 기대된다', '선수들 화이팅!!'],
  default: ['ㅋㅋ', '오', '진짜?', '대박', 'ㄷㄷ', '공감', '레전드', '헐', '이게 맞나'],
}

export function getMessages(channel = 'free') {
  try {
    const raw = localStorage.getItem(`${CHAT_KEY}_${channel}`)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function addMessage(channel, message) {
  const msgs = getMessages(channel)
  msgs.push({ ...message, id: `m${Date.now()}_${Math.random()}` })
  const trimmed = msgs.slice(-MAX_MSGS)
  localStorage.setItem(`${CHAT_KEY}_${channel}`, JSON.stringify(trimmed))
  return trimmed
}

export function sendUserMessage(channel, userId, nickname, body) {
  return addMessage(channel, {
    authorId: userId, nickname, body,
    isBot: false, createdAt: new Date().toISOString(),
  })
}

/** 봇 메시지 1개 랜덤 생성 */
export function generateBotMessage(channel = 'free') {
  const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]
  const pool = BOT_MESSAGES[channel] || BOT_MESSAGES.default
  const body = pool[Math.floor(Math.random() * pool.length)]
  return addMessage(channel, {
    authorId: `bot_${name}`, nickname: name, body,
    isBot: true, createdAt: new Date().toISOString(),
  })
}

/** 라이브 이슈 목록 (실시간 급상승 키워드 시뮬레이션) */
export function getLiveIssues() {
  const issues = [
    { rank: 1, keyword: '맥북 M4', change: '+1', volume: 12847 },
    { rank: 2, keyword: '한국 시리즈',  change: 'NEW', volume: 9823 },
    { rank: 3, keyword: 'GPT-5 출시',   change: '+3', volume: 8541 },
    { rank: 4, keyword: '삼성 갤럭시',  change: '-1', volume: 7632 },
    { rank: 5, keyword: '카카오 주가',  change: '+2', volume: 6821 },
    { rank: 6, keyword: '아이유 콘서트',change: '-2', volume: 5943 },
    { rank: 7, keyword: '비트코인',     change: '+4', volume: 5211 },
    { rank: 8, keyword: '손흥민',       change: 'NEW', volume: 4892 },
    { rank: 9, keyword: '롤 패치',      change: '-3', volume: 4103 },
    { rank: 10, keyword: '날씨 이상',   change: '+1', volume: 3876 },
  ]
  // 랜덤으로 볼륨 소폭 변동
  return issues.map(i => ({ ...i, volume: i.volume + Math.floor(Math.random() * 100 - 50) }))
}
