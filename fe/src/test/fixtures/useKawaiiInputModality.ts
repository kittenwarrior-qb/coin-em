import { useEffect } from 'react'

/** Keep keyboard focus visible without leaving a pressed-looking pointer ring. */
export function useKawaiiInputModality() {
  useEffect(()=>{
    const root=document.documentElement
    const previous=root.dataset.kwInput
    const pointer=()=>{root.dataset.kwInput='pointer'}
    const keyboard=(event:KeyboardEvent)=>{if(event.key==='Tab')root.dataset.kwInput='keyboard'}
    pointer()
    document.addEventListener('pointerdown',pointer,true)
    document.addEventListener('keydown',keyboard,true)
    return ()=>{
      document.removeEventListener('pointerdown',pointer,true)
      document.removeEventListener('keydown',keyboard,true)
      if(previous===undefined)delete root.dataset.kwInput
      else root.dataset.kwInput=previous
    }
  },[])
}
