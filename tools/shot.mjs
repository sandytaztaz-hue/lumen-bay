// LUMEN BAY — screenshot driver. Serves game/, opens ?shot=<n> in
// headless Chrome (SwiftShader WebGL), waits for the game's own
// __lumen.shotReady flag (raised after the settle frames, once the HUD
// is live), checks the shot is not a stale render (JOB 1 / $1,200 means
// the HUD never went live — re-navigate once), then captures a 1280x720
// JPEG into screenshots/. Usage: node tools/shot.mjs <1|2|3|4>

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const CHROME = '/opt/meta-chromium/chrome';
const HEADLESS_SHELL = process.env.HOME +
  '/.cache/puppeteer/chrome-headless-shell/linux-157.0.8103.50/chrome-headless-shell-linux64/chrome-headless-shell';

const NAMES = { 1: '1-chase.jpg', 2: '2-shootout.jpg', 3: '3-job.jpg', 4: '4-done.jpg' };
const CASH = { 1: '$18,450', 2: '$21,700', 3: '$48,500', 4: '$21,400' };
const JOB = { 1: 'JOB 12', 2: 'JOB 15', 3: 'JOB 15', 4: 'STORY COMPLETE' };

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

  async screenshot() {
    const res = await this.call('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
    return Buffer.from(res.data, 'base64');
  }

  close() { try { this.ws.close(); } catch { /* noop */ } }
}

async function launchChrome(url, port, profile) {
  const chrome = HEADLESS_SHELL;
  const args = [
    '--no-sandbox', '--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--hide-scrollbars', '--window-size=1280,720',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, url,
  ];
  const proc = spawn(chrome, args, { stdio: 'ignore' });
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
  const n = Number(process.argv[2]);
  if (![1, 2, 3, 4].includes(n)) {
    console.error('usage: node tools/shot.mjs <1|2|3|4>');
    process.exit(2);
  }
  const name = NAMES[n];
  const serverPort = 8901;
  const debugPort = 9331;
  const server = spawn(process.execPath, ['serve.ts', '--port', String(serverPort)], {
    cwd: repo, stdio: 'ignore',
  });
  try {
    if (!await waitHttp(`http://127.0.0.1:${serverPort}/index.html`)) {
      throw new Error('serve.ts did not come up');
    }
    const url = `http://127.0.0.1:${serverPort}/?shot=${n}&seed=7`;
    const { proc, wsUrl } = await launchChrome(url, debugPort, `/tmp/lumen-shot-${n}`);
    const cdp = new CDP(wsUrl);
    await cdp.ready();
    await cdp.call('Page.enable');
    await cdp.call('Runtime.enable');

    async function waitReady() {
      const t0 = Date.now();
      while (Date.now() - t0 < 600000) {
        try {
          const ready = await cdp.evaluate('window.__lumen && window.__lumen.shotReady');
          if (ready) return true;
        } catch { /* page still loading */ }
        await sleep(2000);
      }
      return false;
    }

    let ok = await waitReady();
    if (!ok) throw new Error('shotReady never raised for shot ' + n);
    // Stale-render check: the HUD must show this shot's job + cash.
    let cash = await cdp.evaluate("document.querySelector('.cash-value')?.textContent");
    let job = await cdp.evaluate("document.querySelector('.mission-title')?.textContent");
    if (cash !== CASH[n] || !String(job).includes(JOB[n])) {
      console.log(`stale render (cash=${cash} job=${job}) — re-navigating once`);
      await cdp.call('Page.navigate', { url });
      ok = await waitReady();
      if (!ok) throw new Error('shotReady never raised after re-navigate');
      cash = await cdp.evaluate("document.querySelector('.cash-value')?.textContent");
      job = await cdp.evaluate("document.querySelector('.mission-title')?.textContent");
      if (cash !== CASH[n] || !String(job).includes(JOB[n])) {
        throw new Error(`still stale after re-navigate (cash=${cash} job=${job})`);
      }
    }
    const frames = await cdp.evaluate('window.__lumen.frames');
    const errors = cdp.consoleErrors.concat(await cdp.evaluate('window.__lumen.errors'));
    await sleep(2000);
    const jpg = await cdp.screenshot();
    const outPath = join(repo, 'screenshots', name);
    writeFileSync(outPath, jpg);
    const sha = createHash('sha256').update(jpg).digest('hex');
    console.log(`shot ${n} -> screenshots/${name}  ${jpg.length} B  sha256 ${sha}  frames=${frames} errors=${errors.length}`);
    if (errors.length > 0) console.log('console errors:\n' + errors.slice(0, 5).join('\n'));
    cdp.close();
    proc.kill('SIGKILL');
  } finally {
    server.kill('SIGKILL');
  }
}

main().catch((err) => {
  console.error('shot failed:', err.message);
  process.exit(1);
});
