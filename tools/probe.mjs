// LUMEN BAY r12 polling probe: re-tests the transitions a naive driver reads
// too early (driver-read race under SwiftShader: frame tick ~310ms, driver
// read ~250-370ms after tap). Real key taps go through CDP
// Input.dispatchKeyEvent, and every check waits for its transition instead
// of reading immediately. Usage: node tools/probe.mjs
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const base = '/home/hatch/workspace/makefun/gta6-01';
const repo = join(base, 'repo');
const work = join(base, 'play-r12', 'probe');
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = '/home/hatch/.cache/puppeteer/chrome/linux-157.0.8103.50/chrome-linux64/chrome';
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail ?? ''}`); };

const serve = spawn('node', ['serve.ts', '--port', '8081'], { cwd: repo, stdio: 'pipe', detached: true });
let chrome = null;
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
  chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9223', `--user-data-dir=${join(work, 'profile')}`, '--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=1280,720', 'http://127.0.0.1:8081/index.html?fast=1'], { stdio: 'pipe', detached: true });
  let page = null;
  for (let i = 0; i < 30; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9223/json/list')).json();
      page = list.find((t) => t.type === 'page' && t.url.includes('fast=1'));
      if (page) break;
    } catch {}
    await sleep(1000);
  }
  if (!page) throw new Error('no fast=1 page');
  await sleep(3000);
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
      if (msg.error) rej(new Error(JSON.stringify(msg.error))); else res(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      errors.push('EXCEPTION: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 200));
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      errors.push('CONSOLE: ' + msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200));
    }
  };
  const send = (method, params) => new Promise((res, rej) => {
    const id = ++mid;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r.result?.value;
  };
  const waitFor = async (expr, timeoutMs) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      try { if (await ev(expr)) return { ok: true, ms: Date.now() - t0 }; } catch {}
      await sleep(300);
    }
    return { ok: false, ms: Date.now() - t0 };
  };
  const key = async (type, code, k, vk) => {
    await send('Input.dispatchKeyEvent', { type, code, key: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  };
  const tap = async (code, k, vk) => {
    await key('keyDown', code, k, vk);
    await sleep(120);
    await key('keyUp', code, k, vk);
    await sleep(250);
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await sleep(1000);

  // 1. Boots and renders.
  let r = await waitFor('window.__frames > 5', 60000);
  check('1 boots-and-renders', r.ok, `${r.ms}ms`);
  // 2. Enter -> play (real Enter tap).
  await tap('Enter', 'Enter', 13);
  r = await waitFor(`window.__game.state.screen === 'play'`, 10000);
  check('2 title->play', r.ok, `${r.ms}ms`);
  // 3. M starts Job 1 (real M tap).
  await tap('KeyM', 'm', 77);
  r = await waitFor(`window.__game.stateSummary().active === true && window.__game.stateSummary().mission === 0`, 10000);
  check('3 M starts Job 1', r.ok, `${r.ms}ms`);
  // 4. Job 1 completes (fair-means completer), cash 1200 + 500.
  await ev('window.__game.completeMission()');
  r = await waitFor(`window.__game.stateSummary().mission === 1 && window.__game.stateSummary().cash === 1700`, 10000);
  check('4 Job 1 completes', r.ok, `${r.ms}ms`);
  // 5. Enter the car.
  await ev('if (window.__game.player.inCar) window.__game.exitCar()');
  await ev('window.__game.enterNearestCar()');
  r = await waitFor(`window.__game.stateSummary().inCar === true`, 10000);
  check('5 enter car', r.ok, `${r.ms}ms`);
  // 6. Exit car.
  await ev('window.__game.exitCar()');
  r = await waitFor(`window.__game.stateSummary().inCar === false`, 5000);
  check('6 exit car', r.ok, `${r.ms}ms`);
  // 7. Wanted 3 spawns police + heli.
  await ev('window.__game.enterNearestCar()');
  await ev('window.__game.setWanted(3)');
  r = await waitFor(`window.__game.stateSummary().wanted === 3 && window.__game.stateSummary().police >= 3 && window.__game.G.heli.active === true`, 15000);
  check('7 wanted 3 police+heli', r.ok, `${r.ms}ms`);
  // 8. NOS burns: hold W+Shift, poll for meter drop.
  const nosBefore = await ev('window.__game.garage.nos');
  await key('keyDown', 'ShiftLeft', 'Shift', 16);
  await key('keyDown', 'KeyW', 'w', 87);
  r = await waitFor(`window.__game.garage.nos < ${nosBefore - 0.5}`, 30000);
  await key('keyUp', 'KeyW', 'w', 87);
  await key('keyUp', 'ShiftLeft', 'Shift', 16);
  const nosAfter = await ev('window.__game.garage.nos');
  check('8 NOS burns', r.ok, `nos ${Math.round(nosBefore)}->${Math.round(nosAfter)} in ${r.ms}ms`);
  // 9. Garage Engine Lv1 (real Digit1 tap), cash 5000 - 800 = 4200.
  await ev('window.__game.exitCar()');
  await ev('window.__game.warpTo(-180,-40)');
  await ev('window.__game.setCash(5000)');
  await ev('window.__game.interact()');
  r = await waitFor(`window.__game.state.garageOpen === true`, 10000);
  const opened = r.ok;
  await tap('Digit1', '1', 49);
  r = await waitFor(`window.__game.stateSummary().upgrades.engine === 1 && window.__game.stateSummary().cash === 4200`, 10000);
  check('9 garage Engine Lv1', opened && r.ok, `opened=${opened} ${r.ms}ms`);
  await tap('KeyE', 'e', 69);
  if (await ev('window.__game.state.garageOpen')) { await tap('KeyE', 'e', 69); }
  await waitFor('!window.__game.state.garageOpen', 5000);
  // 10. Pause / resume (real Escape taps).
  await tap('Escape', 'Escape', 27);
  r = await waitFor(`window.__game.state.screen === 'paused'`, 10000);
  const paused = r.ok;
  await tap('Escape', 'Escape', 27);
  r = await waitFor(`window.__game.state.screen === 'play'`, 10000);
  check('10 pause/resume', paused && r.ok, `paused=${paused} resumed=${r.ok}`);
  // 11. Full story completes (async loop: frames must run between missions
  // so police spawn for the cruiser-steal job).
  await ev(`(async () => { for (let i = 0; i < 60; i++) { const m = window.__game.missions; if (!m.active && m.missionIdx < 15) m.startMission(m.missionIdx); window.__game.completeMission(); if (m.missionIdx >= 15) break; await new Promise((res) => setTimeout(res, 600)); } })()`);
  await sleep(1500);
  const sum = await ev(`JSON.stringify(window.__game.stateSummary())`);
  check('11 story completes 15/15', (await ev(`window.__game.missions.missionIdx`)) >= 15, sum);
  check('12 save written', await ev(`!!window.localStorage.getItem('lumenbay.r6.save.v1')`));
  check('0 console errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  ws.close();
} finally {
  try { if (chrome) process.kill(-chrome.pid, 'SIGKILL'); } catch {}
  try { process.kill(-serve.pid, 'SIGKILL'); } catch {}
  await sleep(1000);
}
const passed = results.filter((x) => x.ok).length;
console.log(`=== r12 probe: ${passed}/${results.length} PASS ===`);
process.exitCode = passed === results.length ? 0 : 1;
