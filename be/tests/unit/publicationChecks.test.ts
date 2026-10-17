import { describe, expect, it } from 'vitest'
import { publicationRejection } from '../../src/communication/publicationChecks'

describe('local chat contact checks, not semantic moderation', () => {
  it.each(['https://example.invalid', 'HTTPS : //example.invalid', 'www.example.invalid', 'example.com/path', 'app.emcoin.cloud',
    'hxxps://example.invalid', 'ｈｔｔｐｓ：//example.invalid', 'ht\u200btps://example.invalid', 'javascript:alert(1)', 'ftp://127.0.0.1',
    'example.cfd', 'example [dot] cfd', 'example[.]lol', 'example(.)xn--p1ai', '127.0.0.1', '[2001:db8::1]'])('rejects link syntax: %s', text => {
    expect(publicationRejection(text)).toBe('CHAT_LINK_NOT_ALLOWED')
  })
  it.each(['qa@example.invalid', 'QA [at] example [dot] invalid', 'ｑａ＠example.invalid', 'qa\u200b@example.invalid',
    '0901234567', '090 123 4567', '0901234567 2 Coin', '+84 (90) 123-4567', '+1 202 555 0100'])('rejects contact syntax: %s', text => {
    expect(publicationRejection(text)).toBe('CHAT_CONTACT_NOT_ALLOWED')
  })
  it.each(['Mình đang buồn và sợ', 'Mình cần giúp đỡ về ý nghĩ tự hại', '123456', 'Lượt 10, 20 Coin Xanh',
    '14/10/2026', 'Mình thấy tốt hơn. Cảm ơn bạn!', '👨‍👩‍👧‍👦 💙', '<img src=x onerror=alert(1)>', 'Tôi muốn chia sẻ', 'من فضلك'])('does not censor emotions, ordinary numbers or rewrite escaped text: %s', text => {
    expect(publicationRejection(text)).toBeNull()
  })
  it('rejects bidi overrides and leaves the input unchanged', () => {
    const value = 'abc\u202ecom'; expect(publicationRejection(value)).toBe('CHAT_TEXT_FORMAT_NOT_ALLOWED'); expect(value).toBe('abc\u202ecom')
  })
  it('documents incomplete recognition instead of claiming a complete detector', () => {
    expect(publicationRejection('Tên mình ở mạng xã hội là một chuỗi khác')).toBeNull()
  })
})
