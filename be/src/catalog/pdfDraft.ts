import type { CatalogCard } from './CatalogStore'
import { pdfSituationPrompts } from './pdfSituationText'
import { pdfReflectionPrompts, pdfSelfcarePrompts } from './pdfPracticeText'
import { emotionFaceText, roleDefinitions, roleKeys } from './pdfIdentityText'

/** Owner-approved paired emotion faces; shared backs inferred from labelled section pages.
 * Remains unreviewed draft. Role duplicate print instances 11/13/15 are not new logical roles.
 */
export function pdfCatalogDraft(): CatalogCard[] {
  const cards: CatalogCard[] = []
  const add = (category: CatalogCard['category'], number: number, name: string, group: string, front: number, back: number) => {
    const code = `${{ role: 'VT', situation: 'TH', emotion: 'CX', reflection: 'PT', selfcare: 'BK' }[category]}-${String(number).padStart(3, '0')}`
    const image = (page: number) => `/emcoin/decks/pdf-v1/page-${String(page).padStart(3, '0')}.webp`
    cards.push({ id: `pdf-v1-${category}-${number}`, code, name, sortOrder: cards.length,
      category, group, definition: '', prompt: '', frontImageUrl: image(front), backImageUrl: image(back),
      sourcePages: [front, back], reviewed: false, archived: false })
  }
  const roles = ['Người Quản trò', 'Người Trao Gửi', 'Người Im Lặng', 'Người Kết Nối', 'Người Gợi Mở', 'Người Dẫn Lối', 'Người Chữa Lành']
  ;[8, 9, 10, 12, 14, 16, 17].forEach((page, index) => add('role', index + 1, roles[index], '', page, 7))
  for (let index = 0; index < 32; index++) add('situation', index + 1, `Tình huống ${index + 1}`,
    index < 13 ? 'light' : index < 24 ? 'medium' : 'sensitive', 19 + index, 18)
  const basic = ['Giận dữ', 'Mong đợi', 'Vui vẻ', 'Tin tưởng', 'Sợ hãi', 'Bất ngờ', 'Buồn bã', 'Chán ghét']
  for (let index = 0; index < 8; index++) add('emotion', index + 1, basic[index], 'basic', 51 + index * 2, 52 + index * 2)
  const extended = [
    ['Bực bội', 'Thịnh nộ', 'Hung hăng'], ['Hứng thú', 'Cảnh giác', 'Lạc quan'],
    ['Thư thái', 'Ngất ngây', 'Yêu mến'], ['Chấp nhận', 'Ngưỡng mộ', 'Khuất phục'],
    ['E sợ', 'Khiếp sợ', 'Kính sợ'], ['Xao nhãng', 'Kinh ngạc', 'Chối bỏ'],
    ['Trầm ngâm', 'Đau buồn', 'Hối hận'], ['Chán nản', 'Ghê tởm', 'Khinh thường'],
  ]
  extended.forEach((group, family) => group.forEach((name, offset) => {
    const page = 67 + family * 6 + offset * 2
    add('emotion', 9 + family * 3 + offset, name, ['light', 'strong', 'advanced'][offset], page, page + 1)
  }))
  for (let index = 0; index < 14; index++) add('reflection', index + 1, `Phản tư ${index + 1}`,
    index < 8 ? 'self' : index < 12 ? 'others' : 'change', 116 + index, 115)
  const care = ['Thở 4-7-8', 'Thư giãn', 'Giải phóng', 'Chu chu', 'Bàn tay biết nghỉ ngơi', 'Ôm mình',
    'Lời cảm ơn', 'Hộp thư yêu thương', 'Nơi an toàn', 'Bản nhạc vỗ tay', 'Nụ cười tỏa nắng',
    'Bức tranh toàn cảnh', 'Dũng cảm', 'Chọn màu, hiểu mình', 'Bản tin thời tiết']
  care.forEach((name, index) => add('selfcare', index + 1, name,
    index < 5 ? 'calm' : index < 11 ? 'connection' : 'emotion', 131 + index, 130))
  cards.filter(card => card.category === 'situation').forEach((card, index) => { card.prompt = pdfSituationPrompts[index] })
  cards.filter(card => card.category === 'reflection').forEach((card, index) => { card.prompt = pdfReflectionPrompts[index] })
  cards.filter(card => card.category === 'selfcare').forEach((card, index) => { card.prompt = pdfSelfcarePrompts[index] })
  cards.filter(card => card.category === 'role').forEach((card, index) => {
    card.definition = roleDefinitions[index]; card.roleKey = roleKeys[index]
  })
  cards.filter(card => card.category === 'emotion').forEach((card, index) => {
    card.definition = emotionFaceText[index][0]
    card.faceText = { front: emotionFaceText[index][0], back: emotionFaceText[index][1] || 'Điều gì có thể khiến bạn có cảm xúc này?' }
  })
  for (const card of cards) card.faceText ??= { front: card.definition || card.prompt, back: '' }
  return cards
}
