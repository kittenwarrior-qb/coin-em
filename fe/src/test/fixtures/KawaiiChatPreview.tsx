import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { KawaiiChat } from '@/features/communication/KawaiiChat'
import type { ChatView } from '@/features/communication/chatClient'
import { ControlThemeProvider } from '@/components/cartoon/ControlThemeProvider'
import '@/index.css'

/** DEV-only presentation QA of the production component; no socket or real writes. */
// eslint-disable-next-line react-refresh/only-export-components
function ChatPreview(){
 const state=new URLSearchParams(location.search).get('state')??'ready'
 const [text,setText]=useState(''),[invite,setInvite]=useState(''),[reportId,setReportId]=useState(''),[reason,setReason]=useState('harassment')
 const admitted=!['disabled','invite'].includes(state),enabled=state!=='disabled',canSend=admitted&&enabled&&state!=='muted'
 const view:ChatView={version:'room-chat/v1',roomId:'qa-local-only',revision:1,enabled,admitted,canSend,isHost:state==='host'||state==='disabled',safetyAvailable:true,blocked:[],safetyMuted:[],messages:admitted?[{id:'a1234567-1234-4123-8123-123456789abc',senderId:'qa-other',senderName:'QA người chơi',text:'Đây là tin nhắn dài để kiểm tra cách phân trang. '.repeat(10).slice(0,500),sentAt:1000}]:[]}
 const pending=state==='pending',retry=state==='error',connected=state!=='offline'
 return <ControlThemeProvider root theme="candy-clouds"><div className="screen-cartoon"><div className="screen-panel bg-[#e8f7ff]"/></div><KawaiiChat open close={()=>{}} view={view} userId="qa-self" players={[{userId:'qa-other',name:'QA người chơi'}]} blocked={pending||retry||!connected} pending={pending} connected={connected} retry={retry} onRetry={()=>{}} error={retry?'Chưa xác nhận được kết quả. Kiểm tra lại đúng yêu cầu này trước khi gửi thao tác mới.':''} text={text} setText={setText} invite={invite} setInvite={setInvite} hostInvite={state==='host'?'a'.repeat(43):''} command={()=>{}} reportId={reportId} setReportId={setReportId} reason={reason} setReason={setReason} report={()=>{}}/><aside className="fixed top-0 right-0 z-[1000] bg-white text-[9px]">QA · Không kết nối chat</aside></ControlThemeProvider>
}
if(import.meta.env.DEV)createRoot(document.getElementById('root')!).render(<ChatPreview/>)
