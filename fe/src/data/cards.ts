import { Card } from '@/types/game'

// Role cards
export const roleCards: Card[] = [
  { id: 'role-1', type: 'role', title: 'Người Quản trò', content: 'Điều phối trò chơi' },
  { id: 'role-2', type: 'role', title: 'Người Trao Gửi', content: 'Kể câu chuyện' },
  { id: 'role-3', type: 'role', title: 'Người Im Lặng', content: 'Không cho người chơi khác nói' },
  { id: 'role-4', type: 'role', title: 'Người Kết Nối', content: 'Đồng cảm với câu chuyện' },
  { id: 'role-5', type: 'role', title: 'Người Gợi Mở', content: 'Chia sẻ góc nhìn khác' },
  { id: 'role-6', type: 'role', title: 'Người Dẫn Lối', content: 'Gửi thông điệp' },
  { id: 'role-7', type: 'role', title: 'Người Chữa Lành', content: 'Giúp người bị cấm chat' },
]

// Situation cards (sample)
export const situationCards: Card[] = [
  { id: 'sit-1', type: 'situation', title: 'Bạn bè xa lánh', content: 'Bạn thân đột nhiên không nói chuyện với mình', level: 1 },
  { id: 'sit-2', type: 'situation', title: 'Điểm kém', content: 'Bạn thi kém và bố mẹ thất vọng', level: 1 },
  { id: 'sit-3', type: 'situation', title: 'Bị bắt nạt', content: 'Có người liên tục trêu chọc bạn', level: 2 },
]

// Emotion cards (sample)
export const emotionCards: Card[] = [
  { id: 'emo-1', type: 'emotion', title: 'Vui', content: 'Cảm giác hạnh phúc, thoải mái' },
  { id: 'emo-2', type: 'emotion', title: 'Buồn', content: 'Cảm giác u ám, không vui' },
  { id: 'emo-3', type: 'emotion', title: 'Lo lắng', content: 'Cảm giác bất an về tương lai' },
  { id: 'emo-4', type: 'emotion', title: 'Tức giận', content: 'Cảm giác bực bội, khó chịu' },
]

// Reflection cards (sample)
export const reflectionCards: Card[] = [
  { id: 'ref-1', type: 'reflection', title: 'Về bản thân', content: 'Điều gì khiến bạn cảm thấy như vậy?' },
  { id: 'ref-2', type: 'reflection', title: 'Về người khác', content: 'Người khác có thể cảm nhận gì?' },
  { id: 'ref-3', type: 'reflection', title: 'Về hành động', content: 'Bạn có thể làm gì khác?' },
]

// Self-care cards (sample)
export const selfCareCards: Card[] = [
  { id: 'care-1', type: 'selfcare', title: 'Hít thở sâu', content: 'Hít vào 4 giây, giữ 4 giây, thở ra 4 giây' },
  { id: 'care-2', type: 'selfcare', title: 'Viết nhật ký', content: 'Ghi lại cảm xúc của bạn' },
  { id: 'care-3', type: 'selfcare', title: 'Chia sẻ', content: 'Nói chuyện với người bạn tin tưởng' },
]

export const allCards = {
  role: roleCards,
  situation: situationCards,
  emotion: emotionCards,
  reflection: reflectionCards,
  selfcare: selfCareCards,
}
