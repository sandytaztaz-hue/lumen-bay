// LUMEN BAY — tiny static server for local play-testing.
// Serves this directory on http://localhost:8080 (game at /, screenshots
// under /screenshots/). Node 22, standard library only. Note: the game
// itself is served from game/ — open http://localhost:8080/game/ to play,
// or http://localhost:8080/game/?shot=chase&seed=1 for the cover scene.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const PORT = 8080;
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.ts': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let path = url.pathname === '/' ? '/game/index.html' : url.pathname;
    const file = normalize(join(here, path));
    if (!file.startsWith(here)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}).listen(PORT, () => console.log(`LUMEN BAY at http://localhost:${PORT}/`));
