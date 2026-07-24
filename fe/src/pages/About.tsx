import { useEffect } from 'react'
import { ArrowDown, Globe2, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'

import SiteHeader from '@/components/site/SiteHeader'

const quickStats = [
  ['10-15', 'độ tuổi trọng tâm'],
  ['4-8', 'người chơi mỗi bàn'],
  ['60-90 phút', 'thời lượng một buổi'],
  ['4 bộ thẻ', 'tình huống, cảm xúc, phản tư, tự ôm'],
]

const gameSteps = [
  ['01', 'Nhận vai', 'Mỗi người có một vai trò riêng để tạo nhịp lắng nghe và phản hồi trong vòng chơi.'],
  ['02', 'Chọn thẻ', 'Người Trao Gửi chọn tình huống và cảm xúc phù hợp với câu chuyện của mình.'],
  ['03', 'Chia sẻ', 'Cả nhóm trò chuyện offline trong một vòng tròn an toàn, không phán xét.'],
  ['04', 'Phản tư', 'Thẻ phản tư và bí kíp tự ôm giúp người chơi nhìn lại cảm xúc sau câu chuyện.'],
  ['05', 'Ghi nhận', 'Coin được dùng như lời cảm ơn và sự công nhận, không phải điểm thắng thua.'],
]

const cards = [
  ['Thẻ tình huống', '32 thẻ', 'Mở đầu câu chuyện bằng những bối cảnh gần gũi trong trường học, gia đình và bạn bè.', '/landing/situation-card.webp'],
  ['Thẻ cảm xúc', '32 thẻ', 'Giúp người chơi gọi tên cảm xúc bằng ngôn ngữ ngắn, rõ và dễ tiếp cận.', '/landing/emotion-card.webp'],
  ['Thẻ phản tư', '14 thẻ', 'Gợi câu hỏi để người chơi nhìn lại hành vi, nhu cầu và cách mình phản ứng.', '/landing/reflection-card.webp'],
  ['Bí kíp tự ôm', '15 thẻ', 'Đề xuất hành động chăm sóc bản thân hoặc kết nối lại với nhóm.', '/landing/selfcare-card.webp'],
]

const roles = [
  ['Quản Trò', 'Điều phối nhịp chơi và giữ không gian an toàn cho cả bàn.'],
  ['Người Trao Gửi', 'Người chia sẻ câu chuyện cảm xúc chính trong vòng chơi.'],
  ['Người Chữa Lành', 'Bảo vệ một người khỏi bị im lặng trong đêm.'],
  ['Người Im Lặng', 'Tạo thử thách bằng cách chọn một người không thể phát biểu.'],
  ['Người Gợi Mở', 'Đặt câu hỏi giúp câu chuyện đi sâu hơn.'],
  ['Người Kết Nối', 'Kết nối câu chuyện của Người Trao Gửi với cả nhóm.'],
  ['Người Dẫn Lối', 'Hướng dẫn hoạt động chăm sóc bản thân cuối vòng.'],
]

const principles = [
  ['Tự nguyện', 'Người chơi có quyền quan sát, từ chối chia sẻ hoặc tạm dừng khi cần.'],
  ['Không phán xét', 'Mỗi cảm xúc được nhìn như một dữ kiện cần lắng nghe, không phải lỗi sai.'],
  ['Offline là chính', 'Web app chỉ hỗ trợ thẻ, vai trò, coin và nhịp chơi; cuộc trò chuyện vẫn diễn ra ngoài đời.'],
]

const teamMembers = [
  ['Lê Trương Mỹ Ngọc', 'Trưởng nhóm', '2005', '/cartoon/icons/avatars/Girl 1.png'],
  ['Nguyễn Trần Bảo Nhi', 'Đồng đội đáng tin cậy', '2005', '/cartoon/icons/avatars/Girl 3.png'],
  ['Huỳnh Hồng Như', 'Đồng đội lý trí', '2006', '/cartoon/icons/avatars/Girl.png'],
]

const trialImages = Array.from({ length: 12 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0')
  return {
    src: `/landing/trial-${number}.webp`,
    thumb: `/landing/trial-${number}-thumb.webp`,
    alt: `Hình ảnh thử nghiệm EmCoin ${index + 1}`,
  }
})

export default function About() {
  useEffect(() => {
    document.title = 'EmCoin - Về dự án'
  }, [])

  useEffect(() => {
    const root = document.querySelector('.about-page')
    const targets = document.querySelectorAll('.hero-copy, .stats, .section, .footer-card')
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
    <main className="about-page">
      <SiteHeader />

      <section className="hero">
        <picture className="hero-photo">
          <source media="(max-width: 640px)" srcSet="/landing/trial-08-thumb.webp" />
          <img src="/landing/trial-08-thumb.webp" alt="Nhóm học sinh trải nghiệm EmCoin" />
        </picture>

        <div className="hero-copy">
          <p className="eyebrow">UPSHIFT 2025 - AIESEC Việt Nam x UNICEF</p>
          <h1>Đồng tiền tử tế</h1>
          <p className="tagline">Bộ thẻ bài giáo dục cảm xúc cho học sinh.</p>
          <p className="lead">
            EmCoin kết hợp thẻ bài và web app để học sinh nhận diện, gọi tên và chia sẻ cảm xúc trong một vòng chơi offline cùng bạn bè.
          </p>
          <div className="hero-actions">
            <Link to="/game" className="primary-action">Chơi thử app</Link>
            <Link to="/cards" className="secondary-action"><span>Xem bộ thẻ 3D</span><span className="new-badge">MỚI</span></Link>
          </div>
        </div>
      </section>

      <section className="stats" aria-label="Thông tin nhanh">
        {quickStats.map(([value, label]) => (
          <article key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </section>

      <section id="cards" className="section">
        <div className="section-heading">
          <p className="section-label">Bộ thẻ</p>
          <h2>Bốn nhóm thẻ giữ cho cuộc trò chuyện có mở đầu, chiều sâu và điểm kết.</h2>
        </div>
        <div className="card-grid">
          {cards.map(([title, count, text, image], index) => (
            <Link className="deck-card-link" key={title} to="/about/cards" aria-label={`Xem bộ thẻ 2D: ${title}`}>
              <article>
                <img src={image} alt={title} decoding="async" />
                <div>
                  <span className="card-count">{count}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
                <span className="card-index">{String(index + 1).padStart(2, '0')}</span>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="section image-section">
        <picture>
          <source media="(max-width: 640px)" srcSet="/landing/trial-12-thumb.webp" />
          <img src="/landing/trial-12.webp" alt="Buổi thử nghiệm EmCoin với học sinh" loading="lazy" />
        </picture>
        <div>
          <p className="section-label">Trải nghiệm thử nghiệm</p>
          <h2>Thiết kế của EmCoin được kiểm tra qua hoạt động thực tế.</h2>
          <p>
            Các buổi thử nghiệm giúp nhóm quan sát mức độ dễ hiểu của thẻ, nhịp chơi, vai trò, cách phản hồi và cảm giác an toàn của người tham gia.
          </p>
        </div>
      </section>

      <section id="gallery" className="section gallery-section">
        <div className="section-heading">
          <p className="section-label">Hình ảnh</p>
          <h2>Một vài lát cắt từ quá trình thử nghiệm và hoàn thiện EmCoin.</h2>
        </div>
        <div className="trial-gallery">
          {trialImages.map((image, index) => (
            <figure
              key={image.src}
              className={[
                index % 5 === 0 ? 'wide' : '',
                index === trialImages.length - 1 ? 'gallery-final' : '',
              ].filter(Boolean).join(' ')}
            >
              <picture>
                <source media="(max-width: 640px)" srcSet={image.thumb} />
                <img src={image.src} alt={image.alt} loading="lazy" />
              </picture>
            </figure>
          ))}
        </div>
      </section>

      <section id="overview" className="section split">
        <div>
          <p className="section-label">Tổng quan</p>
          <h2>Một công cụ mở lời, không phải một bài kiểm tra cảm xúc.</h2>
        </div>
        <div className="text-stack">
          <p>
            Trong nhiều tình huống, học sinh biết mình đang không ổn nhưng không có đủ từ ngữ hoặc không gian an toàn để nói ra. EmCoin biến việc chia sẻ thành một trò chơi có luật, có vai trò và có nhịp rõ ràng.
          </p>
          <p>
            Điện thoại thay thế cho thẻ bài, đồng xu và quản lý lượt chơi. Phần quan trọng nhất vẫn diễn ra trực tiếp: lắng nghe, đặt câu hỏi, phản hồi và ghi nhận nhau.
          </p>
        </div>
      </section>

      <section id="problem" className="section">
        <div className="section-heading">
          <p className="section-label">Vấn đề</p>
          <h2>Học sinh cần một cách nhẹ nhàng hơn để bắt đầu nói về cảm xúc.</h2>
        </div>
        <div className="problem-grid">
          <article>
            <h3>Khó gọi tên</h3>
            <p>Không gọi được tên cảm xúc khiến việc chia sẻ và tự điều chỉnh trở nên khó hơn.</p>
          </article>
          <article>
            <h3>Ngại chia sẻ</h3>
            <p>Các em thường muốn nói với bạn bè, nhưng nhóm bạn lại thiếu cấu trúc để lắng nghe an toàn.</p>
          </article>
          <article>
            <h3>Cần nhịp dẫn dắt</h3>
            <p>Một vòng chơi có vai trò và thẻ bài giúp cuộc trò chuyện bớt gượng ép hơn.</p>
          </article>
        </div>
      </section>

      <section id="how" className="section">
        <div className="section-heading">
          <p className="section-label">Cách chơi</p>
          <h2>Mỗi vòng chơi đi từ nhận vai, chọn thẻ, chia sẻ đến phản tư.</h2>
        </div>
        <div className="steps">
          {gameSteps.map(([number, title, text]) => (
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

      <section className="section">
        <div className="section-heading">
          <p className="section-label">Vai trò</p>
          <h2>Vai trò giúp mỗi người có một nhiệm vụ rõ trong cuộc trò chuyện.</h2>
        </div>
        <div className="role-list">
          {roles.map(([title, text]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="section-label">Nguyên tắc</p>
          <h2>EmCoin được thiết kế như một công cụ hỗ trợ, không thay thế người điều phối.</h2>
        </div>
        <div className="principles">
          {principles.map(([title, text]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section team-section">
        <div>
          <p className="section-label">Nhóm thực hiện</p>
          <h2>Những gương mặt sau Đồng Tiền Tử Tế.</h2>
        </div>
        <div className="team-strip">
          {teamMembers.map(([name, role, year], index) => (
            <article key={name}>
              <span className="team-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>{name}</h3>
                <p>{role}</p>
              </div>
              <time dateTime={year}>{year}</time>
            </article>
          ))}
        </div>
      </section>

      <footer className="about-footer">
        <div className="footer-card">
          <div className="footer-heading">
            <img src="/logo.svg" alt="EmCoin" />
            <div>
              <strong>Liên hệ chi tiết</strong>
              <span>Nhóm dự án Đồng Tiền Tử Tế - UPSHIFT 2025</span>
            </div>
          </div>

          <div className="contact-grid">
            <a href="mailto:emcoin.nnn@gmail.com" className="contact-item">
              <Mail aria-hidden="true" />
              <span>
                <b>Email</b>
                emcoin.nnn@gmail.com
              </span>
            </a>
            <a href="mailto:ngocltm.sw@gmail.com" className="contact-item">
              <Mail aria-hidden="true" />
              <span>
                <b>Email người đại diện</b>
                ngocltm.sw@gmail.com
              </span>
            </a>
            <a href="https://emcoin.cloud" className="contact-item" target="_blank" rel="noreferrer">
              <Globe2 aria-hidden="true" />
              <span>
                <b>Web app</b>
                emcoin.cloud
              </span>
            </a>
          </div>

          <div className="qr-panel">
            <p>Web app thẻ bài <ArrowDown aria-hidden="true" /></p>
            <img src="/landing/emcoin-qr.svg" alt="QR truy cập web app EmCoin" />
          </div>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Nunito+Sans:wght@400;600;700;800&display=swap');

        .about-page {
          --sand: #d9f7fb;
          --oat: #bfeaf1;
          --surface: #fffdf8;
          --ink: #245f8f;
          --muted: #5d8db2;
          --line: rgba(111, 78, 55, .16);
          --accent: #f15f8d;
          --terracotta: #ff8a32;
          --sage: #76c8b7;
          min-height: 100dvh;
          background:
            radial-gradient(circle at 14% 0%, rgba(139,157,131,.22), transparent 30%),
            radial-gradient(circle at 86% 8%, rgba(198,107,61,.14), transparent 32%),
            var(--sand);
          color: var(--ink);
          font-family: "Nunito Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .about-page,
        .about-page * {
          box-sizing: border-box;
          font-family: "Nunito Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }

        .about-page a {
          color: inherit;
        }

        .motion-ready .reveal-target {
          opacity: 0;
          transform: translateY(18px);
          transition:
            opacity 720ms cubic-bezier(.2,.7,.2,1),
            transform 720ms cubic-bezier(.2,.7,.2,1);
        }

        .motion-ready .reveal-target.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .section {
          content-visibility: auto;
          contain-intrinsic-size: 1px 760px;
        }

        .about-nav {
          position: fixed;
          inset: 0 0 auto;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 13px max(18px, calc((100vw - 1160px) / 2));
          background: rgba(255,250,242,.9);
          border-bottom: 1px solid rgba(255,255,255,.58);
          box-shadow: 0 10px 32px rgba(111,78,55,.12);
          backdrop-filter: blur(18px);
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: var(--ink);
        }

        .brand-mark {
          width: 58px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 0;
          border-radius: 0;
          background: transparent;
          color: var(--terracotta);
          font-family: "Fraunces", Georgia, serif !important;
          font-size: 15px;
          font-weight: 700;
        }

        .brand-mark img {
          width: 58px;
          height: 44px;
          object-fit: contain;
        }

        .brand span:last-child {
          display: grid;
          gap: 1px;
          font-family: "Fraunces", Georgia, serif !important;
          font-size: 22px;
          font-weight: 600;
          line-height: 1;
        }

        .brand small {
          color: var(--accent);
          font-size: 11px;
          font-style: italic;
          font-weight: 600;
        }

        .hero {
          position: relative;
          min-height: 100svh;
          display: grid;
          place-items: center;
          isolation: isolate;
          overflow: hidden;
          padding: 104px 18px 70px;
        }

        .hero-photo {
          position: absolute;
          inset: 0;
          z-index: -2;
        }

        .hero-photo img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          object-position: center;
          filter: saturate(.9) brightness(.98);
        }

        .hero::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(circle at 50% 42%, rgba(232,220,199,.05), rgba(111,78,55,.24) 66%),
            linear-gradient(180deg, rgba(111,78,55,.08), rgba(111,78,55,.36));
        }

        .hero-copy {
          width: min(100%, 720px);
          display: grid;
          justify-items: center;
          text-align: center;
          color: white;
          animation: hero-float 5.8s ease-in-out infinite;
        }

        @keyframes hero-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .eyebrow,
        .section-label {
          margin: 0;
          color: var(--terracotta);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .hero .eyebrow {
          color: rgba(255,255,255,.86);
          text-shadow: 0 2px 18px rgba(74,49,34,.25);
        }

        .about-page h1,
        .about-page h2,
        .about-page h3,
        .about-page .brand span:last-child,
        .about-page .brand-mark,
        .about-page .stats strong,
        .about-page .steps span,
        .about-page .tagline,
        .about-page .about-footer strong {
          font-family: "Fraunces", Georgia, serif !important;
        }

        .hero h1 {
          margin: 18px 0 0;
          color: white;
          font-size: clamp(48px, 9vw, 92px);
          font-weight: 600;
          letter-spacing: -.045em;
          line-height: .94;
          text-shadow: 0 8px 36px rgba(74,49,34,.28);
        }

        .tagline {
          margin: 16px 0 0;
          color: rgba(255,255,255,.92);
          font-family: "Fraunces", Georgia, serif !important;
          font-size: clamp(22px, 3vw, 32px);
          font-style: italic;
          line-height: 1.2;
          text-shadow: 0 6px 28px rgba(74,49,34,.24);
        }

        .lead {
          max-width: 620px;
          margin: 22px 0 0;
          color: rgba(255,255,255,.9);
          font-size: clamp(15px, 1.6vw, 18px);
          font-weight: 600;
          line-height: 1.72;
          text-shadow: 0 4px 24px rgba(74,49,34,.24);
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 14px;
          margin-top: 30px;
        }

        .primary-action,
        .secondary-action {
          min-height: 52px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 26px;
          border-radius: 999px;
          font-size: 16px;
          font-weight: 800;
          text-decoration: none;
        }

        .primary-action {
          background: var(--accent);
          color: white !important;
          box-shadow: 0 14px 30px rgba(111,78,55,.22);
        }

        .secondary-action {
          position: relative;
          background: rgba(255,255,255,.92);
          color: var(--ink) !important;
          box-shadow: 0 14px 30px rgba(111,78,55,.14);
        }

        .new-badge {
          position: absolute;
          top: -9px;
          right: -8px;
          z-index: 2;
          padding: 4px 7px 3px;
          border: 1px solid rgba(232,74,95,.42);
          border-radius: 8px;
          background: #fff1f4;
          color: #e84a5f;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .04em;
          line-height: 1;
          box-shadow: 0 4px 10px rgba(232,74,95,.16);
          transform: rotate(8deg);
        }

        .stats,
        .section,
        .about-footer {
          width: min(1120px, calc(100% - 32px));
          margin-inline: auto;
        }

        .stats {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-top: -44px;
        }

        .stats article,
        .problem-grid article,
        .card-grid article {
          border: 1px solid rgba(255,255,255,.62);
          border-radius: 24px;
          background: rgba(255,250,242,.84);
          box-shadow: 0 18px 48px rgba(111,78,55,.08);
        }

        .stats article {
          min-height: 104px;
          padding: 22px;
          backdrop-filter: blur(16px);
        }

        .stats strong {
          display: block;
          color: var(--terracotta);
          font-family: "Fraunces", Georgia, serif !important;
          font-size: 34px;
          font-weight: 700;
          letter-spacing: -.04em;
        }

        .stats span {
          display: block;
          margin-top: 7px;
          color: var(--muted);
          font-size: 14px;
          font-weight: 700;
          line-height: 1.45;
        }

        .section {
          padding-top: 90px;
        }

        .split,
        .image-section {
          display: grid;
          grid-template-columns: .88fr 1.12fr;
          gap: clamp(28px, 5vw, 64px);
          align-items: start;
        }

        .section h2 {
          max-width: 820px;
          margin: 14px 0 0;
          color: var(--ink);
          font-size: clamp(34px, 4.6vw, 62px);
          font-weight: 600;
          letter-spacing: -.045em;
          line-height: 1.02;
        }

        .section-heading {
          max-width: 820px;
          margin-inline: auto;
          text-align: center;
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

        .text-stack {
          display: grid;
          gap: 16px;
          padding-top: 6px;
        }

        .text-stack p,
        .image-section p {
          margin: 0;
          color: var(--muted);
          font-size: 16px;
          font-weight: 700;
          line-height: 1.78;
        }

        .problem-grid {
          display: grid;
          grid-template-columns: 1.2fr .8fr;
          gap: 16px;
          margin-top: 32px;
        }

        .problem-grid article {
          padding: 22px;
        }

        .problem-grid article:first-child {
          grid-row: span 2;
          min-height: 310px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          background:
            linear-gradient(160deg, rgba(255,253,248,.9), rgba(217,247,251,.72)),
            radial-gradient(circle at 18% 16%, rgba(241,95,141,.22), transparent 34%);
        }

        .problem-grid article:first-child h3 {
          font-size: clamp(30px, 4vw, 46px);
          line-height: 1;
        }

        .principles {
          display: grid;
          gap: 0;
          margin-top: 34px;
          border-block: 1px solid rgba(36,95,143,.18);
        }

        .principles article {
          display: grid;
          grid-template-columns: minmax(150px, .34fr) 1fr;
          gap: 20px;
          padding: 22px 0;
          border-bottom: 1px solid rgba(36,95,143,.14);
        }

        .principles article:last-child {
          border-bottom: 0;
        }

        .principles article p {
          margin: 0;
          font-size: 16px;
        }

        .steps {
          position: relative;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0;
          margin-top: 44px;
          padding-top: 34px;
        }

        .steps::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 14px;
          height: 2px;
          background: linear-gradient(90deg, var(--accent), var(--terracotta), var(--sage));
          opacity: .72;
        }

        .steps article {
          display: grid;
          gap: 12px;
          padding: 0 18px 0 0;
          background: transparent;
        }

        .steps span {
          width: 52px;
          height: 52px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: var(--surface);
          box-shadow: 0 14px 34px rgba(36,95,143,.12);
          color: var(--accent);
          font-family: "Fraunces", Georgia, serif !important;
          font-size: 20px;
          font-weight: 700;
        }

        h3 {
          margin: 0;
          color: var(--ink);
          font-family: "Fraunces", Georgia, serif !important;
          font-size: 22px;
          font-weight: 600;
          letter-spacing: -.03em;
        }

        article p {
          margin: 9px 0 0;
          color: var(--muted);
          font-size: 14.5px;
          font-weight: 700;
          line-height: 1.65;
        }

        .card-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-top: 32px;
          perspective: 1200px;
        }

        .deck-card-link {
          color: inherit;
          text-decoration: none;
        }

        .card-grid article {
          position: relative;
          display: grid;
          grid-template-columns: 112px minmax(0, 1fr);
          align-items: center;
          gap: 16px;
          padding: 14px;
          overflow: hidden;
        }

        .card-grid img {
          width: 88px;
          height: 126px;
          display: block;
          justify-self: center;
          object-fit: contain;
          border-radius: 16px;
          border: 1px solid rgba(111, 78, 55, .12);
          background: rgba(255,250,242,.76);
          box-shadow: 0 12px 26px rgba(111,78,55,.1);
          transform: rotate(-2deg);
          will-change: transform;
          transition:
            transform 260ms cubic-bezier(.2,.7,.2,1),
            box-shadow 360ms cubic-bezier(.2,.7,.2,1);
        }

        .card-grid article div {
          padding: 0;
        }

        .card-grid article:nth-child(even) {
          --tilt: 1.5deg;
        }

        @media (hover: hover) and (pointer: fine) {
          .card-grid article {
            cursor: pointer;
          }

          .card-grid article:hover img {
            box-shadow: 0 18px 36px rgba(36,95,143,.16);
            transform: translateY(-8px) rotate(calc(var(--tilt, -1.5deg) * -1.8)) scale(1.14);
          }
        }

        .card-grid article:active img {
          box-shadow: 0 8px 18px rgba(36,95,143,.12);
          filter: brightness(1.04) saturate(1.04);
          transform: rotate(-2deg) scale(.96);
          transition-duration: 120ms;
        }

        .card-count {
          display: inline-flex;
          width: fit-content;
          margin-bottom: 8px;
          padding: 5px 10px;
          border-radius: 999px;
          background: rgba(217,247,251,.86);
          color: var(--ink);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .02em;
        }

        .card-index {
          position: absolute;
          right: 16px;
          top: 12px;
          color: rgba(36,95,143,.12);
          font-family: "Fraunces", Georgia, serif !important;
          font-size: 42px;
          font-weight: 700;
          line-height: 1;
          pointer-events: none;
        }

        .image-section {
          align-items: center;
        }

        .image-section picture {
          overflow: hidden;
          aspect-ratio: 16 / 10;
          border-radius: 28px;
          box-shadow: 0 24px 70px rgba(111,78,55,.16);
        }

        .image-section img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .trial-gallery {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-auto-flow: dense;
          gap: 14px;
          margin-top: 34px;
        }

        .trial-gallery figure {
          min-height: 210px;
          margin: 0;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.62);
          border-radius: 24px;
          background: rgba(255,250,242,.72);
          box-shadow: 0 18px 48px rgba(111,78,55,.08);
        }

        .trial-gallery figure.wide {
          grid-column: span 2;
          grid-row: span 2;
          min-height: 434px;
        }

        .trial-gallery figure.gallery-final {
          grid-column: span 2;
          grid-row: span 2;
          min-height: 434px;
        }

        .trial-gallery picture,
        .trial-gallery img {
          width: 100%;
          height: 100%;
          display: block;
        }

        .trial-gallery img {
          object-fit: cover;
        }

        .role-list {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin-top: 32px;
        }

        .role-list article {
          flex: 1 1 260px;
          max-width: 360px;
          padding: 18px 20px;
          border: 1px solid rgba(36,95,143,.14);
          border-radius: 999px;
          background: rgba(255,253,248,.7);
        }

        .role-list article h3 {
          font-size: 20px;
        }

        .role-list article p {
          font-size: 13.5px;
        }

        .team-section {
          display: grid;
          grid-template-columns: .72fr 1.28fr;
          gap: clamp(28px, 5vw, 60px);
          align-items: start;
        }

        .team-strip {
          display: grid;
          gap: 14px;
        }

        .team-strip article {
          display: grid;
          grid-template-columns: 42px 1fr auto;
          gap: 16px;
          align-items: center;
          padding: 18px 0;
          border-top: 1px solid rgba(36,95,143,.16);
          background: transparent;
        }

        .team-strip article:last-child {
          border-bottom: 1px solid rgba(36,95,143,.16);
        }

        .team-strip h3 {
          font-size: clamp(19px, 2.4vw, 26px);
        }

        .team-strip p {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 15px;
          font-weight: 800;
        }

        .team-index,
        .team-strip time {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 64px;
          min-height: 42px;
          padding: 0 12px;
          border-radius: 999px;
          background: rgba(217,247,251,.92);
          color: var(--ink);
          font-size: 15px;
          font-weight: 900;
        }

        .team-index {
          min-width: 42px;
          min-height: 42px;
          padding: 0;
          background: transparent;
          color: var(--pink);
          font-size: 14px;
        }

        .about-footer {
          margin-top: 92px;
          padding: 42px 0 48px;
          color: var(--muted);
          font-size: 15px;
          font-weight: 700;
        }

        .footer-card {
          display: grid;
          grid-template-columns: 1fr 260px;
          gap: 28px;
          align-items: center;
          padding: 28px;
          border: 1px solid rgba(36,95,143,.16);
          border-radius: 32px;
          background:
            linear-gradient(135deg, rgba(255,253,248,.9), rgba(217,247,251,.82)),
            radial-gradient(circle at 18% 0%, rgba(241,95,141,.12), transparent 36%);
          box-shadow: 0 24px 72px rgba(36,95,143,.12);
        }

        .footer-heading {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          gap: 16px;
          text-align: left;
        }

        .footer-heading img {
          width: 82px;
          height: 62px;
          object-fit: contain;
          flex: 0 0 auto;
        }

        .footer-heading strong {
          display: block;
          color: var(--ink);
          font-family: "Fraunces", Georgia, serif !important;
          font-size: clamp(30px, 5vw, 48px);
          font-weight: 600;
          line-height: 1;
        }

        .footer-heading span {
          display: block;
          margin-top: 8px;
          color: var(--muted);
          font-size: 14px;
          font-weight: 800;
        }

        .contact-grid {
          display: grid;
          gap: 14px;
        }

        .contact-item {
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 14px;
          align-items: center;
          padding: 16px;
          border: 1px solid rgba(36,95,143,.12);
          border-radius: 22px;
          background: rgba(255,253,248,.68);
          color: var(--ink) !important;
          text-decoration: none;
        }

        .contact-item img,
        .contact-item svg {
          width: 34px;
          height: 34px;
          object-fit: contain;
          color: var(--accent);
        }

        .contact-item b {
          display: block;
          margin-bottom: 2px;
          color: var(--accent);
          font-size: 13px;
          font-weight: 900;
        }

        .contact-item span {
          min-width: 0;
          color: var(--ink);
          font-size: clamp(15px, 2vw, 18px);
          font-weight: 900;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .qr-panel {
          display: grid;
          justify-items: center;
          gap: 10px;
          padding: 18px;
          border-radius: 28px;
          background: rgba(255,253,248,.86);
          box-shadow: inset 0 0 0 1px rgba(36,95,143,.12);
          text-align: center;
        }

        .qr-panel p {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin: 0;
          color: var(--ink);
          font-size: 18px;
          font-weight: 900;
        }

        .qr-panel p svg {
          width: 22px;
          height: 22px;
          color: var(--ink);
        }

        .qr-panel > img {
          width: min(100%, 210px);
          aspect-ratio: 1;
          display: block;
          border-radius: 18px;
          background: white;
          padding: 12px;
        }

        @media (max-width: 900px) {
          .split,
          .image-section,
          .team-section {
            grid-template-columns: 1fr;
          }

          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .footer-card {
            grid-template-columns: 1fr;
          }

          .qr-panel > img {
            width: min(100%, 240px);
          }
        }

        @media (max-width: 640px) {
          .about-nav {
            padding: 12px 18px;
          }

          .brand-mark {
            width: 52px;
            height: 36px;
            font-size: 13px;
          }

          .brand-mark img {
            width: 52px;
            height: 36px;
          }

          .brand span:last-child {
            font-size: 19px;
          }

          .hero {
            min-height: 100svh;
            padding: 90px 18px 52px;
            align-items: center;
          }

          .hero h1 {
            font-size: clamp(48px, 15vw, 64px);
          }

          .tagline {
            font-size: 22px;
          }

          .lead {
            font-size: 14.5px;
          }

          .hero-actions {
            display: grid;
            width: min(100%, 240px);
            gap: 12px;
          }

          .primary-action,
          .secondary-action {
            min-height: 50px;
          }

          .footer-card {
            gap: 20px;
            padding: 20px;
            border-radius: 28px;
          }

          .footer-heading {
            align-items: flex-start;
            gap: 12px;
          }

          .footer-heading img {
            width: 64px;
            height: 48px;
          }

          .footer-heading strong {
            font-size: 34px;
          }

          .footer-heading span {
            font-size: 12.5px;
          }

          .contact-item {
            grid-template-columns: 36px 1fr;
            gap: 12px;
            padding: 14px;
            border-radius: 20px;
          }

          .contact-item img,
          .contact-item svg {
            width: 30px;
            height: 30px;
          }

          .qr-panel {
            padding: 16px;
          }

          .qr-panel > img {
            width: min(100%, 220px);
          }

          .stats,
          .section,
          .about-footer {
            width: min(100% - 28px, 1120px);
          }

          .problem-grid,
          .principles {
            grid-template-columns: 1fr;
          }

          .stats {
            margin-top: 32px;
          }

          .problem-grid article:first-child {
            min-height: auto;
          }

          .principles article {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .card-grid {
            display: flex;
            gap: 12px;
            overflow-x: auto;
            overscroll-behavior-x: contain;
            scroll-snap-type: x mandatory;
            scroll-padding-inline: 14px;
            padding: 0 14px 8px;
            margin-inline: -14px;
            scrollbar-width: none;
          }

          .card-grid article {
            min-width: min(82vw, 340px);
            grid-template-columns: 88px minmax(0, 1fr);
            gap: 14px;
            padding: 12px;
          }

          .deck-card-link {
            min-width: min(82vw, 340px);
            scroll-snap-align: center;
          }

          .card-grid::-webkit-scrollbar,
          .trial-gallery::-webkit-scrollbar {
            display: none;
          }

          .card-grid img {
            width: 70px;
            height: 100px;
          }

          .card-grid article div {
            padding: 0;
          }

          .card-count {
            margin-bottom: 7px;
            padding: 4px 9px;
            font-size: 11px;
          }

          .card-index {
            right: 12px;
            top: 10px;
            font-size: 34px;
          }

          .stats article {
            min-height: auto;
            padding: 18px 20px;
          }

          .section {
            padding-top: 64px;
          }

          .section h2 {
            font-size: clamp(34px, 10vw, 46px);
          }

          .section-heading {
            text-align: left;
          }

          .section-heading::after {
            margin-left: 0;
          }

          .steps article {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .steps {
            grid-template-columns: 1fr;
            gap: 18px;
            padding: 0 0 0 22px;
          }

          .steps::before {
            inset: 0 auto 0 0;
            width: 2px;
            height: auto;
          }

          .steps article {
            position: relative;
            padding: 0 0 0 16px;
          }

          .steps span {
            width: 44px;
            height: 44px;
            font-size: 18px;
            margin-left: -38px;
          }

          .role-list {
            justify-content: stretch;
          }

          .role-list article {
            flex-basis: 100%;
            max-width: none;
            border-radius: 24px;
          }

          .team-strip article {
            grid-template-columns: 34px 1fr auto;
            gap: 12px;
            padding: 14px 0;
          }

          .team-strip h3 {
            font-size: 22px;
          }

          .team-strip time {
            grid-column: 3;
            justify-self: end;
            min-width: auto;
            min-height: 32px;
            margin-top: 0;
            font-size: 15px;
          }

          .image-section picture {
            aspect-ratio: 4 / 3;
          }

          .trial-gallery {
            display: flex;
            overflow-x: auto;
            overscroll-behavior-x: contain;
            scroll-snap-type: x mandatory;
            scroll-padding-inline: 14px;
            gap: 10px;
            margin-top: 24px;
            padding: 0 14px 8px;
            margin-inline: -14px;
            scrollbar-width: none;
          }

          .trial-gallery figure,
          .trial-gallery figure.wide,
          .trial-gallery figure.gallery-final {
            flex: 0 0 min(78vw, 310px);
            grid-column: auto;
            grid-row: auto;
            min-height: auto;
            aspect-ratio: 4 / 3;
            border-radius: 18px;
            scroll-snap-align: center;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-copy {
            animation: none;
          }

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
