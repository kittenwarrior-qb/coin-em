import { motion, useReducedMotion } from 'framer-motion'
import { CONTROL_MOTION } from '@/components/cartoon/controlTokens'
import type { Panel } from './candyPrototypeModel'

/** Original bundled sprites and control motion. No generated replacement art. */
export function RicimiHome({ open }: { open: (panel: Panel) => void }) {
  const reduced=useReducedMotion()
  return <section className="cp-ricimi-home" aria-label="Trang chủ EmCoin">
    <div className="cp-ricimi-core">
      <img className="cp-ricimi-logo" src="/emcoin_logo.png" alt="Hành trình EmCoin · Board Game" draggable={false}/>
      <div className="cp-ricimi-actions">{([{label:'Tìm phòng',file:'Teal',panel:'join'},{label:'Tạo phòng',file:'Pink',panel:'create'}] as const).map(item=><motion.button key={item.panel} className="cp-ricimi-button" onClick={()=>open(item.panel)} whileTap={reduced?undefined:CONTROL_MOTION.pill.press} whileHover={reduced?undefined:CONTROL_MOTION.pill.hover} transition={CONTROL_MOTION.pill.return}>
        <img src={`/cartoon/buttons/pill/${item.file}.png`} alt="" draggable={false}/><span>{item.label}</span>
      </motion.button>)}</div>
    </div>
  </section>
}
