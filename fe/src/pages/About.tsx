import { useEffect } from 'react'

export default function About() {
  useEffect(() => {
    document.title = 'CoinEm — Về dự án'
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Hanken+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        :root {
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

        .ab-wrap { max-width: 920px; margin: 0 auto; padding: 0 28px 100px; background: var(--ab-bg); min-height: 100vh; font-family: "Hanken Grotesk", sans-serif; font-size: 16px; line-height: 1.7; color: var(--ab-ink); -webkit-font-smoothing: antialiased; }

        .ab-header { padding: 72px 0 28px; }
        .ab-eyebrow { font-family: "JetBrains Mono", monospace; font-size: 12px; letter-spacing: .18em; text-transform: uppercase; color: var(--ab-base); margin: 0 0 18px; }
        .ab-h1 { font-family: "Fraunces", serif; font-weight: 600; font-size: clamp(36px, 6vw, 58px); line-height: 1.03; letter-spacing: -.015em; margin: 0 0 18px; }
        .ab-h1 em { font-style: italic; color: var(--ab-base); }
        .ab-lede { font-size: 18px; color: var(--ab-ink-soft); max-width: 62ch; margin: 0; }
        .ab-meta { display: flex; flex-wrap: wrap; gap: 8px 22px; margin-top: 30px; font-family: "JetBrains Mono", monospace; font-size: 12.5px; color: var(--ab-ink-faint); }
        .ab-meta b { color: var(--ab-ink-soft); font-weight: 500; }

        .ab-toc { position: sticky; top: 0; z-index: 5; background: rgba(246,241,231,.92); backdrop-filter: blur(8px); border-bottom: 1px solid var(--ab-line); display: flex; flex-wrap: wrap; gap: 6px; padding: 14px 0; margin-bottom: 8px; }
        .ab-toc a { font-family: "JetBrains Mono", monospace; font-size: 12.5px; color: var(--ab-ink-soft); text-decoration: none; padding: 6px 13px; border-radius: 8px; transition: .15s; }
        .ab-toc a:hover { background: var(--ab-base-soft); color: var(--ab-base); }

        .ab-section { padding: 50px 0; border-bottom: 1px solid var(--ab-line-soft); }
        .ab-snum { font-family: "JetBrains Mono", monospace; font-size: 13px; color: var(--ab-base); letter-spacing: .06em; margin: 0 0 2px; }
        .ab-h2 { font-family: "Fraunces", serif; font-weight: 500; font-size: 30px; letter-spacing: -.01em; margin: 6px 0 14px; line-height: 1.15; scroll-margin-top: 64px; }
        .ab-h3 { font-weight: 600; font-size: 16px; margin: 26px 0 8px; }
        .ab-p { margin: 0 0 14px; color: var(--ab-ink-soft); }
        .ab-p strong { color: var(--ab-ink); font-weight: 600; }

        .ab-note { background: var(--ab-surface); border: 1px solid var(--ab-line); border-left: 4px solid var(--ab-loc); border-radius: 0 12px 12px 0; padding: 18px 22px; margin: 16px 0; }
        .ab-note .ab-lbl { font-family: "JetBrains Mono", monospace; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--ab-loc); margin-bottom: 8px; }
        .ab-note .ab-p { font-size: 14.5px; margin: 0 0 8px; }
        .ab-note .ab-p:last-child { margin: 0; }

        .ab-tbl { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 14.5px; }
        .ab-tbl th { text-align: left; font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: 11.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--ab-ink-faint); padding: 0 14px 12px; border-bottom: 1px solid var(--ab-line); }
        .ab-tbl td { padding: 12px 14px; border-bottom: 1px solid var(--ab-line-soft); vertical-align: top; color: var(--ab-ink-soft); }
        .ab-tbl tr:last-child td { border-bottom: none; }
        .ab-tbl td:first-child { font-family: "JetBrains Mono", monospace; font-size: 13px; font-weight: 500; color: var(--ab-ink); white-space: nowrap; }
        .ab-grp td { font-family: "JetBrains Mono", monospace; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--ab-base); padding-top: 22px; border-bottom: none; font-weight: 500; }

        .ab-layers { display: flex; flex-direction: column; gap: 10px; margin: 14px 0; }
        .ab-layer { border-radius: 12px; padding: 16px 20px; border: 1px solid; }
        .ab-layer .ab-h3 { margin: 0 0 3px; font-size: 15px; }
        .ab-layer .ab-p { margin: 0; font-size: 13.5px; }
        .ab-layer-1 { background: var(--ab-core-soft); border-color: #C9C1B0; }
        .ab-layer-1 .ab-h3 { color: #3A382F; } .ab-layer-1 .ab-p { color: #7A766A; }
        .ab-layer-2 { background: var(--ab-loc-soft); border-color: #D9BE84; }
        .ab-layer-2 .ab-h3 { color: #8A5E0A; } .ab-layer-2 .ab-p { color: #9A6A12; }
        .ab-layer-3 { background: var(--ab-biz-soft); border-color: #7FBBC4; }
        .ab-layer-3 .ab-h3 { color: #0D5C8A; } .ab-layer-3 .ab-p { color: #1A6B9E; }

        .ab-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin: 20px 0; }
        .ab-stat { background: var(--ab-surface); border: 1px solid var(--ab-line); border-radius: 14px; padding: 20px 18px; text-align: center; }
        .ab-stat .ab-num { font-family: "Fraunces", serif; font-size: 36px; font-weight: 600; color: var(--ab-base); line-height: 1; margin-bottom: 6px; }
        .ab-stat .ab-desc { font-size: 13px; color: var(--ab-ink-soft); line-height: 1.4; }

        .ab-roles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 14px 0; }
        .ab-role { background: var(--ab-surface); border: 1px solid var(--ab-line); border-radius: 12px; padding: 14px 16px; display: flex; align-items: flex-start; gap: 12px; }
        .ab-role-icon { font-size: 22px; line-height: 1; flex-shrink: 0; margin-top: 2px; }
        .ab-role-name { font-weight: 600; font-size: 14px; color: var(--ab-ink); }
        .ab-role-desc { font-size: 13px; color: var(--ab-ink-soft); margin: 2px 0 0; line-height: 1.4; }

        .ab-coins { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin: 14px 0; }
        .ab-coin { background: var(--ab-surface); border: 1px solid var(--ab-line); border-radius: 14px; padding: 20px 16px; text-align: center; }
        .ab-coin img { width: 48px; height: 48px; object-fit: contain; margin-bottom: 10px; }
        .ab-coin .ab-coin-name { font-family: "JetBrains Mono", monospace; font-size: 13px; font-weight: 500; color: var(--ab-ink); margin-bottom: 4px; }
        .ab-coin .ab-coin-desc { font-size: 13px; color: var(--ab-ink-soft); line-height: 1.4; }

        .ab-hero-img { width: 100%; border-radius: 16px; overflow: hidden; margin: 20px 0; position: relative; aspect-ratio: 16/7; }
        .ab-hero-img img { width: 100%; height: 100%; object-fit: cover; }
        .ab-hero-img .ab-hero-overlay { position: absolute; inset: 0; background: linear-gradient(to right, rgba(246,241,231,.85) 40%, transparent); display: flex; align-items: center; padding: 0 36px; }
        .ab-hero-img .ab-hero-text { max-width: 340px; }
        .ab-hero-img .ab-hero-text .ab-h2 { margin: 0 0 10px; }

        .ab-avatars { display: flex; gap: 8px; margin: 16px 0; flex-wrap: wrap; }
        .ab-avatar { width: 52px; height: 52px; border-radius: 50%; background: #EAE3D4; border: 2px solid var(--ab-line); display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .ab-avatar img { width: 38px; height: 38px; object-fit: contain; }

        .ab-phases { display: flex; flex-direction: column; gap: 8px; margin: 16px 0; counter-reset: phase; }
        .ab-phase-group { background: var(--ab-surface); border: 1px solid var(--ab-line); border-radius: 14px; overflow: hidden; }
        .ab-phase-group-header { padding: 12px 18px; font-family: "JetBrains Mono", monospace; font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase; display: flex; align-items: center; gap: 10px; font-weight: 500; }
        .ab-phase-group-body { border-top: 1px solid var(--ab-line-soft); }
        .ab-phase-item { display: flex; align-items: flex-start; gap: 14px; padding: 11px 18px; border-bottom: 1px solid var(--ab-line-soft); font-size: 14px; }
        .ab-phase-item:last-child { border-bottom: none; }
        .ab-phase-tag { font-family: "JetBrains Mono", monospace; font-size: 11.5px; background: var(--ab-surface2); color: var(--ab-ink-faint); padding: 2px 8px; border-radius: 6px; flex-shrink: 0; margin-top: 2px; white-space: nowrap; }
        .ab-phase-text { color: var(--ab-ink-soft); }
        .ab-phase-text strong { color: var(--ab-ink); font-weight: 600; }

        .ab-golden { margin-top: 46px; text-align: center; padding: 38px 30px; border: 1px dashed var(--ab-line); border-radius: 16px; background: var(--ab-surface); }
        .ab-golden p { font-family: "Fraunces", serif; font-style: italic; font-size: 21px; line-height: 1.45; color: var(--ab-ink); max-width: 56ch; margin: 0 auto; }
        .ab-golden p b { font-style: normal; font-weight: 600; color: var(--ab-base); }

        .ab-footer { margin-top: 40px; text-align: center; font-family: "JetBrains Mono", monospace; font-size: 11.5px; color: var(--ab-ink-faint); letter-spacing: .04em; padding-bottom: 40px; }
        .ab-footer a { color: var(--ab-base); text-decoration: none; }
        .ab-footer a:hover { text-decoration: underline; }

        @media (prefers-reduced-motion: no-preference) {
          .ab-reveal { opacity: 0; transform: translateY(14px); animation: ab-rise .7s cubic-bezier(.2,.7,.3,1) forwards; }
          @keyframes ab-rise { to { opacity: 1; transform: none; } }
        }
        @media (max-width: 680px) {
          .ab-stats { grid-template-columns: 1fr 1fr; }
          .ab-stats .ab-stat:last-child { grid-column: 1 / -1; }
          .ab-roles { grid-template-columns: 1fr; }
          .ab-coins { grid-template-columns: 1fr; }
          .ab-toc { overflow-x: auto; flex-wrap: nowrap; }
          .ab-header { padding: 48px 0 24px; }
          .ab-hero-img { aspect-ratio: 4/3; }
          .ab-team-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="ab-wrap">

        {/* ── HEADER ─────────────────────────────────────── */}
        <header className="ab-header ab-reveal">
          <p className="ab-eyebrow">Dự án UPSHIFT · AIESEC Việt Nam × UNICEF</p>
          <h1 className="ab-h1">
            CoinEm — <em>Đồng tiền tử tế</em>
          </h1>
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

        {/* ── TOC ────────────────────────────────────────── */}
        <nav className="ab-toc">
          <a href="#ve-du-an">01 · Về dự án</a>
          <a href="#van-de">02 · Vấn đề</a>
          <a href="#cach-choi">03 · Cách chơi</a>
          <a href="#vai-tro">04 · Vai trò &amp; Đồng xu</a>
          <a href="#thu-nghiem">05 · Thử nghiệm</a>
          <a href="#doi-ngu">06 · Đội ngũ</a>
        </nav>

        {/* ── 01 — VỀ DỰ ÁN ──────────────────────────────── */}
        <section className="ab-section ab-reveal" id="ve-du-an">
          <p className="ab-snum">01</p>
          <h2 className="ab-h2">Về dự án</h2>

          <div className="ab-hero-img">
            <img src="/ingame_background.png" alt="CoinEm game background" />
            <div className="ab-hero-overlay">
              <div className="ab-hero-text">
                <img src="/emcoin_logo.png" alt="CoinEm" style={{ height: 56, objectFit: 'contain', marginBottom: 12, display: 'block' }} />
                <p className="ab-p" style={{ fontSize: 15, marginBottom: 0 }}>
                  Kết nối cảm xúc — Chia sẻ thật lòng
                </p>
              </div>
            </div>
          </div>

          <p className="ab-p">
            CoinEm là <strong>bộ thẻ bài giáo dục cảm xúc</strong> được thiết kế cho học sinh vị thành niên, sử dụng hình thức nhập vai và phản tư nhóm. Mỗi lượt chơi, một người chia sẻ câu chuyện thật của mình — cả nhóm lắng nghe, đồng cảm và phản hồi qua hệ thống đồng xu.
          </p>
          <p className="ab-p">
            Ý tưởng lấy cảm hứng từ bộ phim <strong>Inside Out</strong> và <strong>Bánh xe cảm xúc của Plutchik</strong>, biến thành trò chơi thẻ bài tương tác nhóm, đặt học sinh vào hành trình khám phá cảm xúc của chính mình.
          </p>

          <div className="ab-layers">
            <div className="ab-layer ab-layer-1">
              <h3 className="ab-h3">Thẻ bài &amp; Đồng xu</h3>
              <p className="ab-p">Thẻ tình huống, cảm xúc, phản tư, bí kíp ôm — mỗi bộ thẻ kích hoạt một giai đoạn chia sẻ khác nhau. Đồng xu là công cụ thể hiện sự trân trọng và đồng cảm.</p>
            </div>
            <div className="ab-layer ab-layer-2">
              <h3 className="ab-h3">Nhập vai có chủ đích</h3>
              <p className="ab-p">Mỗi người chơi giữ một vai trò riêng — từ người lắng nghe, người kết nối, đến người dẫn lối — xây dựng kỹ năng xã hội qua thực hành thực tế.</p>
            </div>
            <div className="ab-layer ab-layer-3">
              <h3 className="ab-h3">Phản tư &amp; Chăm sóc bản thân</h3>
              <p className="ab-p">Sau mỗi vòng chia sẻ, nhóm cùng thực hành một hành động chăm sóc thể chất — ôm, vỗ vai, hít thở — gắn kết cảm xúc với cơ thể.</p>
            </div>
          </div>
        </section>

        {/* ── 02 — VẤN ĐỀ ────────────────────────────────── */}
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
              <div className="ab-desc">học sinh cấp 2 có dấu hiệu trầm cảm ở một nghiên cứu tại TP.HCM</div>
            </div>
          </div>

          <h3 className="ab-h3">Ba nỗi đau lớn nhất</h3>
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
                <td>Học sinh ưu tiên chia sẻ với bạn bè nhưng bạn bè thiếu kỹ năng lắng nghe — hỗ trợ chỉ là tạm thời.</td>
              </tr>
            </tbody>
          </table>

          <div className="ab-note">
            <p className="ab-lbl">Gốc rễ</p>
            <p className="ab-p">Nỗi đau lớn nhất của trẻ vị thành niên là bị kẹt giữa áp lực học tập từ gia đình–xã hội và thiếu sự đồng hành, thấu hiểu về mặt cảm xúc. CoinEm tạo ra không gian trung lập — nơi cảm xúc được phép tồn tại mà không bị phán xét.</p>
          </div>
        </section>

        {/* ── 03 — CÁCH CHƠI ──────────────────────────────── */}
        <section className="ab-section ab-reveal" id="cach-choi">
          <p className="ab-snum">03</p>
          <h2 className="ab-h2">Cách chơi</h2>
          <p className="ab-p">
            Mỗi vòng chơi gồm <strong>16 giai đoạn</strong> chia thành 4 màn, xoay quanh một người chơi được chọn làm <strong>Người Trao Gửi</strong> — người sẽ chia sẻ câu chuyện cảm xúc thật của mình trong vòng đó.
          </p>

          <div className="ab-phases">
            {/* Màn Đêm */}
            <div className="ab-phase-group">
              <div className="ab-phase-group-header" style={{ background: '#2A2A3A', color: '#B0B4CC' }}>
                <span>🌙</span> Màn 1 — Đêm
              </div>
              <div className="ab-phase-group-body">
                {[
                  ['role-reveal', 'Mỗi người xem bí mật vai trò của mình trong vòng này'],
                  ['night', 'Đêm bắt đầu — cả nhóm nhắm mắt'],
                  ['healer-turn', 'Người Chữa Lành chọn 1 người để bảo vệ khỏi bị im lặng'],
                  ['silencer-turn', 'Người Im Lặng chọn 1 người sẽ không thể phát biểu vòng này'],
                ].map(([tag, desc]) => (
                  <div key={tag} className="ab-phase-item">
                    <span className="ab-phase-tag">{tag}</span>
                    <span className="ab-phase-text">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Màn Chia sẻ */}
            <div className="ab-phase-group">
              <div className="ab-phase-group-header" style={{ background: '#FFF4F9', color: '#C04575' }}>
                <span>💌</span> Màn 2 — Chia sẻ
              </div>
              <div className="ab-phase-group-body">
                {[
                  ['situation-card', <><strong>Người Trao Gửi</strong> vuốt và chọn 1 thẻ tình huống phù hợp với câu chuyện của mình</>],
                  ['emotion-card', <><strong>Người Trao Gửi</strong> chọn 1 thẻ cảm xúc — cả 2 thẻ hiện trên bàn cho nhóm xem</>],
                  ['story-telling', <><strong>Người Trao Gửi</strong> kể câu chuyện thật trong 60 giây dựa trên 2 thẻ đã chọn</>],
                ].map(([tag, desc]) => (
                  <div key={tag as string} className="ab-phase-item">
                    <span className="ab-phase-tag">{tag}</span>
                    <span className="ab-phase-text">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Màn Phản hồi */}
            <div className="ab-phase-group">
              <div className="ab-phase-group-header" style={{ background: '#F0F9FF', color: '#1A6B9E' }}>
                <span>🔗</span> Màn 3 — Phản hồi &amp; Phản tư
              </div>
              <div className="ab-phase-group-body">
                {[
                  ['group-response', 'Nhóm phản hồi; NTG tặng coin cho người phản hồi hay nhất (+5 vàng)'],
                  ['reflection-card', 'NTG chọn thẻ phản tư phù hợp với cảm nhận sau khi nghe nhóm'],
                  ['reflection-sharing', 'NTG chia sẻ thêm từ thẻ phản tư vừa chọn'],
                  ['selfcare-card', 'Người Dẫn Lối (hoặc NTG) chọn thẻ bí kíp chăm sóc'],
                  ['hug-action', 'Cả nhóm cùng thực hiện hành động kết nối — ôm, vỗ vai, hít thở'],
                ].map(([tag, desc]) => (
                  <div key={tag} className="ab-phase-item">
                    <span className="ab-phase-tag">{tag}</span>
                    <span className="ab-phase-text">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Màn Kết */}
            <div className="ab-phase-group">
              <div className="ab-phase-group-header" style={{ background: '#FFFBEB', color: '#B07A0E' }}>
                <span>🏆</span> Màn 4 — Kết thúc vòng
              </div>
              <div className="ab-phase-group-body">
                {[
                  ['guess-silencer', 'Mọi người vote đoán ai là Người Im Lặng vòng này'],
                  ['reveal-silencer', 'Tiết lộ kết quả vote + toàn bộ vai trò của từng người'],
                  ['give-coins', 'Người chơi tự do tặng coin đỏ và vàng cho nhau'],
                  ['reward', 'Tổng kết lượt — thưởng coin vàng theo vai trò → vòng tiếp theo'],
                ].map(([tag, desc]) => (
                  <div key={tag} className="ab-phase-item">
                    <span className="ab-phase-tag">{tag}</span>
                    <span className="ab-phase-text">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 04 — VAI TRÒ & ĐỒNG XU ─────────────────────── */}
        <section className="ab-section ab-reveal" id="vai-tro">
          <p className="ab-snum">04</p>
          <h2 className="ab-h2">Vai trò &amp; Đồng xu</h2>

          <h3 className="ab-h3">7 vai trò</h3>
          <p className="ab-p">Mỗi vòng mỗi người được phân ngẫu nhiên một vai. Vai trò tạo ra cấu trúc tương tác — ai lắng nghe, ai bảo vệ, ai đặt câu hỏi, ai hướng dẫn.</p>

          <div className="ab-roles">
            {[
              ['🎭', 'Quản Trò', 'Điều hành trò chơi, đọc hướng dẫn cho nhóm'],
              ['💌', 'Người Trao Gửi', 'Chia sẻ câu chuyện cảm xúc thật của mình'],
              ['💚', 'Người Chữa Lành', 'Mỗi đêm bảo vệ 1 người khỏi bị im lặng'],
              ['🤐', 'Người Im Lặng', 'Mỗi đêm chọn 1 người không thể phát biểu'],
              ['🔗', 'Người Kết Nối', 'Phản hồi gắn kết câu chuyện với cả nhóm'],
              ['✨', 'Người Gợi Mở', 'Đặt câu hỏi chạm sâu vào cảm xúc của NTG'],
              ['🗺️', 'Người Dẫn Lối', 'Hướng dẫn phần chăm sóc bản thân cuối vòng'],
            ].map(([icon, name, desc]) => (
              <div key={name as string} className="ab-role">
                <span className="ab-role-icon">{icon}</span>
                <div>
                  <div className="ab-role-name">{name}</div>
                  <p className="ab-role-desc">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <h3 className="ab-h3">3 loại đồng xu</h3>
          <p className="ab-p">Đồng xu không phải điểm số — đây là ngôn ngữ thể hiện sự <strong>trân trọng, đồng cảm và ghi nhận</strong> giữa người chơi với nhau.</p>

          <div className="ab-coins">
            <div className="ab-coin">
              <img src="/coins/do.png" alt="Coin đỏ" />
              <div className="ab-coin-name">Coin Đỏ 🔴</div>
              <p className="ab-coin-desc">Nhận 3 coin mỗi vòng. Có thể tặng cho người khác để thể hiện sự đồng cảm.</p>
            </div>
            <div className="ab-coin">
              <img src="/coins/vang.png" alt="Coin vàng" />
              <div className="ab-coin-name">Coin Vàng 💛</div>
              <p className="ab-coin-desc">Tích lũy theo thời gian. Nhận được khi hoàn thành tốt vai trò của mình.</p>
            </div>
            <div className="ab-coin">
              <img src="/coins/xanh.png" alt="Coin xanh" />
              <div className="ab-coin-name">Coin Xanh 💚</div>
              <p className="ab-coin-desc">Nhận được khi người khác tặng coin cho bạn — phản chiếu sự kết nối.</p>
            </div>
          </div>

          <h3 className="ab-h3">Cơ chế thưởng coin vàng</h3>
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
        </section>

        {/* ── 05 — THỬ NGHIỆM ─────────────────────────────── */}
        <section className="ab-section ab-reveal" id="thu-nghiem">
          <p className="ab-snum">05</p>
          <h2 className="ab-h2">Thử nghiệm &amp; Đánh giá</h2>
          <p className="ab-p">
            CoinEm đang trong giai đoạn <strong>thử nghiệm thí điểm</strong> tại các trường học, trung tâm và cơ sở thanh thiếu niên tại TP.HCM. Mỗi buổi chơi từ 60–90 phút, có cộng tác viên tâm lý/CTXH được tập huấn hỗ trợ.
          </p>

          <h3 className="ab-h3">Mục tiêu đo lường</h3>
          <table className="ab-tbl">
            <thead><tr><th>Câu hỏi</th><th>Công cụ đo</th></tr></thead>
            <tbody>
              <tr>
                <td>Người dùng có hiểu và tự thực hiện được không?</td>
                <td>3 mức: tự thực hiện / cần hỗ trợ / chưa thực hiện được</td>
              </tr>
              <tr>
                <td>Người dùng cảm thấy nội dung có hữu ích không?</td>
                <td>Hữu ích &amp; phù hợp / Bình thường / Không hữu ích</td>
              </tr>
              <tr>
                <td>Năng lực cảm xúc–xã hội thay đổi thế nào?</td>
                <td>Bảng hỏi SECQ 25 câu (thang Likert 6 bậc) Pre/Post</td>
              </tr>
              <tr>
                <td>Trải nghiệm trong suốt buổi chơi như thế nào?</td>
                <td>Nhật ký cảm xúc ngắn sau mỗi lượt</td>
              </tr>
            </tbody>
          </table>

          <div className="ab-note">
            <p className="ab-lbl">Cam kết an toàn</p>
            <p className="ab-p">Mọi dữ liệu thu thập được xử lý ẩn danh, chỉ dùng cho mục đích nghiên cứu và cải tiến sản phẩm. Học sinh có thể dừng tham gia bất kỳ lúc nào mà không ảnh hưởng đến quyền lợi học tập.</p>
          </div>

          <h3 className="ab-h3">Ứng dụng kỹ thuật số</h3>
          <p className="ab-p">
            Song song với bộ thẻ vật lý, CoinEm có phiên bản <strong>web app</strong> cho phép chơi trực tuyến hoặc offline trong cùng phòng. Dữ liệu đồng xu, vai trò và lịch sử chia sẻ được đồng bộ realtime qua WebSocket.
          </p>

          <div className="ab-avatars">
            {['Bear.png','Bird - Blue.png','Bunny.png','Cat.png','Girl 1.png','Boy 1.png','Bird.png','Bunny 2.png'].map(name => (
              <div key={name} className="ab-avatar">
                <img src={`/cartoon/icons/avatars/${name}`} alt="" />
              </div>
            ))}
          </div>
          <p className="ab-p" style={{ fontSize: 13, marginTop: 6 }}>4–8 người chơi · Mỗi người một avatar · Mỗi vòng một vai mới</p>
        </section>

        {/* ── 06 — ĐỘI NGŨ ────────────────────────────────── */}
        <section className="ab-section ab-reveal" id="doi-ngu">
          <p className="ab-snum">06</p>
          <h2 className="ab-h2">Đội ngũ</h2>
          <p className="ab-p">
            Nhóm dự án <strong>Đồng Tiền Tử Tế</strong> gồm 3 thành viên trẻ đến từ TP.HCM, cùng nhau xây dựng CoinEm trong khuôn khổ chương trình UPSHIFT 2025.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
            <div style={{
              background: 'var(--ab-surface)',
              border: '1px solid var(--ab-line)',
              borderRadius: 20,
              overflow: 'hidden',
              maxWidth: 340,
              width: '100%',
              boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
            }}>
              <img
                src="/about.png"
                alt="Đội ngũ Đồng Tiền Tử Tế — CoinEm"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 8 }}>
            {[
              ['Lê Trương Mỹ Ngọc', 'Trưởng nhóm', '2005'],
              ['Nguyễn Trần Bảo Nhi', 'Đồng đội', '2005'],
              ['Huỳnh Hồng Như', 'Đồng đội — Đồng đội lý trí', '2006'],
            ].map(([name, role, year]) => (
              <div key={name} style={{
                background: 'var(--ab-surface)',
                border: '1px solid var(--ab-line)',
                borderRadius: 14,
                padding: '14px 14px 12px',
                textAlign: 'center',
              }}>
                <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 20, marginBottom: 6 }}>
                  {year === '2006' ? '🌸' : year === '2005' && role.includes('Trưởng') ? '⭐' : '🌟'}
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ab-ink)', lineHeight: 1.3 }}>{name}</div>
                <div style={{ fontSize: 12, color: 'var(--ab-base)', fontFamily: '"JetBrains Mono",monospace', marginTop: 4 }}>{year}</div>
                <div style={{ fontSize: 12, color: 'var(--ab-ink-soft)', marginTop: 3, lineHeight: 1.4 }}>{role}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── QUOTE ───────────────────────────────────────── */}
        <div className="ab-golden ab-reveal">
          <p>
            Mỗi câu chuyện đều xứng đáng được lắng nghe.<br />
            Mỗi cảm xúc đều xứng đáng được gọi tên.<br />
            <b>CoinEm</b> là không gian để cả hai điều đó xảy ra.
          </p>
        </div>

        {/* ── FOOTER ──────────────────────────────────────── */}
        <footer className="ab-footer">
          <p>
            Nhóm Dự án <b>Đồng Tiền Tử Tế</b> · UPSHIFT / AIESEC Việt Nam × UNICEF
          </p>
          <p style={{ marginTop: 6 }}>
            Liên hệ: <a href="mailto:emcoin.nnn@gmail.com">emcoin.nnn@gmail.com</a>
            &nbsp;·&nbsp; 0333 199 233
          </p>
        </footer>

      </div>
    </>
  )
}
