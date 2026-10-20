import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, Flag, Layers, MessageCircle, Minus, Plus, Settings, ShieldCheck, Users, WifiOff } from 'lucide-react'
import { PHASE_LABELS } from '@/stores/types'
import { PrototypeChat } from './CandyPrototypeChat'
import { CardPreview, RealCardImage } from './CandyPrototypeCards'
import { cardCategories, prototypeCards } from './candyPrototypeCatalog'
import { KawaiiMenu } from './CandyKawaiiHome'

import { CHAT_STATES, PANEL_LABELS, type Panel, type Message, type ChatState } from './candyPrototypeModel'
type Props = {
  panel: Panel; inHome:boolean; kawaii?:boolean; open: (panel: Panel) => void; close: () => void; layout: 'A'|'B'; chooseLayout:(v:'A'|'B')=>void;
  count:number; setCount:(v:number)=>void; step:number; setStep:(v:number)=>void; rounds:number; setRounds:(v:number)=>void;
  person:number; setPerson:(v:number)=>void; avatar:number; setAvatar:(v:number)=>void;
  previewId:string; previewCard:(id:string)=>void; selectCard:(id:string)=>void; wallet:number[]; give:(coin:number,quantity:number,person:number)=>void;
  log:string[]; messages:Message[]; send:(text:string)=>void; chatState:ChatState; setChatState:(v:ChatState)=>void;
  home:()=>void; waiting:()=>void; confirm:()=>void; notify:(text:string)=>void;
}
export function CoinArt({ index }: {index:number}) {
  const [light,fill,edge]=[['#c3e898','#8fbb52','#577d35'],['#ffe29a','#f3bd46','#b27c22'],['#ffb7b1','#e77574','#a94850']][index]
  return <svg className="cp-coin-art" viewBox="0 0 48 48" role="img" aria-label={`Coin ${['Xanh','Vàng','Đỏ'][index]}`}><circle cx="24" cy="26" r="21" fill={edge} opacity=".2"/><circle cx="24" cy="23" r="20" fill={fill} stroke={edge} strokeWidth="1.5"/><circle cx="24" cy="23" r="15.5" fill="none" stroke={light} strokeWidth="2"/><path d="M12 14a17 17 0 0 1 15-7" stroke={light} strokeWidth="2.5" strokeLinecap="round" fill="none"/><circle cx="18" cy="21" r="1.7" fill={edge}/><circle cx="30" cy="21" r="1.7" fill={edge}/><path d={index===0?'M16 27q8 10 16 0':index===1?'M18 29h12':'M17 31q7-9 14 0'} stroke={edge} strokeWidth="2.5" strokeLinecap="round" fill="none"/></svg>
}
export function Pager({page,total,setPage,label='Trang'}:{page:number;total:number;setPage:(n:number)=>void;label?:string}) {
  return <nav className="cp-pager" aria-label={label}><button className="cp-circle" aria-label={`${label} trước`} disabled={page===0} onClick={()=>setPage(page-1)}><ArrowLeft/></button><span>{page+1} / {Math.max(1,total)}</span><button className="cp-circle" aria-label={`${label} sau`} disabled={page>=total-1} onClick={()=>setPage(page+1)}><ArrowRight/></button></nav>
}
export function PrototypePanels(p:Props) {
  const refined=Boolean(p.kawaii&&new URLSearchParams(location.search).get('study')==='refined')
  const [page,setPage]=useState(0),[tab,setTab]=useState(0),[text,setText]=useState('')
  const [category,setCategory]=useState('reflection')
  const [inventoryHeight,setInventoryHeight]=useState(0)
  const inventoryRef=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    const element=inventoryRef.current
    if(!element)return
    const observer=new ResizeObserver(([entry])=>setInventoryHeight(entry.contentRect.height))
    observer.observe(element);return()=>observer.disconnect()
  },[])
  const [coin,setCoin]=useState(0),[quantity,setQuantity]=useState(1),[target,setTarget]=useState(p.person||1),[reason,setReason]=useState('harassment')
  const [blocked,setBlocked]=useState<number[]>([]),[muted,setMuted]=useState<number[]>([])
  const tabs=(items:string[])=><div className="cp-tabs">{items.map((item,i)=><button key={item} aria-pressed={tab===i} onClick={()=>{setTab(i);setPage(0)}}>{item}</button>)}</div>
  const action=(label:string,fn:()=>void,disabled=false)=><button className={`cp-action ${refined?'kw-panel-action':''}`} disabled={disabled} onClick={fn}>{refined&&<span className="kw-button-surface" aria-hidden="true"/>}<span>{label}</span><ArrowRight/></button>
  const hint=(text:string)=><p className="cp-hint">{text}</p>
  const character=(n:number)=><img className="cp-detail-avatar" src={`/emcoin/avatars/orbit/${String(n).padStart(2,'0')}.webp`} alt="Chân dung mẫu"/>
  if(p.panel==='menu') {
    if(p.kawaii&&p.inHome)return <KawaiiMenu open={p.open}/>
    const entries:[Panel,typeof BookOpen][]=p.inHome?[['inventory',Layers],['guide',BookOpen],['settings',Settings],['support',Flag]]:[['inventory',Layers],['chat',MessageCircle],['settings',Settings],['guide',BookOpen],['journal',BookOpen],['safety',ShieldCheck],['connection',WifiOff],['support',Flag],['leave',ArrowLeft]]
    const descriptions:Partial<Record<Panel,string>>={inventory:'Xem và khám phá bộ thẻ',chat:'Cùng trao đổi trong phòng',settings:'Chọn cách bạn muốn chơi',journal:'Nhìn lại các thao tác',guide:'Các bước chơi EmCoin',safety:'Chặn và quản lý quyền gửi',connection:'Kiểm tra kết nối phòng',support:'Hướng dẫn & quyền riêng tư',leave:'Trở về trang chủ'}
    return <nav className="cp-menu-single" aria-label={p.inHome?'Menu trang chủ':'Menu phòng chơi'}>{entries.map(([key,Icon])=><button key={key} className={`menu-${key}`} onClick={()=>p.open(key)}><span className="cp-menu-icon"><Icon/></span><span><b>{key==='settings'?'Giao diện':PANEL_LABELS[key]}</b><small>{descriptions[key]}</small></span></button>)}</nav>
  }
  if(p.panel==='settings')return <>{tabs(['Bố cục','Mô phỏng'])}<div className="cp-panel-fill">{tab===0?<>{(['A','B'] as const).map(v=><button key={v} className={`cp-settings-choice ${p.layout===v?'active':''}`} aria-pressed={p.layout===v} onClick={()=>p.chooseLayout(v)}><span className={`cp-mini mini-${v}`}><i/><i/><i/><i/><i/></span><span><b>{v==='A'?'A · Quây quần':'B · Tập trung'}</b><small>{v==='A'?'Ngồi quanh bàn tròn':'Thẻ lớn, danh sách riêng'}</small></span>{p.layout===v&&<Check/>}</button>)}{hint('Đổi bố cục không mất bước chơi hoặc thẻ đã chọn.')}</>:<><label>Số người mẫu<select value={p.count} onChange={e=>p.setCount(Number(e.target.value))}>{[6,7,8,9,10].map(n=><option key={n}>{n}</option>)}</select></label><label>Bước mô phỏng<select value={p.step} onChange={e=>p.setStep(Number(e.target.value))}>{Object.entries(PHASE_LABELS).map(([key,value],i)=><option key={key} value={i}>{i+1}. {value}</option>)}</select></label></>}</div></>
  if(p.panel==='chat')return <PrototypeChat messages={p.messages} send={p.send} state={p.chatState} open={p.open}/>
  if(p.panel==='chat-settings')return <>{hint('Các trạng thái dưới đây chỉ dùng duyệt UI, không mở chat thật.')}<label>Trạng thái chat<select value={p.chatState} onChange={e=>p.setChatState(e.target.value as ChatState)}>{Object.entries(CHAT_STATES).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label><div className="cp-panel-fill cp-centered"><ShieldCheck className="cp-hero-icon"/>{action('Người chơi & an toàn',()=>p.open('safety'))}{action('Trở về chat',()=>p.open('chat'))}</div></>
  if(refined&&(p.panel==='join'||p.panel==='create')){
    const creating=p.panel==='create'
    return <form className="kw-entry-form" onSubmit={event=>{event.preventDefault();if(text.trim())p.waiting()}}>
      <p className="kw-entry-intro">{creating?'Chọn tên hiển thị và số lượt để thử phòng chờ.':'Nhập mã bất kỳ để xem thử giao diện phòng chờ.'}</p>
      <label className="kw-entry-field">{creating?'Tên của bạn':'Mã phòng mẫu'}<span className="kw-entry-input"><Users aria-hidden="true"/><input value={text} maxLength={24} onChange={event=>setText(event.target.value)} placeholder={creating?'Bạn muốn được gọi là gì?':'Nhập mã phòng mẫu'} autoComplete="off" spellCheck={false}/></span></label>
      {creating&&<div className="kw-entry-rounds"><div><label htmlFor="kw-round-count">Số lượt chơi</label><small>Từ 1 đến {p.count} lượt.</small></div><select id="kw-round-count" value={p.rounds} onChange={event=>p.setRounds(Number(event.target.value))}>{Array.from({length:p.count},(_,index)=><option key={index} value={index+1}>{index+1} lượt</option>)}</select></div>}
      <button className={`kw-entry-submit ${creating?'kw-pink':''}`} type="submit" disabled={!text.trim()}><span className="kw-button-surface" aria-hidden="true"/><span>{creating?'Tạo phòng mẫu':'Vào phòng mẫu'}</span><ArrowRight aria-hidden="true"/></button>
      <p className="kw-entry-note"><ShieldCheck aria-hidden="true"/>Bản thử · Không tạo hoặc truy cập phòng thật.</p>
    </form>
  }
  if(p.panel==='chat-join'||p.panel==='join'||p.panel==='create')return <>{hint(p.panel==='chat-join'?'Mã dưới đây chỉ được kiểm tra trong prototype.':'Không tạo hoặc truy cập phòng thật.')}<label>{p.panel==='create'?'Tên của bạn':p.panel==='join'?'Mã phòng mẫu':'Mã mời mẫu'}<input value={text} maxLength={24} onChange={e=>setText(e.target.value)} placeholder={p.panel==='create'?'Tên hiển thị':'Nhập mã bất kỳ để thử'}/></label><div className="cp-panel-fill cp-centered">{p.panel==='create'?<label>Số lượt<select value={p.rounds} onChange={e=>p.setRounds(Number(e.target.value))}>{Array.from({length:p.count},(_,i)=><option key={i} value={i+1}>{i+1} lượt</option>)}</select></label>:hint('Không có dữ liệu hay lời mời nào được gửi lên máy chủ.')}</div>{action('Tiếp tục mẫu',()=>{if(p.panel==='chat-join'){p.setChatState('ready');p.open('chat')}else p.waiting()},!text.trim())}</>
  if(p.panel==='safety') {
    const n=Math.min(page+1,p.count-1)
    return <>{hint('Chặn với bạn và tắt gửi tin là hai quyền riêng. Chỉ thử UI.') }<div className="cp-member-card">{character(n)}<b>Người {n+1}</b><div className="cp-two-actions"><button className="cp-action outline" onClick={()=>setBlocked(blocked.includes(n)?blocked.filter(x=>x!==n):[...blocked,n])}>{blocked.includes(n)?'Bỏ chặn mẫu':'Chặn với tôi'}</button><button className="cp-action pink" onClick={()=>setMuted(muted.includes(n)?muted.filter(x=>x!==n):[...muted,n])}>{muted.includes(n)?'Cho gửi mẫu':'Tắt gửi mẫu'}</button></div></div><Pager page={page} total={p.count-1} setPage={setPage} label="Thành viên"/></>
  }
  if(p.panel==='report')return <>{hint('Báo cáo chỉ mô phỏng. Không gửi nội dung cho quản trị viên.')}<label>Lý do báo cáo<select value={reason} onChange={e=>setReason(e.target.value)}><option value="harassment">Quấy rối</option><option value="unsafe">Không an toàn</option><option value="privacy">Thông tin riêng tư</option><option value="other">Khác</option></select></label><div className="cp-panel-fill cp-centered"><Flag className="cp-hero-icon"/></div>{action('Gửi báo cáo mẫu',()=>{p.notify('Đã thử báo cáo; không gửi ra ngoài.');p.open('chat')})}</>
  if(p.panel==='card') {
    const card=prototypeCards.find(card=>card.id===p.previewId)??prototypeCards[0]
    return <CardPreview key={card.id} card={card} choose={()=>{p.selectCard(card.id);p.close()}}/>
  }
  if(p.panel==='inventory') {
    const cards=prototypeCards.filter(card=>card.category===category)
    const capacity=inventoryHeight>=(refined?410:270)?6:3
    const current=Math.min(page,Math.ceil(cards.length/capacity)-1)
    return <><label>Loại thẻ<select aria-label="Loại thẻ" value={category} onChange={event=>{setCategory(event.target.value);setPage(0)}}>{Object.entries(cardCategories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>{refined&&<p className="kw-catalog-meta"><span>{cards.length} thẻ · {cardCategories[category as keyof typeof cardCategories]}</span><span>Chạm để xem 2 mặt</span></p>}<div ref={inventoryRef} className="cp-inventory cp-real-inventory" data-capacity={capacity}>{cards.slice(current*capacity,current*capacity+capacity).map(card=><button key={card.id} data-card-id={card.id} aria-label={refined?`${card.code} · ${card.name}`:undefined} onClick={()=>{p.previewCard(card.id);p.open('card')}}><RealCardImage card={card} face="front"/>{refined?<span className="kw-catalog-caption"><b>{card.code}</b><small>{card.name}</small></span>:<span>{card.code}</span>}</button>)}</div><Pager page={current} total={Math.ceil(cards.length/capacity)} setPage={setPage} label="Bộ thẻ"/></>
  }
  if(p.panel==='gift')return <>{hint(`Bước ${page+1}/2 · Chỉ tặng Coin mẫu.`)}{page===0?<><div className="cp-coin-options">{p.wallet.map((amount,i)=><button key={i} className={coin===i?'active':''} aria-pressed={coin===i} onClick={()=>{setCoin(i);setQuantity(1)}}><CoinArt index={i}/><b>{['Xanh','Vàng','Đỏ'][i]}</b><small>Còn {amount}</small></button>)}</div><label>Tặng cho<select value={target} onChange={e=>setTarget(Number(e.target.value))}>{Array.from({length:p.count-1},(_,i)=><option key={i} value={i+1}>Người {i+2}</option>)}</select></label><div className="cp-panel-fill"/>{action('Chọn số lượng',()=>setPage(1),p.wallet[coin]===0)}</>:<><div className="cp-gift-summary"><CoinArt index={coin}/><b>Tặng Người {target+1}</b></div><div className="cp-quantity"><button className="cp-circle" aria-label="Giảm" disabled={quantity<=1} onClick={()=>setQuantity(quantity-1)}><Minus/></button><strong>{quantity}</strong><button className="cp-circle" aria-label="Tăng" disabled={quantity>=p.wallet[coin]} onClick={()=>setQuantity(quantity+1)}><Plus/></button></div><div className="cp-panel-fill"/><div className="cp-two-actions"><button className="cp-action outline" onClick={()=>setPage(0)}>Quay lại</button>{action('Xác nhận mẫu',()=>p.give(coin,quantity,target),p.wallet[coin]<quantity)}</div></>}</>
  if(p.panel==='player'||p.panel==='role')return <><div className="cp-member-card">{character(p.person===0?p.avatar:p.person)}<b>{p.person===0?'Bạn':`Người ${p.person+1}`}</b><p>{p.panel==='role'?'Quản trò · vai trò mẫu':p.person===1?'Người trao gửi':p.person===0?'Quản trò':'Thành viên phòng mẫu'}</p></div><div className="cp-two-actions">{p.person===0?action('Đổi chân dung',()=>p.open('avatar')):action('Tặng Coin mẫu',()=>p.open('gift'))}{action('An toàn',()=>p.open('safety'))}</div>{hint('Không mô phỏng quyền xem vai trò bí mật của phòng thật.')}</>
  if(p.panel==='avatar')return <>{hint('Bộ chân dung gốc EmCoin; chọn để xem thử.')}<div className="cp-avatar-picker">{Array.from({length:6},(_,i)=>page*6+i).filter(i=>i<13).map(i=><button key={i} aria-label={`Chọn chân dung ${i+1}`} className={p.avatar===i?'active':''} onClick={()=>p.setAvatar(i)}>{character(i)}{p.avatar===i&&<Check/>}</button>)}</div><Pager page={page} total={3} setPage={setPage} label="Chân dung"/></>
  if(p.panel==='journal')return <><div className="cp-journal-entry"><BookOpen className="cp-hero-icon"/><p>{p.log[page]??'Chưa có thao tác mẫu.'}</p></div><Pager page={page} total={p.log.length} setPage={setPage} label="Nhật ký"/></>
  if(p.panel==='response')return <>{hint('Chia sẻ thử trong prototype, không lưu lên máy chủ.')}<label>Nội dung chia sẻ<textarea value={text} rows={3} maxLength={90} onChange={e=>setText(e.target.value.replace(/\s+/g,' '))}/></label><small>{text.length}/90</small><div className="cp-panel-fill"/>{action('Chia sẻ mẫu',()=>{p.notify('Đã thử chia sẻ.');p.close()},!text.trim())}</>
  if(p.panel==='guess')return <><label>Chọn người chơi<select value={target} onChange={e=>setTarget(Number(e.target.value))}>{Array.from({length:p.count-1},(_,i)=><option key={i} value={i+1}>Người {i+2}</option>)}</select></label><div className="cp-panel-fill cp-centered">{character(target)}{hint('Chỉ minh họa lựa chọn, không chấm kết quả thật.')}</div>{action('Xác nhận lựa chọn mẫu',()=>{p.notify('Đã chọn Người '+(target+1)+' trong bản thử.');p.close()})}</>
  if(p.panel==='guide') {const copy=['Đây là prototype, không phải phòng chơi thật. Dùng nút Tiếp tục để duyệt 17 bước.',`Đổi A/B trong Menu → ${refined?'Giao diện':'Bố cục & bản thử'}. Thẻ đã chọn và bước chơi được giữ nguyên.`,'Màn hình thấp dùng tab Bàn chơi / Người chơi. Không có vùng cuộn; tin nhắn và nội dung dài phân trang.','Chat, chặn, báo cáo và Coin đều là mô phỏng cục bộ. Không có chat realtime hoặc voice trong bản này.'];const titles=['Duyệt ván mẫu','Chọn bố cục','Màn hình nhỏ','Giới hạn bản thử'];return <><div className={refined?'kw-help-content':'cp-guide-page'}><BookOpen className="cp-hero-icon"/>{refined&&<h3>{titles[page]}</h3>}<p>{copy[page]}</p></div><Pager page={page} total={copy.length} setPage={setPage} label="Hướng dẫn"/></>}
  if(p.panel==='connection')return <><div className="cp-guide-page"><WifiOff className="cp-hero-icon"/><h3>Mất kết nối · trạng thái mẫu</h3><p>Không tự gửi lại hành động khi chưa xác nhận kết quả.</p></div>{action('Thử kết nối lại mẫu',()=>{p.notify('Đã trở lại trạng thái bản thử.');p.close()})}</>
  if(p.panel==='confirm')return <><div className="cp-guide-page"><ArrowRight className="cp-hero-icon"/><h3>Chuyển sang bước tiếp theo?</h3><p>Đây chỉ là điều hướng để duyệt thiết kế.</p></div><div className="cp-two-actions"><button className="cp-action outline" onClick={p.close}>Ở lại</button>{action('Chuyển bước mẫu',p.confirm)}</div></>
  if(p.panel==='leave')return <><div className="cp-guide-page"><Users className="cp-hero-icon"/><h3>Rời phòng thử nghiệm?</h3><p>Không có phòng hay dữ liệu thật bị thay đổi.</p></div><div className="cp-two-actions"><button className="cp-action outline" onClick={p.close}>Ở lại</button>{action('Rời phòng mẫu',p.home)}</div></>
  return <><div className={refined?'kw-help-content':'cp-guide-page'}><ShieldCheck className="cp-hero-icon"/><h3>{refined?'Dữ liệu trong bản thử':'Hỗ trợ & quyền riêng tư'}</h3><p>Prototype không thu thập nội dung chat hay thông tin tài khoản. Tính năng trợ giúp thật chưa được kết nối.</p></div>{action('Xem hướng dẫn',()=>p.open('guide'))}</>
}
