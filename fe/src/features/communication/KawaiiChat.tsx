import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Flag, MessageCircle, Send, ShieldCheck } from 'lucide-react'
import { CartoonButton, CartoonModal } from '@/components/cartoon'
import { invitationCode, type ChatIntent, type ChatView } from './chatClient'

interface Props {
 open:boolean;close:()=>void;view:ChatView|null;userId:string;players:{userId?:string;name:string;isFake?:boolean}[];
 blocked:boolean;pending:boolean;connected:boolean;retry:boolean;onRetry:()=>void;error:string;
 text:string;setText:(text:string)=>void;invite:string;setInvite:(text:string)=>void;hostInvite:string;
 command:(intent:ChatIntent)=>void;reportId:string;setReportId:(id:string)=>void;reason:string;setReason:(reason:string)=>void;report:()=>void;
}
function PageNav({page,total,change,label}:{page:number;total:number;change:(page:number)=>void;label:string}){
 return <nav className="kawaii-chat-pages" aria-label={label}><button aria-label={`${label} trước`} disabled={page<=0} onClick={()=>change(page-1)}><ArrowLeft/></button><small>{page+1} / {Math.max(1,total)}</small><button aria-label={`${label} sau`} disabled={page>=total-1} onClick={()=>change(page+1)}><ArrowRight/></button></nav>
}
/** Bounded real chat presentation. No transport, authorization or retry decisions live here. */
export function KawaiiChat(p:Props){
 const [tab,setTab]=useState<'chat'|'write'|'manage'|'safety'>('chat'),[messagePage,setMessagePage]=useState<number|null>(null),[memberPage,setMemberPage]=useState(0),[draftPage,setDraftPage]=useState(0)
 const [dismissedNotice,setDismissedNotice]=useState('')
 const hasNotice=Boolean(p.error||!p.connected||p.retry),noticeKey=JSON.stringify([p.error,p.connected,p.retry]),noticeVisible=hasNotice&&dismissedNotice!==noticeKey
 const chunks=(p.view?.messages??[]).flatMap(message=>Array.from({length:Math.ceil(message.text.length/90)},(_,i)=>({message,text:message.text.slice(i*90,(i+1)*90),part:i+1,total:Math.ceil(message.text.length/90)})))
 const current=Math.max(0,Math.min(messagePage??chunks.length-1,chunks.length-1)),chunk=chunks[current]
 const members=p.players.filter(player=>player.userId&&player.userId!==p.userId&&!player.isFake),member=members[Math.min(memberPage,Math.max(0,members.length-1))]
 const textarea=useRef<HTMLTextAreaElement>(null)
 const [draftMetrics,setDraftMetrics]=useState<{width:number;lines:number;font:string}|null>(null)
 useEffect(()=>{
  const area=textarea.current;if(!p.open||!area||typeof ResizeObserver==='undefined')return
  let alive=true
  const measure=()=>{if(!alive)return;const style=getComputedStyle(area),next={width:Math.max(30,area.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-8),lines:Math.max(2,Math.floor((area.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom))/parseFloat(style.lineHeight))),font:`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`};setDraftMetrics(current=>current&&JSON.stringify(current)===JSON.stringify(next)?current:next)}
  const observer=new ResizeObserver(measure);observer.observe(area);measure();void document.fonts.ready.then(measure)
  return()=>{alive=false;observer.disconnect()}
 },[tab,noticeVisible,p.open])
 const draftParts=useMemo(()=>{
  const result:{start:number;end:number;text:string}[]=[]
  const context=draftMetrics?document.createElement('canvas').getContext('2d'):null
  if(context&&draftMetrics)context.font=draftMetrics.font
  let start=0
  while(start<p.text.length){
   let end=start,lines=1,line=''
   while(end<p.text.length){
    const character=String.fromCodePoint(p.text.codePointAt(end)!)
    if(context&&draftMetrics){
     if(character==='\n'){if(lines>=draftMetrics.lines&&end>start)break;lines++;line=''}
     else if(context.measureText(line+character).width>draftMetrics.width){if(lines>=draftMetrics.lines&&end>start)break;lines++;line=character}else line+=character
    }else if(end-start>=90)break
    end+=character.length
   }
   result.push({start,end,text:p.text.slice(start,end)});start=end
  }
  return result.length?result:[{start:0,end:0,text:''}]
 },[p.text,draftMetrics])
 const draft=Math.min(draftPage,draftParts.length-1),part=draftParts[draft],draftCount=draftParts.length,canWrite=!p.blocked&&Boolean(p.view?.canSend)
 return <CartoonModal open={p.open} title="Chat phòng" persistent={p.pending||p.retry} hideClose={p.pending||p.retry} onClose={p.close} className="kawaii-chat-modal">
  <div className="kawaii-chat-body">
   {noticeVisible?<div className="kawaii-chat-state"><ShieldCheck/><p role="status">{p.error||(!p.connected?'Mất kết nối. Chat sẽ tải lại khi mạng ổn định.':'Chưa xác nhận được kết quả.')}</p>{p.retry&&<CartoonButton disabled={p.pending||!p.connected} onClick={p.onRetry}>Kiểm tra lại yêu cầu</CartoonButton>}<button type="button" className="kawaii-resume" onClick={()=>setDismissedNotice(noticeKey)}>Xem chat và bản nháp</button></div>:<>
   <nav className="kawaii-tabs" aria-label="Chức năng chat">{([['chat','Tin nhắn'],['write','Soạn tin'],['manage','Quản lý chat'],['safety','An toàn']] as const).map(([key,label])=><button key={key} aria-pressed={tab===key} onClick={()=>{setTab(key);p.setReportId('')}} disabled={(key==='write'||key==='safety')&&!p.view?.admitted}>{label}</button>)}</nav>
   {hasNotice&&<button type="button" className="kawaii-chat-state-link" onClick={()=>setDismissedNotice('')}>Xem trạng thái kết nối / yêu cầu</button>}
   {p.reportId?<form className="kawaii-chat-state" onSubmit={event=>{event.preventDefault();p.report()}}><label>Lý do báo cáo<select disabled={p.blocked} value={p.reason} onChange={e=>p.setReason(e.target.value)}><option value="harassment">Quấy rối</option><option value="unsafe">Không an toàn</option><option value="privacy">Thông tin riêng tư</option><option value="other">Khác</option></select></label><p>Tin nhắn được lưu cho quản trị viên tối đa 7 ngày kể từ lúc gửi.</p><CartoonButton color="pink" type="submit" disabled={p.blocked||!p.view?.safetyAvailable}>Gửi báo cáo</CartoonButton><button disabled={p.pending||p.retry} onClick={()=>p.setReportId('')} type="button">Hủy</button></form>:
    tab==='chat'?<>
     <div className="kawaii-chat-conversation" aria-label="Tin nhắn gần đây">{chunk?<article className={`kawaii-chat-bubble ${chunk.message.senderId===p.userId?'self':''}`}><header><b>{chunk.message.senderName}</b><time dateTime={new Date(chunk.message.sentAt).toISOString()}>{new Date(chunk.message.sentAt).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</time></header><p>{chunk.text}</p><footer><small>{chunk.total>1?`Phần ${chunk.part}/${chunk.total}`:''}</small>{chunk.message.senderId!==p.userId&&<button aria-label="Báo cáo tin nhắn" disabled={p.blocked||!p.view?.safetyAvailable} onClick={()=>{p.setReportId(chunk.message.id);p.setReason('harassment')}}><Flag/>Báo cáo</button>}</footer></article>:<div className="kawaii-chat-empty"><MessageCircle/><p>{!p.view?'Đang tải chat…':!p.view.enabled?'Quản trò chưa mở chat phòng.':!p.view.admitted?'Nhập mã mời trong Quản lý chat để tham gia.':'Chưa có tin nhắn.'}</p></div>}</div>
     {chunks.length>0&&<PageNav page={current} total={chunks.length} change={setMessagePage} label="Tin nhắn"/>}
     <p className="kawaii-chat-privacy"><ShieldCheck/>Chỉ người được mời · Không gửi link hoặc thông tin riêng tư.</p>
    </>:tab==='write'?<form className="kawaii-chat-state" onSubmit={event=>{event.preventDefault();if(canWrite&&p.text.trim())p.command({kind:'send',text:p.text.trim()})}}>
     {!p.view?.canSend&&<p role="status">{p.view?.safetyAvailable?'Bạn đang bị quản trò tắt quyền gửi tin.':'Kho báo cáo chưa sẵn sàng. Tạm dừng gửi tin mới.'}</p>}
     <label>Tin nhắn<textarea ref={textarea} aria-label="Tin nhắn" value={part.text} maxLength={500-(p.text.length-part.text.length)} disabled={!canWrite} onChange={event=>p.setText(p.text.slice(0,part.start)+event.target.value+p.text.slice(part.end))}/></label>
     <div className="kawaii-chat-pages"><button type="button" aria-label="Phần tin trước" disabled={draft===0} onClick={()=>setDraftPage(draft-1)}><ArrowLeft/></button><small>Phần {draft+1}/{draftCount} · {p.text.length}/500</small><button type="button" aria-label="Phần tin sau" disabled={draft>=draftCount-1} onClick={()=>setDraftPage(draft+1)}><ArrowRight/></button></div>
     <CartoonButton type="submit" disabled={!canWrite||!p.text.trim()}><Send/>Gửi</CartoonButton>
    </form>:tab==='manage'?<div className="kawaii-chat-state">
     {p.view?.isHost?<><p>Tạo mã mới sẽ yêu cầu mọi người nhập lại. Hạn chế an toàn vẫn được giữ.</p><CartoonButton disabled={p.blocked||!p.view.safetyAvailable} onClick={()=>p.command({kind:'enable',invitation:invitationCode()})}>{p.view.enabled?'Đổi mã mời':'Mở chat & tạo mã mời'}</CartoonButton>{p.hostInvite&&<label>Mã mời (gửi riêng cho người chơi)<input readOnly value={p.hostInvite} onFocus={e=>e.target.select()}/></label>}{p.view.enabled&&<CartoonButton color="pink" disabled={p.blocked} onClick={()=>p.command({kind:'disable'})}>Tắt chat phòng</CartoonButton>}</>:<p>Quản trò quản lý mã mời và quyền gửi tin.</p>}
     {p.view?.enabled&&!p.view.admitted&&<form onSubmit={event=>{event.preventDefault();p.command({kind:'join',invitation:p.invite.trim()})}}><label>Mã mời từ quản trò<input autoComplete="off" maxLength={43} value={p.invite} disabled={p.blocked} onChange={e=>p.setInvite(e.target.value)}/></label><CartoonButton type="submit" disabled={p.blocked||!/^[A-Za-z0-9_-]{43}$/.test(p.invite.trim())}>Tham gia chat</CartoonButton></form>}
    </div>:<div className="kawaii-chat-state">
     {member&&p.view?<><h3>{member.name}</h3><CartoonButton disabled={p.blocked} onClick={()=>p.command({kind:'block',targetId:member.userId!,value:!p.view!.blocked.includes(member.userId!)})}>{p.view.blocked.includes(member.userId!)?'Bỏ chặn':'Chặn với tôi'}</CartoonButton>{p.view.isHost&&<CartoonButton color="pink" disabled={p.blocked} onClick={()=>p.command({kind:'mute',targetId:member.userId!,value:!p.view!.safetyMuted?.includes(member.userId!)})}>{p.view.safetyMuted?.includes(member.userId!)?'Cho gửi tin':'Tắt gửi tin'}</CartoonButton>}<PageNav page={Math.min(memberPage,members.length-1)} total={members.length} change={setMemberPage} label="Người chơi"/></>:<p>Chưa có người chơi khác.</p>}
    </div>}
   </>}
  </div>
 </CartoonModal>
}
