import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowLeft, ArrowRight, BookOpen, Check, Gift, Layers, MessageCircle, Moon, Settings, Users, X } from 'lucide-react'
import { PHASE_LABELS, type GamePhase } from '@/stores/types'
import { CandyIcon } from '@/components/cartoon/CandyIcon'
import { CoinArt, Pager, PrototypePanels } from './CandyPrototypePanels'
import { RealCardImage } from './CandyPrototypeCards'
import { cardsForPhase } from './candyPrototypeCatalog'
import { PrototypeHome, type HomeVariant } from './CandyPrototypeHome'
import { useKawaiiInputModality } from './useKawaiiInputModality'
import { CHAT_STATES, PANEL_LABELS, type ChatState, type Message, type Panel } from './candyPrototypeModel'
import './candyPrototypes.css'
import './candyPrototypeFriendly.css'
import './candyPrototypeReference.css'
import './candyPrototypeHome.css'
import './candyPrototypeKawaii.css'
import './candyPrototypeCrafted.css'
import './candyPrototypeDialogs.css'
import './candyPrototypeGame.css'

// Isolated DEV-only design prototype: no sockets, backend calls or real gameplay writes.
const phases=Object.keys(PHASE_LABELS) as GamePhase[]
const params=new URLSearchParams(location.search)
const study=['crafted','refined'].includes(params.get('study')??'')?params.get('study'):undefined
type Layout='A'|'B'
type Screen='home'|'waiting'|'board'
function initialLayout():Layout {try{return(params.get('layout')??localStorage.getItem('emcoin.prototype.layout'))==='A'?'A':'B'}catch{return'B'}}
function validPanel(value:string|null):Panel|null {return value&&Object.prototype.hasOwnProperty.call(PANEL_LABELS,value)?value as Panel:null}

export function Prototype() {
  useKawaiiInputModality()
  const [layout,setLayout]=useState<Layout>(initialLayout)
  const [homeVariant,setHomeVariant]=useState<HomeVariant>(params.get('home')==='kawaii'?'kawaii':params.get('home')==='ricimi'?'ricimi':params.get('home')==='friends'?'friends':params.get('home')==='cards'?'cards':params.get('home')==='cloud'?'cloud':'table')
  const [screen,setScreen]=useState<Screen>(params.get('screen')==='home'?'home':params.get('screen')==='waiting'?'waiting':'board')
  const [count,setCount]=useState(Math.min(10,Math.max(6,Number(params.get('count'))||10)))
  const [step,setStep]=useState(Math.max(0,phases.indexOf(params.get('phase') as GamePhase)<0?8:phases.indexOf(params.get('phase') as GamePhase)))
  const [rounds,setRounds]=useState(Math.min(count,Math.max(1,Number(params.get('rounds'))||3))),[round,setRound]=useState(1)
  const [panel,setPanel]=useState<Panel|null>(validPanel(params.get('panel')))
  const [person,setPerson]=useState(1),[avatar,setAvatar]=useState(0),[selected,setSelected]=useState<string|null>(null)
  const [previewId,setPreviewId]=useState(()=>cardsForPhase(params.get('phase')??'reflection-card')[0].id)
  const [wallet,setWallet]=useState([2,2,0]),[log,setLog]=useState<string[]>([]),[toast,setToast]=useState('')
  const [messages,setMessages]=useState<Message[]>([{id:1,sender:'Người 2',text:'Mọi người đã sẵn sàng chưa?'},{id:2,sender:'Bạn',text:'Mình sẵn sàng. Cùng lắng nghe nhau nhé.'}])
  const [chatState,setChatState]=useState<ChatState>('ready')
  const [boardTab,setBoardTab]=useState<'table'|'players'>('table'),[waitingTab,setWaitingTab]=useState(0),[playerPage,setPlayerPage]=useState(0)
  const [arenaSize,setArenaSize]=useState({width:Math.min(innerWidth,480),height:Math.max(100,innerHeight-240)})
  const arena=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null)
  const closing=useRef(false)
  const phase=phases[step]
  const isNight=['night','healer-turn','silencer-turn'].includes(phase)&&screen==='board'
  const compact=arenaSize.height<(layout==='A'?400:305)
  const rows=Math.ceil((count-2)/2)
  const deck=phase==='reflection-card'||phase==='reflection-sharing'?'Phản tư':phase==='situation-card'?'Tình huống':['selfcare-card','hug-action'].includes(phase)?'Bí kíp ôm':'Cảm xúc'

  useEffect(()=>{
    const viewport=window.visualViewport
    const resize=()=>document.documentElement.style.setProperty('--screen-h',`${viewport?.height??innerHeight}px`)
    resize();viewport?.addEventListener('resize',resize);window.addEventListener('resize',resize)
    return()=>{viewport?.removeEventListener('resize',resize);window.removeEventListener('resize',resize)}
  },[])
  useEffect(()=>{
    const element=arena.current
    if(!element)return
    const observer=new ResizeObserver(([entry])=>setArenaSize({width:entry.contentRect.width,height:entry.contentRect.height}))
    observer.observe(element);return()=>observer.disconnect()
  },[screen])
  useEffect(()=>{
    if(panel&&!dialog.current?.open)dialog.current?.showModal()
    else if(!panel&&dialog.current?.open)dialog.current.close()
  },[panel])
  useEffect(()=>{if(!toast)return;const timer=window.setTimeout(()=>setToast(''),3200);return()=>clearTimeout(timer)},[toast])
  function chooseLayout(value:Layout){setLayout(value);try{localStorage.setItem('emcoin.prototype.layout',value)}catch{/* session-only fallback */}}
  function changeCount(value:number){setCount(value);setRounds(Math.min(rounds,value));setPerson(Math.min(person,value-1))}
  function move(value:number){setStep(Math.min(phases.length-1,Math.max(0,value)));setSelected(null);setBoardTab('table')}
  function open(value:Panel){setPanel(value)}
  function closePanel(){
    if(closing.current)return
    const card=dialog.current?.querySelector('.cp-real-preview')
    if(panel==='card'&&card&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      closing.current=true
      card.animate([{transform:'perspective(1000px) rotateX(0deg) scale(1)',opacity:1},{transform:'perspective(1000px) translateY(35px) rotateX(55deg) scale(.65)',opacity:0}],{duration:220,easing:'ease-in',fill:'forwards'}).finished.finally(()=>{closing.current=false;setPanel(null)})
    }else if(homeVariant==='kawaii'&&params.get('study')!=='crafted'&&dialog.current&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      closing.current=true
      dialog.current.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'translateY(8px) scale(.95)'}],{duration:160,easing:'ease-in',fill:'forwards'}).finished.finally(()=>{closing.current=false;dialog.current?.close();setPanel(null);dialog.current?.getAnimations().forEach(animation=>animation.cancel())})
    }else setPanel(null)
  }
  function changeScreen(value:Screen){setPanel(null);setScreen(value);setBoardTab('table')}
  function player(index:number,small=false){return <button key={index} className={`cp-player ${small?'compact':''} ${index===0?'host':''} ${index===1?'sender':''}`} aria-label={`Xem ${index===0?'Bạn':`Người ${index+1}`}`} onClick={()=>{setPerson(index);open('player')}}><span className="cp-portrait"><img src={`/emcoin/avatars/orbit/${String(index===0?avatar:index).padStart(2,'0')}.webp`} alt=""/></span><span className="cp-name">{index===0?'Bạn':`Người ${index+1}`}</span>{index<2&&<span className="cp-role">{index===0?'Quản trò':'Người trao gửi'}</span>}</button>}
  function roster(){const paged=arenaSize.height<230;const current=Math.min(playerPage,Math.ceil(count/5)-1);return <section className={`cp-roster-panel ${paged?'paged':''}`}><div className="cp-roster-head"><h2><Users/>Người chơi · {count}</h2>{paged&&<Pager page={current} total={Math.ceil(count/5)} setPage={setPlayerPage} label="Người chơi"/>}</div><div className="cp-roster">{Array.from({length:count},(_,i)=>i).slice(paged?current*5:0,paged?current*5+5:count).map(i=>player(i,true))}</div></section>}
  function stage(){
    const isCards=['situation-card','emotion-card','reflection-card','selfcare-card'].includes(phase)
    const cardCount=['situation-card','selfcare-card'].includes(phase)?1:phase==='emotion-card'?2:3
    return <div className={`cp-stage-content ${isCards?'has-cards':''}`}>{isCards?<><span className="cp-deck-label">{deck}</span><div className="cp-cards" key={phase}>{cardsForPhase(phase).slice(0,cardCount).map((card,index)=><button key={card.id} data-card-id={card.id} style={{'--card-delay':`${index*65}ms`} as CSSProperties} className={`cp-card cp-real-card ${selected===card.id?'selected':''}`} aria-label={`Xem thẻ ${deck} ${index+1}`} onClick={()=>{setPreviewId(card.id);open('card')}}><RealCardImage card={card} face={selected===card.id?'front':'back'}/>{selected===card.id&&<Check className="cp-selected-mark"/>}</button>)}</div><p className="cp-status">{selected===null?'Người trao gửi đang chọn thẻ':'Đã chọn thẻ trong bản thử'}</p></>:
    isNight?<><Moon className="cp-hero-icon"/><h2>{phase==='night'?'Cả phòng nhắm mắt':PHASE_LABELS[phase]}</h2><p>Chờ vai trò thực hiện.</p><button className="cp-action" onClick={()=>open('confirm')}>Xem xác nhận mẫu<ArrowRight/></button></>:
    phase==='give-coins'?<><Gift className="cp-hero-icon"/><h2>Trao theo cảm nhận</h2><p>Không bắt buộc sử dụng hết Coin.</p><button className="cp-action pink" onClick={()=>open('gift')}>Tặng Coin<ArrowRight/></button></>:
    phase==='role-reveal'?<><CandyIcon name="cards" className="cp-hero-icon"/><h2>Nhận vai trò</h2><button className="cp-action" onClick={()=>{setPerson(0);open('role')}}>Xem vai trò mẫu<ArrowRight/></button></>:
    phase==='ended'?<><Users className="cp-hero-icon"/><h2>Cảm ơn vì đã lắng nghe</h2><button className="cp-action" onClick={()=>changeScreen('waiting')}>Về phòng chờ<ArrowRight/></button></>:
    phase==='reward'?<><Gift className="cp-hero-icon"/><h2>Khép lại lượt {round}</h2><button className="cp-action" onClick={()=>{setRound(Math.min(rounds,round+1));move(round<rounds?0:16)}}>{round<rounds?'Bắt đầu lượt tiếp':'Kết thúc ván'}<ArrowRight/></button></>:
    <><CandyIcon name={phase.includes('silencer')?'help':phase==='hug-action'?'gift':'book'} className="cp-hero-icon"/><h2>{PHASE_LABELS[phase]}</h2><p>{phase==='story-telling'?'Người trao gửi chia sẻ câu chuyện.':phase==='group-response'?'Lắng nghe và phản hồi.':phase==='reflection-sharing'?'Chia sẻ suy nghĩ từ thẻ Phản tư.':'Cùng hoàn thành bước chơi.'}</p><button className="cp-action" onClick={()=>open(phase==='guess-silencer'?'guess':phase==='reveal-silencer'?'role':'response')}>{phase==='guess-silencer'?'Chọn người chơi':'Mở thao tác mẫu'}<ArrowRight/></button></>}</div>
  }
  const tabBar=<div className="cp-board-tabs cp-tabs"><button aria-pressed={boardTab==='table'} onClick={()=>setBoardTab('table')}><Layers/>Bàn chơi</button><button aria-pressed={boardTab==='players'} onClick={()=>setBoardTab('players')}><Users/>Người chơi ({count})</button></div>
  return <div className="cp-workbench">
    <aside className="cp-tools"><a className="cp-tools-brand" href="/candy-prototypes.html">EmCoin<span>Prototype · Không cuộn</span></a><fieldset><legend>Bố cục bàn chơi</legend>{(['A','B'] as const).map(v=><button key={v} className={`cp-layout-choice ${layout===v?'active':''}`} aria-pressed={layout===v} onClick={()=>chooseLayout(v)}><span className={`cp-mini mini-${v}`}><i/><i/><i/><i/><i/></span><span><b>{v==='A'?'A · Quây quần':'B · Tập trung'}</b><small>{v==='A'?'Bàn tròn, cùng kết nối':'Ưu tiên thẻ và thao tác'}</small></span>{layout===v&&<Check/>}</button>)}</fieldset>
      <label>Màn hình<select value={screen} onChange={e=>changeScreen(e.target.value as Screen)}><option value="home">Trang chủ</option><option value="waiting">Phòng chờ</option><option value="board">Bàn chơi</option></select></label>
      <label>Số người mẫu<select value={count} onChange={e=>changeCount(Number(e.target.value))}>{[6,7,8,9,10].map(n=><option key={n}>{n}</option>)}</select></label>
      <label>Bước chơi<select value={step} onChange={e=>{move(Number(e.target.value));setScreen('board')}}>{phases.map((key,i)=><option value={i} key={key}>{i+1}. {PHASE_LABELS[key]}</option>)}</select></label>
      <label>Duyệt tính năng<select value={panel??''} onChange={e=>{const value=validPanel(e.target.value);if(value)open(value)}}><option value="">Chọn màn hình chi tiết</option>{Object.entries(PANEL_LABELS).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label><p className="cp-prototype-note">Dữ liệu mẫu. Không kết nối phòng, chat hoặc Coin thật.</p>
    </aside>
    <main className={`cp-phone layout-${layout} ${isNight?'cp-night':''}`} data-layout={layout} data-screen={screen} data-home={homeVariant} data-study={study}>
      <div className="cp-topbar">{screen==='board'?<div className="cp-wallet" aria-label="Coin mẫu">{wallet.map((n,i)=><span key={i}><CoinArt index={i}/><b>{n}</b></span>)}</div>:<button className="cp-circle" aria-label="Hướng dẫn" onClick={()=>open('guide')}><CandyIcon name="help"/></button>}<div className="cp-top-actions">{screen!=='home'&&<button className="cp-circle" aria-label="Mở chat phòng" onClick={()=>open('chat')}><MessageCircle/></button>}<button className="cp-circle" aria-label="Mở menu" onClick={()=>open('menu')}><Settings/></button></div></div>
      {screen==='home'?<PrototypeHome variant={homeVariant} choose={setHomeVariant} open={open}/>:
      <><header className="cp-heading"><img src={homeVariant==='kawaii'?'/cartoon/ui/prototypes/kawaii/original-brand.svg':'/logo.svg'} alt="EmCoin"/><p>{screen==='waiting'?'Phòng thử nghiệm':`Lượt ${round}/${rounds}`}</p><h1>{screen==='waiting'?'Cùng nhau bắt đầu':PHASE_LABELS[phase]}</h1><div className="cp-heading-line"/></header>
      {screen==='waiting'?<div className="cp-tabs"><button aria-pressed={waitingTab===0} onClick={()=>setWaitingTab(0)}>Người chơi ({count})</button><button aria-pressed={waitingTab===1} onClick={()=>setWaitingTab(1)}>Thiết lập</button></div>:compact&&tabBar}
      <div ref={arena} className="cp-arena" data-compact={compact} style={{'--seat-rows':rows,'--arena-width':`${arenaSize.width}px`,'--arena-height':`${arenaSize.height}px`} as CSSProperties}>
        {screen==='waiting'?(waitingTab===0?roster():<section className="cp-waiting-settings"><h2>Thiết lập ván chơi</h2><label>Số lượt chơi<select value={rounds} onChange={e=>setRounds(Number(e.target.value))}>{Array.from({length:count},(_,i)=><option key={i} value={i+1}>{i+1} lượt</option>)}</select></label><p>Mỗi lượt một Người trao gửi. Tối đa {count} lượt.</p><button className="cp-action outline" onClick={()=>open('settings')}><Layers/>Đổi bố cục</button></section>):
        compact?(boardTab==='players'?roster():<div className={`cp-single-stage ${layout==='A'?'round':''}`}>{stage()}</div>):
        layout==='A'?<div className="cp-round-board"><div className="cp-top-player">{player(0)}</div><div className="cp-orbit"><div className="cp-side">{Array.from({length:count-2},(_,i)=>i+2).filter(i=>i%2===0).map(i=>player(i))}</div><section className="cp-round-stage">{stage()}</section><div className="cp-side">{Array.from({length:count-2},(_,i)=>i+2).filter(i=>i%2===1).map(i=>player(i))}</div></div><div className="cp-bottom-player">{player(1)}</div></div>:
        <div className="cp-focused-board"><section className="cp-focus-stage">{stage()}</section>{roster()}</div>}
      </div>
      <footer className="cp-dock">{screen==='waiting'?<button className="cp-action" onClick={()=>{setRound(1);move(0);changeScreen('board')}}>Bắt đầu ván mẫu<ArrowRight/></button>:<><p className="cp-dock-title">Điều khiển quản trò</p><div className="cp-dock-actions"><button className="cp-journal-button" aria-label="Nhật ký" onClick={()=>open('journal')}><span><BookOpen/></span><small>Nhật ký</small></button><button className="cp-action outline" disabled={step===0} onClick={()=>move(step-1)}><ArrowLeft/><span>Quay lại</span></button><button className="cp-action" disabled={step===phases.length-1} onClick={()=>move(step+1)}><span>Tiếp tục</span><ArrowRight/></button></div></>}</footer></>}
      <div className="cp-bottom-bar"><button className="cp-mobile-layout" aria-label="Chọn bố cục bàn chơi" onClick={()=>open('settings')}><Layers/>{layout==='A'?'Quây quần':'Tập trung'}</button><span>Bản thử · không realtime</span></div>
    </main>
    <aside className="cp-review-note"><b>{layout==='A'?'A · Quây quần':'B · Tập trung'}</b><p>Màn hình thấp tách Bàn chơi / Người chơi. Không thu nhỏ cả giao diện hoặc giấu nội dung dưới mép màn hình.</p><p>Chat phân trang tin nhắn; form dài chia bước. Không có vùng cuộn.</p><p>Chat hiện tại: {CHAT_STATES[chatState]}.</p></aside>
    <dialog ref={dialog} data-study={study} data-screen={screen} className={`cp-dialog panel-${panel??'menu'} ${homeVariant==='kawaii'?'cp-kawaii-dialog':''}`} onCancel={event=>{event.preventDefault();closePanel()}} onClose={()=>setPanel(null)} aria-labelledby="cp-dialog-title">
      <div className="cp-dialog-head">
        {panel==='chat'?<div className="cp-chat-heading"><span className="cp-chat-heading-art"><img src="/emcoin/avatars/orbit/00.webp" alt=""/><img src="/emcoin/avatars/orbit/01.webp" alt=""/></span><div><h2 id="cp-dialog-title">Chat phòng <small>Bản mẫu</small></h2><p>Phòng thử nghiệm · {count} người</p></div></div>:<h2 id="cp-dialog-title">{study==='refined'&&panel==='settings'?'Giao diện':panel?PANEL_LABELS[panel]:''}</h2>}
        <button className="cp-circle" aria-label="Đóng" onClick={closePanel}><X/></button>
      </div>
<div className="cp-dialog-body">{panel&&<PrototypePanels key={panel} panel={panel} inHome={screen==='home'} kawaii={homeVariant==='kawaii'} open={open} close={closePanel} layout={layout} chooseLayout={chooseLayout} count={count} setCount={changeCount} step={step} setStep={v=>{move(v);setScreen('board')}} rounds={rounds} setRounds={setRounds} person={person} setPerson={setPerson} avatar={avatar} setAvatar={setAvatar} previewId={previewId} previewCard={setPreviewId} selectCard={setSelected} wallet={wallet} give={(c,q,t)=>{setWallet(wallet.map((v,i)=>i===c?v-q:v));setLog([...log,`Tặng mẫu ${q} Coin ${['Xanh','Vàng','Đỏ'][c]} cho Người ${t+1}`]);setPanel(null);setToast('Đã tặng Coin mẫu.')}} log={log} messages={messages} send={text=>setMessages([...messages,{id:messages.length+1,sender:'Bạn',text}])} chatState={chatState} setChatState={setChatState} home={()=>changeScreen('home')} waiting={()=>changeScreen('waiting')} confirm={()=>{move(step+1);setPanel(null)}} notify={setToast}/>}</div>
    </dialog>
    {toast&&<div className="cp-toast" role="status">{toast}</div>}
  </div>
}
if(import.meta.env.DEV)createRoot(document.getElementById('root')!).render(<Prototype/> )
