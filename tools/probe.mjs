// LUMEN BAY — tools/probe.mjs
// A gameplay probe with 13 checks against the live game in headless
// Chrome (the stock puppeteer Chrome build — never the Hatch build, its
// local-network checks block localhost navigation and its WebGL policy
// blocks this game). Exits 0 only when all 13 pass.

import { ensureServer, ChromeSession, GAME_PORT, sleep } from './cdp.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GAME_URL = 'http://127.0.0.1:' + GAME_PORT + '/index.html?seed=7';

const results = [];
function check(n, name, ok, detail) {
  results.push({ n, name, ok, detail: detail || '' });
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + n + '. ' + name + (detail ? ' — ' + detail : ''));
}

async function main() {
  let server = null;
  const chrome = new ChromeSession();
  try {
    server = await ensureServer(repoRoot);
    await chrome.launch(9333, 1280, 920, 'probe');
    await chrome.navigate(GAME_URL);

    // (1) The game boots and renders frames.
    await chrome.waitFor(function () {
      return window.__lumen && window.__lumen.state.frames > 5;
    }, 30000, 'game boot');
    check(1, 'game boots and renders frames', true, 'frames=' + (await chrome.evaluate('window.__lumen.state.frames')));

    // (2) Title to play.
    await chrome.evaluate("document.querySelector('#playBtn').click()");
    await sleep(500);
    const started = await chrome.evaluate('window.__lumen.snapshot().started');
    check(2, 'title to play', started === true, 'started=' + started);

    // (3) Job 1 starts.
    const job1 = await chrome.evaluate('window.__lumen.snapshot().job');
    check(3, 'job 1 starts', job1 === 1, 'job=' + job1);

    // (4) Job 1 completes and cash goes from 1,200 to 2,000.
    const cashBefore = await chrome.evaluate('window.__lumen.snapshot().cash');
    await chrome.evaluate('window.__lumen.completeMission()');
    const cashAfter = await chrome.evaluate('window.__lumen.snapshot().cash');
    check(4, 'job 1 completes, cash 1,200 -> 2,000', cashBefore === 1200 && cashAfter === 2000, cashBefore + ' -> ' + cashAfter);

    // (5) Enter the car.
    const entered = await chrome.evaluate('window.__lumen.enterCar()');
    const inCar = await chrome.evaluate('window.__lumen.snapshot().inCar');
    check(5, 'enter the car', entered === true && inCar === true, 'inCar=' + inCar);

    // (6) Exit the car.
    const exited = await chrome.evaluate('window.__lumen.exitCar()');
    const outCar = await chrome.evaluate('window.__lumen.snapshot().inCar');
    check(6, 'exit the car', exited === true && outCar === false, 'inCar=' + outCar);

    // (7) Wanted 3 with at least 3 police active and the helicopter visible.
    await chrome.evaluate('window.__lumen.setWanted(3)');
    await sleep(1200);
    const wanted = await chrome.evaluate('window.__lumen.snapshot()');
    check(7, 'wanted 3, >=3 police, heli visible', wanted.wanted === 3 && wanted.policeActive >= 3 && wanted.heliVisible === true,
      'police=' + wanted.policeActive + ' heli=' + wanted.heliVisible);

    // (8) NOS burns (tank drops).
    const nosBefore = await chrome.evaluate('window.__lumen.snapshot().nos');
    await chrome.evaluate('window.__lumen.burnNos()');
    const nosAfter = await chrome.evaluate('window.__lumen.snapshot().nos');
    check(8, 'NOS burns (tank drops)', nosAfter < nosBefore, nosBefore + ' -> ' + nosAfter);

    // (9) Pause then resume.
    await chrome.evaluate('window.__lumen.pause()');
    const paused = await chrome.evaluate('window.__lumen.snapshot().paused');
    await chrome.evaluate('window.__lumen.resume()');
    const resumed = await chrome.evaluate('window.__lumen.snapshot().paused');
    check(9, 'pause then resume', paused === true && resumed === false, 'paused=' + paused + ' resumed=' + !resumed);

    // (10) All 15 missions complete: cash 39,700, turf 8 of 12, garage
    // owned, kills 19.
    await chrome.evaluate('window.__lumen.completeAllMissions()');
    const all = await chrome.evaluate('window.__lumen.snapshot()');
    check(10, 'all 15 missions complete', all.cash === 39700 && all.turf === 8 && all.garageOwned === true && all.kills === 19,
      'cash=' + all.cash + ' turf=' + all.turf + '/12 garage=' + all.garageOwned + ' kills=' + all.kills);

    // (11) Garage Engine level 1: engine 1 and cash down exactly 1,500.
    const engCashBefore = await chrome.evaluate('window.__lumen.snapshot().cash');
    const bought = await chrome.evaluate('window.__lumen.buyEngine()');
    const eng = await chrome.evaluate('window.__lumen.snapshot()');
    check(11, 'garage Engine level 1', bought.ok === true && eng.engineLevel === 1 && engCashBefore - eng.cash === 1500,
      'engine=' + eng.engineLevel + ' cash ' + engCashBefore + ' -> ' + eng.cash);

    // (12) Save written with all 15 missions in it, and the saved cash
    // matches the live cash.
    await chrome.evaluate('window.__lumen.save()');
    const saved = await chrome.evaluate("JSON.parse(window.localStorage.getItem('lumenbay.save.v1') || '{}')");
    const liveCash = await chrome.evaluate('window.__lumen.snapshot().cash');
    check(12, 'save written with all 15 missions', Array.isArray(saved.completed) && saved.completed.length === 15 && saved.cash === liveCash,
      'completed=' + (saved.completed ? saved.completed.length : 'none') + ' savedCash=' + saved.cash + ' liveCash=' + liveCash);

    // (13) Zero console errors.
    check(13, 'zero console errors', chrome.consoleErrors.length === 0,
      chrome.consoleErrors.length ? chrome.consoleErrors.slice(0, 3).join(' | ') : 'none');
  } catch (err) {
    console.error('PROBE ERROR: ' + err.message);
    if (chrome.consoleErrors.length) console.error('console errors: ' + chrome.consoleErrors.join(' | '));
    process.exitCode = 1;
  } finally {
    chrome.close();
    if (server) {
      try { server.kill('SIGTERM'); } catch (err) { /* already dead */ }
    }
  }
  const failed = results.filter((r) => !r.ok);
  console.log('probe: ' + (results.length - failed.length) + '/' + results.length + ' passed');
  if (failed.length > 0) process.exitCode = 1;
}

main();
