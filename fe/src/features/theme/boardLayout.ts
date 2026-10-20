import { useSyncExternalStore } from 'react'

export type BoardLayout = 'A' | 'B'
export const BOARD_LAYOUT_KEY = 'emcoin.board-layout.v1'
const event = 'emcoin:board-layout'
let sessionLayout: BoardLayout | undefined
function read(): BoardLayout {
  if(sessionLayout)return sessionLayout
  try { const value=localStorage.getItem(BOARD_LAYOUT_KEY); return value==='A'?'A':value==='B'?'B':'B' }
  catch { return sessionLayout??'B' }
}
function subscribe(notify:()=>void) {
  const storage=(change:StorageEvent)=>{if(change.key===BOARD_LAYOUT_KEY||change.key===null){sessionLayout=undefined;notify()}}
  window.addEventListener(event,notify);window.addEventListener('storage',storage)
  return ()=>{window.removeEventListener(event,notify);window.removeEventListener('storage',storage)}
}
export function chooseBoardLayout(layout:BoardLayout) {
  sessionLayout=layout
  try {localStorage.setItem(BOARD_LAYOUT_KEY,layout)}catch{/* Session-only on restricted devices. */}
  window.dispatchEvent(new Event(event))
}
export function useBoardLayout(){return useSyncExternalStore(subscribe,read,()=> 'B' as const)}
