import { useState, type RefObject } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Minus, Plus, X } from 'lucide-react'
import { CartoonButton } from '@/components/cartoon'
import { BrandCoinIcon } from '@/components/game/BrandCoinIcon'
import type { CoinType, Player } from '@/components/game/types'
interface Props {
 dialogRef:RefObject<HTMLDivElement|null>;types:CoinType[];coin:CoinType;chooseCoin:(coin:CoinType)=>void;max:(coin:CoinType)=>number;
 amount:number;setAmount:(value:number)=>void;targets:Player[];target:string|null;chooseTarget:(id:string)=>void;
 locked:boolean;pending:boolean;canGive:boolean;give:()=>void;close:()=>void;success:string|null;again:()=>void;error:string|null;
}
const names={red:'Đỏ',yellow:'Vàng',green:'Xanh'}
export function KawaiiGift(p:Props){
 const [step,setStep]=useState(0),reduced=useReducedMotion()
 return <motion.div className="kawaii-gift-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={p.locked?undefined:p.close}>
  <motion.div className="kawaii-gift" ref={p.dialogRef} role="dialog" aria-modal="true" aria-label="Trao Coin" aria-busy={p.pending||undefined} tabIndex={-1} data-testid="give-coin-dialog" initial={reduced?false:{scale:.985}} animate={{scale:1}} onClick={e=>e.stopPropagation()}>
   <header><h2>Tặng Coin</h2><button className="kawaii-tool" aria-label="Đóng trao Coin" disabled={p.locked} onClick={p.close}><X/></button></header>
   {p.success?<div className="kawaii-gift-body"><Check/><p>Đã tặng Coin cho <b>{p.success}</b>.</p><CartoonButton onClick={()=>{setStep(0);p.again()}}>Tặng tiếp</CartoonButton></div>:<div className="kawaii-gift-body">
    <p className="kawaii-gift-step">Bước {step+1}/2 · {step===0?'Chọn Coin và người nhận':'Kiểm tra số lượng'}</p>
    {step===0?<>
     <div className="kawaii-gift-coins">{p.types.map(coin=><button key={coin} aria-label={`${names[coin]} · ${p.max(coin)}`} aria-pressed={p.coin===coin} disabled={p.locked||p.max(coin)<=0} onClick={()=>p.chooseCoin(coin)}><BrandCoinIcon type={coin} workshop={false}/><b>{names[coin]}</b><small>Còn {p.max(coin)}</small></button>)}</div>
     <label>Tặng cho<select aria-label="Người nhận Coin" value={p.targets.some(target=>target.id===p.target)?p.target??'':''} disabled={p.locked} onChange={e=>p.chooseTarget(e.target.value)}><option value="">Chọn người nhận</option>{p.targets.map(target=><option key={target.id} value={target.id}>{target.name}</option>)}</select></label>
     <CartoonButton disabled={p.locked||!p.target||!p.targets.some(target=>target.id===p.target)||p.max(p.coin)<=0} onClick={()=>setStep(1)}>Chọn số lượng<ArrowRight/></CartoonButton>
    </>:<>
     <div className="kawaii-gift-summary"><BrandCoinIcon type={p.coin} workshop={false}/><span>{names[p.coin]} → {p.targets.find(target=>target.id===p.target)?.name??'Người nhận không còn trong phòng'}</span></div>
     <div className="kawaii-gift-quantity"><button className="kawaii-tool" aria-label="Giảm số Coin" disabled={p.locked||p.amount<=1} onClick={()=>p.setAmount(p.amount-1)}><Minus/></button><b>{p.amount}</b><button className="kawaii-tool" aria-label="Tăng số Coin" disabled={p.locked||p.amount>=p.max(p.coin)} onClick={()=>p.setAmount(p.amount+1)}><Plus/></button></div>
     <div className="kawaii-gift-actions"><CartoonButton color="white" disabled={p.locked} onClick={()=>setStep(0)}><ArrowLeft/>Quay lại</CartoonButton><CartoonButton pending={p.pending} disabled={!p.canGive} onClick={p.give}>Xác nhận</CartoonButton></div>
    </>}
    {p.error&&<p role="alert">{p.error}</p>}
   </div>}
  </motion.div>
 </motion.div>
}
