// Drives the static (backend free) demo build and fails if any request reaches /api.
//   VITE_STATIC_DEMO=true npm run build && npx vite preview --port 4174 & node scripts/static-check.mjs http://localhost:4174
import { chromium } from '@playwright/test';
const BASE = process.argv[2];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const api = []; p.on('request', (r) => new URL(r.url()).pathname.startsWith('/api/') && api.push(r.url()));
const see = async (text) => { await p.getByText(text).first().waitFor({ timeout: 8000 }); };
await p.goto(BASE + '/app/welcome'); await see('Online demo');
await p.getByRole('button', { name: 'Try the demo' }).click(); await see('12 days to go'); console.log('ok  demo login, 12 days to go');
await p.goto(BASE + '/app/journey'); await p.getByRole('checkbox', { name: /Choose a verified place/ }).click(); await p.getByRole('img', { name: /Journey [1-9]\d*% charged/ }).waitFor({ timeout: 8000 }); console.log('ok  tick charges battery');
await p.goto(BASE + '/admin/login'); await p.getByRole('button', { name: /demo housing office/ }).click(); await see('Listings');
const id = await p.locator('[data-testid^="verify-"]').first().getAttribute('data-testid');
await p.getByTestId(id).click();
await p.getByLabel('AED a month').first().fill('3250'); await p.getByLabel('Deposit AED').first().fill('1500');
if (await p.getByLabel('AED a month').nth(1).count()) { await p.getByLabel('AED a month').nth(1).fill('4100'); await p.getByLabel('Deposit AED').nth(1).fill('1500'); }
await p.getByLabel('Source link').fill('https://example.org/sample'); await p.getByLabel('Nearest station').selectOption('metro-dubai-internet-city'); await p.getByLabel('Walk, minutes').fill('8');
await p.getByTestId('verify-submit').click(); await see('is verified'); console.log('ok  portal verifies a listing');
await p.goto(BASE + '/app/welcome'); await p.getByRole('button', { name: 'Try the demo' }).click(); await see('12 days to go');
await p.goto(BASE + '/app/housing'); await see('Verified by Heriot-Watt University Dubai'); await see('AED 3,250 a month'); await see('About 8 min walk'); console.log('ok  student sees badge, price and walk time');
await p.goto(BASE + '/app/transit'); await p.getByTestId('preset-airport').click(); await see('Airport Terminal 1 to Dubai Internet City'); console.log('ok  transit routes T1 to campus');
await p.goto(BASE + '/app/budget'); await see('Rates on'); console.log('ok  budget with rate snapshot');
await p.goto(BASE + '/app/me'); await p.getByRole('button', { name: 'Arrive today' }).click(); await p.waitForTimeout(500);
await p.getByRole('button', { name: 'Emirates ID received' }).click(); await see(/tasks? (is|are) ready/); console.log('ok  Emirates ID unlock toast');
// New account through set up (uses the university and listing ids)
const c2 = await b.newContext({ viewport: { width: 390, height: 844 } }); const q = await c2.newPage();
q.on('pageerror', (e) => errs.push(e.message));
await q.goto(BASE + '/app/create'); await q.getByLabel('First name').fill('Omar'); await q.getByLabel('Email').fill('omar@example.com'); await q.getByLabel('Password').fill('longenough1');
await q.getByRole('button', { name: 'Create account' }).click(); await q.waitForURL(/setup\/university/); await q.waitForTimeout(700);
await q.getByText('Heriot-Watt University Dubai').last().click(); await q.getByRole('button', { name: 'Continue' }).last().click();
await q.waitForURL(/setup\/arrival/); console.log('ok  new student passes the university step');
await c2.close();
await p.goto(BASE + '/'); await see('42,026 students now study in Dubai.'); console.log('ok  landing page');
console.log('API requests that left the browser:', api.length, '| page errors:', errs.length ? errs : 'none');
await b.close();
process.exit(api.length || errs.length ? 1 : 0);
