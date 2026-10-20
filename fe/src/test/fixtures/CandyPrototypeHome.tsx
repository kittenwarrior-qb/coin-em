import { ArrowRight, BookOpen, DoorOpen, Layers, Plus, Settings, Users } from 'lucide-react'
import type { Panel } from './candyPrototypeModel'
import { prototypeCards } from './candyPrototypeCatalog'
import { RealCardImage } from './CandyPrototypeCards'
import { RicimiHome } from './CandyRicimiHome'
import { KawaiiHome } from './CandyKawaiiHome'

export type HomeVariant = 'cloud' | 'friends' | 'cards' | 'table' | 'ricimi' | 'kawaii'
const homeVariants: Partial<Record<HomeVariant, string>> = { table: 'Bàn chơi · Mới', cloud: 'Xem mẫu trước' }

export function PrototypeHome({ variant, choose, open }: { variant: HomeVariant; choose: (value: HomeVariant) => void; open: (value: Panel) => void }) {
  if(variant==='kawaii')return <KawaiiHome open={open}/>
  if(variant==='ricimi')return <RicimiHome open={open}/>
  if(variant==='table')return <section className="cp-home-study home-table">
    <div className="cp-table-home-content">
      <header className="cp-table-home-brand"><img src="/logo.svg" alt="EmCoin"/><div><h1>Chơi cùng nhau.<br/>Hiểu nhau hơn.</h1><p>Một khoảng nhỏ để lắng nghe.</p></div></header>
      <div className="cp-table-home-play" aria-label="Vào chơi">
        <button className="cp-entry cp-entry-join" onClick={()=>open('join')}><span className="cp-entry-art" aria-hidden="true"><DoorOpen/></span><span className="cp-entry-copy"><small>Bạn đã có mã phòng?</small><b>Tìm phòng</b></span><span className="cp-entry-arrow"><ArrowRight/></span></button>
        <button className="cp-entry cp-entry-create" onClick={()=>open('create')}><span className="cp-entry-art" aria-hidden="true"><Plus/></span><span className="cp-entry-copy"><small>Mời bạn bè cùng chơi</small><b>Tạo phòng</b></span><span className="cp-entry-arrow"><ArrowRight/></span></button>
      </div>
      <nav className="cp-home-launchpad" aria-label="Khám phá"><button onClick={()=>open('guide')}><BookOpen/><span>Cách chơi</span></button><button onClick={()=>open('inventory')}><Layers/><span>Bộ thẻ</span></button><button onClick={()=>open('settings')}><Settings/><span>Giao diện</span></button></nav>
    </div>
    <nav className="cp-home-variants" aria-label="Phương án trang chủ">{Object.entries(homeVariants).map(([key,label])=><button key={key} aria-pressed={variant===key} onClick={()=>choose(key as HomeVariant)}>{label}</button>)}</nav>
  </section>
  return <section className={`cp-home-study home-${variant}`}>
    <div className="cp-home-composition">
      <div className="cp-home-brand">
        {variant === 'friends' && <div className="cp-home-friends" aria-hidden="true">{[0,1,2,3].map(index=><img key={index} src={`/emcoin/avatars/orbit/0${index}.webp`} alt=""/>)}</div>}
        <img className="cp-home-master-logo" src="/logo.svg" alt="EmCoin"/>
        <h1>{variant === 'cards' ? 'Một thẻ bài.\nNhiều điều thấu hiểu.' : variant === 'friends' ? 'Cùng chơi.\nGần nhau hơn.' : 'Cùng chơi. Cùng thấu hiểu.'}</h1>
      </div>
      {variant === 'cards' && <button className="cp-home-card-fan" aria-label="Khám phá bộ thẻ" onClick={()=>open('inventory')}>{prototypeCards.filter(card=>card.category==='reflection').slice(0,3).map(card=><span key={card.id}><RealCardImage card={card} face="front"/></span>)}</button>}
      <div className="cp-home-play">
        <button className="cp-home-primary" onClick={()=>open('join')}><span className="cp-home-action-icon"><Users/></span><span><b>Tìm phòng</b>{variant!=='cloud'&&<small>Tham gia cùng bạn bè</small>}</span><ArrowRight/></button>
        <button className="cp-home-secondary" onClick={()=>open('create')}><span className="cp-home-action-icon"><Plus/></span><span><b>Tạo phòng</b>{variant!=='cloud'&&<small>Bắt đầu cuộc chơi mới</small>}</span><ArrowRight/></button>
      </div>
      <nav className="cp-home-shortcuts" aria-label="Khám phá"><button onClick={()=>open('guide')}><BookOpen/>Cách chơi</button><button onClick={()=>open('inventory')}><Layers/>Bộ thẻ</button></nav>
    </div>
    <nav className="cp-home-variants" aria-label="Phương án trang chủ">{Object.entries(homeVariants).map(([key,label])=><button key={key} aria-pressed={variant===key} onClick={()=>choose(key as HomeVariant)}>{label}</button>)}</nav>
  </section>
}
