# LUMEN BAY: Sunset Getaway

[![make.fun — gta6-01](https://img.shields.io/badge/make.fun-gta6--01-orange)](https://make.fun/c/gta6-01)
[![Lumen Bay — Sunset Getaway](https://img.shields.io/badge/Lumen%20Bay-Sunset%20Getaway-red)](https://make.fun/c/gta6-01)
[![lumen-bay repo](https://img.shields.io/badge/repo-lumen--bay-blue)](https://github.com/sandytaztaz-hue/lumen-bay)

**make.fun bounty:** [gta6-01](https://make.fun/c/gta6-01) — build the most
complete open-world crime game you can, in the spirit of GTA 6. Owner:
**sandytaztaz-hue**, repo **lumen-bay**.

## The game

Original sun-soaked island city **Puerto Lumen**. You are **Mara Solis**,
getaway driver. Crew: fixer **Tio Reyes**, hacker **Lena Cruz**, wheelman
**Big Dario**. Landmark: **Torre Lumen** clock tower, **Playa Dorada** beach,
**Mercado Viejo**.

- **On foot and by car** — third-person WASD + mouse orbit on foot, arcade
  driving with chase cam, `E` to steal any car.
- **Traffic + pedestrians** — 12 AI cars on road loops, 24 walkers who flee
  gunfire.
- **Wanted 0–5 stars** — police cruisers chase + ram, helicopter with a
  spotlight at 3+ stars, wanted decays when hidden, BUSTED / WASTED.
- **Combat** — pistol (infinite) + SMG, hitscan, muzzle flash, tracers,
  damage numbers, kill feed.
- **15 story jobs** — from stealing the Comet GT at the marina to the Torre
  Lumen vault heist and the dawn boat out. Full playthrough: $39,700,
  19 kills, 8/12 turf, Bay Garage owned.
- **Economy + garage** — job cash buys engine levels, armour, NOS.
- **HUD** — minimap, gold wanted stars, health, cash, speed, weapon + ammo,
  objective banner, event log, radio, clock.
- **Audio** — WebAudio synth: engine hum, sirens, gunshots, radio loop.
  No audio files.
- **Save** — localStorage; title screen offers CONTINUE.

## Play

```sh
node serve.ts        # http://localhost:8080/
```

WASD move/drive · mouse drag orbits the camera · E steal/exit car ·
click shoot · Shift NOS · Space handbrake · 1/2/3 weapons · M city map ·
P pause · R radio.

## Screenshots

Rendered headless (Chrome CDP, SwiftShader WebGL, 1280×720 JPEG q90):

```sh
node tools/shot.mjs 1   # night boulevard chase — JOB 12, 5 stars, heli beam
node tools/shot.mjs 2   # beach shootout — JOB 15, cordon, downed officer
node tools/shot.mjs 3   # full city map — escape route, vault to boat
node tools/shot.mjs 4   # dawn boat — STORY COMPLETE
```

## Verify

```sh
node tools/probe.mjs    # 13 gameplay checks, 0 console errors
node main.ts             # writes /output/dossier.json (≥700 KB)
```

Probe checks: boots/renders, title→play, Job 1 start/complete, enter/exit
car, wanted 3 + police + heli, NOS burn, pause/resume, all 15 missions
($39,700, turf 8/12, Bay Garage owned, 19 kills), garage Engine Lv1,
save written, 0 console errors.

## Tech

- three.js 0.170.0 vendored under `game/vendor/three/` + import map.
- Procedural canvas textures, seeded RNG — no assets, no network.
- `main.ts` copies `game/` + `screenshots/` to `/output` and builds the
  dossier with the kit's `vendor/makefun-game.ts` (unchanged).
