// Card constants - matches backend
// These match the actual card IDs from Cloudinary

// Situation card groups
export const SITUATION_CARDS = {
  light: ['TH1', 'TH2', 'TH3', 'TH4', 'TH5', 'TH6', 'TH7', 'TH8', 'TH9', 'TH10', 'TH11', 'TH12', 'TH13'],
  medium: ['TH14', 'TH15', 'TH16', 'TH17', 'TH18', 'TH19', 'TH20', 'TH21', 'TH22', 'TH23', 'TH24'],
  sensitive: ['TH25', 'TH26', 'TH27', 'TH28', 'TH29', 'TH30', 'TH31', 'TH32'],
} as const

// Self-care cards (Bí kíp ôm)
export const SELFCARE_CARDS = ['BK1', 'BK2', 'BK3', 'BK4', 'BK5', 'BK6', 'BK7', 'BK8', 'BK9', 'BK10', 'BK11', 'BK12', 'BK13', 'BK14', 'BK15'] as const

// Reflection cards (Phản tư)
export const REFLECTION_CARDS = ['PT1', 'PT2', 'PT3', 'PT4', 'PT5', 'PT6', 'PT7', 'PT8', 'PT9', 'PT10', 'PT11', 'PT12', 'PT13', 'PT14'] as const

// Emotion card groups
export const EMOTION_CARDS = {
  basic: ['buon', 'chan', 'gian', 'mong', 'so', 'tin', 'vui', 'wow'],
  light: ['nhe1', 'nhe2', 'nhe3', 'nhe4', 'nhe5', 'nhe6', 'nhe7', 'nhe8'],
  strong: ['manh1', 'manh2', 'manh3', 'manh4', 'manh5', 'manh6', 'manh7', 'manh8'],
  advanced: ['NC1', 'NC2', 'NC3', 'NC4', 'NC5', 'NC6', 'NC7', 'NC8'],
} as const

// Type definitions
export type SituationGroup = keyof typeof SITUATION_CARDS
export type EmotionGroup = keyof typeof EMOTION_CARDS
export type SituationCard = typeof SITUATION_CARDS[SituationGroup][number]
export type SelfcareCard = typeof SELFCARE_CARDS[number]
export type ReflectionCard = typeof REFLECTION_CARDS[number]
export type EmotionCard = typeof EMOTION_CARDS[EmotionGroup][number]

// Card group labels
export const SITUATION_GROUP_LABELS: Record<SituationGroup, string> = {
  light: 'Nhẹ',
  medium: 'Vừa',
  sensitive: 'Nhạy cảm',
}

export const EMOTION_GROUP_LABELS: Record<EmotionGroup, string> = {
  basic: 'Cơ bản',
  light: 'Nhẹ',
  strong: 'Mạnh',
  advanced: 'Nâng cao',
}

// Helper functions
export function getAllSituationCards(groups: SituationGroup[]): string[] {
  return groups.flatMap(group => [...SITUATION_CARDS[group]])
}

export function getAllEmotionCards(groups: EmotionGroup[]): string[] {
  return groups.flatMap(group => [...EMOTION_CARDS[group]])
}

export function validateSituationGroups(groups: string[]): groups is SituationGroup[] {
  return groups.every(g => g in SITUATION_CARDS)
}

export function validateEmotionGroups(groups: string[]): groups is EmotionGroup[] {
  return groups.every(g => g in EMOTION_CARDS)
}

// Get card image URL from card ID
import { CARD_IMAGES } from './cardImages'

export function getCardImageUrl(cardId: string, cardType: 'situation' | 'selfcare' | 'reflection' | 'emotion'): string {
  switch (cardType) {
    case 'situation': {
      return CARD_IMAGES.situation[cardId as keyof typeof CARD_IMAGES.situation] || CARD_IMAGES.situation.back
    }
    case 'selfcare': {
      return CARD_IMAGES.selfcare[cardId as keyof typeof CARD_IMAGES.selfcare] || CARD_IMAGES.selfcare.back
    }
    case 'reflection': {
      return CARD_IMAGES.reflection[cardId as keyof typeof CARD_IMAGES.reflection] || CARD_IMAGES.reflection.back
    }
    case 'emotion': {
      // Handle emotion cards (basic/light/strong/advanced)
      if (CARD_IMAGES.emotionBasic[cardId as keyof typeof CARD_IMAGES.emotionBasic]) {
        return CARD_IMAGES.emotionBasic[cardId as keyof typeof CARD_IMAGES.emotionBasic].front
      }
      // Check in arrays
      const lightIndex = EMOTION_CARDS.light.findIndex(c => c === cardId)
      if (lightIndex !== -1) {
        return CARD_IMAGES.emotionLight[lightIndex].front
      }
      const strongIndex = EMOTION_CARDS.strong.findIndex(c => c === cardId)
      if (strongIndex !== -1) {
        return CARD_IMAGES.emotionStrong[strongIndex].front
      }
      const advancedIndex = EMOTION_CARDS.advanced.findIndex(c => c === cardId)
      if (advancedIndex !== -1) {
        return CARD_IMAGES.emotionAdvanced[advancedIndex].front
      }
      return CARD_IMAGES.emotionBasic.vui.back
    }
    default:
      return ''
  }
}
