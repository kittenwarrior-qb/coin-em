import { useState } from 'react'
import { Layers } from 'lucide-react'
import type { PrototypeCard } from './candyPrototypeCatalog'

export function RealCardImage({ card, face = 'back' }: { card: PrototypeCard; face?: 'front' | 'back' }) {
  return <img className="cp-real-card-image" src={face === 'front' ? card.frontImageUrl : card.backImageUrl} alt={`${face === 'front' ? 'Mặt trước' : 'Mặt sau'} · ${card.name}`} draggable={false} decoding="async"/>
}

export function CardPreview({ card, choose }: { card: PrototypeCard; choose: () => void }) {
  const [flipped, setFlipped] = useState(false)
  return <>
    <p className="cp-real-card-title">{card.code} · {card.name}</p>
    <div className="cp-card-preview cp-real-preview" data-card-id={card.id} data-face={flipped ? 'back' : 'front'}>
      <div className={`cp-card-flipper ${flipped ? 'is-flipped' : ''}`}>
        <div className="cp-flip-face" aria-hidden={flipped}><RealCardImage card={card} face="front"/></div>
        <div className="cp-flip-face cp-flip-back" aria-hidden={!flipped}><RealCardImage card={card}/></div>
      </div>
    </div>
    <div className="cp-two-actions"><button className="cp-action outline" aria-pressed={flipped} onClick={() => setFlipped(!flipped)}><Layers/>Lật thẻ</button><button className="cp-action" onClick={choose}>Chọn thẻ mẫu</button></div>
    <p className="cp-hint cp-card-face-label" aria-live="polite">Ảnh thẻ gốc · {flipped ? 'Mặt sau' : 'Mặt trước'}</p>
  </>
}
