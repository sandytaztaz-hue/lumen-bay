# LUMEN BAY: Sunset Getaway

[![Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/sandytaztaz-hue/lumen-bay/rank.svg)](https://make.fun/c/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/sandytaztaz-hue/lumen-bay/reward.svg)](https://make.fun/c/gta6-01)

An original open-world crime caper in the browser. You are Mara Solis, getaway driver in the sun-soaked island city of Puerto Lumen. Steal the Veloz Comet RS at the marina, run fifteen story jobs for fixer Tio Reyes, hacker Lena Cruz and wheelman Big Dario, outrun the LCPD through five wanted stars, crack the Torre Lumen vault and vanish on the dawn boat.

## The game

- **A city to explore** — twelve districts, four rows of procedural buildings, the Torre Lumen clock tower, the lighthouse, the marina pier, palms, markets and beaches, all built from a seed so the same seed always builds the same Puerto Lumen.
- **On foot and by car** — third-person walking with a mouse-orbit camera, arcade driving with a chase camera, handbrake, NOS boost and a garage that sells engine levels, armour, NOS tanks and repairs.
- **Traffic and pedestrians** — twelve AI traffic cars, twenty-four strolling pedestrians who flee gunfire, police bikes and the helicopter AIR-1 with its spotlight.
- **Wanted, police, combat** — a 0–5 star wanted level, cruisers that chase and ram, roadblocks across the boulevard at 4–5 stars, BUSTED and WASTED, six weapons (fists, pistol, SMG, shotgun, rifle, bat — the last three unlock with turf) with hitscan shooting, tracers, muzzle flashes and floating damage numbers.
- **Missions and a story** — fifteen jobs worth $38,500, timed jobs with a countdown and a stage progress bar, crew abilities on keys Q / Z / X (Tio cuts a wanted star, Dario refills NOS and repairs, Lena jams the nearest cruiser), a day counter and a district standing meter, turf to take district by district, a respect ladder from ROOKIE to KINGPIN, an eight-checkpoint street race, vault guards and a full city map with a dashed gold escape route from the vault to the boat.
- **HUD and sound** — mission panel, wanted stars, money and weapon panels, LCPD response list, toasts, event log, respect bar, street label, live minimap, dialogue bar and speed panel; all audio is synthesized with WebAudio (engine hum, siren, gunshots, mission stinger, Radio Sol 101.9).
- **Save** — progress saves to localStorage; CONTINUE resumes where you left off.

## How to play

```sh
node serve.ts
```

Open http://localhost:8091 and press PLAY.

- **WASD** move / drive · **mouse drag** orbit camera · **Shift** run / NOS
- **Space** handbrake · **E** steal or exit a car · **Click** shoot
- **1 / 2 / 3 / 4 / 5 / 6** fists / pistol / SMG / shotgun / rifle / bat · **Q / Z / X** crew abilities · **M** city map · **P / Esc** pause · **R** radio

## Screenshots

Take all four staged screenshots (1280×720 JPEG, quality 90) with the shot driver:

```sh
node tools/shot.mjs all
```

1. `1-chase.jpg` — day boulevard chase, five stars, eight units, heli beam
2. `2-shootout.jpg` — beach shootout at sunset, cordon, cash in the air
3. `3-job.jpg` — the full city map with the gold escape route
4. `4-done.jpg` — dawn boat escape at Playa Dorada, Mara on foot, crew and Comet

## Verify

```sh
node tools/probe.mjs
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

The probe runs 13 gameplay checks against the live game in headless Chrome (boot, title to play, job 1, entering and exiting the car, wanted 3 with helicopter, NOS burn, pause and resume, all 15 missions, garage engine level 1, save, zero console errors). It drives the stock puppeteer Chrome build over the DevTools protocol with Node 22's built-in WebSocket client — no puppeteer library needed. Run the probe, the shot driver and the entrypoint with Node 22 (system node may be newer; the game itself only needs a browser).
