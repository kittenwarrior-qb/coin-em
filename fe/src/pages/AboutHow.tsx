import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import SiteHeader from '@/components/site/SiteHeader'
import { playSteps, roleCards } from './siteContent'

export default function AboutHow() {
  return (
    <main className="site-page">
      <div className="site-wrap">
        <SiteHeader />

        <section className="page-hero">
          <span className="page-kicker">02 - Cách chơi</span>
          <h1>Vòng chơi rõ ràng, nhanh hiểu, dễ nhập vai.</h1>
          <p>
            EmCoin được thiết kế như một game intro có nhịp ngắn: nhận vai, chọn thẻ, chia sẻ và ghi nhận. Người mới nhìn vào là hiểu ngay mình phải làm gì.
          </p>
          <Link className="page-back" to="/about">Về trang chủ</Link>
        </section>

        <section className="step-grid">
          {playSteps.map(([step, title, text]) => (
            <article className="step-card" key={step}>
              <span>{step}</span>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </section>

        <section className="role-strip">
          {roleCards.map(([name, icon, color]) => (
            <article className="role-card" key={name} style={{ '--accent': color } as CSSProperties}>
              <div className="role-icon">
                <img src={icon} alt="" />
              </div>
              <h2>{name}</h2>
            </article>
          ))}
        </section>
      </div>

      <style>{`
        .site-page {
          --blue: #2f76ac;
          --pink: #ff6993;
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
          max-width: 740px;
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

        .step-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .step-card {
          min-height: 180px;
          padding: 18px;
          border: 1px solid rgba(47,118,172,.12);
          border-radius: 20px;
          background: rgba(255,255,255,.86);
          box-shadow: 0 14px 32px rgba(31,95,146,.08);
        }

        .step-card span {
          color: #ef5f8a;
          font-size: 13px;
          font-weight: 900;
        }

        .step-card h2 {
          margin: 12px 0 0;
          font-size: 24px;
        }

        .step-card p {
          margin: 8px 0 0;
          color: rgba(31,95,146,.72);
          font-size: 14px;
          line-height: 1.5;
        }

        .role-strip {
          display: grid;
          grid-template-columns: repeat(7, minmax(130px, 1fr));
          gap: 10px;
          margin-top: 26px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .role-strip::-webkit-scrollbar {
          display: none;
        }

        .role-card {
          padding: 14px;
          border: 1px solid color-mix(in srgb, var(--accent) 26%, white);
          border-radius: 18px;
          background: rgba(255,255,255,.86);
          box-shadow: 0 14px 32px rgba(31,95,146,.08);
          text-align: center;
        }

        .role-icon {
          display: grid;
          width: 56px;
          height: 56px;
          place-items: center;
          margin: 0 auto 10px;
          border-radius: 50%;
          background: color-mix(in srgb, var(--accent) 18%, white);
        }

        .role-icon img {
          width: 36px;
          height: 36px;
        }

        .role-card h2 {
          margin: 0;
          color: var(--accent);
          font-size: 17px;
        }

        @media (max-width: 980px) {
          .step-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .step-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  )
}
