import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { ControlThemeProvider } from '@/components/cartoon/ControlThemeProvider'
import { KawaiiChat } from '@/features/communication/KawaiiChat'
import type { ChatView } from '@/features/communication/chatClient'
import { GiveCoinPicker } from '@/components/game/GiveCoinPicker'
import { PlayerLayout } from '@/components/game/PlayerLayout'
import { chooseBoardLayout } from '@/features/theme/boardLayout'
import type { Player } from '@/components/game/types'
import { handlePlatformBack } from '@/features/overlays/usePopupLifecycle'

afterEach(async()=>{cleanup();await waitFor(()=>expect(handlePlatformBack()).toBe(false));localStorage.clear()})
const longText='A'.repeat(90)+'B'.repeat(90)+'C'.repeat(90)+'D'.repeat(90)+'E'.repeat(90)+'F'.repeat(50)
const view:ChatView={version:'room-chat/v1',roomId:'qa',revision:1,enabled:true,admitted:true,isHost:false,canSend:true,safetyAvailable:true,blocked:[],messages:[{id:'a1234567-1234-4123-8123-123456789abc',senderId:'qa-other',senderName:'QA người khác',text:longText,sentAt:1000}]}
function chatProps(){return {open:true,close:vi.fn(),view,userId:'qa-self',players:[],blocked:false,pending:false,connected:true,retry:false,onRetry:vi.fn(),error:'',text:'',setText:vi.fn(),invite:'',setInvite:vi.fn(),hostInvite:'',command:vi.fn(),reportId:'',setReportId:vi.fn(),reason:'harassment',setReason:vi.fn(),report:vi.fn()}}

it('paginates every character of a 500-character real chat message without losing its report identity',async()=>{
 const props=chatProps(),{container}=render(<ControlThemeProvider theme="candy-clouds"><KawaiiChat {...props}/></ControlThemeProvider>)
 await screen.findByRole('dialog',{name:'Chat phòng'})
 const previous=screen.getByRole('button',{name:'Tin nhắn trước'})
 while(!previous.hasAttribute('disabled'))fireEvent.click(previous)
 const parts:string[]=[]
 const next=screen.getByRole('button',{name:'Tin nhắn sau'})
 for(let index=0;index<6;index++){parts.push(container.ownerDocument.querySelector('.kawaii-chat-bubble>p')!.textContent!);if(next.hasAttribute('disabled'))break;fireEvent.click(next)}
 expect(parts.join('')).toBe(longText)
 fireEvent.click(screen.getByRole('button',{name:'Báo cáo tin nhắn'}))
 expect(props.setReportId).toHaveBeenCalledWith(view.messages[0].id)
})

it('keeps all draft parts when editing and sends the complete message through the supplied command',async()=>{
 const props=chatProps()
 function Draft(){const [text,setText]=useState('A'.repeat(90)+'B'.repeat(90)+'C'.repeat(50));return <KawaiiChat {...props} text={text} setText={setText}/>}
 render(<ControlThemeProvider theme="candy-clouds"><Draft/></ControlThemeProvider>)
 fireEvent.click(await screen.findByRole('button',{name:'Soạn tin'}))
 expect(screen.getByLabelText('Tin nhắn')).toHaveValue('A'.repeat(90))
 fireEvent.click(screen.getByRole('button',{name:'Phần tin sau'}))
 fireEvent.change(screen.getByLabelText('Tin nhắn'),{target:{value:'D'.repeat(90)}})
 fireEvent.click(screen.getByRole('button',{name:'Gửi'}))
 expect(props.command).toHaveBeenCalledWith({kind:'send',text:'A'.repeat(90)+'D'.repeat(90)+'C'.repeat(50)})
})

it('does not expose a usable send action while the real view forbids sending',async()=>{
 const props=chatProps()
 render(<ControlThemeProvider theme="candy-clouds"><KawaiiChat {...props} text="QA bản nháp" view={{...view,canSend:false}}/></ControlThemeProvider>)
 fireEvent.click(await screen.findByRole('button',{name:'Soạn tin'}))
 expect(screen.getByLabelText('Tin nhắn')).toBeDisabled()
 fireEvent.click(screen.getByRole('button',{name:'Gửi'}))
 expect(props.command).not.toHaveBeenCalled()
})

const players:Player[]=[0,1,2].map(index=>({id:`qa-${index}`,name:`QA ${index}`,role:'QA',isMe:index===0,isNarrator:index===0,isSender:index===1,coins:{red:0,green:2,yellow:2}}))
it('keeps finite-Coin eligibility and waits for the real gift acknowledgement',async()=>{
 const give=vi.fn().mockResolvedValue(false)
 render(<ControlThemeProvider theme="candy-clouds"><GiveCoinPicker players={players} myPlayer={players[0]} finiteCycle onGiveCoin={give} onClose={vi.fn()}/></ControlThemeProvider>)
 expect(screen.queryByRole('button',{name:/Đỏ ·/})).not.toBeInTheDocument()
 const recipient=screen.getByLabelText('Người nhận Coin')
 expect(recipient.querySelectorAll('option')).toHaveLength(2)
 fireEvent.change(recipient,{target:{value:'qa-1'}})
 fireEvent.click(screen.getByRole('button',{name:'Chọn số lượng'}))
 fireEvent.click(screen.getByRole('button',{name:'Xác nhận'}))
 await waitFor(()=>expect(give).toHaveBeenCalledWith('qa-1','green',1))
 await waitFor(()=>expect(screen.getByRole('button',{name:'Xác nhận'})).not.toBeDisabled())
 expect(screen.queryByText(/Đã tặng Coin/)).not.toBeInTheDocument()
 expect(give).toHaveBeenCalledOnce()
})

it('switches the live A/B presentation without duplicating players or changing selected-card state',()=>{
 chooseBoardLayout('B')
 function Board(){const [chosen,setChosen]=useState(false);return <PlayerLayout players={players} renderPlayer={({player})=><span data-seat={player?.id}>{player?.name}</span>} renderCenter={()=><button onClick={()=>setChosen(true)}>{chosen?'Đã chọn thẻ':'Chọn thẻ'}</button>}/>}
 const {container}=render(<ControlThemeProvider theme="candy-clouds"><Board/></ControlThemeProvider>)
 fireEvent.click(screen.getByRole('button',{name:'Chọn thẻ'}))
 act(()=>chooseBoardLayout('A'))
 expect(screen.getByTestId('kawaii-board')).toHaveAttribute('data-layout','A')
 expect(screen.getByRole('button',{name:'Đã chọn thẻ'})).toBeInTheDocument()
 expect([...container.querySelectorAll('[data-seat]')].map(el=>el.getAttribute('data-seat')).sort()).toEqual(players.map(p=>p.id).sort())
})
