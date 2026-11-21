# LUMEN BAY — Sunset Getaway

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/p/gta6-01)
[![rank](https://make.fun/badge/gta6-01/sandytaztaz-hue/lumen-bay/rank.svg)](https://make.fun/p/gta6-01)
[![reward](https://make.fun/badge/gta6-01/sandytaztaz-hue/lumen-bay/reward.svg)](https://make.fun/p/gta6-01)

An open-world crime game in the spirit of GTA 6, playable in a desktop
browser from static files with no network request. Built for the
[make.fun gta6-01 bounty](https://make.fun/p/gta6-01) — $1,666 pot, top 100 paid.

You are **Mara Solis**, getaway driver in **Puerto Lumen** — a sun-soaked
island city of boulevards, beaches, a marina, a casino row and the Torre
Lumen clock tower. Fifteen story jobs with fixer Tio Reyes, hacker Lena
Cruz and wheelman Big Dario take you from stealing the Veloz Comet RS at
the marina to cracking the Torre Lumen vault and escaping by speedboat at dawn.

## What is in the game

- **A city on foot and by car** — third-person walking (WASD + mouse orbit)
  and arcade driving (chase cam, handbrake, NOS boost) on a boulevard grid
  with palms, lamps, beach and sea.
- **Traffic and pedestrians** — 12 AI cars on road loops, walkers on the
  sidewalks who flee gunfire. Sidewalk pedestrians can never drift onto the
  road: their wandering is clamped to their home side of the street.
- **Cars to steal** — press E near any car to take it; stealing raises heat.
- **A wanted level and police** — 0–5 gold stars; black-white LCPD cruisers
  chase and ram, police motorcycles ride alongside, and the AIR-1 helicopter
  circles overhead with a spotlight from 3 stars. Heat decays when hidden.
- **15 missions + a story** — steals, deliveries on a timer, shootouts,
  escapes, an 8-checkpoint street race and the vault finale, with dialogue,
  markers, cash, rep and turf.
- **Combat** — pistol (infinite) and SMG pickup, hitscan with muzzle flash,
  tracers, damage numbers and a kill feed.
- **A HUD with a minimap** — mission panel, wanted stars, cash, weapon
  slots, health / armour / NOS, the LCPD response list, a live circular
  minimap, speedometer, radio station and a full-city-map overlay (M).
- **A start and a save** — title screen with Continue, and a save slot in
  localStorage (mission, cash, rep, turf, garage, position).
- **Garage, races, turf** — Bay Garage upgrades (engine, armour, NOS,
  paint), street races and 12 turf spots to take from the Tiburones.
- **Sound** — fully synthesized WebAudio: engine hum, sirens, gunshots,
  mission stingers and a synthwave radio loop. No audio files.

## Play it

```sh
node serve.ts            # serves game/ on http://localhost:8080
```

Open http://localhost:8080 — no build step, no network. Keyboard + mouse.

| Key | Action |
| --- | --- |
| WASD / arrows | Drive / walk |
| SPACE | Handbrake |
| SHIFT | NOS boost |
| E | Enter / exit car, interact |
| CLICK | Shoot |
| 1 / 2 / 3 | Fists / Pistol / SMG |
| M | City map |
| P / ESC | Pause |

## Screenshots

Rendered by the game's own code (`node tools/shot.mjs <n>`, headless
Chrome + SwiftShader WebGL):

1. `1-chase.jpg` — night chase: the red Comet RS under the heli beam, eight
   LCPD units closing, 5 gold stars.
2. `2-shootout.jpg` — beach shootout: Mara pulled back, cordon returning
   fire, one downed officer with a blood pool.
3. `3-job.jpg` — the full Puerto Lumen city map with the gold escape route
   from the vault to the boat.
4. `4-done.jpg` — dawn: story complete, the speedboat waiting, MISSION PASSED.

## Verify it

```sh
node tools/probe.mjs     # 13 gameplay checks, 15/15 missions, 0 console errors
node main.ts              # writes /output/dossier.json (MAKEFUN_OUTPUT_DIR=out to test)
```

## Tech

- three.js 0.170.0 vendored under `game/vendor/three/` (MIT, byte-for-byte
  from unpkg), loaded via an import map. All other code is original.
- Procedural canvas textures (building facades, roads, sand) — zero image assets.
- Deterministic seeded world (`?seed=7`); screenshots stage fixed scenes
  from the real game state via `?shot=1..4`.
- `main.ts` copies `game/` + `screenshots/` to `/output` and builds the
  dossier with the vendored `vendor/makefun-game.ts` (unchanged kit file).

## License

MIT — see `LICENSE`. Everything in this repo (city, characters, vehicles,
names, story, art, sound, music) is original; nothing is taken from any
commercial game.
