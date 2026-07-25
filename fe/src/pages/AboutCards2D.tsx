import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ArrowLeft, Box, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react'
import { Link } from 'react-router-dom'

import SiteHeader from '@/components/site/SiteHeader'
import { CARD_IMAGES } from '@/constants/cardImages'

type CardItem = {
  code: string
  title: string
  image: string
  deckId: string
  deckLabel: string
}

type Deck = {
  id: string
  label: string
  description: string
  accent: string
  cards: CardItem[]
}

const recordCards = (
  deckId: string,
  deckLabel: string,
  source: Record<string, string>,
  titlePrefix: string,
) =>
  Object.entries(source)
    .filter(([code]) => code !== 'back')
    .map(([code, image]) => ({
      code,
      title: `${titlePrefix} ${code.replace(/[A-Z]+/i, '') || code}`,
      image,
      deckId,
      deckLabel,
    }))

const numberedCards = (
  deckId: string,
  deckLabel: string,
  source: Array<{ front: string; back: string }>,
  titlePrefix: string,
) =>
  source.map((item, index) => ({
    code: `${deckId}-${index + 1}`,
    title: `${titlePrefix} ${index + 1}`,
    image: item.front,
    deckId,
    deckLabel,
  }))

const basicEmotionNames: Record<string, string> = {
  buon: 'Buồn',
  chan: 'Chán',
  gian: 'Giận',
  mong: 'Mong',
  so: 'Sợ',
  tin: 'Tin',
  vui: 'Vui',
  wow: 'Wow',
}

function buildDecks(): Deck[] {
  const roles = recordCards('roles', 'Vai trò', CARD_IMAGES.roles as Record<string, string>, 'Vai trò')
  const situation = recordCards('situation', 'Tình huống', CARD_IMAGES.situation as Record<string, string>, 'Tình huống')
  const reflection = recordCards('reflection', 'Phản tư', CARD_IMAGES.reflection as Record<string, string>, 'Phản tư')
  const selfcare = recordCards('selfcare', 'Bí kíp tự ôm', CARD_IMAGES.selfcare as Record<string, string>, 'Bí kíp')
  // Only 3 physical coins exist (Đỏ, Vàng, Xanh); each key pair (red1/red2, ...)
  // is the two faces of the same coin, not 2 separate coins — show one card per color.
  const coins: CardItem[] = [
    { code: 'coins-red', title: 'Coin Đỏ', image: CARD_IMAGES.coins.red1, deckId: 'coins', deckLabel: 'Coin' },
    { code: 'coins-yellow', title: 'Coin Vàng', image: CARD_IMAGES.coins.yellow1, deckId: 'coins', deckLabel: 'Coin' },
    { code: 'coins-green', title: 'Coin Xanh', image: CARD_IMAGES.coins.green1, deckId: 'coins', deckLabel: 'Coin' },
  ]

  const basicEmotions = Object.entries(CARD_IMAGES.emotionBasic).map(([code, images]) => ({
    code,
    title: basicEmotionNames[code] ?? code,
    image: images.front,
    deckId: 'emotion',
    deckLabel: 'Cảm xúc',
  }))

  const emotion = [
    ...basicEmotions,
    ...numberedCards('emotion', 'Cảm xúc', CARD_IMAGES.emotionLight, 'Cảm xúc nhẹ'),
    ...numberedCards('emotion', 'Cảm xúc', CARD_IMAGES.emotionStrong, 'Cảm xúc mạnh'),
    ...numberedCards('emotion', 'Cảm xúc', CARD_IMAGES.emotionAdvanced, 'Cảm xúc nâng cao'),
  ]

  return [
    {
      id: 'situation',
      label: 'Tình huống',
      description: 'Những bối cảnh quen thuộc để mở đầu câu chuyện.',
      accent: '#2f76ac',
      cards: situation,
    },
    {
      id: 'emotion',
      label: 'Cảm xúc',
      description: 'Bộ từ vựng hình ảnh giúp học sinh gọi tên cảm xúc.',
      accent: '#ef5f8a',
      cards: emotion,
    },
    {
      id: 'reflection',
      label: 'Phản tư',
      description: 'Câu hỏi ngắn để nhìn lại nhu cầu, hành vi và phản ứng.',
      accent: '#58a85d',
      cards: reflection,
    },
    {
      id: 'selfcare',
      label: 'Bí kíp tự ôm',
      description: 'Hành động nhỏ để chăm sóc bản thân sau khi chia sẻ.',
      accent: '#f58b35',
      cards: selfcare,
    },
    {
      id: 'roles',
      label: 'Vai trò',
      description: 'Các vai hỗ trợ nhịp chơi, lắng nghe và ghi nhận.',
      accent: '#d6aa27',
      cards: roles,
    },
    {
      id: 'coins',
      label: 'Coin',
      description: 'Token ghi nhận sự lắng nghe và đóng góp trong vòng chơi.',
      accent: '#77b9c8',
      cards: coins,
    },
  ]
}

export default function AboutCards2D() {
  const decks = useMemo(buildDecks, [])
  const [activeDeck, setActiveDeck] = useState('all')
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [dragX, setDragX] = useState(0)
  const dragStartRef = useRef<number | null>(null)
  const draggingRef = useRef(false)

  const visibleDecks = useMemo(
    () => (activeDeck === 'all' ? decks : decks.filter((deck) => deck.id === activeDeck)),
    [decks, activeDeck],
  )
  const totalCards = decks.reduce((sum, deck) => sum + deck.cards.length, 0)
  // Flat, on-screen order of the currently filtered cards — lets preview
  // next/prev/swipe move through exactly what the reader sees, tab included.
  const flatCards = useMemo(() => visibleDecks.flatMap((deck) => deck.cards), [visibleDecks])
  const preview = previewIndex !== null ? flatCards[previewIndex] ?? null : null

  const openPreview = (card: CardItem) => {
    const index = flatCards.indexOf(card)
    setDragX(0)
    setPreviewIndex(index === -1 ? null : index)
  }
  const closePreview = () => setPreviewIndex(null)
  const showPrev = () => {
    setDragX(0)
    setPreviewIndex((i) => (i === null || flatCards.length === 0 ? i : (i - 1 + flatCards.length) % flatCards.length))
  }
  const showNext = () => {
    setDragX(0)
    setPreviewIndex((i) => (i === null || flatCards.length === 0 ? i : (i + 1) % flatCards.length))
  }

  // Keyboard nav (←/→/Esc) + lock background scroll while the preview is open.
  useEffect(() => {
    if (previewIndex === null) return
    document.body.style.overflow = 'hidden'
    const total = flatCards.length
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewIndex(null)
      } else if (event.key === 'ArrowRight') {
        setDragX(0)
        setPreviewIndex((i) => (i === null || total === 0 ? i : (i + 1) % total))
      } else if (event.key === 'ArrowLeft') {
        setDragX(0)
        setPreviewIndex((i) => (i === null || total === 0 ? i : (i - 1 + total) % total))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [previewIndex, flatCards.length])

  const onImageTouchStart = (event: React.TouchEvent) => {
    dragStartRef.current = event.touches[0].clientX
    draggingRef.current = true
  }
  const onImageTouchMove = (event: React.TouchEvent) => {
    if (!draggingRef.current || dragStartRef.current === null) return
    setDragX(event.touches[0].clientX - dragStartRef.current)
  }
  const onImageTouchEnd = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    dragStartRef.current = null
    const threshold = 48
    if (dragX > threshold) showPrev()
    else if (dragX < -threshold) showNext()
    else setDragX(0)
  }

  // Switching tabs re-filters the grid above the fold — scroll back to the top
  // so the reader lands on the new deck instead of wherever they'd scrolled to.
  const isFirstDeckRender = useRef(true)
  useEffect(() => {
    if (isFirstDeckRender.current) { isFirstDeckRender.current = false; return }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeDeck])

  useEffect(() => {
    document.title = 'EmCoin - Bộ thẻ'

    const root = document.querySelector('.deck-page')
    const targets = document.querySelectorAll('.deck-hero, .deck-tabs, .deck-section, .deck-footer')
    root?.classList.add('motion-ready')
    targets.forEach((target) => target.classList.add('reveal-target'))

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        })
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    )

    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [])

  return (
    <main className="deck-page">
      <div className="deck-wrap">
        <SiteHeader />

        <section className="deck-hero">
          <Link className="back-link" to="/about">
            <ArrowLeft aria-hidden="true" />
            Về giới thiệu
          </Link>
          <div>
            <p>Bộ thẻ EmCoin</p>
            <h1>Xem nhanh toàn bộ thẻ dùng trong một vòng chơi.</h1>
          </div>
          <div className="deck-hero-card">
            <strong>{totalCards}</strong>
            <span>thẻ và coin</span>
          </div>
        </section>

        <section className="deck-tabs" aria-label="Lọc bộ thẻ">
          <button className={activeDeck === 'all' ? 'is-active' : ''} type="button" onClick={() => setActiveDeck('all')}>
            Tất cả
          </button>
          {decks.map((deck) => (
            <button
              key={deck.id}
              className={activeDeck === deck.id ? 'is-active' : ''}
              style={{ '--deck-accent': deck.accent } as CSSProperties}
              type="button"
              onClick={() => setActiveDeck(deck.id)}
            >
              {deck.label}
              <span>{deck.cards.length}</span>
            </button>
          ))}
        </section>

        <div className="deck-stack">
          {visibleDecks.map((deck) => (
            <section className="deck-section" key={deck.id} style={{ '--deck-accent': deck.accent } as CSSProperties}>
              <header>
                <div>
                  <p>{deck.cards.length} thẻ</p>
                  <h2>{deck.label}</h2>
                </div>
                <span>{deck.description}</span>
              </header>

              <div className="catalog-grid">
                {deck.cards.map((card) => (
                  <button className="catalog-card" key={`${deck.id}-${card.code}`} type="button" onClick={() => openPreview(card)}>
                    <img src={card.image} alt={card.title} loading="lazy" decoding="async" />
                    <span>{card.title}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="deck-footer">
          <Link to="/cards">
            <Box aria-hidden="true" />
            Xem bộ thẻ 3D
          </Link>
          <Link to="/about/story">
            <Eye aria-hidden="true" />
            Xem hướng dẫn
          </Link>
        </footer>
      </div>

      {preview && (
        <div className="preview-layer" role="dialog" aria-modal="true" aria-label={preview.title} onClick={closePreview}>
          <div className="preview-card" onClick={(event) => event.stopPropagation()}>
            <button className="preview-close" type="button" aria-label="Đóng xem trước" onClick={closePreview}>
              <X aria-hidden="true" />
            </button>

            <div
              className="preview-image-wrap"
              onTouchStart={onImageTouchStart}
              onTouchMove={onImageTouchMove}
              onTouchEnd={onImageTouchEnd}
            >
              {flatCards.length > 1 && (
                <button className="preview-nav prev" type="button" aria-label="Thẻ trước" onClick={showPrev}>
                  <ChevronLeft aria-hidden="true" />
                </button>
              )}
              <img
                src={preview.image}
                alt={preview.title}
                style={{
                  transform: `translateX(${dragX}px)`,
                  transition: draggingRef.current ? 'none' : 'transform .25s ease',
                }}
              />
              {flatCards.length > 1 && (
                <button className="preview-nav next" type="button" aria-label="Thẻ tiếp theo" onClick={showNext}>
                  <ChevronRight aria-hidden="true" />
                </button>
              )}
            </div>

            <div>
              <span>
                {preview.deckLabel}
                {flatCards.length > 1 && ` · ${(previewIndex ?? 0) + 1}/${flatCards.length}`}
              </span>
              <h2>{preview.title}</h2>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@500;600;700;800;900&display=swap');

        .deck-page {
          --blue: #245f8f;
          --ink: #245f8f;
          --muted: #5f8ab0;
          --accent: #ef5f8a;
          --terracotta: #f58b35;
          --sage: #76a663;
          --sky: #d9f7fb;
          --surface: rgba(255, 253, 248, .86);
          min-height: 100dvh;
          background:
            radial-gradient(circle at 8% 0%, rgba(239,95,138,.16), transparent 28%),
            radial-gradient(circle at 88% 8%, rgba(217,247,251,.88), transparent 34%),
            linear-gradient(180deg, #fffaf2 0%, #f7fbf5 54%, #ffffff 100%);
          color: var(--ink);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .deck-wrap {
          width: min(1160px, calc(100% - 28px));
          margin: 0 auto;
          padding-bottom: 52px;
        }

        .motion-ready .reveal-target {
          opacity: 0;
          transform: translateY(28px);
          transition:
            opacity 720ms cubic-bezier(.2,.7,.2,1),
            transform 720ms cubic-bezier(.2,.7,.2,1);
        }

        .motion-ready .reveal-target.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .deck-hero {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 20px;
          align-items: end;
          padding: 126px 0 22px;
        }

        .back-link {
          grid-column: 1 / -1;
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--blue);
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
        }

        .back-link svg {
          width: 18px;
          height: 18px;
        }

        .deck-hero p,
        .deck-section header p {
          margin: 0 0 12px;
          color: #ef5f8a;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .deck-hero h1 {
          max-width: 760px;
          margin: 0;
          color: var(--ink);
          font-family: "Fraunces", Georgia, serif;
          font-size: clamp(44px, 8vw, 92px);
          font-weight: 700;
          letter-spacing: -.055em;
          line-height: .92;
        }

        .deck-hero-card {
          min-width: 164px;
          padding: 20px;
          border: 1px solid rgba(35, 95, 148, .14);
          border-radius: 28px;
          background: var(--surface);
          box-shadow: 0 22px 54px rgba(111,78,55,.1);
        }

        .deck-hero-card strong {
          display: block;
          color: var(--blue);
          font-size: 48px;
          font-weight: 900;
          letter-spacing: -.06em;
          line-height: 1;
        }

        .deck-hero-card span {
          color: var(--muted);
          font-size: 14px;
          font-weight: 750;
        }

        .deck-tabs {
          position: sticky;
          top: 74px;
          z-index: 5;
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding: 12px 0;
          background: linear-gradient(180deg, rgba(255,250,242,.96), rgba(255,250,242,.72));
          backdrop-filter: blur(16px);
          scrollbar-width: none;
        }

        .deck-tabs::-webkit-scrollbar {
          display: none;
        }

        .deck-tabs button {
          flex: 0 0 auto;
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(35, 95, 148, .14);
          border-radius: 999px;
          background: rgba(255,255,255,.78);
          color: var(--blue);
          padding: 0 15px;
          font: inherit;
          font-size: 14px;
          font-weight: 850;
          cursor: pointer;
        }

        .deck-tabs button span {
          display: inline-flex;
          min-width: 26px;
          height: 26px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(210,248,255,.92);
          color: var(--blue);
          font-size: 12px;
        }

        .deck-tabs button.is-active {
          border-color: transparent;
          background: var(--deck-accent, var(--blue));
          color: white;
          box-shadow: 0 14px 30px rgba(35, 95, 148, .13);
        }

        .deck-stack {
          display: grid;
          gap: 22px;
          margin-top: 22px;
        }

        .deck-section {
          padding: clamp(18px, 3vw, 28px);
          border: 1px solid rgba(35, 95, 148, .12);
          border-radius: 32px;
          background: var(--surface);
          box-shadow: 0 24px 70px rgba(111,78,55,.08);
        }

        .deck-section header {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 20px;
          padding-bottom: 18px;
        }

        .deck-section header p {
          color: var(--deck-accent);
        }

        .deck-section h2 {
          margin: 0;
          color: var(--ink);
          font-family: "Fraunces", Georgia, serif;
          font-size: clamp(30px, 5vw, 54px);
          font-weight: 700;
          letter-spacing: -.045em;
          line-height: .95;
        }

        .deck-section header span {
          max-width: 390px;
          color: var(--muted);
          font-size: 15px;
          font-weight: 700;
          line-height: 1.55;
        }

        .catalog-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
          gap: 16px;
        }

        .catalog-card {
          display: grid;
          gap: 10px;
          padding: 12px;
          border: 1px solid rgba(35, 95, 148, .12);
          border-radius: 22px;
          background: rgba(255,253,248,.76);
          color: var(--ink);
          font: inherit;
          font-weight: 850;
          text-align: left;
          cursor: pointer;
          transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
        }

        .catalog-card img {
          width: 100%;
          aspect-ratio: 5 / 7;
          display: block;
          border-radius: 14px;
          object-fit: contain;
          background: rgba(255,253,248,.8);
          box-shadow: 0 14px 30px rgba(111,78,55,.09);
        }

        .catalog-card span {
          color: var(--blue);
          font-size: 13px;
          line-height: 1.25;
        }

        @media (hover: hover) and (pointer: fine) {
          .catalog-card:hover {
            border-color: color-mix(in srgb, var(--deck-accent) 44%, transparent);
            box-shadow: 0 20px 42px rgba(35, 95, 148, .12);
            transform: translateY(-6px) rotate(-1.2deg);
          }
        }

        .catalog-card:active {
          transform: scale(.985) rotate(.8deg);
        }

        .deck-footer {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          padding-top: 34px;
        }

        .deck-footer a {
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 18px;
          border-radius: 999px;
          background: var(--blue);
          color: white;
          text-decoration: none;
          font-weight: 850;
        }

        .deck-footer a:last-child {
          background: white;
          color: var(--blue);
          border: 1px solid rgba(35, 95, 148, .14);
        }

        .deck-footer svg {
          width: 18px;
          height: 18px;
        }

        .preview-layer {
          position: fixed;
          inset: 0;
          z-index: 40;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(16, 36, 59, .54);
          backdrop-filter: blur(12px);
        }

        .preview-card {
          position: relative;
          width: min(420px, 92vw);
          display: grid;
          gap: 16px;
          padding: 18px;
          border-radius: 28px;
          background: white;
          box-shadow: 0 34px 90px rgba(16, 36, 59, .28);
          animation: previewPop .2s ease both;
        }

        .preview-image-wrap {
          position: relative;
          touch-action: pan-y;
        }

        .preview-image-wrap img {
          width: 100%;
          max-height: 72dvh;
          display: block;
          object-fit: contain;
          border-radius: 18px;
          background: rgba(210,248,255,.32);
          user-select: none;
          -webkit-user-drag: none;
        }

        .preview-nav {
          position: absolute;
          top: 50%;
          z-index: 1;
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(35, 95, 148, .12);
          border-radius: 999px;
          background: rgba(255,255,255,.88);
          color: var(--blue);
          cursor: pointer;
          box-shadow: 0 10px 22px rgba(35, 95, 148, .16);
          transform: translateY(-50%);
          transition: transform .15s ease, background .15s ease;
        }

        .preview-nav:hover {
          background: white;
          transform: translateY(-50%) scale(1.06);
        }

        .preview-nav:active {
          transform: translateY(-50%) scale(.94);
        }

        .preview-nav.prev { left: 10px; }
        .preview-nav.next { right: 10px; }

        .preview-nav svg {
          width: 20px;
          height: 20px;
        }

        .preview-card span {
          color: #ef5f8a;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .preview-card h2 {
          margin: 4px 0 0;
          color: var(--ink);
          font-size: 30px;
          font-weight: 900;
          letter-spacing: -.05em;
        }

        .preview-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 42px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(35, 95, 148, .12);
          border-radius: 999px;
          background: rgba(255,255,255,.86);
          color: var(--blue);
          cursor: pointer;
          box-shadow: 0 12px 24px rgba(35, 95, 148, .1);
        }

        .preview-close svg {
          width: 20px;
          height: 20px;
        }

        @keyframes previewPop {
          from { opacity: 0; transform: translateY(10px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (max-width: 720px) {
          .deck-wrap {
            width: min(100% - 20px, 520px);
          }

          .deck-tabs {
            top: 68px;
          }

          .deck-hero {
            grid-template-columns: 1fr;
            padding-top: 104px;
          }

          .deck-hero h1 {
            font-size: clamp(42px, 13vw, 62px);
          }

          .deck-hero-card {
            width: 100%;
            display: flex;
            align-items: end;
            justify-content: space-between;
          }

          .deck-section {
            border-radius: 26px;
          }

          .deck-section header {
            display: grid;
            gap: 10px;
          }

          .catalog-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .catalog-card {
            padding: 9px;
            border-radius: 18px;
          }

          .catalog-card img {
            border-radius: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .motion-ready .reveal-target {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }
      `}</style>
    </main>
  )
}
