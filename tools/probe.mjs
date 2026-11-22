// LUMEN BAY — gameplay probe: 13 checks against the live game in headless
// Chrome (CDP over the built-in WebSocket, SwiftShader WebGL).
//   node tools/probe.mjs
// Exits 0 only when all 13 pass with 0 console errors.
import { spawn, execSync } from 'node:child_process';
import { writeFileSync, rmSync, existsSync } from 'node:fs';

// Chrome: the stock puppeteer build. The Hatch build (/opt/meta-chromium)
// enforces Local Network Access checks that block every localhost
// navigation (ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS) and a WebGL
// domain policy that allows only example.com — it cannot load this game.
const CHROME = '/home/hatch/.cache/puppeteer/chrome/linux-157.0.8103.50/chrome-linux64/chrome';
const PORT = 8091;
const CDP_PORT = 9224;
const PROFILE = '/tmp/chrome-lumen-probe';
const URL = `http://localhost:${PORT}/?seed=7`;

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
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
        this.errors.push(msg.params.args?.map((a) => a.value ?? a.description ?? '').join(' '));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        this.errors.push(msg.params?.exceptionDetails?.text + ': ' + (msg.params?.exceptionDetails?.exception?.description || ''));
      }
      if (msg.method === 'Log.entryAdded' && msg.params?.entry?.level === 'error') {
        const src = msg.params.entry.source || '';
        const text = msg.params.entry.text || '';
        if (!text.includes('favicon.ico')) this.errors.push(`${src}: ${text}`);
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
    if (r.exceptionDetails) throw new Error('page eval failed: ' + (r.exceptionDetails.text || JSON.stringify(r.exceptionDetails)));
    return r.result?.value;
  }
}

async function main() {
  const started = Date.now();
  let server = null;
  if (!(await serverUp())) {
    server = spawn(process.execPath, ['serve.ts'], { cwd: process.cwd(), stdio: 'ignore' });
    for (let i = 0; i < 30; i++) {
      if (await serverUp()) break;
      await sleep(500);
    }
    if (!(await serverUp())) throw new Error(`probe: server never came up on port ${PORT} — is another game squatting on it?`);
  }
  // guard: make sure the server on this port is Lumen Bay, not another game
  const home = await (await fetch(`http://localhost:${PORT}/`)).text();
  if (!home.includes('LUMEN BAY')) throw new Error(`probe: port ${PORT} serves something else, not Lumen Bay`);
  rmSync(PROFILE, { recursive: true, force: true });
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-proxy-server',
    '--disable-dev-shm-usage', '--enable-unsafe-swiftshader',
    '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests',
    `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${CDP_PORT}`,
    '--window-size=1280,920', '--hide-scrollbars', '--force-device-scale-factor=1',
    URL,
  ], { stdio: 'ignore' });

  const results = [];
  const check = (name, ok, detail = '') => {
    results.push({ name, ok: !!ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  };
  try {
    // wait for the CDP endpoint
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
    await cdp.send('Log.enable');
    await cdp.send('Page.enable');

    // wait for the game to boot and render frames
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        ready = await cdp.eval(`window.__gameAPI && window.__gameAPI.snapshot().frames > 5`);
        if (ready) break;
      } catch { /* not up yet */ }
      await sleep(1000);
    }
    check('boots/renders', ready, ready ? 'game API live, frames rendering' : 'game never booted');

    const snap = () => cdp.eval(`window.__gameAPI.snapshot()`);
    const phase = () => cdp.eval(`window.__game.phase`);
    const ev = (expr) => cdp.eval(expr);

    // 2. title -> play
    await ev(`window.__gameAPI.start()`);
    await sleep(500);
    check('title→play', (await phase()) === 'playing', `phase=${await phase()}`);

    // 3. Job 1 start
    await ev(`window.__gameAPI.startMission(1)`);
    check('Job 1 start', (await ev(`window.__game.state.mission`)) === 1, 'mission 1 active');

    // 4. Job 1 complete (+$800)
    await ev(`window.__gameAPI.completeMission(1)`);
    let s = await snap();
    check('Job 1 complete', s.cash === 2000 && s.done === 1, `cash=$${s.cash}, done=${s.done}`);

    // 5. enter car (Comet parked by the marina, 4 m away)
    await ev(`window.__gameAPI.enterCar()`);
    s = await snap();
    check('enter car', s.inCar === true, `inCar=${s.inCar}`);

    // 6. exit car
    await ev(`window.__gameAPI.exitCar()`);
    s = await snap();
    check('exit car', s.inCar === false, `inCar=${s.inCar}`);

    // 7. wanted 3 + police + heli
    await ev(`window.__gameAPI.setWanted(3)`);
    await sleep(500);
    s = await snap();
    check('wanted 3 + police + heli', s.wanted === 3 && s.policeActive >= 3 && s.heliVisible === true,
      `wanted=${s.wanted}, police=${s.policeActive}, heli=${s.heliVisible}`);

    // 8. NOS burn
    await ev(`window.__gameAPI.enterCar()`);
    const nosBefore = (await snap()).nos;
    await ev(`window.__gameAPI.burnNos()`);
    s = await snap();
    check('NOS burn', s.nos < nosBefore, `nos ${nosBefore} → ${s.nos}`);

    // 9. pause / resume
    await ev(`window.__gameAPI.pause()`);
    const paused = (await phase()) === 'paused';
    await ev(`window.__gameAPI.resume()`);
    check('pause/resume', paused && (await phase()) === 'playing', `paused=${paused}, phase=${await phase()}`);

    // 10. ALL 15 missions complete
    await ev(`window.__gameAPI.completeAllMissions()`);
    await sleep(300);
    s = await snap();
    check('ALL 15 missions complete', s.cash === 39700 && s.turf === 8 && s.garageOwned === true && s.kills === 19,
      `cash=$${s.cash}, turf=${s.turf}/12, garage=${s.garageOwned}, kills=${s.kills}`);

    // 11. garage Engine Lv1 ($1,500)
    const cashBefore = (await snap()).cash;
    await ev(`window.__gameAPI.buyEngine()`);
    s = await snap();
    check('garage Engine Lv1', s.engine === 1 && s.cash === cashBefore - 1500,
      `engine=${s.engine}, cash=$${s.cash}`);

    // 12. save written
    await ev(`window.__gameAPI.save()`);
    const saved = await ev(`(() => { const d = JSON.parse(localStorage.getItem('lumenbay.save.v1') || 'null'); return d ? Object.keys(d.done || {}).length : -1; })()`);
    check('save written', saved === 15, `saved missions=${saved}`);

    // 13. 0 console errors
    await sleep(1000);
    check('0 console errors', cdp.errors.length === 0, cdp.errors.length ? cdp.errors.slice(0, 3).join(' | ') : 'clean');
    ws.close();
  } catch (err) {
    console.log('PROBE ERROR: ' + err.message);
    results.push({ name: 'probe crashed', ok: false, detail: err.message });
  } finally {
    try { chrome.kill('SIGKILL'); } catch { /* already dead */ }
    if (server) server.kill('SIGKILL');
  }
  const passed = results.filter((r) => r.ok).length;
  console.log(`\nprobe: ${passed}/${results.length} PASS (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  process.exit(passed === results.length ? 0 : 1);
}

main();
