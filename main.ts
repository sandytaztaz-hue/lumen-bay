// LUMEN BAY — main.ts
// The entrypoint (Node 22, standard library only). It copies game/ and
// screenshots/ into the output directory and writes dossier.json with
// the kit library's dossier builder. Running it twice on the same tree
// writes byte-identical output.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = resolve(import.meta.dirname);
const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

if (!existsSync(join(gameDir, 'index.html'))) {
  console.error('main.ts: game/index.html is missing, cannot build the dossier.');
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

// A missing or empty screenshots/ still builds a dossier, but the
// entry would be invalid at the gate — say so loudly instead of
// silently handing in a screenshot-less entry.
if (!existsSync(shotsDir)) {
  console.warn('warning: screenshots/ is missing — the entry needs 3 or 4 screenshots.');
} else {
  const shots = readdirSync(shotsDir).filter((f) => !f.startsWith('.'));
  if (shots.length < 3) console.warn('warning: only ' + shots.length + ' screenshot(s) — the entry needs 3 or 4.');
  console.log('screenshots: ' + shots.join(', '));
}

const sha = createHash('sha256').update(dossier).digest('hex');
console.log('dossier bytes: ' + dossier.length);
console.log('dossier sha256: ' + sha);
if (dossier.length < 700 * 1024) {
  console.warn('warning: dossier is under 700 KB (' + dossier.length + ' bytes).');
}
console.log('output: ' + outDir);
