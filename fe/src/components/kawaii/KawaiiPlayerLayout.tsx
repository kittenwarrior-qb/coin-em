import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Layers, Users } from 'lucide-react'
import type { Player } from '@/components/game/types'
import { useBoardLayout } from '@/features/theme/boardLayout'

export interface PlayerSlot {player:Player|null;position:'top'|'bottom'|'left'|'right';index:number}
interface Props {players:Player[];renderPlayer:(slot:PlayerSlot)=>ReactNode;renderCenter:()=>ReactNode}
/** Presentation only: every token keeps the caller's existing permission-aware handlers. */
export function KawaiiPlayerLayout({players,renderPlayer,renderCenter}:Props){
 const layout=useBoardLayout(),root=useRef<HTMLDivElement>(null)
 const [height,setHeight]=useState(500),[tab,setTab]=useState<'table'|'players'>('table'),[page,setPage]=useState(0)
 useEffect(()=>{const node=root.current;if(!node||typeof ResizeObserver==='undefined')return;const observer=new ResizeObserver(([entry])=>setHeight(entry.contentRect.height));observer.observe(node);return()=>observer.disconnect()},[])
 const compact=height<(layout==='A'?430:440),paged=height<230
 const narrator=players.find(p=>p.isNarrator)??players[0],sender=players.find(p=>p.isSender&&p.id!==narrator?.id)
 const others=players.filter(p=>p.id!==narrator?.id&&p.id!==sender?.id)
 const seat=(p:Player,position:PlayerSlot['position'])=><div key={p.id} className="kawaii-seat">{renderPlayer({player:p,position,index:players.indexOf(p)})}</div>
 const lastPage=Math.max(0,Math.ceil(players.length/5)-1),current=Math.min(page,lastPage)
 const roster=<section className={`kawaii-roster ${paged?'paged':''}`} aria-label="Người chơi trong phòng" data-testid="kawaii-roster">
  <div className="kawaii-roster-heading"><h2><Users/>Người chơi · {players.length}</h2>{paged&&<nav aria-label="Trang người chơi"><button aria-label="Người chơi trước" disabled={current===0} onClick={()=>setPage(current-1)}><ArrowLeft/></button><small>{current+1}/{lastPage+1}</small><button aria-label="Người chơi sau" disabled={current===lastPage} onClick={()=>setPage(current+1)}><ArrowRight/></button></nav>}</div>
  <div className="kawaii-roster-grid">{(paged?players.slice(current*5,current*5+5):players).map(p=>seat(p,p.id===narrator?.id?'top':p.id===sender?.id?'bottom':'left'))}</div>
 </section>
 return <div ref={root} className={`kawaii-board layout-${layout} ${compact?'compact':''}`} data-testid="kawaii-board" data-layout={layout}>
  {compact&&<nav className="kawaii-tabs" aria-label="Bàn và người chơi"><button aria-pressed={tab==='table'} onClick={()=>setTab('table')}><Layers/>Bàn chơi</button><button aria-pressed={tab==='players'} onClick={()=>setTab('players')}><Users/>Người chơi ({players.length})</button></nav>}
  {compact?(tab==='players'?roster:<section className="kawaii-center">{renderCenter()}</section>):layout==='B'?<div className="kawaii-focused"><section className="kawaii-center">{renderCenter()}</section>{roster}</div>:<div className="kawaii-round">
   <div className="kawaii-seat-top">{narrator&&seat(narrator,'top')}</div><div className="kawaii-orbit"><div className="kawaii-seat-side">{others.filter((_,i)=>i%2===0).map(p=>seat(p,'left'))}</div><section className="kawaii-center">{renderCenter()}</section><div className="kawaii-seat-side">{others.filter((_,i)=>i%2===1).map(p=>seat(p,'right'))}</div></div><div className="kawaii-seat-bottom">{sender&&seat(sender,'bottom')}</div>
  </div>}
 </div>
}
