// LUMEN BAY entrypoint: hands the game in to the make.fun grader.
//
// Copies game/ and screenshots/ into the output directory and writes
// dossier.json there with the kit's dossier builder. Node standard
// library only, plus the kit library's buildDossier.
//
// The output directory may be a mounted volume in the grader. A mount
// point cannot be removed while it is mounted, so this program never
// removes the output directory itself: when it needs a clean slate it
// removes only the three entries it owns inside the directory (the
// copied game folder, the copied screenshots folder and the dossier
// file). Creating the directory when it is missing is fine.
//
// Every path is resolved from this file's own directory, never from the
// process working directory: the grader runs this entrypoint from an
// arbitrary working directory.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// A dossier smaller than this is suspiciously thin for a full game;
// warn about it instead of failing, so a small but valid entry still
// gets handed in.
const MIN_DOSSIER_BYTES = 700 * 1024;

// The folder this file lives in is the repository root.
const repoRoot = dirname(fileURLToPath(import.meta.url));

// The game page must be present, or there is nothing to hand in.
const gamePage = join(repoRoot, 'game', 'index.html');
if (!existsSync(gamePage)) {
  console.error(`error: game/index.html not found under ${repoRoot}`);
  process.exit(1);
}

// The grader mounts its output volume at /output; outside the grader
// MAKEFUN_OUTPUT_DIR stands in for it.
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// Make sure the output directory exists. Creating it is safe; removing
// it is not (it may be a mount point), so it is never removed.
mkdirSync(outDir, { recursive: true });

// Clear only the entries this program owns inside the output
// directory. The directory itself stays put.
for (const owned of ['game', 'screenshots', 'dossier.json']) {
  rmSync(join(outDir, owned), { recursive: true, force: true });
}

// Copy the game and its screenshots into the output directory.
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

// Build the dossier from what is now in the output directory.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

// Report what was written: its size and its sha256 digest.
const written = readFileSync(join(outDir, 'dossier.json'));
const digest = createHash('sha256').update(written).digest('hex');
console.log(`dossier.json: ${written.length} bytes, sha256 ${digest}`);
if (written.length < MIN_DOSSIER_BYTES) {
  console.warn(`warning: dossier is under 700 KB (${written.length} bytes)`);
}
console.log(`output written to ${outDir}`);
