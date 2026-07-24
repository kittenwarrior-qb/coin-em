import { chromium } from 'playwright';
const outDir = process.argv[2];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));

await page.goto('http://localhost:5173/cards', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

for (let i = 0; i < 6; i++) {
  await page.click('.card-nav-fab .next-card-button');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${outDir}/slow-switch-${i}.png` });
  const cardIndexText = await page.textContent('.card-nav-fab span');
  console.log(`step ${i}: index=${cardIndexText}`);
}

console.log('---LOGS---');
console.log(logs.join('\n'));
await ctx.close();
await browser.close();
console.log('DONE_SLOW_SWITCH');
