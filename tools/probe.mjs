// LUMEN BAY — gameplay probe. Serves game/, opens it in headless Chrome
// (SwiftShader WebGL) and drives the real game through its __lumen debug
// API — the same functions the UI calls — asserting 13 checks:
// boot/render, title→play, Job 1 start/complete, enter/exit car, wanted 3
// + police + heli, NOS burn, pause/resume, all 15 missions, $39,700 cash,
// turf 8/12 + 19 kills + garage owned, Engine Lv1, save written, and zero
// console errors. Usage: node tools/probe.mjs

import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const HEADLESS_SHELL = process.env.HOME +
  '/.cache/puppeteer/chrome-headless-shell/linux-157.0.8103.50/chrome-headless-shell-linux64/chrome-headless-shell';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitHttp(url, timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await sleep(300);
  }
  return false;
}

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.consoleErrors = [];
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        this.consoleErrors.push('exception: ' + (d.exception?.description || d.text || 'unknown'));
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        this.consoleErrors.push('console.error: ' + msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
      }
    };
  }

  ready() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }

  call(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('CDP timeout: ' + method));
        }
      }, 60000);
    });
  }

  async evaluate(expression) {
    const res = await this.call('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error('evaluate failed: ' + JSON.stringify(res.exceptionDetails.exception?.description || res.exceptionDetails.text));
    }
    return res.result.value;
  }

  close() { try { this.ws.close(); } catch { /* noop */ } }
}

async function launchChrome(url, port, profile) {
  const args = [
    '--no-sandbox', '--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--hide-scrollbars', '--window-size=1280,720',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, url,
  ];
  const proc = spawn(HEADLESS_SHELL, args, { stdio: 'ignore' });
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return { proc, wsUrl: page.webSocketDebuggerUrl };
    } catch { /* not up yet */ }
    await sleep(500);
  }
  throw new Error('chrome did not open a debugging port');
}

async function main() {
  const serverPort = 8902;
  const debugPort = 9332;
  const server = spawn(process.execPath, ['serve.ts', '--port', String(serverPort)], {
    cwd: repo, stdio: 'ignore',
  });
  const results = [];
  function check(name, ok, detail) {
    results.push({ name, ok: !!ok, detail: detail ?? '' });
    console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  — ' + detail : ''));
  }
  try {
    if (!await waitHttp(`http://127.0.0.1:${serverPort}/index.html`)) {
      throw new Error('serve.ts did not come up');
    }
    const url = `http://127.0.0.1:${serverPort}/`;
    const { proc, wsUrl } = await launchChrome(url, debugPort, '/tmp/lumen-probe');
    const cdp = new CDP(wsUrl);
    await cdp.ready();
    await cdp.call('Page.enable');
    await cdp.call('Runtime.enable');
    const L = (expr) => cdp.evaluate(`window.__lumen && (${expr})`);

    // Wait for the game to boot and render frames.
    let booted = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 240000) {
      try {
        if (await L('__lumen.frames > 3')) { booted = true; break; }
      } catch { /* still loading */ }
      await sleep(2000);
    }
    if (!booted) throw new Error('game never booted (no frames in 240s)');

    // Deterministic start: wipe any save from an earlier run, reload.
    await cdp.evaluate('localStorage.clear()');
    await cdp.call('Page.reload', { ignoreCache: true });
    const t1 = Date.now();
    while (Date.now() - t1 < 240000) {
      try {
        if (await L('__lumen.frames > 3')) break;
      } catch { /* still loading */ }
      await sleep(2000);
    }

    // 1 — boots and renders (frames + a painted minimap).
    const minimapLive = await cdp.evaluate(`(() => {
      const c = document.querySelector('.minimap');
      if (!c) return false;
      const g = c.getContext('2d');
      const d = g.getImageData(60, 60, 90, 90).data;
      let seen = new Set();
      for (let i = 0; i < d.length; i += 16) seen.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
      return seen.size > 4;
    })()`);
    check('1 boots/renders + minimap painted', (await L('__lumen.frames > 3')) && minimapLive,
      'frames=' + (await L('__lumen.frames')));

    // 2 — title screen -> play.
    await cdp.evaluate('window.__lumen.startGame(false)');
    await sleep(500);
    check('2 title -> play', (await L('__lumen.screen')) === 'play',
      'screen=' + (await L('__lumen.screen')));

    // 3 — Job 1 starts and completes for real cash.
    await cdp.evaluate('window.__lumen.startMission(1)');
    const m1 = await cdp.evaluate('window.__lumen.state()');
    const done1 = await cdp.evaluate('window.__lumen.completeMission(1)');
    const s1 = await cdp.evaluate('window.__lumen.state()');
    check('3 Job 1 start/complete', done1 === true && s1.missionsDone === 1 && s1.cash === 2400,
      'missionsDone=' + s1.missionsDone + ' cash=$' + s1.cash);

    // 4 — enter and exit the car.
    await cdp.evaluate('window.__lumen.teleport(93, 217)');
    const entered = await cdp.evaluate('window.__lumen.enterCar()');
    const exited = await cdp.evaluate('window.__lumen.exitCar()');
    check('4 enter/exit car', entered === true && exited === true,
      'entered=' + entered + ' exited=' + exited);

    // 5 — wanted 3 brings police cruisers + the helicopter.
    await cdp.evaluate('window.__lumen.setWanted(3)');
    const s5 = await cdp.evaluate('window.__lumen.state()');
    check('5 wanted 3 + police + heli', s5.wanted === 3 && s5.cruisers >= 1 && s5.heli === true,
      'wanted=' + s5.wanted + ' cruisers=' + s5.cruisers + ' heli=' + s5.heli);

    // 6 — NOS burns (tank drops, speed rises).
    const nos = await cdp.evaluate('window.__lumen.burnNos()');
    check('6 NOS burn', nos.after < nos.before && nos.speedKmh > 0,
      'nos ' + Math.round(nos.before) + ' -> ' + Math.round(nos.after) + ', ' + Math.round(nos.speedKmh) + ' km/h');

    // 7 — pause and resume.
    await cdp.evaluate('window.__lumen.pauseGame()');
    const paused = await L('__lumen.screen');
    await cdp.evaluate('window.__lumen.resumeGame()');
    const resumed = await L('__lumen.screen');
    check('7 pause/resume', paused === 'paused' && resumed === 'play',
      'paused=' + paused + ' resumed=' + resumed);

    // 8 — all 15 missions complete through the real path.
    const all = await cdp.evaluate('window.__lumen.completeAllMissions()');
    const s8 = await cdp.evaluate('window.__lumen.state()');
    check('8 all 15 missions complete', all === 15 && s8.missionsDone === 15,
      'completed=' + all + ' missionsDone=' + s8.missionsDone);

    // 9 — full-playthrough cash: $1,200 start + $38,500 of job rewards.
    check('9 cash $39,700', s8.cash === 39700, 'cash=$' + s8.cash);

    // 10 — turf 8/12, 19 kills, Bay Garage owned (opens after mission 8).
    check('10 turf 8/12 + 19 kills + garage owned',
      s8.turf === 8 && s8.kills === 19 && s8.garageOwned === true,
      'turf=' + s8.turf + '/12 kills=' + s8.kills + ' garageOwned=' + s8.garageOwned);

    // 11 — garage Engine Lv1 buys and raises top speed 62 -> 74.
    const buy = await cdp.evaluate('window.__lumen.buyUpgrade("engine1")');
    const s11 = await cdp.evaluate('window.__lumen.state()');
    check('11 garage Engine Lv1', buy.ok === true && s11.topSpeed === 74,
      'ok=' + buy.ok + ' topSpeed=' + s11.topSpeed);

    // 12 — save written to localStorage with the finished story.
    const saveRaw = await cdp.evaluate('window.__lumen.saveGame()');
    let saveOk = false;
    try {
      const s = JSON.parse(saveRaw);
      saveOk = s.mission === 15 && s.cash === 38900 && s.storyDone === true;
    } catch { /* bad save */ }
    check('12 save written', saveOk, saveRaw ? saveRaw.slice(0, 120) : 'null');

    // 13 — zero console errors across the whole run.
    const errs = cdp.consoleErrors.concat(await cdp.evaluate('window.__lumen.errors'));
    check('13 zero console errors', errs.length === 0, errs.length + ' errors');
    if (errs.length > 0) console.log(errs.slice(0, 8).join('\n'));

    cdp.close();
    proc.kill('SIGKILL');
  } finally {
    server.kill('SIGKILL');
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nprobe: ${results.length - failed}/${results.length} PASS`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('probe failed:', err.message);
  process.exit(1);
});
