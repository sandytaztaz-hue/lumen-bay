// LUMEN BAY — tools/shot.mjs
// The screenshot driver: takes a shot number (1 to 4, or "all"), starts
// the server if needed, opens the game's shot URL in the same headless
// Chrome on its own debugging port (never attach to another agent's
// browser — a wrong browser reads stale frames forever), waits until the
// shot-ready flag is set AND the cash text matches the shot's pinned
// value (a render showing job 1 and 1,200 cash is STALE, re-run it),
// waits one more beat, captures a 1280 by 720 JPEG at quality 90 into
// screenshots/, prints its size and sha256, and retries once on a stale
// capture.

import { ensureServer, ChromeSession, GAME_PORT, sleep } from './cdp.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shots = JSON.parse(readFileSync(join(repoRoot, 'shots.json'), 'utf8'));

const PINNED_CASH = { 1: '$18,450', 2: '$21,700', 3: '$48,500', 4: '$21,400' };

function shotSha(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

async function takeShot(chrome, n) {
  const entry = shots[n - 1];
  if (!entry) throw new Error('no shot ' + n + ' in shots.json');
  const url = 'http://127.0.0.1:' + GAME_PORT + '/index.html' + entry.query;
  const wantCash = PINNED_CASH[n];
  for (let attempt = 1; attempt <= 2; attempt++) {
    await chrome.navigate(url);
    await chrome.waitFor(function () {
      return window.__shotReady === true;
    }, 30000, 'shot ' + n + ' ready');
    const cash = await chrome.evaluate("document.querySelector('#cashText').textContent");
    if (cash !== wantCash) {
      console.log('shot ' + n + ' attempt ' + attempt + ': STALE cash ' + cash + ' (want ' + wantCash + '), retrying');
      continue;
    }
    await sleep(500);
    const buf = await chrome.screenshot();
    if (buf.length < 40 * 1024) throw new Error('shot ' + n + ' too small (' + buf.length + ' bytes) — likely a blank frame');
    const outPath = join(repoRoot, 'screenshots', entry.file);
    writeFileSync(outPath, buf);
    console.log('shot ' + n + ': ' + entry.file + ' ' + buf.length + ' bytes sha256 ' + shotSha(buf));
    return { file: entry.file, bytes: buf.length, sha256: shotSha(buf) };
  }
  throw new Error('shot ' + n + ' stayed stale after 2 attempts');
}

async function main() {
  const arg = process.argv[2] || 'all';
  const wanted = arg === 'all' ? [1, 2, 3, 4] : [parseInt(arg, 10)];
  for (const n of wanted) {
    if (![1, 2, 3, 4].includes(n)) {
      console.error('usage: node tools/shot.mjs [1|2|3|4|all]');
      process.exit(1);
    }
  }
  let server = null;
  const chrome = new ChromeSession();
  try {
    server = await ensureServer(repoRoot);
    await chrome.launch(9334, 1280, 720, 'shot');
    for (const n of wanted) {
      await takeShot(chrome, n);
    }
    console.log('shots done: ' + wanted.join(', '));
  } catch (err) {
    console.error('SHOT ERROR: ' + err.message);
    if (chrome.consoleErrors.length) console.error('console errors: ' + chrome.consoleErrors.join(' | '));
    process.exitCode = 1;
  } finally {
    chrome.close();
    if (server) {
      try { server.kill('SIGTERM'); } catch (err) { /* already dead */ }
    }
  }
}

main();
