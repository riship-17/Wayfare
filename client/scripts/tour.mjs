// Visual tour at 390 x 844: screenshots, console errors and horizontal overflow per screen.
import { chromium } from '@playwright/test';
const BASE = process.env.BASE ?? 'http://localhost:5173';
const OUT = process.env.OUT;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: Number(process.env.W ?? 390), height: Number(process.env.H ?? 844) }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(`${page.url()}: ${m.text()}`));
page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
const res = await page.request.post(`${BASE}/api/v1/auth/demo`, { data: { as: 'student' } });
console.log('demo login', res.status());
const shot = async (name, path, act) => {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  if (act) await act();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: process.env.FULL === '1' });
  console.log(name.padEnd(14), 'overflow', overflow);
};
const screens = (process.env.ONLY ?? 'home,journey,task,housing,transit,budget,essentials,community,me').split(',');
const map = {
  home: ['/app'], journey: ['/app/journey'], task: ['/app/journey/register-ejari'], housing: ['/app/housing'],
  transit: ['/app/transit', async () => { await page.getByTestId('preset-airport').click(); await page.waitForTimeout(1500); }],
  budget: ['/app/budget'], essentials: ['/app/essentials'], community: ['/app/community'], me: ['/app/me'],
  landing: ['/'], kit: ['/dev/kit'], welcome: ['/app/welcome'],
};
for (const s of screens) await shot(s, ...map[s]);
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
