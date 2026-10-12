import { Link } from 'react-router-dom'
import { EmcoinImage } from '@/components/cartoon/EmcoinImage'

import SiteHeader from '@/components/site/SiteHeader'
import { teamMembers } from './siteContent'

export default function AboutTeam() {
  return (
    <main className="site-page">
      <div className="site-wrap">
        <SiteHeader />

        <section className="page-hero">
          <span className="page-kicker">04 - Đội ngũ</span>
          <h1>Những người đứng sau EmCoin.</h1>
          <p>
            Dự án được phát triển trong khuôn khổ UPSHIFT 2025 với mong muốn đưa giáo dục cảm xúc đến gần hơn với học sinh Việt Nam.
          </p>
          <Link className="page-back" to="/about">Về trang chủ</Link>
        </section>

        <section className="team-grid">
          {teamMembers.map(([name, role], index) => (
            <article className="team-card" key={name}>
              <div className="avatar">
                <EmcoinImage src={`/emcoin/avatars/orbit/${index === 1 ? '03' : '01'}.webp`} alt="" />
              </div>
              <div className="copy">
                <h2>{name}</h2>
                <p>{role}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="credit-panel">
          <p>Avatar và icon giao diện dùng bộ EmCoin Friends mới.</p>
        </section>
      </div>

      <style>{`
        .site-page {
          --blue: #2f76ac;
          min-height: 100dvh;
          background: linear-gradient(180deg, #f9feff 0%, #effbff 44%, #ffffff 100%);
          color: var(--blue);
          font-family: var(--font-body), system-ui, sans-serif;
        }

        .site-wrap {
          width: min(1100px, calc(100% - 24px));
          margin: 0 auto;
          padding-bottom: 48px;
        }

        .page-hero {
          padding: 28px 0 16px;
        }

        .page-kicker {
          display: inline-flex;
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(255,255,255,.82);
          color: #ef5f8a;
          font-size: 12px;
          font-weight: 900;
        }

        .page-hero h1 {
          margin: 12px 0 0;
          font-size: clamp(38px, 6vw, 64px);
          line-height: .98;
          letter-spacing: -.03em;
        }

        .page-hero p {
          max-width: 760px;
          margin: 14px 0 0;
          color: rgba(31,95,146,.76);
          font-size: 17px;
          line-height: 1.62;
        }

        .page-back {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          margin: 6px 0 0 -10px;
          padding: 0 10px;
          border-radius: 10px;
          color: #1f5f92;
          font-weight: 900;
          text-decoration: none;
        }

        .page-back:hover {
          background: rgba(47, 118, 172, .08);
        }

        .team-grid {
          display: grid;
          gap: 12px;
        }

        .team-card {
          display: grid;
          grid-template-columns: 52px minmax(0, 1fr);
          gap: 14px;
          align-items: center;
          min-height: 92px;
          padding: 16px 18px;
          border: 1px solid rgba(47,118,172,.12);
          border-radius: 20px;
          background: rgba(255,255,255,.86);
          box-shadow: 0 14px 32px rgba(31,95,146,.08);
        }

        .avatar {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #d2f8ff;
          display: grid;
          place-items: center;
        }

        .avatar img {
          width: 38px;
          height: 38px;
          object-fit: contain;
        }

        .copy h2 {
          margin: 0;
          color: #ff6993;
          font-size: 22px;
        }

        .copy p {
          margin: 4px 0 0;
          color: rgba(31,95,146,.68);
          font-size: 14px;
        }

        .credit-panel {
          margin-top: 26px;
          padding: 16px 18px;
          border: 1px solid rgba(47,118,172,.12);
          border-radius: 20px;
          background: rgba(255,255,255,.86);
          color: rgba(31,95,146,.7);
          box-shadow: 0 14px 32px rgba(31,95,146,.08);
        }

        .credit-panel p {
          margin: 0;
          font-size: 13px;
          font-weight: 700;
        }

        @media (max-width: 640px) {
          .team-card {
            grid-template-columns: 44px minmax(0, 1fr) auto;
            padding: 14px;
            min-height: 80px;
          }

          .avatar {
            width: 44px;
            height: 44px;
          }

          .avatar img {
            width: 32px;
            height: 32px;
          }

          .copy h2 {
            font-size: 18px;
          }
        }
      `}</style>
    </main>
  )
}

