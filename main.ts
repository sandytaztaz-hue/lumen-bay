// LUMEN BAY — entry point. Copies game/ + screenshots/ to /output and
// writes the make.fun dossier (buildDossier from vendor/makefun-game.ts).
// Run from the repo root: `node main.ts`. Deterministic: the same tree
// always writes the same dossier bytes.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildDossier } from './vendor/makefun-game.ts';

const repo = process.cwd();
const out = '/output';

if (!existsSync(`${repo}/game/index.html`)) {
  console.error('main.ts: run from the repo root (game/index.html not found)');
  process.exit(1);
}
mkdirSync(out, { recursive: true });
cpSync(`${repo}/game`, `${out}/game`, { recursive: true });
cpSync(`${repo}/screenshots`, `${out}/screenshots`, { recursive: true });

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(`${out}/dossier.json`, dossier);

const sha = createHash('sha256').update(dossier).digest('hex');
console.log(`dossier: ${dossier.length} bytes sha256 ${sha}`);
if (dossier.length < 700 * 1024) {
  console.warn(`dossier is under the 700 KB bar (${dossier.length} bytes) — check the screenshots`);
}
console.log(`output: ${out} (game/ + screenshots/ + dossier.json)`);
