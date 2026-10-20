import { motion, useReducedMotion } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import type { Panel } from './candyPrototypeModel'

/** One optical grid and stroke weight, scoped to this prototype only. */
function KawaiiActionIcon({ name }: { name:'friends'|'plus'|'cards'|'book'|'settings'|'headset' }) {
  const shapes = {
    friends: <><g className="kw-icon-detail"><circle cx="17" cy="8" r="3" fill="#ffd1e3"/><path d="M16 14h1a5 5 0 0 1 5 5v1"/></g><circle cx="8" cy="7" r="3.5" fill="#fff5dc"/><path d="M2 21v-2a6 6 0 0 1 12 0v2" fill="#e2f8ff"/></>,
    plus: <><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" fill="#fff5dc"/><path className="kw-icon-detail" d="M12 10v7M8.5 13.5h7"/></>,
    cards: <><rect x="3" y="4" width="13" height="17" rx="2.5" fill="#ffd1e3" transform="rotate(-9 9 13)"/><g className="kw-icon-detail"><rect x="8" y="3" width="13" height="17" rx="2.5" fill="#fff5dc"/><path d="M11.5 11c0-3 3-3 3-1 0-2 3-2 3 0 0 2-3 4-3 4s-3-2-3-3Z" fill="#f59bbb" strokeWidth="1.3"/></g></>,
    book: <><path d="M12 5C9 3 6 3 2 4v15c4-1 7-1 10 2Z" fill="#fff5dc"/><path className="kw-icon-detail" d="M12 5c3-2 6-2 10-1v15c-4-1-7-1-10 2Z" fill="#d5f3ff"/><path d="M5 8h3M16 8h3" strokeWidth="1.5"/></>,
    settings: <><path d="M12 3a9 9 0 1 0 0 18h1a2.5 2.5 0 0 0 1.8-4.2 1.5 1.5 0 0 1 1.1-2.6H18c5 0 3-11.2-6-11.2Z" fill="#fff5dc"/><circle cx="7" cy="9" r="1.5" fill="#5ac6df" stroke="none"/><circle cx="12" cy="6.5" r="1.5" fill="#ee91b8" stroke="none"/><circle className="kw-icon-detail" cx="17" cy="9" r="1.5" fill="#f6c858" stroke="none"/><circle cx="6.5" cy="14" r="1.5" fill="#ee91b8" stroke="none"/></>,
    headset: <><path d="M4 14v-3a8 8 0 0 1 16 0v3M20 18v1a3 3 0 0 1-3 3h-3"/><rect x="3" y="12" width="4" height="7" rx="2" fill="#e2f8ff"/><rect x="17" y="12" width="4" height="7" rx="2" fill="#ffd1e3"/><path className="kw-icon-detail" d="M10 13v3M13 11v6" strokeWidth="1.5"/></>,
  }
  return <svg className={`kw-action-icon kw-icon-${name}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>
}

/** Silhouette and tilted ellipses from the existing EmCoin logo.svg, simplified. */
export function KawaiiCoin({ className='', size, x, y }: {className?:string;size?:number;x?:number;y?:number}) {
  return <svg className={className} width={size??400} height={size??315} x={x} y={y} viewBox="0 0 400 315" fill="none" aria-hidden="true">
    <path d="m6.73 165.26s1.46 75.12 56.72 115.92c28.02 20.69 61.8 23.54 80.76 25.56 28.63 3.04 51.09-.5 69.7-3.57 21.64-3.57 50.49-8.33 80.43-23.74 19.78-10.19 83.92-43.21 94.64-109.19 6.64-40.92-10.4-75.17-20.09-91.23l-192 39.83L6.73 165.26Z" fill="#e7b579"/>
    <ellipse cx="188.91" cy="118.83" rx="188" ry="112.85" transform="rotate(-14.3 188.91 118.83)" fill="#f4d98f"/>
    <ellipse cx="187.4" cy="117.4" rx="143.07" ry="85.88" transform="rotate(-14.3 187.4 117.4)" fill="#fff0c5"/>
    <ellipse cx="185.56" cy="126.99" rx="131.88" ry="77.06" transform="rotate(-14.3 185.56 126.99)" fill="#f6ce86"/>
  </svg>
}

export function KawaiiButton({children,onClick,tone='blue',icon}:{children:ReactNode;onClick:()=>void;tone?:'blue'|'pink';icon:ReactNode}) {
  return <button type="button" className={`kw-button kw-${tone}`} onClick={onClick}>
    <span className="kw-button-surface" aria-hidden="true"/><span className="kw-button-icon" aria-hidden="true">{icon}</span><span className="kw-button-label">{children}</span>
  </button>
}

/** Preserve the original layered coin/lettering; ?brand=softcoin retains v5. */
export function KawaiiLogo() {
  const reduced=useReducedMotion()
  const [reaction,setReaction]=useState(0)
  const staticStudy=new URLSearchParams(window.location.search).get('study')==='crafted'
  const requested=new URLSearchParams(window.location.search).get('brand')
  const variant=requested==='type'||requested==='softcoin'?requested:'coin'
  return <button type="button" disabled={staticStudy} className={`kw-wordmark kw-brand-${variant}`} aria-label={staticStudy?'Logo EmCoin':'Chạm để logo EmCoin chuyển động'} data-brand={variant} data-reaction={reaction} onClick={()=>setReaction(value=>value+1)}>
    <svg className="kw-wordmark-lettering" viewBox={variant==='type'?'0 0 400 160':'0 0 400 315'} role="img" aria-label="EmCoin">
      <title>EmCoin</title>
      <motion.g key={reaction} style={{transformOrigin:'200px 160px'}} animate={!reduced&&reaction?{rotate:[0,-1.5,0]}:undefined} transition={{duration:.2,ease:'easeOut'}}>
        {variant==='coin'?<image className="kw-original-brand" href="/cartoon/ui/prototypes/kawaii/original-brand.svg" x="0" y="0" width="400" height="315" opacity={reduced&&reaction%2?.87:1}/>:<>
          {variant==='softcoin'&&<KawaiiCoin className="kw-logo-coin"/>}
          <text x="200" y={variant==='softcoin'?185:105} textAnchor="middle" fontFamily="CPQuicksand, sans-serif" fontWeight="700" fontSize="80" letterSpacing="-4" fill={reduced&&reaction%2?'#547c8b':'#346474'} stroke={variant==='softcoin'?'#fff5d9':'none'} strokeWidth="5" paintOrder="stroke fill" strokeLinejoin="round"><tspan>Em</tspan><tspan>Coin</tspan></text>
        </>}
      </motion.g>
    </svg>
  </button>
}

export function KawaiiHome({open}:{open:(value:Panel)=>void}) {
  return <section className="kw-home" aria-label="Trang chủ EmCoin">
    <svg className="kw-cloud-bank" viewBox="0 0 480 190" preserveAspectRatio="none" aria-hidden="true"><path d="M-16 110C-4 79 15 73 42 81C45 46 95 33 118 65C148 55 174 74 177 99C204 79 232 87 245 109C275 74 314 80 333 99C340 58 386 45 408 75C438 62 470 79 496 103V190H-16Z" fill="#fff"/><path d="M-10 170C13 132 55 133 80 155C105 116 157 120 174 154C207 135 240 146 252 165C279 130 324 131 342 158C369 132 409 137 424 157C452 130 478 140 496 158V190H-10Z" fill="#ffe3ef"/></svg>
    <div className="kw-home-core">
      <div className="kw-brand"><KawaiiLogo/></div>
      <div className="kw-home-actions"><KawaiiButton onClick={()=>open('join')} icon={<KawaiiActionIcon name="friends"/>}>Tìm phòng</KawaiiButton><KawaiiButton tone="pink" onClick={()=>open('create')} icon={<KawaiiActionIcon name="plus"/>}>Tạo phòng</KawaiiButton></div>
    </div>
  </section>
}

export function KawaiiMenu({open}:{open:(value:Panel)=>void}) {
  return <nav className="kw-menu" aria-label="Menu trang chủ">
    <KawaiiButton onClick={()=>open('inventory')} icon={<KawaiiActionIcon name="cards"/>}>Bộ thẻ</KawaiiButton>
    <KawaiiButton tone="pink" onClick={()=>open('guide')} icon={<KawaiiActionIcon name="book"/>}>Hướng dẫn</KawaiiButton>
    <KawaiiButton onClick={()=>open('settings')} icon={<KawaiiActionIcon name="settings"/>}>Giao diện</KawaiiButton>
    <KawaiiButton tone="pink" onClick={()=>open('support')} icon={<KawaiiActionIcon name="headset"/>}>Hỗ trợ</KawaiiButton>
  </nav>
}
