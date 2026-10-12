import { CARD_IMAGES } from '@/constants/cardImages'
import type { CardData, CardCategory, EmotionSubType } from '@/stores/types'

function buildCards() {
  const make = (key: string, url: string, cat: CardCategory, back: string) =>
    ({ id: `${cat}-${key}`, frontImage: url, backImage: back, category: cat } as CardData)

  const roles = Object.entries(CARD_IMAGES.roles)
    .filter(([k]) => k !== 'back')
    .map(([k, u]) => make(k, u, 'role', CARD_IMAGES.roles.back))

  const allSituation = Object.entries(CARD_IMAGES.situation).filter(([k]) => k !== 'back').map(([k, u]) => make(k, u, 'situation', CARD_IMAGES.situation.back))
  // TH1-TH13 = Nhẹ, TH14-TH24 = Vừa, TH25-TH32 = Nhạy cảm
  const situationLight     = allSituation.filter(c => { const n = parseInt(c.id.replace('situation-TH', '')); return n >= 1 && n <= 13 })
  const situationMedium    = allSituation.filter(c => { const n = parseInt(c.id.replace('situation-TH', '')); return n >= 14 && n <= 24 })
  const situationSensitive = allSituation.filter(c => { const n = parseInt(c.id.replace('situation-TH', '')); return n >= 25 })

  const reflection = Object.entries(CARD_IMAGES.reflection).filter(([k]) => k !== 'back').map(([k, u]) => make(k, u, 'reflection', CARD_IMAGES.reflection.back))
  const selfcare   = Object.entries(CARD_IMAGES.selfcare).filter(([k]) => k !== 'back').map(([k, u]) => make(k, u, 'selfcare', CARD_IMAGES.selfcare.back))

  const emotionBasic    = Object.entries(CARD_IMAGES.emotionBasic).map(([k, imgs]) => ({ id: `emotion-basic-${k}`, frontImage: imgs.front, backImage: imgs.back, category: 'emotion' as CardCategory, subType: 'basic' as EmotionSubType }))
  const emotionLight    = CARD_IMAGES.emotionLight.map((imgs, i) => ({ id: `emotion-light-${i+1}`, frontImage: imgs.front, backImage: imgs.back, category: 'emotion' as CardCategory, subType: 'light' as EmotionSubType }))
  const emotionStrong   = CARD_IMAGES.emotionStrong.map((imgs, i) => ({ id: `emotion-strong-${i+1}`, frontImage: imgs.front, backImage: imgs.back, category: 'emotion' as CardCategory, subType: 'strong' as EmotionSubType }))
  const emotionAdvanced = CARD_IMAGES.emotionAdvanced.map((imgs, i) => ({ id: `emotion-advanced-${i+1}`, frontImage: imgs.front, backImage: imgs.back, category: 'emotion' as CardCategory, subType: 'advanced' as EmotionSubType }))

  return {
    roles,
    situation: allSituation, reflection, selfcare,
    situationByType: { light: situationLight, medium: situationMedium, sensitive: situationSensitive },
    emotion: [...emotionBasic, ...emotionLight, ...emotionStrong, ...emotionAdvanced],
    emotionsByType: { basic: emotionBasic, light: emotionLight, strong: emotionStrong, advanced: emotionAdvanced },
  }
}

export const CARD_DATA = buildCards()
