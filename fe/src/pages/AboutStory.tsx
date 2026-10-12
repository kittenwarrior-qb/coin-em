import { EmcoinImage } from '@/components/cartoon/EmcoinImage'
import { useEffect, type CSSProperties } from 'react'
import { ArrowRight, Smartphone } from 'lucide-react'
import { Link } from 'react-router-dom'

import SiteHeader from '@/components/site/SiteHeader'
import { CoinRulesGuide } from '@/components/game/CoinRulesGuide'
import { APPROVED_GAME_INFO } from '@/content/approvedGameInfo'

const tutorialImages = Array.from({ length: 9 }, (_, index) => ({
  src: '/tutorial/' + (index + 1) + '.webp',
  alt: 'Màn hướng dẫn chơi EmCoin ' + (index + 1),
}))

const gameFlow = [
  ['01', 'Tạo phòng', 'Một người làm Quản Trò tạo phòng, các bạn còn lại quét QR hoặc nhập mã để vào bàn.'],
  ['02', 'Nhận vai', 'Ứng dụng chia vai, giữ bí mật vai trò và cho từng người xem thẻ của mình trên điện thoại.'],
  ['03', 'Chọn thẻ', 'Người Trao Gửi chọn thẻ tình huống, thẻ cảm xúc, thẻ phản tư hoặc bí kíp tự ôm theo từng phase.'],
  ['04', 'Chia sẻ offline', 'Câu chuyện vẫn diễn ra ngoài đời. Web app chỉ giữ nhịp, hiển thị thẻ và ghi nhận lượt chơi.'],
  ['05', 'Ghi nhận coin', 'Coin được dùng như lời cảm ơn sau khi lắng nghe, không phải điểm hơn thua.'],
]

const roleIcons = [
  ['Quản Trò', '/emcoin/icons/orbit/facilitator.svg', '#f5cc00'],
  ['Người Trao Gửi', '/emcoin/icons/orbit/storyteller.svg', '#ef5f8a'],
  ['Người Chữa Lành', '/emcoin/icons/orbit/heal.svg', '#53b025'],
  ['Người Im Lặng', '/emcoin/icons/orbit/lock.svg', '#7b4fd4'],
  ['Người Gợi Mở', '/emcoin/icons/orbit/gift.svg', '#ff8c42'],
  ['Người Kết Nối', '/emcoin/icons/orbit/connect.svg', '#0e94c5'],
  ['Người Dẫn Lối', '/emcoin/icons/orbit/compass.svg', '#e8a020'],
]

const avatarAssets = [
  '/emcoin/avatars/orbit/01.webp',
  '/emcoin/avatars/orbit/05.webp',
  '/emcoin/avatars/orbit/00.webp',
  '/emcoin/avatars/orbit/06.webp',
  '/emcoin/avatars/orbit/12.webp',
  '/emcoin/avatars/orbit/13.webp',
  '/emcoin/avatars/orbit/16.webp',
  '/emcoin/avatars/orbit/21.webp',
]

const uiAssets = [
  ['Nút tròn', '/cartoon/buttons/circle/Violet.png'],
  ['Nút pill', '/cartoon/buttons/pill/Pink.png'],
  ['Bảng UI', '/cartoon/ui/Panel-Teal.png'],
  ['Cờ heading', '/cartoon/ui/Headline-Flag.png'],
  ['Sách log', '/emcoin/icons/orbit/book.svg'],
]

const principles = [
  ['Mobile-first', 'Mỗi người dùng điện thoại riêng, nên các thao tác quan trọng cần rõ, lớn và dễ chạm.'],
  ['Trò chuyện trực tiếp', 'Web app cần Internet để chơi; phần offline chỉ hỗ trợ hướng dẫn công khai. Ứng dụng không thay người điều phối.'],
  ['An toàn cảm xúc', 'Luật chơi cần giúp học sinh có quyền quan sát, chia sẻ hoặc dừng lại khi cần.'],
]

export default function AboutStory() {
  useEffect(() => {
    document.title = 'EmCoin - Hướng dẫn'

    const root = document.querySelector('.game-intro-page')
    const targets = document.querySelectorAll('.game-hero, .tutorial-board, .flow-section, .asset-section, .principle-band, .license-panel')
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
    <main className="game-intro-page">
      <SiteHeader />

      <section className="game-hero">
        <div>
          <p className="section-label">Hướng dẫn</p>
          <h1>EmCoin là một vòng chơi cảm xúc, không phải một bài kiểm tra.</h1>
          <p>
            Người chơi dùng điện thoại thay cho bộ thẻ giấy: vào phòng, nhận vai, chọn thẻ, trò chuyện trực tiếp và ghi nhận nhau bằng Coin. Web app cần Internet để chơi; phần offline chỉ hỗ trợ hướng dẫn công khai.
          </p>
          <div className="hero-actions">
            <Link className="primary-action" to="/game">
              Chơi thử app
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className="secondary-action" to="/about/cards">
              Xem bộ thẻ 2D
            </Link>
          </div>
        </div>
        <figure className="hero-phone">
          <EmcoinImage src="/tutorial/1.webp" alt="Màn hình hướng dẫn đầu tiên của EmCoin" />
        </figure>
      </section>

      <section className="flow-section" aria-label="Luật Coin trên web">
        <div className="section-heading">
          <h2>Luật Coin trên web</h2>
          <p>Luật web hiện tại được trình bày dưới đây; các hình minh họa gốc được giữ nguyên ở phần tiếp theo.</p>
        </div>
        <CoinRulesGuide />
        <p>Hỗ trợ: <a href={`mailto:${APPROVED_GAME_INFO.supportEmail}`}>{APPROVED_GAME_INFO.supportEmail}</a></p>
      </section>

      <section className="tutorial-board">
        <div className="section-heading">
          <p className="section-label">Từng bước</p>
          <h2>Mỗi màn hướng dẫn được hiển thị nguyên vẹn để người xem đọc hết nội dung.</h2>
        </div>
        <div className="tutorial-grid">
          {tutorialImages.map((image, index) => (
            <figure key={image.src}>
              <figcaption>Bước {String(index + 1).padStart(2, '0')}</figcaption>
              <EmcoinImage src={image.src} alt={image.alt} loading="lazy" decoding="async" />
            </figure>
          ))}
        </div>
      </section>

      <section className="flow-section">
        <div className="section-heading">
          <p className="section-label">Logic một vòng chơi</p>
          <h2>Ứng dụng giữ nhịp để người chơi tập trung vào cuộc trò chuyện ngoài đời.</h2>
        </div>
        <div className="flow-grid">
          {gameFlow.map(([number, title, text]) => (
            <article key={number}>
              <span>{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="asset-section">
        <div>
          <p className="section-label">Nhân vật & vai trò</p>
          <h2>Avatar giúp bàn chơi có cảm giác gần gũi, còn icon vai trò giúp quản trò đọc trạng thái nhanh hơn.</h2>
          <div className="avatar-cloud">
            {avatarAssets.map((src) => (
              <EmcoinImage key={src} src={src} alt="" loading="lazy" decoding="async" />
            ))}
          </div>
        </div>
        <div className="role-cloud">
          {roleIcons.map(([name, icon, color]) => (
            <article key={name} style={{ '--role-color': color } as CSSProperties}>
              <EmcoinImage src={icon} alt="" loading="lazy" decoding="async" />
              <span>{name}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="asset-section ui-showcase">
        <div>
          <p className="section-label">UI trong game</p>
          <h2>Các thành phần giao diện dùng chất liệu cartoon để giữ cảm giác thân thiện với học sinh.</h2>
        </div>
        <div className="ui-grid">
          {uiAssets.map(([label, image]) => (
            <article key={label}>
              <EmcoinImage src={image} alt="" loading="lazy" decoding="async" />
              <span>{label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="principle-band">
        {principles.map(([title, text]) => (
          <article key={title}>
            <Smartphone aria-hidden="true" />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="license-panel">
        <p>Avatar và icon giao diện dùng bộ EmCoin Friends mới.</p>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@500;600;700;800;900&display=swap');

        .game-intro-page {
          --ink: #245f8f;
          --muted: #5f8ab0;
          --accent: #ef5f8a;
          --terracotta: #f58b35;
          --sage: #76a663;
          --surface: #fffdf8;
          --sky: #d9f7fb;
          min-height: 100dvh;
          padding-bottom: 72px;
          background:
            radial-gradient(circle at 12% 6%, rgba(239,95,138,.15), transparent 30%),
            radial-gradient(circle at 88% 8%, rgba(217,247,251,.92), transparent 36%),
            linear-gradient(180deg, #fffaf2 0%, #f7fbf5 54%, #ffffff 100%);
          color: var(--ink);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          overflow-x: hidden;
        }

        .game-hero,
        .tutorial-board,
        .flow-section,
        .asset-section,
        .principle-band,
        .license-panel {
          width: min(1120px, calc(100% - 32px));
          margin-inline: auto;
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

        .game-hero {
          min-height: calc(100svh - 74px);
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(280px, .72fr);
          gap: clamp(28px, 6vw, 76px);
          align-items: center;
          padding: 126px 0 72px;
        }

        .section-label {
          width: fit-content;
          margin: 0 0 14px;
          padding: 8px 14px;
          border: 1px solid rgba(239,95,138,.24);
          border-radius: 999px;
          background: rgba(255,253,248,.72);
          color: var(--accent);
          font-size: 13px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .game-hero h1,
        .section-heading h2,
        .asset-section h2,
        .license-panel h2 {
          margin: 0;
          color: var(--ink);
          font-family: "Fraunces", Georgia, serif;
          font-size: clamp(40px, 7vw, 82px);
          font-weight: 700;
          letter-spacing: -.055em;
          line-height: .96;
        }

        .game-hero p,
        .license-panel p {
          max-width: 680px;
          margin: 20px 0 0;
          color: var(--muted);
          font-size: clamp(16px, 2vw, 19px);
          font-weight: 700;
          line-height: 1.72;
        }

        .hero-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 30px;
        }

        .primary-action,
        .secondary-action {
          min-height: 52px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 22px;
          border-radius: 999px;
          color: white;
          font-size: 15px;
          font-weight: 900;
          text-decoration: none;
          box-shadow: 0 14px 30px rgba(111,78,55,.14);
          transition: transform .18s ease, box-shadow .18s ease;
        }

        .primary-action {
          background: var(--accent);
        }

        .secondary-action {
          background: rgba(255,253,248,.86);
          color: var(--ink);
          border: 1px solid rgba(36,95,143,.12);
        }

        .primary-action:hover,
        .secondary-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 40px rgba(111,78,55,.18);
        }

        .primary-action svg {
          width: 18px;
          height: 18px;
        }

        .hero-phone {
          margin: 0;
          justify-self: center;
          width: min(100%, 320px);
          padding: 14px;
          border: 1px solid rgba(36,95,143,.14);
          border-radius: 34px;
          background: rgba(255,253,248,.82);
          box-shadow: 0 30px 80px rgba(111,78,55,.16);
          animation: floatPhone 5s ease-in-out infinite;
        }

        .hero-phone img {
          width: 100%;
          display: block;
          border-radius: 24px;
        }

        .section-heading {
          max-width: 820px;
          margin-inline: auto;
          text-align: center;
        }

        .section-heading h2,
        .asset-section h2,
        .license-panel h2 {
          font-size: clamp(34px, 5vw, 58px);
        }

        .section-heading::after {
          content: "";
          display: block;
          width: 96px;
          height: 4px;
          margin: 24px auto 0;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--accent), #d4b35e, var(--sage));
        }

        .tutorial-board,
        .flow-section,
        .asset-section,
        .principle-band,
        .license-panel {
          padding-top: 86px;
        }

        .tutorial-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 22px;
          margin-top: 34px;
        }

        .tutorial-grid figure {
          margin: 0;
          overflow: visible;
          display: grid;
          gap: 12px;
          align-content: start;
          padding: 12px;
          border: 1px solid rgba(255,255,255,.62);
          border-radius: 28px;
          background: rgba(255,253,248,.72);
          box-shadow: 0 18px 48px rgba(111,78,55,.08);
        }

        .tutorial-grid figcaption {
          width: fit-content;
          padding: 6px 11px;
          border-radius: 999px;
          background: rgba(239,95,138,.12);
          color: var(--accent);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .tutorial-grid img {
          width: 100%;
          height: auto;
          display: block;
          object-fit: contain;
          border-radius: 20px;
          background: rgba(255,250,242,.58);
          transition: transform 520ms cubic-bezier(.2,.7,.2,1);
        }

        .tutorial-grid figure:hover img {
          transform: scale(1.04);
        }

        .flow-grid {
          position: relative;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0;
          margin-top: 44px;
          padding-top: 34px;
        }

        .flow-grid::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 14px;
          height: 2px;
          background: linear-gradient(90deg, var(--accent), var(--terracotta), var(--sage));
          opacity: .72;
        }

        .flow-grid article {
          display: grid;
          gap: 12px;
          padding: 0 18px 0 0;
        }

        .flow-grid span {
          width: 52px;
          height: 52px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: var(--surface);
          box-shadow: 0 14px 34px rgba(36,95,143,.12);
          color: var(--accent);
          font-family: "Fraunces", Georgia, serif;
          font-size: 20px;
          font-weight: 700;
        }

        h3 {
          margin: 0;
          color: var(--ink);
          font-family: "Fraunces", Georgia, serif;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -.03em;
        }

        article p {
          margin: 9px 0 0;
          color: var(--muted);
          font-size: 14.5px;
          font-weight: 700;
          line-height: 1.65;
        }

        .asset-section {
          display: grid;
          grid-template-columns: .8fr 1.2fr;
          gap: clamp(28px, 5vw, 60px);
          align-items: center;
        }

        .avatar-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
        }

        .avatar-cloud img {
          width: 66px;
          height: 66px;
          object-fit: contain;
          padding: 8px;
          border-radius: 50%;
          background: var(--sky);
          box-shadow: 0 12px 24px rgba(36,95,143,.1);
        }

        .role-cloud,
        .ui-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .role-cloud article,
        .ui-grid article,
        .principle-band article {
          min-height: 104px;
          display: grid;
          grid-template-columns: 54px 1fr;
          gap: 14px;
          align-items: center;
          padding: 16px;
          border: 1px solid rgba(36,95,143,.14);
          border-radius: 24px;
          background: rgba(255,253,248,.78);
          box-shadow: 0 18px 48px rgba(111,78,55,.08);
        }

        .role-cloud img,
        .ui-grid img {
          width: 48px;
          height: 48px;
          object-fit: contain;
        }

        .role-cloud span,
        .ui-grid span {
          color: var(--role-color, var(--ink));
          font-family: "Fraunces", Georgia, serif;
          font-size: 20px;
          font-weight: 700;
          line-height: 1.05;
        }

        .ui-showcase {
          grid-template-columns: .7fr 1.3fr;
        }

        .ui-grid article {
          grid-template-columns: 70px 1fr;
        }

        .ui-grid img {
          width: 64px;
          height: 44px;
        }

        .principle-band {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .principle-band article {
          display: block;
          min-height: 210px;
          padding: 22px;
        }

        .principle-band svg {
          width: 42px;
          height: 42px;
          margin-bottom: 18px;
          color: var(--accent);
        }

        .license-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 88px;
          padding: 22px;
          border: 1px solid rgba(36,95,143,.14);
          border-radius: 32px;
          background: rgba(255,253,248,.82);
          box-shadow: 0 24px 70px rgba(111,78,55,.1);
        }

        .license-panel img {
          width: min(180px, 48vw);
          display: block;
          object-fit: contain;
        }

        @keyframes floatPhone {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
        }

        @media (max-width: 900px) {
          .game-hero,
          .asset-section,
          .ui-showcase,
          .license-panel {
            grid-template-columns: 1fr;
          }

          .hero-phone {
            width: min(100%, 280px);
          }

          .flow-grid {
            grid-template-columns: 1fr;
            gap: 18px;
            padding: 0 0 0 22px;
          }

          .flow-grid::before {
            inset: 0 auto 0 0;
            width: 2px;
            height: auto;
          }

          .flow-grid article {
            position: relative;
            grid-template-columns: 52px 1fr;
            padding: 0 0 0 8px;
          }

          .tutorial-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .tutorial-grid figure,
          .tutorial-grid figure:nth-child(3n + 1),
          .tutorial-grid figure:nth-child(3n + 2),
          .tutorial-grid figure:nth-child(3n + 3) {
            grid-column: auto;
          }
        }

        @media (max-width: 640px) {
          .game-hero,
          .tutorial-board,
          .flow-section,
          .asset-section,
          .principle-band,
          .license-panel {
            width: min(100% - 28px, 520px);
          }

          .game-hero {
            min-height: calc(100svh - 68px);
            padding: 104px 0 58px;
          }

          .hero-actions,
          .principle-band {
            grid-template-columns: 1fr;
            display: grid;
          }

          .tutorial-grid {
            display: grid;
            grid-auto-flow: column;
            grid-auto-columns: minmax(300px, 88vw);
            grid-template-columns: none;
            grid-template-rows: 1fr;
            overflow-x: auto;
            overscroll-behavior-x: contain;
            scroll-snap-type: x mandatory;
            gap: 12px;
            padding: 0 14px 8px;
            margin-inline: -14px;
            scrollbar-width: none;
          }

          .tutorial-grid::-webkit-scrollbar {
            display: none;
          }

          .tutorial-grid figure,
          .tutorial-grid figure.wide {
            grid-column: auto;
            grid-row: auto;
            border-radius: 18px;
            scroll-snap-align: center;
          }

          .tutorial-grid img {
            border-radius: 14px;
          }

          .role-cloud,
          .ui-grid {
            grid-template-columns: 1fr;
          }

          .license-panel {
            padding: 22px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-phone {
            animation: none;
          }

          .motion-ready .reveal-target {
            opacity: 1;
            transform: none;
            transition: none;
          }

          .tutorial-grid img {
            transition: none;
          }
        }
      `}</style>
    </main>
  )
}
