// LUMEN BAY — tools/cdp.mjs
// Shared headless-Chrome driver for the probe and the shot tool. It talks
// to the stock puppeteer Chrome build over the DevTools protocol with
// Node 22's built-in WebSocket client — no puppeteer library needed.

import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const CHROME = '/home/hatch/.cache/puppeteer/chrome/linux-157.0.8103.50/chrome-linux64/chrome';
export const NODE22 = '/home/hatch/workspace/makefun/github-core-clone-01/node-v22.21.1-linux-x64/bin/node';
export const GAME_PORT = 8091;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Start serve.ts on port 8091 if it is not already serving this game.
// Refuses to run if the port serves something other than this game.
export async function ensureServer(repoRoot) {
  const url = 'http://127.0.0.1:' + GAME_PORT + '/';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    const body = await res.text();
    if (res.ok && body.includes('LUMEN BAY')) return null;
    throw new Error('port ' + GAME_PORT + ' serves something other than this game');
  } catch (err) {
    if (err.message.startsWith('port ')) throw err;
    // Nothing listening: start our own server.
  }
  const child = spawn(NODE22, ['serve.ts'], { cwd: repoRoot, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      const body = await res.text();
      if (res.ok && body.includes('LUMEN BAY')) return child;
    } catch (err) {
      // Not up yet.
    }
    if (child.exitCode !== null) throw new Error('serve.ts exited early with code ' + child.exitCode);
  }
  throw new Error('serve.ts did not come up on port ' + GAME_PORT);
}

export class ChromeSession {
  constructor() {
    this.child = null;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.consoleErrors = [];
  }

  async launch(debugPort, width, height, tag) {
    const profile = mkdtempSync(join(tmpdir(), 'lumen-chrome-' + tag + '-'));
    const args = [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--disable-dev-shm-usage',
      '--no-proxy-server',
      '--disable-features=LocalNetworkAccessChecks',
      '--remote-debugging-port=' + debugPort,
      '--user-data-dir=' + profile,
      '--window-size=' + width + ',' + height,
      'about:blank',
    ];
    this.child = spawn(CHROME, args, { stdio: 'ignore' });
    let target = null;
    for (let i = 0; i < 60; i++) {
      await sleep(500);
      try {
        const res = await fetch('http://127.0.0.1:' + debugPort + '/json/list', { signal: AbortSignal.timeout(2000) });
        const list = await res.json();
        target = list.find((t) => t.type === 'page');
        if (target) break;
      } catch (err) {
        // Chrome not up yet.
      }
      if (this.child.exitCode !== null) throw new Error('chrome exited early with code ' + this.child.exitCode);
    }
    if (!target) throw new Error('chrome did not expose a page target');
    this.ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch (err) {
        return;
      }
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error('CDP ' + msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        const cbs = this.listeners.get(msg.method) || [];
        for (const cb of cbs) cb(msg.params);
      }
    };
    this.on('Runtime.consoleAPICalled', (p) => {
      if (p.type === 'error') {
        this.consoleErrors.push(p.args.map((a) => a.value ?? a.description ?? '').join(' '));
      }
    });
    this.on('Runtime.exceptionThrown', (p) => {
      const d = p.exceptionDetails || {};
      this.consoleErrors.push('exception: ' + (d.text || '') + ' ' + ((d.exception && d.exception.description) || ''));
    });
    this.on('Log.entryAdded', (p) => {
      if (p.entry && p.entry.level === 'error') {
        this.consoleErrors.push('log: ' + (p.entry.text || '') + ' ' + (p.entry.url || ''));
      }
    });
    await this.send('Runtime.enable');
    await this.send('Page.enable');
    await this.send('Log.enable');
    // Force the layout viewport to the requested size: headless Chrome's
    // --window-size leaves the viewport 200 px short, which misplaces
    // every bottom-anchored HUD panel and overflows the 720 px map.
    await this.send('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 1, mobile: false,
    });
  }

  on(method, cb) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(cb);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('CDP timeout on ' + method));
        }
      }, 30000);
    });
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression, awaitPromise: true, returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error('evaluate failed: ' + JSON.stringify(res.exceptionDetails.exception?.description || res.exceptionDetails.text));
    }
    return res.result.value;
  }

  async waitFor(fn, timeoutMs, label) {
    const deadline = Date.now() + timeoutMs;
    let lastErr = null;
    while (Date.now() < deadline) {
      try {
        const ok = await this.evaluate('(' + fn.toString() + ')()');
        if (ok) return true;
      } catch (err) {
        lastErr = err;
      }
      await sleep(250);
    }
    throw new Error('timed out waiting for ' + label + (lastErr ? ': ' + lastErr.message : ''));
  }

  async screenshot() {
    const res = await this.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
    return Buffer.from(res.data, 'base64');
  }

  close() {
    try {
      if (this.ws) this.ws.close();
    } catch (err) {
      // Already closed.
    }
    if (this.child) {
      try {
        this.child.kill('SIGKILL');
      } catch (err) {
        // Already dead.
      }
    }
  }
}

export { sleep };
