import { useState } from 'react'
import { BookOpen, Settings } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

interface Props {onJoin:()=>void;onCreate:()=>void;onMenu:()=>void;onGuide:()=>void;onResume:()=>void;resumeCount:number}
function HomeIcon({create=false}:{create?:boolean}){
 return <svg data-kawaii-icon={create?'plus':'friends'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{create?<><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" fill="#fff5dc"/><path d="M12 10v7M8.5 13.5h7"/></>:<><circle cx="17" cy="8" r="3" fill="#ffd1e3"/><path d="M16 14h1a5 5 0 0 1 5 5v1"/><circle cx="8" cy="7" r="3.5" fill="#fff5dc"/><path d="M2 21v-2a6 6 0 0 1 12 0v2" fill="#e2f8ff"/></>}</svg>
}
export function KawaiiHome({onJoin,onCreate,onMenu,onGuide,onResume,resumeCount}:Props){
 const reduced=useReducedMotion(),[reaction,setReaction]=useState(0)
 return <div className="kawaii-home" data-testid="lobby-menu">
  <nav className="kawaii-home-tools" aria-label="Trợ giúp và cài đặt"><button onClick={onGuide} aria-label="Hướng dẫn"><BookOpen/></button><button onClick={onMenu} aria-label="Cài đặt"><Settings/></button></nav>
  <div className="kawaii-home-core">
   <motion.button className="kawaii-logo" aria-label="Logo EmCoin" onClick={()=>setReaction(v=>v+1)}>
    <motion.img key={reaction} id="home-logo" src="/cartoon/ui/themes/candy-clouds/coin-mark.webp" alt="EmCoin" animate={!reduced&&reaction?{rotate:[0,-2,1,0],scale:[1,1.018,.998,1]}:undefined} transition={{duration:.36,ease:'easeOut'}}/>
   </motion.button>
   <div className="kawaii-home-actions"><button className="kawaii-button" data-testid="btn-join-room" onClick={onJoin}><HomeIcon/><span>Tìm phòng</span></button><button className="kawaii-button pink" data-testid="btn-create-room" onClick={onCreate}><HomeIcon create/><span>Tạo phòng</span></button></div>
   {resumeCount>0&&<button className="kawaii-resume" onClick={onResume}>Tiếp tục phòng ({resumeCount})</button>}
  </div>
  <svg className="kawaii-clouds" viewBox="0 0 480 190" preserveAspectRatio="none" aria-hidden="true"><path d="M-16 110C-4 79 15 73 42 81C45 46 95 33 118 65C148 55 174 74 177 99C204 79 232 87 245 109C275 74 314 80 333 99C340 58 386 45 408 75C438 62 470 79 496 103V190H-16Z" fill="#fff"/><path d="M-10 170C13 132 55 133 80 155C105 116 157 120 174 154C207 135 240 146 252 165C279 130 324 131 342 158C369 132 409 137 424 157C452 130 478 140 496 158V190H-10Z" fill="#ffe3ef"/></svg>
 </div>
}
