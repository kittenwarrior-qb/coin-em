import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Flag, LockKeyhole, MessageCircle, Send, Settings, ShieldCheck } from 'lucide-react'
import { CHAT_STATES, type ChatState, type Message, type Panel } from './candyPrototypeModel'

export function PrototypeChat({messages,send,state,open}:{messages:Message[];send:(text:string)=>void;state:ChatState;open:(panel:Panel)=>void}) {
  const root=useRef<HTMLDivElement>(null)
  const [height,setHeight]=useState(Math.min(innerHeight-100,510))
  const [writing,setWriting]=useState(false),[draft,setDraft]=useState(''),[error,setError]=useState('')
  const [requestedPage,setRequestedPage]=useState<number|null>(null)
  useEffect(()=>{const element=root.current;if(!element)return;const observer=new ResizeObserver(([entry])=>setHeight(entry.contentRect.height));observer.observe(element);return()=>observer.disconnect()},[])
  const compact=height<350
  const chunkSize=height<470?60:90
  const items=messages.flatMap(message=>Array.from({length:Math.max(1,Math.ceil(message.text.length/chunkSize))},(_,part)=>({...message,text:message.text.slice(part*chunkSize,(part+1)*chunkSize),part})))
  const perPage=height>=400?2:1
  const total=Math.max(1,Math.ceil(items.length/perPage))
  const page=Math.min(requestedPage??total-1,total-1)
  const visible=items.slice(page*perPage,(page+1)*perPage)
  const restricted=state==='disabled'||state==='invite'
  const composing=!compact||writing
  const stateHint=state==='muted'?'Quản trò đang tắt quyền gửi tin của bạn.':state==='offline'?'Mất kết nối. Tin chưa được gửi.':state==='pending'?'Đang chờ xác nhận. Không gửi lặp tin.':state==='error'?'Gửi chưa thành công. Kiểm tra trạng thái trước khi thử lại.':'Không gửi link hoặc thông tin riêng tư.'
  return <div ref={root} className={`cp-friendly-chat ${compact?'is-compact':''} ${composing?'is-composing':''}`}>
    {!(compact&&writing)&&<div className="cp-chat-context"><LockKeyhole/><span>{state==='ready'?'Chỉ người được mời':CHAT_STATES[state]}</span><button className="cp-chat-settings" aria-label="Quản lý chat" onClick={()=>open('chat-settings')}><Settings/></button></div>}
    {(!compact||!writing)&&<>
      <div className="cp-conversation" aria-label="Lịch sử trò chuyện">
        {restricted?<div className="cp-chat-welcome"><span><ShieldCheck/></span><h3>{state==='disabled'?'Chat chưa được mở':'Cùng vào trò chuyện'}</h3><p>{state==='disabled'?'Quản trò sẽ mở chat khi cả phòng sẵn sàng.':'Dùng mã mời quản trò gửi để tham gia.'}</p><button className="cp-action" onClick={()=>open(state==='disabled'?'chat-settings':'chat-join')}>{state==='disabled'?'Quản lý chat mẫu':'Nhập mã mời'}</button></div>:
        visible.length?visible.map(item=><article className={`cp-chat-row ${item.sender==='Bạn'?'self':''}`} key={`${item.id}-${item.part}`}>
          <img className="cp-chat-avatar" src={`/emcoin/avatars/orbit/${item.sender==='Bạn'?'00':'01'}.webp`} alt=""/>
          <div className="cp-chat-bubble"><div className="cp-chat-author"><b>{item.sender}</b>{item.part>0&&<small>phần tiếp</small>}<button aria-label={`Báo cáo tin nhắn ${item.id}`} onClick={()=>open('report')}><Flag/></button></div><p>{item.text}</p></div>
        </article>):<div className="cp-chat-welcome"><span><MessageCircle/></span><h3>Bắt đầu trò chuyện</h3><p>Gửi một lời chào tới cả phòng.</p></div>}
      </div>
      {!restricted&&items.length>perPage&&<nav className="cp-chat-pages" aria-label="Lịch sử tin nhắn"><button aria-label="Tin nhắn trước" disabled={page===0} onClick={()=>setRequestedPage(page-1)}><ChevronLeft/></button><span>{page*perPage+1}–{Math.min((page+1)*perPage,items.length)} / {items.length} phần tin</span><button aria-label="Tin nhắn sau" disabled={page===total-1} onClick={()=>setRequestedPage(page+1)}><ChevronRight/></button></nav>}
    </>}
    {!restricted&&(composing?<form className="cp-chat-editor" onSubmit={event=>{event.preventDefault();if(!draft.trim()||state!=='ready')return;if(/https?:|www\.|@|\d{8}/i.test(draft)){setError('Bản thử không nhận link hoặc thông tin liên hệ.');return}send(draft.trim());setDraft('');setError('');setRequestedPage(null);setWriting(false)}}>
      <label htmlFor="cp-friendly-compose">Tin nhắn mẫu</label>
      <textarea id="cp-friendly-compose" rows={3} maxLength={90} placeholder="Chia sẻ với cả phòng…" value={draft} disabled={state!=='ready'} onChange={event=>{setDraft(event.target.value.replace(/\s+/g,' '));setError('')}}/>
      <div className="cp-chat-editor-actions">{compact&&<button type="button" className="cp-chat-back" aria-label="Về tin nhắn" onClick={()=>setWriting(false)}><ArrowLeft/></button>}<small>{draft.length}/90 · bản mẫu</small><button type="submit" className="cp-chat-send" aria-label="Gửi mẫu" disabled={!draft.trim()||state!=='ready'}><Send/><span>Gửi</span></button></div>
      <p className={`cp-chat-guidance ${error?'has-error':''}`} role={error?'alert':undefined}>{error||stateHint}</p>
    </form>:<button className="cp-chat-write" onClick={()=>setWriting(true)}><MessageCircle/><span>Soạn tin</span><Send/></button>)}
  </div>
}
