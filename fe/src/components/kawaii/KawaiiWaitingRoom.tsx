import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, LogOut, Users } from 'lucide-react'
import { CartoonAvatar, CartoonButton } from '@/components/cartoon'
interface WaitingPlayer {socketId:string;userId?:string;name:string;avatarIndex?:number;bgIndex?:number}
interface Props {
 roomId:string;players:WaitingPlayer[];myUserId?:string;hostId:string;onProfile:()=>void;onLeave:()=>void;
 isHost:boolean;startPending:boolean;startDisabled:boolean;onStart:()=>void;
 roundChoice:string;onRoundChoice:(value:string)=>void;roundDisabled:boolean;roundValid:boolean;confirmedValid:boolean;
 roundDirty:boolean;roundPending:boolean;roundMessage:string;saveRounds:()=>void;onAddFakePlayers?:()=>void;
 renderDebugRole?:(player:WaitingPlayer)=>ReactNode;
}
export function KawaiiWaitingRoom(p:Props){
 const [tab,setTab]=useState(0),[page,setPage]=useState(0),[height,setHeight]=useState(500),ref=useRef<HTMLDivElement>(null)
 useEffect(()=>{const node=ref.current;if(!node||typeof ResizeObserver==='undefined')return;const observer=new ResizeObserver(([entry])=>setHeight(entry.contentRect.height));observer.observe(node);return()=>observer.disconnect()},[])
 const paged=height<230,slots=Array.from({length:10},(_,i)=>p.players[i]??null),current=paged?Math.min(page,1):0
 return <div className="screen-panel kawaii-waiting">
  <header><button className="kawaii-tool" aria-label="Rời phòng" disabled={p.roundPending} onClick={p.onLeave}><LogOut/></button><img src="/cartoon/ui/themes/candy-clouds/coin-mark.webp" alt="EmCoin"/><div><h1>Phòng chờ</h1><p>Mã phòng: <b data-testid="room-id">{p.roomId}</b></p></div></header>
  <nav className="kawaii-tabs"><button aria-pressed={tab===0} onClick={()=>setTab(0)}><Users/>Người chơi ({p.players.length}/10)</button><button aria-pressed={tab===1} onClick={()=>setTab(1)}>Thiết lập{p.roundDirty?' · Chưa lưu':''}</button></nav>
  <div ref={ref} className="kawaii-waiting-body">
   {tab===0?<section className={`kawaii-waiting-roster ${paged?'paged':''}`} data-testid="player-list"><div className="kawaii-roster-heading"><h2>Người chơi <span data-testid="player-count">{p.players.length} / 10</span></h2>{paged&&<nav aria-label="Trang người chơi"><button aria-label="Người chơi trước" disabled={current===0} onClick={()=>setPage(0)}><ArrowLeft/></button><small>{current+1}/2</small><button aria-label="Người chơi sau" disabled={current===1} onClick={()=>setPage(1)}><ArrowRight/></button></nav>}</div>
    <div className="kawaii-roster-grid">{slots.slice(paged?current*5:0,paged?current*5+5:10).map((player,i)=>player?<div className="kawaii-waiting-person" key={player.socketId} data-testid={`waiting-player-${player.name}`}><button disabled={player.userId!==p.myUserId} aria-label={player.userId===p.myUserId?`Chỉnh hồ sơ của ${player.name}`:player.name} onClick={p.onProfile}><CartoonAvatar name={player.name} avatarIndex={player.avatarIndex??i} bgIndex={player.bgIndex??i} size="sm"/><b title={player.name}>{player.name}</b><small>{player.userId===p.hostId?'Chủ phòng':player.userId===p.myUserId?'Bạn':'Người chơi'}</small></button>{p.renderDebugRole?.(player)}</div>:<div className="kawaii-empty-seat" key={`empty-${i}`}><Users/><small>Chỗ trống</small></div>)}</div>
   </section>:<section className="kawaii-waiting-settings" aria-label="Số lượt chơi"><h2>Thiết lập ván chơi</h2><label>Số lượt<select aria-label="Số lượt chơi" value={p.roundChoice} onChange={e=>p.onRoundChoice(e.target.value)} disabled={p.roundDisabled}><option value="auto">Mỗi người một lượt ({p.players.length})</option>{Array.from({length:Math.min(p.players.length,10)},(_,i)=><option key={i+1} value={i+1}>{i+1} lượt</option>)}{!p.roundValid&&<option value={p.roundChoice}>{p.roundChoice} lượt (cần chọn lại)</option>}</select></label>
    {!p.confirmedValid&&<p role="alert">Số lượt vượt số người hiện có. Quản trò cần chọn lại trước khi bắt đầu.</p>}
    {p.roundChoice!=='auto'&&Number(p.roundChoice)<p.players.length&&<p>Ván ngắn: không phải tất cả người chơi đều có lượt làm Người Trao Gửi.</p>}
    {p.isHost&&p.roundDirty&&<CartoonButton pending={p.roundPending} disabled={!p.roundValid||p.roundDisabled} onClick={p.saveRounds}>Lưu số lượt</CartoonButton>}
    {p.roundMessage&&<p role="status">{p.roundMessage}</p>}
    {p.onAddFakePlayers&&p.players.length<10&&<CartoonButton color="pink" data-testid="btn-add-bots" onClick={p.onAddFakePlayers}>Thêm Bot</CartoonButton>}
   </section>}
  </div>
  <footer>{p.isHost?<CartoonButton className="w-full" pending={p.startPending} disabled={p.startDisabled} onClick={p.onStart} data-testid="btn-start-game">{p.players.length>=5?'Bắt đầu':`Cần đủ 5 người (${p.players.length}/5)`}<ArrowRight/></CartoonButton>:<p data-testid="waiting-for-host">Đang chờ chủ phòng bắt đầu…</p>}{p.roundDirty&&<button className="kawaii-resume" onClick={()=>setTab(1)}>Lưu số lượt trước khi bắt đầu</button>}</footer>
 </div>
}
