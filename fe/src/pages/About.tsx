import { useEffect } from 'react'

export default function About() {
  useEffect(() => {
    document.title = 'CoinEm — Về dự án'
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Hanken+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        /* ── Variables ───────────────────────────────── */
        .ab-root {
          --ab-bg: #F6F1E7;
          --ab-surface: #FFFDF8;
          --ab-surface2: #F1EADB;
          --ab-ink: #211F19;
          --ab-ink-soft: #56534A;
          --ab-ink-faint: #8A8576;
          --ab-line: #DED5C3;
          --ab-line-soft: #EAE3D4;
          --ab-base: #D4507A;
          --ab-base-soft: #F9E0EA;
          --ab-biz: #1A6B9E;
          --ab-biz-soft: #DBF0F7;
          --ab-loc: #C48A14;
          --ab-loc-soft: #FBF0D4;
          --ab-core: #4A4842;
          --ab-core-soft: #E6E0D2;
        }

        /* ── Base ─────────────────────────────────────── */
        .ab-root * { box-sizing: border-box; }
        .ab-root { background: var(--ab-bg); color: var(--ab-ink); font-family: "Hanken Grotesk", sans-serif; font-size: 16px; line-height: 1.7; -webkit-font-smoothing: antialiased; overflow-x: hidden; }

        .ab-wrap { max-width: 920px; margin: 0 auto; padding: 0 28px 100px; }

        /* ── Header ───────────────────────────────────── */
        .ab-header { padding: 64px 0 24px; }
        .ab-eyebrow { font-family: "JetBrains Mono", monospace; font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: var(--ab-base); margin: 0 0 16px; }
        .ab-h1 { font-family: "Fraunces", serif; font-weight: 600; font-size: clamp(30px, 7vw, 58px); line-height: 1.05; letter-spacing: -.015em; margin: 0 0 16px; }
        .ab-h1 em { font-style: italic; color: var(--ab-base); }
        .ab-lede { font-size: clamp(15px, 3vw, 18px); color: var(--ab-ink-soft); max-width: 62ch; margin: 0; }
        .ab-meta { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 24px; font-family: "JetBrains Mono", monospace; font-size: 12px; color: var(--ab-ink-faint); }
        .ab-meta b { color: var(--ab-ink-soft); font-weight: 500; }

        /* ── TOC ──────────────────────────────────────── */
        .ab-toc { position: sticky; top: 0; z-index: 5; background: rgba(246,241,231,.93); backdrop-filter: blur(8px); border-bottom: 1px solid var(--ab-line); display: flex; gap: 4px; padding: 10px 0; margin-bottom: 4px; overflow-x: auto; white-space: nowrap; scrollbar-width: none; }
        .ab-toc::-webkit-scrollbar { display: none; }
        .ab-toc a { font-family: "JetBrains Mono", monospace; font-size: 11.5px; color: var(--ab-ink-soft); text-decoration: none; padding: 5px 11px; border-radius: 8px; transition: .15s; flex-shrink: 0; }
        .ab-toc a:hover { background: var(--ab-base-soft); color: var(--ab-base); }

        /* ── Section ──────────────────────────────────── */
        .ab-section { padding: 44px 0; border-bottom: 1px solid var(--ab-line-soft); }
        .ab-snum { font-family: "JetBrains Mono", monospace; font-size: 12px; color: var(--ab-base); letter-spacing: .06em; margin: 0 0 2px; }
        .ab-h2 { font-family: "Fraunces", serif; font-weight: 500; font-size: clamp(22px, 4vw, 30px); letter-spacing: -.01em; margin: 4px 0 12px; line-height: 1.2; scroll-margin-top: 60px; }
        .ab-h3 { font-weight: 600; font-size: 15px; margin: 22px 0 8px; }
        .ab-p { margin: 0 0 12px; color: var(--ab-ink-soft); }
        .ab-p strong { color: var(--ab-ink); font-weight: 600; }

        /* ── Note ─────────────────────────────────────── */
        .ab-note { background: var(--ab-surface); border: 1px solid var(--ab-line); border-left: 4px solid var(--ab-loc); border-radius: 0 12px 12px 0; padding: 16px 18px; margin: 14px 0; }
        .ab-note .ab-lbl { font-family: "JetBrains Mono", monospace; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--ab-loc); margin-bottom: 8px; }
        .ab-note .ab-p { font-size: 14px; margin: 0 0 6px; }
        .ab-note .ab-p:last-child { margin: 0; }

        /* ── Tables ───────────────────────────────────── */
        .ab-tbl-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 8px 0; border-radius: 12px; border: 1px solid var(--ab-line); }
        .ab-tbl { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 400px; }
        .ab-tbl th { text-align: left; font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--ab-ink-faint); padding: 10px 14px 10px; border-bottom: 1px solid var(--ab-line); background: var(--ab-surface2); }
        .ab-tbl td { padding: 11px 14px; border-bottom: 1px solid var(--ab-line-soft); vertical-align: top; color: var(--ab-ink-soft); word-break: break-word; }
        .ab-tbl tr:last-child td { border-bottom: none; }
        .ab-tbl td:first-child { font-family: "JetBrains Mono", monospace; font-size: 12.5px; font-weight: 500; color: var(--ab-ink); min-width: 140px; }
        .ab-grp td { font-family: "JetBrains Mono", monospace; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--ab-base); padding-top: 18px; border-bottom: none; font-weight: 500; background: var(--ab-surface2); }

        /* ── Layers ───────────────────────────────────── */
        .ab-layers { display: flex; flex-direction: column; gap: 8px; margin: 12px 0; }
        .ab-layer { border-radius: 12px; padding: 14px 18px; border: 1px solid; }
        .ab-layer .ab-h3 { margin: 0 0 3px; font-size: 14px; }
        .ab-layer .ab-p { margin: 0; font-size: 13px; }
        .ab-layer-1 { background: var(--ab-core-soft); border-color: #C9C1B0; }
        .ab-layer-1 .ab-h3 { color: #3A382F; } .ab-layer-1 .ab-p { color: #7A766A; }
        .ab-layer-2 { background: var(--ab-loc-soft); border-color: #D9BE84; }
        .ab-layer-2 .ab-h3 { color: #8A5E0A; } .ab-layer-2 .ab-p { color: #9A6A12; }
        .ab-layer-3 { background: var(--ab-biz-soft); border-color: #7FBBC4; }
        .ab-layer-3 .ab-h3 { color: #0D5C8A; } .ab-layer-3 .ab-p { color: #1A6B9E; }

        /* ── Stats ────────────────────────────────────── */
        .ab-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin: 18px 0; }
        .ab-stat { background: var(--ab-surface); border: 1px solid var(--ab-line); border-radius: 12px; padding: 18px 14px; text-align: center; }
        .ab-stat .ab-num { font-family: "Fraunces", serif; font-size: clamp(28px, 6vw, 36px); font-weight: 600; color: var(--ab-base); line-height: 1; margin-bottom: 6px; }
        .ab-stat .ab-desc { font-size: 12.5px; color: var(--ab-ink-soft); line-height: 1.4; }

        /* ── Roles ────────────────────────────────────── */
        .ab-roles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; }
        .ab-role { background: var(--ab-surface); border: 1px solid var(--ab-line); border-radius: 12px; padding: 12px 14px; display: flex; align-items: flex-start; gap: 10px; }
        .ab-role-icon { font-size: 20px; line-height: 1; flex-shrink: 0; margin-top: 1px; }
        .ab-role-name { font-weight: 600; font-size: 13.5px; color: var(--ab-ink); }
        .ab-role-desc { font-size: 12.5px; color: var(--ab-ink-soft); margin: 2px 0 0; line-height: 1.4; }

        /* ── Coins ────────────────────────────────────── */
        .ab-coins { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin: 12px 0; }
        .ab-coin { background: var(--ab-surface); border: 1px solid var(--ab-line); border-radius: 12px; padding: 16px 12px; text-align: center; }
        .ab-coin img { width: 44px; height: 44px; object-fit: contain; margin-bottom: 8px; }
        .ab-coin .ab-coin-name { font-family: "JetBrains Mono", monospace; font-size: 12px; font-weight: 500; color: var(--ab-ink); margin-bottom: 4px; }
        .ab-coin .ab-coin-desc { font-size: 12.5px; color: var(--ab-ink-soft); line-height: 1.4; }

        /* ── Hero image ───────────────────────────────── */
        .ab-hero { position: relative; border-radius: 14px; overflow: hidden; margin: 18px 0; aspect-ratio: 16/7; }
        .ab-hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .ab-hero-overlay { position: absolute; inset: 0; background: linear-gradient(to right, rgba(246,241,231,.88) 45%, rgba(246,241,231,.2) 80%, transparent); display: flex; align-items: center; padding: 0 28px; }
        .ab-hero-content { max-width: 280px; }
        .ab-hero-content img { height: 48px; object-fit: contain; display: block; margin-bottom: 8px; }
        .ab-hero-tagline { font-size: 14px; color: var(--ab-ink-soft); margin: 0; }

        /* ── Avatars ──────────────────────────────────── */
        .ab-avatars { display: flex; gap: 8px; margin: 14px 0; flex-wrap: wrap; }
        .ab-avatar { width: 48px; height: 48px; border-radius: 50%; background: #EAE3D4; border: 2px solid var(--ab-line); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
        .ab-avatar img { width: 34px; height: 34px; object-fit: contain; }

        /* ── Phases ───────────────────────────────────── */
        .ab-phases { display: flex; flex-direction: column; gap: 8px; margin: 14px 0; }
        .ab-phase-group { background: var(--ab-surface); border: 1px solid var(--ab-line); border-radius: 12px; overflow: hidden; }
        .ab-phase-header { padding: 11px 16px; font-family: "JetBrains Mono", monospace; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; display: flex; align-items: center; gap: 8px; font-weight: 500; }
        .ab-phase-body { border-top: 1px solid rgba(0,0,0,.08); }
        .ab-phase-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 16px; border-bottom: 1px solid var(--ab-line-soft); font-size: 13.5px; }
        .ab-phase-item:last-child { border-bottom: none; }
        .ab-phase-tag { font-family: "JetBrains Mono", monospace; font-size: 10.5px; background: var(--ab-surface2); color: var(--ab-ink-faint); padding: 2px 7px; border-radius: 6px; flex-shrink: 0; margin-top: 3px; line-height: 1.5; }
        .ab-phase-text { color: var(--ab-ink-soft); line-height: 1.5; }
        .ab-phase-text strong { color: var(--ab-ink); font-weight: 600; }

        /* ── Team ─────────────────────────────────────── */
        .ab-team-card { background: var(--ab-surface); border: 1px solid var(--ab-line); border-radius: 18px; overflow: hidden; max-width: 320px; width: 100%; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
        .ab-team-card img { width: 100%; height: auto; display: block; }
        .ab-team-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-top: 10px; }
        .ab-member { background: var(--ab-surface); border: 1px solid var(--ab-line); border-radius: 12px; padding: 14px 10px 12px; text-align: center; }
        .ab-member-emoji { font-size: 20px; margin-bottom: 6px; }
        .ab-member-name { font-weight: 600; font-size: 12.5px; color: var(--ab-ink); line-height: 1.3; }
        .ab-member-year { font-family: "JetBrains Mono", monospace; font-size: 11px; color: var(--ab-base); margin-top: 3px; }
        .ab-member-role { font-size: 11.5px; color: var(--ab-ink-soft); margin-top: 2px; line-height: 1.35; }

        /* ── Quote ────────────────────────────────────── */
        .ab-golden { margin-top: 44px; text-align: center; padding: 32px 24px; border: 1px dashed var(--ab-line); border-radius: 14px; background: var(--ab-surface); }
        .ab-golden p { font-family: "Fraunces", serif; font-style: italic; font-size: clamp(16px, 3.5vw, 21px); line-height: 1.5; color: var(--ab-ink); max-width: 52ch; margin: 0 auto; }
        .ab-golden p b { font-style: normal; font-weight: 600; color: var(--ab-base); }

        /* ── Footer ───────────────────────────────────── */
        .ab-footer { margin-top: 36px; text-align: center; font-family: "JetBrains Mono", monospace; font-size: 11px; color: var(--ab-ink-faint); letter-spacing: .04em; padding-bottom: 40px; line-height: 1.8; }
        .ab-footer a { color: var(--ab-base); text-decoration: none; }
        .ab-footer a:hover { text-decoration: underline; }

        /* ── Reveal animation ─────────────────────────── */
        @media (prefers-reduced-motion: no-preference) {
          .ab-reveal { opacity: 0; transform: translateY(12px); animation: ab-rise .65s cubic-bezier(.2,.7,.3,1) forwards; }
          @keyframes ab-rise { to { opacity: 1; transform: none; } }
        }

        /* ── Mobile ≤ 600px ───────────────────────────── */
        @media (max-width: 600px) {
          .ab-wrap { padding: 0 16px 80px; }
          .ab-header { padding: 40px 0 20px; }
          .ab-stats { grid-template-columns: 1fr 1fr; }
          .ab-stats .ab-stat:nth-child(3) { grid-column: 1 / -1; }
          .ab-roles { grid-template-columns: 1fr; }
          .ab-coins { grid-template-columns: 1fr 1fr; }
          .ab-coins .ab-coin:nth-child(3) { grid-column: 1 / -1; }
          .ab-team-grid { grid-template-columns: 1fr; }
          .ab-hero { aspect-ratio: 4/3; }
          .ab-hero-overlay { background: linear-gradient(to bottom, rgba(246,241,231,.92) 0%, rgba(246,241,231,.5) 60%, transparent); align-items: flex-start; padding: 20px 18px; }
          .ab-phase-item { flex-direction: column; gap: 5px; }
          .ab-phase-tag { align-self: flex-start; }
        }

        /* ── Tablet 601–860px ─────────────────────────── */
        @media (min-width: 601px) and (max-width: 860px) {
          .ab-wrap { padding: 0 22px 90px; }
          .ab-roles { grid-template-columns: 1fr; }
          .ab-stats .ab-stat:nth-child(3) { grid-column: auto; }
        }
      `}</style>

      <div className="ab-root">
        <div className="ab-wrap">

          {/* ── HEADER ───────────────────────────────── */}
          <header className="ab-header ab-reveal">
            <p className="ab-eyebrow">Dự án UPSHIFT · AIESEC Việt Nam × UNICEF</p>
            <h1 className="ab-h1">CoinEm — <em>Đồng tiền tử tế</em></h1>
            <p className="ab-lede">
              Bộ thẻ bài nhập vai giúp học sinh 10–19 tuổi học cách nhận diện, gọi tên và chia sẻ cảm xúc trong một không gian an toàn, gần gũi cùng bạn bè.
            </p>
            <div className="ab-meta">
              <span><b>Đối tượng:</b> 10–19 tuổi</span>
              <span><b>Phương pháp:</b> Game-Based Learning</span>
              <span><b>Người chơi:</b> 4–8 người</span>
              <span><b>Địa điểm:</b> TP. Hồ Chí Minh</span>
              <span><b>Giai đoạn:</b> 2025–2026</span>
            </div>
          </header>

          {/* ── TOC ──────────────────────────────────── */}
          <nav className="ab-toc">
            <a href="#ve-du-an">01 · Về dự án</a>
            <a href="#van-de">02 · Vấn đề</a>
            <a href="#cach-choi">03 · Cách chơi</a>
            <a href="#vai-tro">04 · Vai trò &amp; Đồng xu</a>
            <a href="#thu-nghiem">05 · Thử nghiệm</a>
            <a href="#doi-ngu">06 · Đội ngũ</a>
          </nav>

          {/* ── 01 — VỀ DỰ ÁN ───────────────────────── */}
          <section className="ab-section ab-reveal" id="ve-du-an">
            <p className="ab-snum">01</p>
            <h2 className="ab-h2">Về dự án</h2>

            <div className="ab-hero">
              <img src="/ingame_background.png" alt="CoinEm gameplay" />
              <div className="ab-hero-overlay">
                <div className="ab-hero-content">
                  <img src="/emcoin_logo.png" alt="CoinEm" />
                  <p className="ab-hero-tagline">Kết nối cảm xúc — Chia sẻ thật lòng</p>
                </div>
              </div>
            </div>

            <p className="ab-p">
              CoinEm là <strong>bộ thẻ bài giáo dục cảm xúc</strong> được thiết kế cho học sinh vị thành niên, sử dụng hình thức nhập vai và phản tư nhóm. Mỗi lượt chơi, một người chia sẻ câu chuyện thật của mình — cả nhóm lắng nghe, đồng cảm và phản hồi qua hệ thống đồng xu.
            </p>
            <p className="ab-p">
              Ý tưởng lấy cảm hứng từ bộ phim <strong>Inside Out</strong> và <strong>Bánh xe cảm xúc của Plutchik</strong>, biến thành trò chơi tương tác nhóm, đặt học sinh vào hành trình khám phá cảm xúc của chính mình.
            </p>

            <div className="ab-layers">
              <div className="ab-layer ab-layer-1">
                <h3 className="ab-h3">Thẻ bài &amp; Đồng xu</h3>
                <p className="ab-p">Thẻ tình huống, cảm xúc, phản tư, bí kíp ôm — mỗi bộ thẻ kích hoạt một giai đoạn chia sẻ. Đồng xu là công cụ thể hiện sự trân trọng và đồng cảm.</p>
              </div>
              <div className="ab-layer ab-layer-2">
                <h3 className="ab-h3">Nhập vai có chủ đích</h3>
                <p className="ab-p">Mỗi người chơi giữ một vai trò riêng — người lắng nghe, người kết nối, người dẫn lối — xây dựng kỹ năng xã hội qua thực hành thực tế.</p>
              </div>
              <div className="ab-layer ab-layer-3">
                <h3 className="ab-h3">Phản tư &amp; Chăm sóc bản thân</h3>
                <p className="ab-p">Sau mỗi vòng chia sẻ, nhóm cùng thực hành một hành động chăm sóc thể chất — ôm, vỗ vai, hít thở — gắn kết cảm xúc với cơ thể.</p>
              </div>
            </div>
          </section>

          {/* ── 02 — VẤN ĐỀ ─────────────────────────── */}
          <section className="ab-section ab-reveal" id="van-de">
            <p className="ab-snum">02</p>
            <h2 className="ab-h2">Vấn đề chúng tôi giải quyết</h2>
            <p className="ab-p">
              Theo khảo sát Sức khỏe tâm thần thanh thiếu niên toàn quốc 2022, tình trạng rối loạn cảm xúc ở học sinh đang ở mức đáng lo ngại — trong khi phần lớn không có cơ hội tiếp cận hỗ trợ chuyên môn.
            </p>

            <div className="ab-stats">
              <div className="ab-stat">
                <div className="ab-num">1/5</div>
                <div className="ab-desc">thanh thiếu niên có vấn đề sức khỏe tâm thần trong 12 tháng</div>
              </div>
              <div className="ab-stat">
                <div className="ab-num">8.4%</div>
                <div className="ab-desc">trong số đó được tiếp cận dịch vụ chuyên môn</div>
              </div>
              <div className="ab-stat">
                <div className="ab-num">40%</div>
                <div className="ab-desc">học sinh cấp 2 có dấu hiệu trầm cảm tại TP.HCM</div>
              </div>
            </div>

            <h3 className="ab-h3">Ba nỗi đau lớn nhất</h3>
            <div className="ab-tbl-wrap">
              <table className="ab-tbl">
                <thead><tr><th>Vấn đề</th><th>Biểu hiện</th></tr></thead>
                <tbody>
                  <tr>
                    <td>Khó nhận diện cảm xúc</td>
                    <td>Không gọi được tên cảm xúc → không ứng phó được → tích tụ thành rối loạn hành vi.</td>
                  </tr>
                  <tr>
                    <td>Áp lực thành tích</td>
                    <td>31.7% học sinh THPT có triệu chứng trầm cảm mức vừa trở lên do áp lực học tập, thi cử.</td>
                  </tr>
                  <tr>
                    <td>Ngại chia sẻ với người lớn</td>
                    <td>Học sinh ưu tiên chia sẻ với bạn bè nhưng bạn bè thiếu kỹ năng lắng nghe.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="ab-note">
              <p className="ab-lbl">Gốc rễ</p>
              <p className="ab-p">Nỗi đau lớn nhất của trẻ vị thành niên là bị kẹt giữa áp lực học tập từ gia đình–xã hội và thiếu sự đồng hành, thấu hiểu về mặt cảm xúc. CoinEm tạo ra không gian trung lập — nơi cảm xúc được phép tồn tại mà không bị phán xét.</p>
            </div>
          </section>

          {/* ── 03 — CÁCH CHƠI ───────────────────────── */}
          <section className="ab-section ab-reveal" id="cach-choi">
            <p className="ab-snum">03</p>
            <h2 className="ab-h2">Cách chơi</h2>
            <p className="ab-p">
              Mỗi vòng chơi gồm <strong>16 giai đoạn</strong> chia thành 4 màn, xoay quanh một <strong>Người Trao Gửi</strong> — người chia sẻ câu chuyện cảm xúc thật của mình trong vòng đó.
            </p>

            <div className="ab-phases">
              <div className="ab-phase-group">
                <div className="ab-phase-header" style={{ background: '#2A2A3A', color: '#B0B4CC' }}>
                  <span>🌙</span> Màn 1 — Đêm
                </div>
                <div className="ab-phase-body">
                  {([
                    ['role-reveal', 'Mỗi người xem bí mật vai trò của mình trong vòng này'],
                    ['night', 'Đêm bắt đầu — cả nhóm nhắm mắt'],
                    ['healer-turn', 'Người Chữa Lành chọn 1 người để bảo vệ khỏi bị im lặng'],
                    ['silencer-turn', 'Người Im Lặng chọn 1 người sẽ không thể phát biểu vòng này'],
                  ] as [string, string][]).map(([tag, desc]) => (
                    <div key={tag} className="ab-phase-item">
                      <span className="ab-phase-tag">{tag}</span>
                      <span className="ab-phase-text">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ab-phase-group">
                <div className="ab-phase-header" style={{ background: '#FFF4F9', color: '#C04575' }}>
                  <span>💌</span> Màn 2 — Chia sẻ
                </div>
                <div className="ab-phase-body">
                  {([
                    ['situation-card', 'Người Trao Gửi vuốt và chọn 1 thẻ tình huống'],
                    ['emotion-card', 'Người Trao Gửi chọn 1 thẻ cảm xúc — cả 2 thẻ hiện trên bàn'],
                    ['story-telling', 'Người Trao Gửi kể câu chuyện thật trong 60 giây'],
                  ] as [string, string][]).map(([tag, desc]) => (
                    <div key={tag} className="ab-phase-item">
                      <span className="ab-phase-tag">{tag}</span>
                      <span className="ab-phase-text">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ab-phase-group">
                <div className="ab-phase-header" style={{ background: '#F0F9FF', color: '#1A6B9E' }}>
                  <span>🔗</span> Màn 3 — Phản hồi &amp; Phản tư
                </div>
                <div className="ab-phase-body">
                  {([
                    ['group-response', 'Nhóm phản hồi; NTG tặng coin cho người phản hồi hay nhất'],
                    ['reflection-card', 'NTG chọn thẻ phản tư phù hợp với cảm nhận của mình'],
                    ['reflection-sharing', 'NTG chia sẻ thêm từ thẻ phản tư vừa chọn'],
                    ['selfcare-card', 'Người Dẫn Lối (hoặc NTG) chọn thẻ bí kíp chăm sóc'],
                    ['hug-action', 'Cả nhóm cùng thực hiện hành động kết nối — ôm, vỗ vai'],
                  ] as [string, string][]).map(([tag, desc]) => (
                    <div key={tag} className="ab-phase-item">
                      <span className="ab-phase-tag">{tag}</span>
                      <span className="ab-phase-text">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ab-phase-group">
                <div className="ab-phase-header" style={{ background: '#FFFBEB', color: '#B07A0E' }}>
                  <span>🏆</span> Màn 4 — Kết thúc vòng
                </div>
                <div className="ab-phase-body">
                  {([
                    ['guess-silencer', 'Mọi người vote đoán ai là Người Im Lặng vòng này'],
                    ['reveal-silencer', 'Tiết lộ kết quả vote + toàn bộ vai trò của từng người'],
                    ['give-coins', 'Người chơi tự do tặng coin đỏ và vàng cho nhau'],
                    ['reward', 'Tổng kết — thưởng coin vàng theo vai trò → vòng tiếp theo'],
                  ] as [string, string][]).map(([tag, desc]) => (
                    <div key={tag} className="ab-phase-item">
                      <span className="ab-phase-tag">{tag}</span>
                      <span className="ab-phase-text">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── 04 — VAI TRÒ & ĐỒNG XU ──────────────── */}
          <section className="ab-section ab-reveal" id="vai-tro">
            <p className="ab-snum">04</p>
            <h2 className="ab-h2">Vai trò &amp; Đồng xu</h2>

            <h3 className="ab-h3">7 vai trò</h3>
            <p className="ab-p">Mỗi vòng mỗi người được phân ngẫu nhiên một vai. Vai trò tạo ra cấu trúc tương tác — ai lắng nghe, ai bảo vệ, ai đặt câu hỏi, ai hướng dẫn.</p>

            <div className="ab-roles">
              {([
                ['🎭', 'Quản Trò', 'Điều hành trò chơi, đọc hướng dẫn cho nhóm'],
                ['💌', 'Người Trao Gửi', 'Chia sẻ câu chuyện cảm xúc thật của mình'],
                ['💚', 'Người Chữa Lành', 'Mỗi đêm bảo vệ 1 người khỏi bị im lặng'],
                ['🤐', 'Người Im Lặng', 'Mỗi đêm chọn 1 người không thể phát biểu'],
                ['🔗', 'Người Kết Nối', 'Phản hồi gắn kết câu chuyện với cả nhóm'],
                ['✨', 'Người Gợi Mở', 'Đặt câu hỏi chạm sâu vào cảm xúc của NTG'],
                ['🗺️', 'Người Dẫn Lối', 'Hướng dẫn phần chăm sóc bản thân cuối vòng'],
              ] as [string, string, string][]).map(([icon, name, desc]) => (
                <div key={name} className="ab-role">
                  <span className="ab-role-icon">{icon}</span>
                  <div>
                    <div className="ab-role-name">{name}</div>
                    <p className="ab-role-desc">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="ab-h3">3 loại đồng xu</h3>
            <p className="ab-p">Đồng xu không phải điểm số — đây là ngôn ngữ thể hiện sự <strong>trân trọng, đồng cảm và ghi nhận</strong> giữa người chơi.</p>

            <div className="ab-coins">
              <div className="ab-coin">
                <img src="/coins/do.png" alt="Coin đỏ" />
                <div className="ab-coin-name">Coin Đỏ 🔴</div>
                <p className="ab-coin-desc">Nhận 3 coin mỗi vòng. Tặng cho người khác để thể hiện sự đồng cảm.</p>
              </div>
              <div className="ab-coin">
                <img src="/coins/vang.png" alt="Coin vàng" />
                <div className="ab-coin-name">Coin Vàng 💛</div>
                <p className="ab-coin-desc">Tích lũy theo thời gian. Nhận khi hoàn thành tốt vai trò.</p>
              </div>
              <div className="ab-coin">
                <img src="/coins/xanh.png" alt="Coin xanh" />
                <div className="ab-coin-name">Coin Xanh 💚</div>
                <p className="ab-coin-desc">Nhận được khi người khác tặng coin cho bạn.</p>
              </div>
            </div>

            <h3 className="ab-h3">Cơ chế thưởng coin vàng</h3>
            <div className="ab-tbl-wrap">
              <table className="ab-tbl">
                <thead><tr><th>Hành động</th><th>Thưởng</th></tr></thead>
                <tbody>
                  <tr className="ab-grp"><td colSpan={2}>Người Trao Gửi</td></tr>
                  <tr><td>Hoàn thành chia sẻ phản tư</td><td>+5 💛</td></tr>
                  <tr className="ab-grp"><td colSpan={2}>Vai trò hỗ trợ</td></tr>
                  <tr><td>Được NTG vote phản hồi hay nhất</td><td>+5 💛</td></tr>
                  <tr><td>Chỉ phản hồi (không được vote)</td><td>+2 💛</td></tr>
                  <tr><td>Bị mute — không thể phản hồi</td><td>0 💛</td></tr>
                  <tr className="ab-grp"><td colSpan={2}>Người Im Lặng</td></tr>
                  <tr><td>Không bị nhóm đoán ra</td><td>+7 💛</td></tr>
                  <tr><td>Bị nhóm đoán ra</td><td>+2 💛</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ── 05 — THỬ NGHIỆM ──────────────────────── */}
          <section className="ab-section ab-reveal" id="thu-nghiem">
            <p className="ab-snum">05</p>
            <h2 className="ab-h2">Thử nghiệm &amp; Đánh giá</h2>
            <p className="ab-p">
              CoinEm đang trong giai đoạn <strong>thử nghiệm thí điểm</strong> tại các trường học, trung tâm và cơ sở thanh thiếu niên tại TP.HCM. Mỗi buổi chơi 60–90 phút, có cộng tác viên tâm lý/CTXH được tập huấn hỗ trợ.
            </p>

            <h3 className="ab-h3">Mục tiêu đo lường</h3>
            <div className="ab-tbl-wrap">
              <table className="ab-tbl">
                <thead><tr><th>Câu hỏi</th><th>Công cụ đo</th></tr></thead>
                <tbody>
                  <tr>
                    <td>Người dùng có hiểu và tự thực hiện được không?</td>
                    <td>3 mức: tự thực hiện / cần hỗ trợ / chưa thực hiện được</td>
                  </tr>
                  <tr>
                    <td>Nội dung có hữu ích và phù hợp không?</td>
                    <td>Hữu ích &amp; phù hợp / Bình thường / Không hữu ích</td>
                  </tr>
                  <tr>
                    <td>Năng lực cảm xúc–xã hội thay đổi thế nào?</td>
                    <td>Bảng hỏi SECQ 25 câu (thang Likert 6 bậc) Pre/Post</td>
                  </tr>
                  <tr>
                    <td>Trải nghiệm xuyên suốt buổi chơi như thế nào?</td>
                    <td>Nhật ký cảm xúc ngắn sau mỗi lượt</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="ab-note">
              <p className="ab-lbl">Cam kết an toàn</p>
              <p className="ab-p">Mọi dữ liệu được xử lý ẩn danh, chỉ dùng cho mục đích nghiên cứu. Học sinh có thể dừng tham gia bất kỳ lúc nào mà không ảnh hưởng đến quyền lợi học tập.</p>
            </div>

            <h3 className="ab-h3">Ứng dụng kỹ thuật số</h3>
            <p className="ab-p">
              Song song với bộ thẻ vật lý, CoinEm có phiên bản <strong>web app</strong> cho phép chơi trực tuyến hoặc trong cùng phòng. Đồng xu, vai trò và lịch sử chia sẻ được đồng bộ realtime.
            </p>

            <div className="ab-avatars">
              {['Bear.png','Bird - Blue.png','Bunny.png','Cat.png','Girl 1.png','Boy 1.png','Bird.png','Bunny 2.png'].map(name => (
                <div key={name} className="ab-avatar">
                  <img src={`/cartoon/icons/avatars/${name}`} alt="" />
                </div>
              ))}
            </div>
            <p className="ab-p" style={{ fontSize: 12.5, marginTop: 4 }}>4–8 người chơi · Mỗi người một avatar · Mỗi vòng một vai mới</p>
          </section>

          {/* ── 06 — ĐỘI NGŨ ─────────────────────────── */}
          <section className="ab-section ab-reveal" id="doi-ngu">
            <p className="ab-snum">06</p>
            <h2 className="ab-h2">Đội ngũ</h2>
            <p className="ab-p">
              Nhóm dự án <strong>Đồng Tiền Tử Tế</strong> gồm 3 thành viên trẻ đến từ TP.HCM, cùng nhau xây dựng CoinEm trong khuôn khổ chương trình UPSHIFT 2025.
            </p>

            <div className="ab-team-card">
              <img src="/about.png" alt="Đội ngũ Đồng Tiền Tử Tế — CoinEm" />
            </div>

            <div className="ab-team-grid">
              {([
                ['⭐', 'Lê Trương Mỹ Ngọc', 'Trưởng nhóm', '2005'],
                ['🌟', 'Nguyễn Trần Bảo Nhi', 'Đồng đội', '2005'],
                ['🌸', 'Huỳnh Hồng Như', 'Đồng đội lý trí', '2006'],
              ] as [string, string, string, string][]).map(([emoji, name, role, year]) => (
                <div key={name} className="ab-member">
                  <div className="ab-member-emoji">{emoji}</div>
                  <div className="ab-member-name">{name}</div>
                  <div className="ab-member-year">{year}</div>
                  <div className="ab-member-role">{role}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── QUOTE ────────────────────────────────── */}
          <div className="ab-golden ab-reveal">
            <p>
              Mỗi câu chuyện đều xứng đáng được lắng nghe.<br />
              Mỗi cảm xúc đều xứng đáng được gọi tên.<br />
              <b>CoinEm</b> là không gian để cả hai điều đó xảy ra.
            </p>
          </div>

          {/* ── FOOTER ───────────────────────────────── */}
          <footer className="ab-footer">
            <p>Nhóm Dự án <b>Đồng Tiền Tử Tế</b> · UPSHIFT / AIESEC Việt Nam × UNICEF</p>
            <p>Liên hệ: <a href="mailto:emcoin.nnn@gmail.com">emcoin.nnn@gmail.com</a> · 0333 199 233</p>
          </footer>

        </div>
      </div>
    </>
  )
}
