import { APPROVED_GAME_INFO } from '@/content/approvedGameInfo'
import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'

/** Read-only approved web rules. Does not modify cards, phases or balances. */
export function CoinRulesGuide() {
  const theme=useControlTheme(),[page,setPage]=useState(0)
  const pages=[
    ['Trao Coin','Mỗi lượt sử dụng 60 Coin, gồm 20 Coin Đỏ, 20 Coin Xanh và 20 Coin Vàng.'],
    ['Đầu lượt','Người Trao Gửi nhận toàn bộ 20 Coin Đỏ. Những người chơi còn lại chia đều 20 Coin Xanh và 20 Coin Vàng; số Coin dư không sử dụng.'],
    ['Đỏ – Lòng tốt vô hạn','Người kể trao cho người có phản hồi khiến mình cảm thấy được an ủi, thấu hiểu.'],
    ['Xanh – Được yêu thương','Người chơi trao cho người kể.'],
    ['Vàng – Trao yêu thương','Người chơi trao cho nhau để ghi nhận và khích lệ.'],
    ['Cuối lượt','Mỗi người ghi lại số Coin mình nhận được. Sau đó, toàn bộ Coin được thu về và chia lại từ đầu ở lượt tiếp theo.'],
    ['Trao theo cảm nhận','Coin được trao theo cảm nhận, không bắt buộc phải sử dụng hết.'],
    ['Coin nhận được','Coin nhận được là phần ghi nhận; không dùng để trao lại trong lượt.'],
  ]
  if(theme==='candy-clouds')return <article className="kawaii-rules" data-testid="coin-rules-guide"><div><h2>{pages[page][0]}</h2><p>{pages[page][1]}</p>{page===7&&<small>Luật web: {APPROVED_GAME_INFO.rulesVersion}</small>}</div><nav className="kawaii-chat-pages" aria-label="Trang luật Coin"><button aria-label="Luật Coin trước" disabled={page===0} onClick={()=>setPage(page-1)}><ArrowLeft/></button><small>{page+1} / {pages.length}</small><button aria-label="Luật Coin sau" disabled={page===pages.length-1} onClick={()=>setPage(page+1)}><ArrowRight/></button></nav></article>
  return <article className="h-full overflow-y-auto rounded-3xl bg-[var(--c-cream)] px-6 py-5 font-body text-sm leading-relaxed text-[var(--c-blue-dark)]" data-testid="coin-rules-guide">
    <h2 className="font-display text-xl">🪙 TRAO COIN</h2>
    <p className="mt-3">Mỗi lượt sử dụng 60 Coin, gồm 20 Coin Đỏ, 20 Coin Xanh và 20 Coin Vàng.</p>
    <h3 className="mt-4 font-display text-base">Đầu lượt</h3>
    <p>Người Trao Gửi nhận toàn bộ 20 Coin Đỏ. Những người chơi còn lại chia đều 20 Coin Xanh và 20 Coin Vàng; số Coin dư không sử dụng.</p>
    <h3 className="mt-4 font-display text-base">Trong lượt</h3>
    <dl className="space-y-3">
      <div><dt className="font-semibold">🔴 Đỏ – Lòng tốt vô hạn</dt><dd>Người kể trao cho người có phản hồi khiến mình cảm thấy được an ủi, thấu hiểu.</dd></div>
      <div><dt className="font-semibold">🟢 Xanh – Được yêu thương</dt><dd>Người chơi trao cho người kể.</dd></div>
      <div><dt className="font-semibold">🟡 Vàng – Trao yêu thương</dt><dd>Người chơi trao cho nhau để ghi nhận và khích lệ.</dd></div>
    </dl>
    <h3 className="mt-4 font-display text-base">Cuối lượt</h3>
    <p>Mỗi người ghi lại số Coin mình nhận được. Sau đó, toàn bộ Coin được thu về và chia lại từ đầu ở lượt tiếp theo.</p>
    <p className="mt-4 font-semibold">Coin được trao theo cảm nhận, không bắt buộc phải sử dụng hết.</p>
    <p className="mt-3">Coin nhận được là phần ghi nhận; không dùng để trao lại trong lượt.</p>
    <p className="mt-4 break-words text-xs">Luật web: {APPROVED_GAME_INFO.rulesVersion}</p>
  </article>
}
