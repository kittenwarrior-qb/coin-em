import { useEffect } from 'react'

const evidence = [
  ['85', 'lượt tiếp cận', 'Bao gồm học sinh, cộng đồng và nhóm yếu thế trong hoạt động thử nghiệm/truyền thông.'],
  ['6', 'người chơi chính thức', 'Nhóm pilot ngày 27/06/2026 gồm học sinh 10-15 tuổi tại Làng Thiếu Niên Thủ Đức.'],
  ['100%', 'hiểu nội dung thẻ', 'Người dùng hiểu nội dung thẻ, trong đó 50% có thể tự tin hướng dẫn lại cách chơi.'],
  ['83.3%', 'hài lòng', 'Phản hồi tích cực: vui vẻ, hứng thú, thoải mái và hiểu bản thân hơn.'],
  ['NPS 8', 'sẵn sàng giới thiệu', 'Tín hiệu tốt cho khả năng tiếp tục phát triển sau pilot.'],
]

const causes = [
  ['Não bộ tuổi dậy thì', 'Hệ cảm xúc phát triển nhanh hơn khả năng kiểm soát, khiến học sinh dễ bùng phát hoặc né tránh cảm xúc.'],
  ['Gia đình & kỳ vọng', 'Áp lực “con ngoan trò giỏi”, xung đột hoặc thiếu hỗ trợ làm trẻ khó chia sẻ đúng lúc.'],
  ['Bạo lực học đường', 'Bắt nạt trực tiếp hoặc trực tuyến làm giảm cảm giác an toàn và tăng lo âu.'],
  ['Áp lực học tập', 'Học thêm, thi cử và thiếu ngủ khiến khả năng điều tiết cảm xúc yếu hơn.'],
  ['Thiếu hệ thống hỗ trợ', 'Tư vấn học đường và giáo dục cảm xúc - xã hội chưa đủ phổ biến, thân thiện và liên tục.'],
  ['Kỳ thị sức khỏe tinh thần', 'Học sinh ngại tìm kiếm hỗ trợ chuyên môn, thường chỉ chia sẻ với bạn bè để giải tỏa tạm thời.'],
]

const solutionLayers = [
  ['Thẻ vai trò', 'Tạo nhiệm vụ nhỏ cho từng người: điều phối, trao gửi, chữa lành, im lặng, gợi mở, kết nối, dẫn lối.'],
  ['Thẻ tình huống', 'Đưa vào bối cảnh học đường, bạn bè, gia đình để người chơi bắt đầu câu chuyện dễ hơn.'],
  ['Thẻ cảm xúc', 'Giúp gọi tên cảm xúc bằng ngôn ngữ ngắn, hình ảnh và màu sắc dễ phân biệt.'],
  ['Thẻ phản tư', 'Đặt câu hỏi giúp học sinh nhìn lại hành vi, nhu cầu và cách phản ứng của bản thân.'],
  ['Bí kíp tự ôm', 'Kết thúc bằng hành động chăm sóc cơ thể hoặc kết nối nhóm, giúp cảm xúc có điểm hạ cánh.'],
  ['Coin & nhật ký cảm xúc', 'Coin là lời ghi nhận; nhật ký cảm xúc giúp ghi nhận nhanh trạng thái sau lượt chơi.'],
]

const feedback = [
  '“Giống ma sói.”',
  '“Có thể hòa nhập cùng các bạn.”',
  '“Sặc sỡ hơn, đẹp hơn.”',
  '“Vui vẻ.”',
  '“Được trò chuyện.”',
  '“Mong đợi lần sau có thể chơi thêm.”',
]

const future = [
  'Tổ chức thêm nhiều phiên thử nghiệm với nhóm đa dạng hơn, không chỉ một mẫu nhỏ.',
  'Rút gọn ngôn ngữ thẻ cho học sinh nhỏ tuổi hoặc học sinh cần hỗ trợ đặc biệt.',
  'Tập huấn điều phối viên về lắng nghe không phán xét, nhạy cảm giới và dừng vòng an toàn.',
  'Duy trì web app như công cụ hỗ trợ thẻ vật lý: chia vai, nhắc phase, chọn thẻ, ghi nhận coin.',
  'Phát triển dữ liệu tình huống mới từ phản hồi thực tế của học sinh và nhà trường.',
]

export default function ImpactReport() {
  useEffect(() => {
    document.title = 'EmCoin - Báo cáo dự án'
  }, [])

  return (
    <main className="report-root">
      <style>{`
        .report-root {
          --blue: #2f76ac;
          --blue-text: #1f5f92;
          --sky: #d2f8ff;
          --pink: #ff6993;
          --yellow: #f5cc00;
          min-height: 100dvh;
          color: var(--blue-text);
          background:
            radial-gradient(circle at 88% 0%, rgba(210,248,255,.82) 0, rgba(210,248,255,.28) 34%, transparent 60%),
            linear-gradient(180deg, #f9feff 0%, #f1fbff 38%, #ffffff 100%);
          font-family: var(--font-body), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-weight: 500;
        }

        .report-wrap {
          width: min(980px, calc(100% - 22px));
          margin: 0 auto;
          padding: 14px 0 72px;
        }

        .report-nav {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          border: 1px solid rgba(47,118,172,.12);
          border-radius: 18px;
          background: rgba(255,255,255,.76);
          box-shadow: 0 12px 30px rgba(31,95,146,.08);
          backdrop-filter: blur(12px);
        }

        .circle-link {
          position: relative;
          display: grid;
          width: 40px;
          height: 40px;
          place-items: center;
          border: 1px solid rgba(47,118,172,.14);
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 8px 18px rgba(31,95,146,.08);
          text-decoration: none;
        }

        .circle-link > img {
          display: none;
        }

        .circle-link > img:last-child {
          position: relative;
          width: 18px;
          height: 18px;
        }

        .circle-link span {
          color: var(--blue-text);
          font-size: 13px;
          font-weight: 800;
          line-height: 1;
        }

        .report-brand {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--blue-text);
          font-size: 15px;
          font-weight: 900;
        }

        .report-brand::before {
          content: "";
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ef5f8a;
          box-shadow: 14px 0 0 #2f76ac;
        }

        .report-logo {
          height: 36px;
          object-fit: contain;
        }

        .report-hero {
          padding: 26px 0 38px;
        }

        .report-kicker {
          display: inline-flex;
          padding: 7px 11px;
          border-radius: 999px;
          border: 1px solid rgba(47,118,172,.12);
          background: #fff;
          color: #db4772;
          font-size: 12px;
          font-weight: 800;
        }

        .report-hero h1,
        .report-section h2 {
          margin: 10px 0 0;
          font-family: var(--font-body), system-ui, sans-serif;
          font-weight: 800;
          line-height: 1.1;
          color: var(--blue-text);
          letter-spacing: 0;
          text-wrap: balance;
        }

        .report-hero h1 {
          font-size: clamp(36px, 8vw, 66px);
        }

        .report-section h2 {
          font-size: clamp(27px, 5.8vw, 44px);
        }

        .report-hero p,
        .report-section > p {
          max-width: 760px;
          margin: 13px 0 0;
          color: rgba(31,95,146,.72);
          font-size: 15px;
          line-height: 1.6;
          font-weight: 500;
        }

        .report-actions {
          display: grid;
          grid-template-columns: 1fr;
          gap: 9px;
          margin-top: 18px;
        }

        .pill-link {
          position: relative;
          min-height: 54px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          border: 1px solid rgba(47,118,172,.14);
          border-radius: 12px;
          background: #ffffff;
          color: var(--blue-text);
          box-shadow: 0 10px 22px rgba(31,95,146,.1);
          text-decoration: none;
        }

        .pill-link img {
          display: none;
        }

        .pill-link span {
          position: relative;
          font-family: var(--font-body), system-ui, sans-serif;
          font-size: 14px;
          font-weight: 800;
        }

        .report-section {
          padding: 34px 0;
        }

        .metric-grid,
        .cause-grid,
        .solution-grid,
        .feedback-grid,
        .future-grid {
          display: grid;
          gap: 11px;
          margin-top: 17px;
        }

        .metric-grid {
          grid-template-columns: 1fr;
        }

        .metric-card,
        .report-card,
        .quote-card {
          padding: 15px;
          border: 1px solid rgba(47,118,172,.12);
          border-radius: 16px;
          background: rgba(255,255,255,.88);
          box-shadow: 0 12px 30px rgba(47,118,172,.08);
        }

        .metric-card b {
          display: block;
          font-family: var(--font-body), system-ui, sans-serif;
          font-size: 34px;
          line-height: 1;
          color: var(--pink);
          letter-spacing: 0;
        }

        .metric-card strong,
        .report-card h3 {
          display: block;
          margin-top: 4px;
          font-family: var(--font-body), system-ui, sans-serif;
          font-weight: 800;
          letter-spacing: 0;
          font-size: 22px;
          line-height: 1.05;
          color: var(--blue);
        }

        .metric-card span,
        .report-card p,
        .quote-card {
          display: block;
          margin-top: 8px;
          color: rgba(47,118,172,.75);
          font-size: 14px;
          line-height: 1.5;
        }

        .report-photo {
          width: 100%;
          margin-top: 18px;
          border: 4px solid white;
          border-radius: 24px;
          aspect-ratio: 1.4;
          object-fit: cover;
          box-shadow: 0 18px 42px rgba(47,118,172,.12);
        }

        .quote-card {
          margin: 0;
          color: var(--pink);
          font-family: var(--font-body), system-ui, sans-serif;
          font-weight: 800;
          letter-spacing: 0;
          font-size: 22px;
          text-align: center;
        }

        .future-grid {
          counter-reset: future;
        }

        .future-item {
          position: relative;
          padding-left: 52px;
        }

        .future-item::before {
          counter-increment: future;
          content: counter(future);
          position: absolute;
          left: 13px;
          top: 13px;
          display: grid;
          width: 30px;
          height: 30px;
          place-items: center;
          border-radius: 50%;
          background: var(--sky);
          color: var(--pink);
          font-family: var(--font-body), system-ui, sans-serif;
          font-weight: 800;
          letter-spacing: 0;
        }

        .report-footer {
          padding: 28px 0 8px;
          text-align: center;
          color: rgba(47,118,172,.68);
          font-size: 13px;
          line-height: 1.6;
        }

        @media (min-width: 740px) {
          .report-actions {
            grid-template-columns: repeat(3, 1fr);
            max-width: 760px;
          }

          .metric-grid {
            grid-template-columns: repeat(5, 1fr);
          }

          .cause-grid,
          .solution-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .feedback-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 620px) {
          .report-wrap {
            width: min(100% - 24px, 980px);
          }

          .report-hero {
            padding: 24px 0 28px;
          }

          .report-hero h1 {
            font-size: clamp(34px, 11vw, 44px);
            line-height: 1.12;
          }

          .report-section h2 {
            font-size: clamp(27px, 8vw, 36px);
          }

          .report-hero p,
          .report-section > p {
            font-size: 16px;
            line-height: 1.62;
          }

          .pill-link {
            min-height: 48px;
          }
        }
      `}</style>

      <div className="report-wrap">
        <nav className="report-nav" aria-label="Điều hướng báo cáo">
          <a className="circle-link" href="/about" aria-label="Quay lại landing">
            <img src="/cartoon/buttons/circle/Blue.png" alt="" draggable={false} />
            <img src="/cartoon/icons/Arrow-Simple-Left.svg" alt="" draggable={false} />
            <span>Back</span>
          </a>
          <div className="report-brand" aria-label="EmCoin">EmCoin</div>
          <a className="circle-link" href="/cards" aria-label="Xem thẻ 3D">
            <img src="/cartoon/buttons/circle/Violet.png" alt="" draggable={false} />
            <img src="/cartoon/icons/Arrows-Random.svg" alt="" draggable={false} />
            <span>3D</span>
          </a>
        </nav>

        <section className="report-hero">
          <span className="report-kicker">Bản đọc sâu từ báo cáo tổng kết và đề án chi tiết</span>
          <h1>EmCoin dưới góc nhìn tâm lý, giáo dục và tác động xã hội</h1>
          <p>
            Đây là bản web story tổng hợp từ hai tài liệu dự án mới nhất. Nội dung được viết lại để dễ đọc trên điện thoại, nhưng vẫn giữ các luận điểm chính: vấn đề, đối tượng, cơ sở tâm lý, giải pháp, thử nghiệm, kết quả và hướng phát triển.
          </p>
          <div className="report-actions">
            <a className="pill-link" href="/card-showcase/manifest.json">
              <img src="/cartoon/buttons/pill/Teal.png" alt="" draggable={false} />
              <span>Dữ liệu bộ thẻ</span>
            </a>
            <a className="pill-link" href="/report/bao-cao-tong-ket.pdf">
              <img src="/cartoon/buttons/pill/Pink.png" alt="" draggable={false} />
              <span>Báo cáo gốc</span>
            </a>
            <a className="pill-link" href="/report/de-an-chi-tiet.pdf">
              <img src="/cartoon/buttons/pill/Orange.png" alt="" draggable={false} />
              <span>Đề án gốc</span>
            </a>
          </div>
        </section>

        <section className="report-section">
          <h2>1. Vấn đề xã hội</h2>
          <p>
            Quản lý cảm xúc là khả năng nhận biết, hiểu và điều chỉnh cảm xúc phù hợp với hoàn cảnh. Với học sinh 10-15 tuổi, đây là giai đoạn có nhiều biến đổi tâm sinh lý, chịu ảnh hưởng mạnh từ bạn bè, gia đình, học tập và môi trường số. Vấn đề cốt lõi của EmCoin được diễn đạt rất rõ: học sinh thiếu công cụ để học cách nhận diện cảm xúc, thay đổi hành vi và trò chuyện với bạn bè.
          </p>
          <div className="cause-grid">
            {causes.map(([title, text]) => (
              <article className="report-card" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="report-section">
          <h2>2. Chân dung người dùng</h2>
          <p>
            Đối tượng trọng tâm là học sinh 10-15 tuổi tại TP.HCM, đặc biệt chú ý nhóm học sinh nữ, trẻ ở mái ấm/cơ sở bảo trợ, trẻ có khó khăn học tập hoặc khó khăn tâm lý. Các em có xu hướng tìm đến bạn bè để chia sẻ, dùng mạng xã hội/game để xả cảm xúc và dè dặt khi tìm kiếm hỗ trợ chuyên môn.
          </p>
          <img className="report-photo" src="/landing/trial-07.webp" alt="Học sinh tham gia thử nghiệm EmCoin" loading="lazy" draggable={false} />
        </section>

        <section className="report-section">
          <h2>3. Cơ sở tâm lý của giải pháp</h2>
          <p>
            EmCoin bắt đầu từ một nguyên tắc đơn giản: một đứa trẻ không thể quản lý thứ mà em chưa gọi tên được. Trò chơi dùng phản tư và đa góc nhìn để giúp học sinh gọi tên cảm xúc, hiểu nhu cầu phía sau cảm xúc, nhìn vấn đề từ nhiều vị trí và thực hành lắng nghe không phán xét.
          </p>
          <div className="solution-grid">
            {solutionLayers.map(([title, text]) => (
              <article className="report-card" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="report-section">
          <h2>4. Kết quả thử nghiệm</h2>
          <p>
            Pilot chính thức diễn ra ngày 27/06/2026 với 6 học sinh 10-15 tuổi. Nhóm thử nghiệm đều là trẻ có hoàn cảnh đặc biệt; trong đó có học sinh khuyết tật trí tuệ nhẹ và học sinh có khó khăn tâm lý. Người chơi lần đầu tiếp cận trò chơi nhưng đánh giá tích cực về tính trực quan, màu sắc và cách thẻ bài hỗ trợ trò chuyện.
          </p>
          <div className="metric-grid">
            {evidence.map(([value, label, text]) => (
              <article className="metric-card" key={label}>
                <b>{value}</b>
                <strong>{label}</strong>
                <span>{text}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="report-section">
          <h2>5. Người chơi nói gì?</h2>
          <p>
            Phản hồi cho thấy các em thích tính nhập vai, màu sắc, thẻ coin và cảm giác được hòa nhập. Một số em cũng mong muốn thêm vai trò hoặc chỉnh thứ tự hành động để trò chơi hấp dẫn hơn.
          </p>
          <div className="feedback-grid">
            {feedback.map((item) => (
              <blockquote className="quote-card" key={item}>{item}</blockquote>
            ))}
          </div>
        </section>

        <section className="report-section">
          <h2>6. Tính hòa nhập và an toàn</h2>
          <p>
            Mọi phiên chơi cần giữ nguyên tắc tự nguyện, không phán xét, tôn trọng quyền riêng tư và được quyền dừng lại. Tài liệu đề xuất điều chỉnh kích thước thẻ, dùng biểu tượng minh họa, màu sắc dễ phân biệt, văn bản ngắn gọn và có thể bổ sung audio cho học sinh khó đọc.
          </p>
          <img className="report-photo" src="/landing/trial-11.webp" alt="Bàn chơi thử nghiệm EmCoin" loading="lazy" draggable={false} />
        </section>

        <section className="report-section">
          <h2>7. Hướng phát triển</h2>
          <p>
            EmCoin có thể phát triển thành công cụ hỗ trợ giáo dục kỹ năng sống, sinh hoạt lớp, câu lạc bộ kỹ năng sống hoặc hoạt động tham vấn cơ bản. Web app nên tiếp tục đóng vai trò hỗ trợ bộ thẻ vật lý, không thay thế cuộc trò chuyện trực tiếp.
          </p>
          <div className="future-grid">
            {future.map((item) => (
              <article className="report-card future-item" key={item}>
                <p>{item}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="report-footer">
          <div>Nhóm Đồng Tiền Tử Tế - UPSHIFT 2025 - AIESEC Việt Nam x UNICEF</div>
          <div>Game UI assets licensed from ricimi. Designed & created by ricimi.</div>
        </footer>
      </div>
    </main>
  )
}
