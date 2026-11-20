// LUMEN BAY r12 screenshot shooter: serve the repo on 8081, then for EACH
// shot launch a FRESH headless Chrome 157 (CDP 9223, fresh profile,
// SwiftShader) with just that shot's tab and capture it straight into
// screenshots/ (driver-written, never cp/mv). One tab at a time: headless
// Chrome throttles requestAnimationFrame in background tabs, so 4 tabs in
// one Chrome never reach __shotReady. Usage: node tools/shot.mjs [1|2|3|4]
// (default: all four). Cleanup: never process.exit() inside try — set
// process.exitCode and return so finally kills serve+Chrome (exit() skips
// finally and leaves strays holding 8081/9223, so later runs test a STALE
// page).
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync, openSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const only = process.argv[2] ? [Number(process.argv[2])] : [1, 2, 3, 4];
const base = '/home/hatch/workspace/makefun/gta6-01';
const repo = join(base, 'repo');
const work = join(base, 'play-r12', 'shoot');
const shots = join(repo, 'screenshots');
const CHROME = '/home/hatch/.cache/puppeteer/chrome/linux-157.0.8103.50/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NAMES = { 1: '1-chase.jpg', 2: '2-shootout.jpg', 3: '3-job.jpg', 4: '4-done.jpg' };

// The compositor lags the page by ~1 presented frame: a capture taken at
// __frames==1 returns a stale first-presented image (static-HTML HUD, high
// camera) even though the live DOM/camera are already correct, and a capture
// at __frames>=14 is correct. So each shot waits for 14 rendered frames
// before capturing.
async function waitFrames(shotN, target) {
  const list = await (await fetch('http://127.0.0.1:9223/json/list')).json();
  const page = list.find((t) => t.type === 'page' && t.url.includes(`shot=${shotN}`));
  if (!page) throw new Error(`shot ${shotN} page gone before frame wait`);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let mid = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res } = pending.get(msg.id);
      pending.delete(msg.id);
      res(msg.result);
    }
  };
  const send = (method, params) => new Promise((res) => {
    const id = ++mid;
    pending.set(id, { res });
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
  await send('Runtime.enable');
  for (let i = 0; i < 240; i++) {
    const r = await send('Runtime.evaluate', { expression: 'window.__frames || 0', returnByValue: true });
    const frames = r.result ? r.result.value : 0;
    if (frames >= target) { ws.close(); return frames; }
    await sleep(500);
  }
  ws.close();
  throw new Error(`shot ${shotN} stuck below ${target} frames`);
}

// The HUD (mission panel, cash, stars, police list) is written by
// updateHud() inside the fixed-step update, which only starts once the game
// finishes its slow SwiftShader init — the staged 3D scene renders from
// frame 1, but the HUD can still show the STATIC-HTML defaults (JOB 1 /
// $1,200 / empty stars) at frame 14. A capture then looks broken even
// though the scene is right. So after the frame wait, also wait for the
// mission title to flip away from the static default before capturing.
// The staged title is never JOB 1 (shot 1: JOB 12, shots 2-3: JOB 15,
// shot 4: STORY COMPLETE). Timeout falls through so a stuck HUD still
// yields a shot instead of failing the run.
async function waitHud(shotN) {
  const list = await (await fetch('http://127.0.0.1:9223/json/list')).json();
  const page = list.find((t) => t.type === 'page' && t.url.includes(`shot=${shotN}`));
  if (!page) throw new Error(`shot ${shotN} page gone before HUD wait`);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let mid = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res } = pending.get(msg.id);
      pending.delete(msg.id);
      res(msg.result);
    }
  };
  const send = (method, params) => new Promise((res) => {
    const id = ++mid;
    pending.set(id, { res });
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
  await send('Runtime.enable');
  for (let i = 0; i < 240; i++) {
    const r = await send('Runtime.evaluate', { expression: `document.getElementById('hud-mission-title')?.textContent || ''`, returnByValue: true });
    const title = r.result ? r.result.value : '';
    if (title && title !== 'JOB 1: FIRST KEYS') { ws.close(); return title; }
    await sleep(500);
  }
  ws.close();
  console.log(`shot ${shotN}: WARNING — HUD never flipped off JOB 1, capturing anyway`);
  return '';
}

async function capture(shotN, outPath) {
  const list = await (await fetch('http://127.0.0.1:9223/json/list')).json();
  const page = list.find((t) => t.type === 'page' && t.url.includes(`shot=${shotN}`));
  if (!page) throw new Error(`shot ${shotN} page gone before capture`);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let mid = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) rej(new Error(JSON.stringify(msg.error)));
      else res(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(`EXCEPTION: ${JSON.stringify(msg.params.exceptionDetails).slice(0, 300)}`);
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      errors.push(`CONSOLE: ${msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300)}`);
    }
  };
  const send = (method, params) => new Promise((res, rej) => {
    const id = ++mid;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r.result ? r.result.value : undefined;
  };
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  // Force a true 1280x720 viewport: headless --window-size alone leaves the
  // layout viewport at 1280x520 (the JPEG would be a stretched 520 render).
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await sleep(800);
  let ready = false;
  for (let i = 0; i < 180; i += 1) {
    try { ready = await ev('window.__shotReady === true'); if (ready) break; } catch { /* page still loading */ }
    await sleep(500);
  }
  if (!ready) throw new Error(`shot ${shotN} never reached __shotReady; errors: ${errors.join(' | ')}`);
  await sleep(1500);
  const shotRes = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  writeFileSync(outPath, Buffer.from(shotRes.data, 'base64'));
  const frames = await ev('window.__frames');
  const hud = await ev(`JSON.stringify({
    missionTitle: document.getElementById('hud-mission-title')?.textContent,
    police: document.getElementById('hud-police-list')?.textContent,
    dialogue: document.getElementById('hud-dialogue-text')?.textContent,
    speed: document.getElementById('hud-speed-big')?.textContent,
    cash: document.getElementById('hud-cash')?.textContent,
    stars: document.getElementById('hud-stars')?.textContent,
    toasts: document.getElementById('hud-notifications')?.textContent,
    weapons: document.getElementById('hud-weapons')?.textContent,
    clock: document.getElementById('hud-clock')?.textContent
  })`);
  ws.close();
  return { frames, hud: JSON.parse(hud || '{}'), errors };
}

rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
mkdirSync(shots, { recursive: true });

const serve = spawn('node', ['serve.ts', '--port', '8081'], { cwd: repo, stdio: 'pipe', detached: true });
let failed = false;
try {
  for (const url of ['http://127.0.0.1:8081/index.html', 'http://127.0.0.1:9223/json/list']) {
    try {
      const r = await fetch(url);
      if (r.ok) throw new Error(`PORT BUSY (stale instance?): ${url} already answers — aborting`);
    } catch (e) {
      if (e.message.startsWith('PORT BUSY')) throw e;
    }
  }
  await sleep(2500);
  for (let i = 0; i < 10; i++) {
    try { const r = await fetch('http://127.0.0.1:8081/index.html'); if (r.ok) break; } catch {}
    await sleep(500);
  }
  for (const n of only) {
    const shotWork = join(work, `shot${n}`);
    mkdirSync(shotWork, { recursive: true });
    const chromeLog = openSync(join(shotWork, 'chrome.log'), 'w');
    const url = `http://127.0.0.1:8081/index.html?shot=${n}&seed=20261120`;
    const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9223', `--user-data-dir=${join(shotWork, 'profile')}`, '--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=1280,720', url], { stdio: ['ignore', chromeLog, chromeLog], detached: true });
    try {
      let ok = false;
      for (let i = 0; i < 30; i++) {
        try {
          const list = await (await fetch('http://127.0.0.1:9223/json/list')).json();
          if (list.some((t) => t.type === 'page' && t.url.includes(`shot=${n}`))) { ok = true; break; }
        } catch {}
        await sleep(1000);
      }
      if (!ok) throw new Error(`shot ${n} page never appeared`);
      await sleep(3000);
      const frames = await waitFrames(n, 14);
      console.log(`shot ${n}: ${frames} frames rendered, waiting for live HUD`);
      const title = await waitHud(n);
      if (title) console.log(`shot ${n}: HUD live (${title}), capturing`);
      const out = join(shots, NAMES[n]);
      const res = await capture(n, out);
      console.log(JSON.stringify({ shot: n, frames: res.frames, size: statSync(out).size, hud: res.hud, errors: res.errors }));
      console.log(`shot ${n}: ${statSync(out).size} B`);
    } catch (e) {
      failed = true;
      console.log(`shot ${n} FAILED: ${e.message}`.slice(0, 2000));
    } finally {
      try { process.kill(-chrome.pid, 'SIGKILL'); } catch {}
      await sleep(1000);
      for (let i = 0; i < 10; i++) {
        try { await fetch('http://127.0.0.1:9223/json/list'); await sleep(500); }
        catch { break; }
      }
    }
  }
} finally {
  try { process.kill(-serve.pid, 'SIGKILL'); } catch {}
  await sleep(1000);
}
process.exitCode = failed ? 1 : 0;
console.log(failed ? '=== r12 shoot: FAILED ===' : '=== r12 shoot done ===');
