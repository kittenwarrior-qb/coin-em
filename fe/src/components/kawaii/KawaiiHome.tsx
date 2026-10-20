import { useState } from 'react'
import { BookOpen, Settings, Pause, Play } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

interface Props {onJoin:()=>void;onCreate:()=>void;onMenu:()=>void;onGuide:()=>void;onResume:()=>void;resumeCount:number}
function HomeIcon({create=false}:{create?:boolean}){
 return <svg data-kawaii-icon={create?'plus':'friends'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{create?<><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" fill="#fff5dc"/><path d="M12 10v7M8.5 13.5h7"/></>:<><circle cx="17" cy="8" r="3" fill="#ffd1e3"/><path d="M16 14h1a5 5 0 0 1 5 5v1"/><circle cx="8" cy="7" r="3.5" fill="#fff5dc"/><path d="M2 21v-2a6 6 0 0 1 12 0v2" fill="#e2f8ff"/></>}</svg>
}
export function KawaiiHome({onJoin,onCreate,onMenu,onGuide,onResume,resumeCount}:Props){
 const reduced=useReducedMotion(),[reaction,setReaction]=useState(0),[paused,setPaused]=useState(false)
 return <div className="kawaii-home" data-testid="lobby-menu" data-motion-paused={paused||reduced?'true':undefined}>
  <nav className="kawaii-home-tools" aria-label="Trợ giúp và cài đặt"><button onClick={onGuide} aria-label="Hướng dẫn"><BookOpen/></button><button onClick={onMenu} aria-label="Cài đặt"><Settings/></button></nav>
  <div className="kawaii-home-core">
   <motion.button className="kawaii-logo" aria-label="Logo EmCoin" onClick={()=>setReaction(v=>v+1)} whileTap={reduced?undefined:{y:3,scale:.98}} transition={{duration:.12,ease:'easeOut'}}>
    <span className="kawaii-logo-float"><motion.img key={reaction} id="home-logo" src="/cartoon/ui/themes/candy-clouds/coin-mark.webp" alt="EmCoin" animate={!reduced&&reaction?{rotate:[0,-2,1,0],scale:[1,1.018,.998,1]}:undefined} transition={{duration:.36,ease:'easeOut'}}/></span>
   </motion.button>
   <div className="kawaii-home-actions"><button className="kawaii-button" data-testid="btn-join-room" onClick={onJoin}><HomeIcon/><span>Tìm phòng</span></button><button className="kawaii-button pink" data-testid="btn-create-room" onClick={onCreate}><HomeIcon create/><span>Tạo phòng</span></button></div>
   {resumeCount>0&&<button className="kawaii-resume" onClick={onResume}>Tiếp tục phòng ({resumeCount})</button>}
  </div>
  <svg className="kawaii-clouds" viewBox="0 0 480 190" preserveAspectRatio="none" aria-hidden="true"><path className="kawaii-cloud-back" d="M-96 110C-68 79-45 73-18 81C-15 46 35 33 58 65C88 55 114 74 117 99C144 79 172 87 185 109C215 74 254 80 273 99C280 58 326 45 348 75C378 62 410 79 436 103C460 66 511 63 536 94C563 70 593 78 596 110V200H-96Z" fill="#fff"/><path className="kawaii-cloud-front" d="M-96 170C-73 132-31 133-6 155C19 116 71 120 88 154C121 135 154 146 166 165C193 130 238 131 256 158C283 132 323 137 338 157C366 130 392 140 410 158C435 121 479 128 501 158C531 136 570 143 596 166V200H-96Z" fill="#ffe3ef"/></svg>
  {!reduced&&<button className="kawaii-motion-toggle" onClick={()=>setPaused(value=>!value)} aria-label={paused?'Bật chuyển động nền':'Tạm dừng chuyển động nền'} aria-pressed={paused} title={paused?'Bật chuyển động nền':'Tạm dừng chuyển động nền'}>{paused?<Play/>:<Pause/>}</button>}
 </div>
}
