// LUMEN BAY — screenshot driver: headless Chrome CDP (built-in WebSocket,
// SwiftShader WebGL), 1280x720 JPEG q90.
//   node tools/shot.mjs 1   (then 2, 3, 4)
// Waits for the HUD to go live before capturing — a render showing
// JOB 1 / $1,200 / black minimap is STALE, so the cash text is checked
// against the shot's pinned value and the shot is re-run if it mismatches.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Chrome: the stock puppeteer build. The Hatch build (/opt/meta-chromium)
// enforces Local Network Access checks that block every localhost
// navigation (ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS) and a WebGL
// domain policy that allows only example.com — it cannot load this game.
const CHROME = '/home/hatch/.cache/puppeteer/chrome/linux-157.0.8103.50/chrome-linux64/chrome';
const PORT = 8091;
const CDP_PORT = 9241; // 9223 is taken by another agent's Chrome (token-radar) —
// attaching to the wrong browser made every shot read STALE forever.
const PIN_CASH = { 1: '$18,450', 2: '$21,700', 3: '$48,500', 4: '$21,400' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function serverUp() {
  try {
    const r = await fetch(`http://localhost:${PORT}/`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch { return false; }
}

async function cdpGet(path) {
  const r = await fetch(`http://127.0.0.1:${CDP_PORT}${path}`);
  return r.json();
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.errors = [];
    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        this.errors.push(msg.params?.exceptionDetails?.exception?.description || msg.params?.exceptionDetails?.text || 'exception');
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
        this.errors.push(msg.params.args?.map((a) => a.value ?? a.description ?? '').join(' '));
      }
    };
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('page eval failed: ' + (r.exceptionDetails.text || ''));
    return r.result?.value;
  }
}

async function captureOnce(shot, shots) {
  const entry = shots[shot - 1];
  const profile = `/tmp/chrome-lumen-shot${shot}`;
  rmSync(profile, { recursive: true, force: true });
  const url = `http://localhost:${PORT}/${entry.query}`;
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-proxy-server',
    '--disable-dev-shm-usage', '--enable-unsafe-swiftshader',
    '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests',
    `--user-data-dir=${profile}`, `--remote-debugging-port=${CDP_PORT}`,
    '--window-size=1280,920', '--hide-scrollbars', '--force-device-scale-factor=1',
    url,
  ], { stdio: 'ignore' });
  try {
    let targets = null;
    for (let i = 0; i < 40; i++) {
      try { targets = await cdpGet('/json/list'); break; } catch { await sleep(500); }
    }
    if (!targets) throw new Error('Chrome CDP never came up');
    const page = targets.find((t) => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const cdp = new Cdp(ws);
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');

    // wait for the staged shot to settle: __shotReady + pinned cash text
    let live = false;
    let cash = '';
    for (let i = 0; i < 180; i++) {
      try {
        const ready = await cdp.eval(`window.__shotReady === true`);
        cash = await cdp.eval(`document.getElementById('cash')?.textContent || ''`);
        if (ready && cash === PIN_CASH[shot]) { live = true; break; }
      } catch { /* not up yet */ }
      await sleep(1000);
    }
    if (!live) {
      console.log(`shot ${shot}: STALE (cash=${cash || '?'}, want ${PIN_CASH[shot]}) — re-run`);
      ws.close();
      return { ok: false, stale: true };
    }
    // one more beat so the last frame lands
    await sleep(1500);
    const shot2 = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
    const buf = Buffer.from(shot2.data, 'base64');
    const outPath = `screenshots/${entry.name}`;
    writeFileSync(outPath, buf);
    const sha = createHash('sha256').update(buf).digest('hex');
    console.log(`shot ${shot}: ${outPath} ${buf.length} bytes sha256 ${sha.slice(0, 12)}… errors=${cdp.errors.length}`);
    if (cdp.errors.length) console.log('  console errors: ' + cdp.errors.slice(0, 3).join(' | '));
    ws.close();
    return { ok: true, bytes: buf.length, sha };
  } finally {
    try { chrome.kill('SIGKILL'); } catch { /* dead */ }
  }
}

async function main() {
  const arg = process.argv[2] || '1';
  if (arg === 'all') {
    for (let s = 1; s <= 4; s++) {
      console.log(`--- shot ${s} ---`);
      const code = await runOne(s);
      if (code !== 0) process.exit(code);
    }
    return;
  }
  const shot = parseInt(arg, 10);
  if (!(shot >= 1 && shot <= 4)) {
    console.error('usage: node tools/shot.mjs <1|2|3|4|all>');
    process.exit(2);
  }
  process.exit(await runOne(shot));
}

async function runOne(shot) {
  const shots = JSON.parse(readFileSync('shots.json', 'utf8'));
  let server = null;
  if (!(await serverUp())) {
    server = spawn(process.execPath, ['serve.ts'], { cwd: process.cwd(), stdio: 'ignore' });
    for (let i = 0; i < 30; i++) {
      if (await serverUp()) break;
      await sleep(500);
    }
  }
  try {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const r = await captureOnce(shot, shots);
      if (r.ok) { console.log(`shot ${shot} done (attempt ${attempt})`); return 0; }
      if (attempt === 2) { console.error(`shot ${shot}: FAILED after 2 attempts`); return 1; }
      console.log(`shot ${shot}: retrying…`);
    }
    return 1;
  } finally {
    if (server) server.kill('SIGKILL');
  }
}

main();
