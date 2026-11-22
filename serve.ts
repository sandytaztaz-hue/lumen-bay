// LUMEN BAY — serve.ts
// A static file server for the game (Node standard library only).
// Serves game/ over HTTP on port 8091 by default (PORT overrides).
// Root serves index.html, favicon gets an empty 204, paths outside the
// game directory or missing files get 404.

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';

const gameDir = resolve(import.meta.dirname, 'game');
const port = parseInt(process.env.PORT || '8091', 10);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (url.pathname === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }
  const rel = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
  const file = resolve(gameDir, rel);
  if (!file.startsWith(gameDir + '/') && file !== gameDir) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'content-type': type });
  res.end(readFileSync(file));
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('serve.ts: port ' + port + ' is already in use — stop the other server or set PORT.');
    process.exit(1);
  }
  throw err;
});

server.listen(port, () => {
  console.log('LUMEN BAY serving game/ on http://localhost:' + port);
});
