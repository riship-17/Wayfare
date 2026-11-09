// Captures real Wayfare screens for the exhibition video. Run with the dev servers up (npm run dev).
// Uses the demo accounts and resets them at the end with `npm run seed -- --reset`.
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';
const OUT = new URL('./shots/', import.meta.url).pathname;
const b = await chromium.launch();
const phone = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'no-preference' });
const desk = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const p = await phone.newPage();
const d = await desk.newPage();
const settle = (pg, ms = 1600) => pg.waitForTimeout(ms);
const boxes = {};
const box = async (shot, key, loc) => { try { const r = await loc.first().boundingBox({ timeout: 3000 }); if (r) (boxes[shot] ??= {})[key] = r; } catch { console.log('no box', shot, key); } };
const snap = async (pg, name, full = false) => { await pg.screenshot({ path: `${OUT}${name}.png`, fullPage: full }); console.log('shot', name); };
const go = async (pg, path, ms) => { await pg.goto(BASE + path, { waitUntil: 'networkidle' }); await settle(pg, ms); };

// Fresh demo state
await p.request.post(BASE + '/api/v1/auth/demo', { data: { as: 'student' } });
await p.request.post(BASE + '/api/v1/me/demo-controls', { data: { reset: true } });
await d.request.post(BASE + '/api/v1/auth/demo', { data: { as: 'admin' } });
const admin = await (await d.request.get(BASE + '/api/v1/admin/listings')).json();
for (const l of admin.listings) await d.request.patch(`${BASE}/api/v1/admin/listings/${l.id}/verification`, { data: { status: 'pending' } });

// Landing (desktop)
await go(d, '/', 2500); await snap(d, 'landing-hero');
await d.getByText('Make every arrival', { exact: true }).scrollIntoViewIfNeeded(); await settle(d, 2500); await snap(d, 'landing-tagline');
await d.locator('#how').scrollIntoViewIfNeeded(); await settle(d, 1800); await snap(d, 'landing-stages');

// Student app, phone
await go(p, '/app/welcome', 1800); 
await p.request.post(BASE + '/api/v1/auth/demo', { data: { as: 'student' } });
await go(p, '/app/welcome', 1800); await snap(p, 'welcome');
await go(p, '/app'); await snap(p, 'home');
await box('home', 'countdown', p.getByText('12 days to go')); await box('home', 'battery', p.getByRole('img', { name: /Journey/ })); await box('home', 'next', p.getByTestId('next-step')); await box('home', 'eid', p.getByRole('heading', { name: 'Emirates ID' }));
await go(p, '/app/journey'); await snap(p, 'journey-prepare');
await p.getByRole('tab', { name: 'Settle' }).click(); await settle(p); await snap(p, 'journey-settle');
await box('journey-settle', 'locked', p.getByRole('heading', { name: /Unlocks with your Emirates ID/ })); await box('journey-settle', 'bridge', p.getByText(/^Meanwhile:/)); await box('journey-settle', 'tabs', p.getByRole('tablist'));
await go(p, '/app/housing'); await snap(p, 'housing-pending');
await go(p, '/app/essentials'); await snap(p, 'essentials');
await box('essentials', 'ready', p.getByRole('heading', { name: 'Day Zero ready' }));
await go(p, '/app/community'); await snap(p, 'community');
await go(p, '/app/transit'); await p.getByTestId('preset-airport').click(); await settle(p, 2200); await snap(p, 'transit-route');
await p.locator('[aria-label="Schematic map of the Dubai Metro and Tram"]').scrollIntoViewIfNeeded(); await settle(p, 400); await snap(p, 'transit-map');

// University portal (desktop): verify one listing with SAMPLE values (labelled in the video, reset after)
const target = admin.listings[0];
await go(d, '/admin/listings', 1500); await snap(d, 'admin-pending');
await d.getByTestId(`verify-${target.id}`).click();
await d.getByLabel('AED a month').first().fill('3250');
await d.getByLabel('Deposit AED').first().fill('1500');
if (await d.getByLabel('AED a month').nth(1).count()) { await d.getByLabel('AED a month').nth(1).fill('4100'); await d.getByLabel('Deposit AED').nth(1).fill('1500'); }
await d.getByLabel('Source link').fill('https://example.org/sample-price-list');
await d.getByLabel('Nearest station').selectOption('metro-dubai-internet-city');
await d.getByLabel('Walk, minutes').fill('8');
await d.getByLabel('Distance to campus, km').fill('2.4');
await d.getByTestId('verify-submit').scrollIntoViewIfNeeded(); await settle(d, 500); await snap(d, 'admin-verify-form');
await d.getByTestId('verify-submit').click(); await settle(d, 1200); await snap(d, 'admin-verified');

// Student sees it
await go(p, '/app/housing'); await snap(p, 'housing-verified');
await box('housing-verified', 'badge', p.getByText('Verified by Heriot-Watt University Dubai')); await box('housing-verified', 'price', p.getByText(/AED 3,250 a month/)); await box('housing-verified', 'walk', p.getByText(/About 8 min walk/));
await p.getByTestId('listing-card').first().click(); await settle(p, 1800); await snap(p, 'listing-detail');
await p.request.patch(BASE + '/api/v1/me', { data: { chosenListingId: target.id } });
await p.request.put(BASE + '/api/v1/budget/me', { data: { items: [{ key: 'groceries', amountAed: 650 }, { key: 'health-insurance', amountAed: 700 }] } });
await go(p, '/app/budget', 2200); await snap(p, 'budget');
await box('budget', 'total', p.getByText('To land and settle')); await box('budget', 'share', p.getByTestId('share-family'));
await p.getByTestId('share-family').click(); await settle(p, 900);
await p.getByRole('button', { name: 'Create link' }).click(); await settle(p, 1400); await snap(p, 'budget-share');
const url = await p.getByTestId('share-url').textContent();
const fam = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const fp = await fam.newPage(); await fp.goto(new URL(url).pathname.replace(/^/, BASE), { waitUntil: 'networkidle' }); await settle(fp); await snap(fp, 'family');
await box('family', 'title', fp.getByRole('heading', { level: 1 }));

// Offline transit
await go(p, '/app/transit', 1200);
await phone.setOffline(true); await p.evaluate(() => window.dispatchEvent(new Event('offline'))); await settle(p, 600);
await p.getByTestId('preset-airport').click(); await settle(p, 2200); await snap(p, 'transit-offline');
await box('transit-offline', 'banner', p.getByRole('status').filter({ hasText: "You're offline" })); await box('transit-offline', 'minutes', p.getByText(/^About \d+ min$/)); await box('transit-offline', 'preset', p.getByTestId('preset-airport'));
await phone.setOffline(false); await p.evaluate(() => window.dispatchEvent(new Event('online')));

// Fast forward: arrive today, then Emirates ID received
await p.request.post(BASE + '/api/v1/me/demo-controls', { data: { arrivalOffsetDays: 0, eidStatus: 'residence_issued' } });
await go(p, '/app'); await snap(p, 'home-arrive');
await go(p, '/app/journey'); await p.getByRole('tab', { name: 'Settle' }).click(); await settle(p); await snap(p, 'journey-locked');
await go(p, '/app/me', 1200);
await p.getByRole('button', { name: 'Emirates ID received' }).click(); await settle(p, 900); await snap(p, 'unlock-toast');
await box('unlock-toast', 'toast', p.getByText(/Emirates ID received\. \d+ tasks?/));
await go(p, '/app/journey'); await p.getByRole('tab', { name: 'Settle' }).click(); await settle(p); await snap(p, 'journey-unlocked');

// Fully charged: mark everything done
const j = await (await p.request.get(BASE + '/api/v1/journey')).json();
for (const t of j.tasks) await p.request.patch(`${BASE}/api/v1/journey/tasks/${t.key}`, { data: { status: 'done' } });
await go(p, '/app', 2000); await snap(p, 'home-charged');
await box('home-charged', 'battery', p.getByRole('img', { name: /Journey/ })); await box('home-charged', 'charged', p.getByText('Fully charged', { exact: true }));

// Desktop app
await d.request.post(BASE + '/api/v1/auth/demo', { data: { as: 'student' } });
await go(d, '/app', 2000); await snap(d, 'desktop-home');
await go(d, '/app/transit', 1200); await d.getByTestId('preset-airport').click(); await settle(d, 2200); await snap(d, 'desktop-transit');
import('node:fs').then(({ writeFileSync }) => writeFileSync(new URL('./comp/boxes.js', import.meta.url), 'window.BOXES = ' + JSON.stringify(boxes, null, 1) + ';\n'));
await b.close();
