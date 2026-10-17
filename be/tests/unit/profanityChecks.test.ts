import { describe, expect, it } from 'vitest'
import { containsCuratedProfanity, PROFANITY_POLICY_VERSION } from '../../src/communication/profanityChecks'
import { publicationRejection } from '../../src/communication/publicationChecks'

describe('original bilingual seed vocabulary: conservative matching, not contextual moderation', () => {
  // Runs first, while patterns are cold: per-pattern \p{…} classes once took ~7s on Vietnamese text and timed out chat ACKs.
  it('stays fast on cold, accented and maximum-length input', () => {
    const started = performance.now()
    for (const text of ['ĐỤ MÁ', 'địt mẹ', 'Tôi rất buồn hôm nay, cảm ơn mọi người đã lắng nghe', 'đ '.repeat(250), 'f.'.repeat(250), 'ữ'.repeat(500)]) containsCuratedProfanity(text)
    expect(performance.now() - started).toBeLessThan(1000)
  })
  it.each(['fuck', 'FUCK', 'fucking', 'motherfucker', 'bullshit', 'shitty', 'asshole', 'cunt', 'dickhead', 'son of a bitch',
    'địt', 'ĐỤ MÁ', 'đéo', 'cặc', 'lồn', 'đụ mẹ', 'địt mẹ',
    'f u c k', 'f.u.c.k', 'f_u_c_k', 'fu\u200bck', 'ｆｕｃｋ', 'fùck', 'fvck', 'sh1t', 'a55hole',
    'đ ị t', 'lo\u0302\u0300n'])('detects curated seed/example %s', text => {
    expect(containsCuratedProfanity(text)).toBe(true)
  })
  it.each(['Scunthorpe', 'assessment', 'assistant', 'passion', 'classroom', 'shiitake', 'shitake', 'shitake mushroom',
    'Mình bị đụng vào tay', 'đục lỗ', 'đu quay', 'đủ rồi', 'du lịch', 'đít ghế', 'lớn lên', 'lòng tốt', 'Phúc',
    'gay', 'lesbian', 'LGBTQ', 'Mình đang buồn và sợ', 'Mình cần giúp đỡ về ý nghĩ tự hại',
    'Bạn nói sai rồi', 'DM là tin nhắn riêng', 'cc', 'VL', '💙 👨‍👩‍👧‍👦', '127', 'Có thể chia sẻ không?'])('preserves benign boundary/identity/feeling example %s', text => {
    expect(containsCuratedProfanity(text)).toBe(false)
  })
  it('has stable repeated decisions, unlike a stateful global regex', () => {
    for (let n = 0; n < 100; n++) {
      expect(containsCuratedProfanity('fuck')).toBe(true)
      expect(containsCuratedProfanity('classroom')).toBe(false)
    }
  })
  it('preserves the original Unicode text and only checks new-publication policy', () => {
    const text = 'ĐỤ MÁ'; expect(PROFANITY_POLICY_VERSION).toBe('chat-profanity-seed/v1')
    expect(publicationRejection(text)).toBe('CHAT_PROFANITY_NOT_ALLOWED'); expect(text).toBe('ĐỤ MÁ')
    expect(publicationRejection('fuck https://example.invalid')).toBe('CHAT_LINK_NOT_ALLOWED')
  })
  it('documents unknown insults/quotes as a limitation, not semantic classification', () => {
    expect(containsCuratedProfanity('Tôi ghét bạn')).toBe(false)
    expect(containsCuratedProfanity('đ\u200bọụ')).toBe(false) // Insertion/typo evasion is not fully covered.
    expect(containsCuratedProfanity('Tôi bị gọi là "fuck"')).toBe(true)
  })
})
