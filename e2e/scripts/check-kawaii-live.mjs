import {chromium} from '@playwright/test'
import {mkdtemp,writeFile} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
const base=new URL(process.argv[2]||'http://127.0.0.1:5183')
if(base.hostname!=='127.0.0.1'||base.protocol!=='http:')throw Error('Owned loopback only')
const output=await mkdtemp(path.join(os.tmpdir(),'emcoin-kawaii-live-'))
const browser=await chromium.launch(),checks=[],failures=[]
const sizes=process.argv.includes('--quick')?[[320,400],[390,844],[568,320],[1440,900]]:[[310,558],[320,400],[320,568],[390,844],[430,932],[568,320],[844,390],[1024,768],[1440,900]]
const phases=process.argv.includes('--full')?['role-reveal','night','healer-turn','silencer-turn','situation-card','emotion-card','story-telling','group-response','reflection-card','reflection-sharing','selfcare-card','hug-action','guess-silencer','reveal-silencer','give-coins','reward','ended']:['emotion-card','reflection-card','night','give-coins']
try{
 const runSize=async([width,height])=>{
  let page=await browser.newPage({viewport:{width,height}}),navigations=0
  const configure=async()=>{page.on('pageerror',error=>failures.push({width,height,runtime:error.message}));await page.route('**/*',route=>new URL(route.request().url()).origin===base.origin?route.continue():route.abort())}
  await configure()
  async function audit(label){
   await page.evaluate(()=>document.fonts.ready)
   await page.waitForTimeout(200)
   const problems=await page.evaluate(()=>{
    const out=[]
    for(const el of [document.documentElement,document.body,...document.querySelectorAll('.game-shell,.kawaii-home,.kawaii-board,.kawaii-focused,.kawaii-round,.kawaii-center,.kawaii-roster,.kawaii-roster-grid,.kawaii-game-dock,.kawaii-waiting,.kawaii-waiting-body,.kawaii-waiting-roster')]){
     const b=el.getBoundingClientRect();if(b.width<1||b.height<1)continue
     if(el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2)out.push({node:el.className,client:[el.clientWidth,el.clientHeight],scroll:[el.scrollWidth,el.scrollHeight]})
    }
    const root=document.querySelector('.game-shell,.kawaii-home,.kawaii-waiting')
    if(root){const b=root.getBoundingClientRect();for(const el of root.querySelectorAll('button,input,select')){const r=el.getBoundingClientRect();if(r.width<1||r.height<1)continue;if(r.left<b.left-1||r.right>b.right+1||r.top<b.top-1||r.bottom>b.bottom+1)out.push({control:el.getAttribute('aria-label')||el.textContent,bounds:[r.x,r.y,r.width,r.height]})}}
    return out
   });checks.push(label);if(problems.length)failures.push({label,problems})
  }
  for(const screen of ['lobby','waiting']){
   await page.goto(new URL(`/qa-screens.html?screen=${screen}&theme=candy-clouds`,base).href)
   await page.getByTestId('screen-qa-fixture').waitFor();await audit(`${screen}-${width}x${height}`)
   await page.screenshot({path:path.join(output,`${screen}-${width}x${height}.png`),animations:'disabled'})
  }
  for(const layout of ['A','B'])for(const viewer of ['narrator','sender'])for(const phase of phases){
   if(++navigations%6===0){await page.close();page=await browser.newPage({viewport:{width,height}});await configure()}
   await page.goto(new URL(`/qa-board.html?count=10&phase=${phase}&viewer=${viewer}&theme=candy-clouds`,base).href)
   await page.evaluate(value=>{localStorage.setItem('emcoin.board-layout.v1',value);window.dispatchEvent(new Event('emcoin:board-layout'))},layout)
   await page.getByTestId('kawaii-board').waitFor();await audit(`${layout}-${viewer}-${phase}-${width}x${height}`)
   if(viewer==='narrator'&&phase==='reflection-card')await page.screenshot({path:path.join(output,`board-${layout}-${width}x${height}.png`),animations:'disabled'})
  }
  await page.close()
 }
 for(const size of sizes)await runSize(size)
}finally{await browser.close()}
await writeFile(path.join(output,'report.json'),JSON.stringify({checks,failures},null,2))
console.log(JSON.stringify({output,checks:checks.length,failures},null,2));if(failures.length)process.exitCode=1
