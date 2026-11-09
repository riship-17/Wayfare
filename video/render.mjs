// node render.mjs stills full 3,12,40   -> PNG previews
// node render.mjs video  full out.mp4   -> frames piped straight into ffmpeg (no frames on disk)
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const [mode, cut, arg] = process.argv.slice(2);
const page = await (await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-web-security'] })).newPage({ viewport: { width: 1920, height: 1080 } });
const url = new URL(`./comp/index.html?cut=${cut}`, import.meta.url).href;
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.goto(url); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(800);
const { duration, fps, scenes } = await page.evaluate(() => ({ duration: window.DURATION, fps: window.FPS, scenes: window.SCENES }));
console.log(`cut ${cut}: ${duration}s, ${scenes.length} scenes`);
if (mode === 'stills') {
  for (const t of arg.split(',').map(Number)) {
    // step through the preceding half second so velocity based blur and transitions are realistic
    for (let x = Math.max(0, t - 0.5); x <= t; x += 1 / fps) await page.evaluate((x) => window.render(x), x);
    await page.screenshot({ path: fileURLToPath(new URL(`./preview/${cut}-${t}.png`, import.meta.url)) });
  }
} else {
  const total = Math.round(duration * fps);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', arg], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    await page.evaluate((t) => window.render(t), f / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`frame ${f}/${total} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  console.log('wrote', arg);
}
if (errs.length) console.log('page errors:', errs.join('\n'));
process.exit(0);
