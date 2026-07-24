import { Link } from 'react-router-dom'

import SiteHeader from '@/components/site/SiteHeader'
import { impactStats } from './siteContent'

const feedbacks = [
  '“Giống ma sói.”',
  '“Có thể hòa nhập cùng các bạn.”',
  '“Sặc sỡ hơn, đẹp hơn.”',
  '“Vui vẻ.”',
  '“Được trò chuyện.”',
  '“Mong đợi lần sau.”',
]

export default function AboutImpact() {
  return (
    <main className="site-page">
      <div className="site-wrap">
        <SiteHeader />

        <section className="page-hero">
          <span className="page-kicker">03 - Tác động</span>
          <h1>Số liệu pilot cho thấy game đủ vui để người chơi muốn quay lại.</h1>
          <p>
            EmCoin không chỉ là một bộ thẻ đẹp. Nó được kiểm tra như một trải nghiệm thật: người chơi hiểu nội dung, có cảm giác thoải mái và sẵn sàng giới thiệu cho người khác.
          </p>
          <Link className="page-back" to="/about">Về trang chủ</Link>
        </section>

        <section className="stats-grid">
          {impactStats.map(([value, label, text]) => (
            <article className="stat-card" key={label}>
              <strong>{value}</strong>
              <b>{label}</b>
              <p>{text}</p>
            </article>
          ))}
        </section>

        <section className="feedback-panel">
          <h2>Người chơi nói gì?</h2>
          <div className="feedback-grid">
            {feedbacks.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
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

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .stat-card {
          min-height: 170px;
          padding: 18px;
          border: 1px solid rgba(47,118,172,.12);
          border-radius: 20px;
          background: rgba(255,255,255,.86);
          box-shadow: 0 14px 32px rgba(31,95,146,.08);
        }

        .stat-card strong {
          display: block;
          color: var(--pink);
          font-size: clamp(30px, 4vw, 46px);
          line-height: .95;
        }

        .stat-card b {
          display: block;
          margin-top: 4px;
          font-size: 20px;
        }

        .stat-card p {
          margin: 10px 0 0;
          color: rgba(31,95,146,.72);
          font-size: 13px;
          line-height: 1.5;
        }

        .feedback-panel {
          margin-top: 26px;
          padding: 20px;
          border: 1px solid rgba(47,118,172,.12);
          border-radius: 24px;
          background: rgba(210,248,255,.56);
        }

        .feedback-panel h2 {
          margin: 0;
          font-size: 28px;
        }

        .feedback-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 14px;
        }

        .feedback-grid span {
          display: inline-flex;
          padding: 10px 14px;
          border: 1px solid rgba(47,118,172,.12);
          border-radius: 999px;
          background: rgba(255,255,255,.86);
          color: rgba(31,95,146,.76);
          font-size: 13px;
          font-weight: 700;
        }

        @media (max-width: 980px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  )
}

