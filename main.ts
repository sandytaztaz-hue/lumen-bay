// LUMEN BAY r8c — the entry program (Node 22, standard library only).
// r8c rebuilds the lighting for bright daytime (clear blue sky, high white
// sun) on top of the r8b hero/police/crowd/neon build; gameplay/missions
// unchanged. Dossier: run it twice, the two dossier.json outputs must be
// byte-identical.
// It hands the game in: copies game/ and screenshots/ from beside this file to
// /output (or MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with the vendored make.fun library, exactly as the kit's
// starter does. No build step, no network, no install.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Run it twice: the two dossier.json outputs must be byte-identical.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
// The scorer's caps (reference/gate.json): only text_max_bytes shapes the
// dossier bytes; the others refuse an entry the scorer would refuse — more than
// 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of
// game files in all, or a path under game/ over 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
