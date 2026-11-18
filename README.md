# LUMEN BAY: Sunset Getaway

**12 story missions in Puerto Lumen: steal cars, outrun 5-star police, escape the helicopter.**

An original open-world crime game built for the make.fun bounty **gta6-01 — "Make GTA 6"** ($1,666 pot, top 100 paid). Play it at: https://make.fun/bounty/gta6-01

Puerto Lumen is a fictional sun-soaked island city — nothing here is taken from any existing game, film or real place. Mara Solis is a getaway driver. Her crew: fixer Tio Reyes, hacker Lena Cruz, wheelman Big Dario. The clock is fixed at golden hour, 18:40: warm orange sky, long shadows, ocean on two sides, palm trees, neon shop signs, and a red lighthouse at the point.

## Play

Open `game/index.html` in a desktop browser (or run `node serve.ts` and open http://localhost:8080). No install, no network requests at runtime — three.js is vendored under `game/vendor/three/` and every texture and sound is generated in code.

| Key | Action |
| --- | --- |
| W A S D | Move on foot / drive |
| Mouse | Orbit camera — click to shoot |
| Shift | Sprint |
| E | Steal / enter a car (press again to get out) |
| Space | Handbrake |
| 1 / 2 | Pistol / SMG |
| M | Start / advance the current story mission |
| R | Change radio station (3 synthwave stations) |
| Esc | Pause |

## The 12 story missions

1. **First Keys** — Steal the Comet GT from Marina Lumen, drive it to the safehouse. ($500)
2. **The Drop** — Deliver a package to Mercado Viejo within 90 seconds. ($750)
3. **Hot Wheels** — Lose a 2-star police tail; stay hidden until the heat dies. ($900)
4. **The Marina Job** — Pick up Lena's crate at the docks, deliver it to Taller Lumen. ($1,100)
5. **Payday** — Ambush the courier van on the coast road, grab the cash, escape. ($1,500)
6. **The Informant** — Rescue Dario from a police cordon in the market square. ($1,800)
7. **Night Shift** — Drive Lena to 3 hack checkpoints; wait at each until her hack completes. ($2,000)
8. **The Swap** — Steal a police cruiser and deliver it to Taller Lumen. ($2,400)
9. **Beach Run** — Smuggle crates along Playa Dorada to the lighthouse in 120 seconds. ($2,600)
10. **High Tide** — Reach Farol Rojo with a helicopter on you at 4 stars, then go dark. ($3,200)
11. **The Getaway** — Rob the Casino Miramar vault, fight the guards, escape to the marina boat. ($4,500)
12. **The Last Sunset** — Finale: Torre Lumen vault, then the coast road to the boat under full pursuit. ($8,000)

## Systems

- **On foot and by car** — third-person on foot with mouse-orbit camera; arcade driving with chase camera, handbrake turns and a speedometer.
- **Traffic and crowds** — 12 AI cars looping the road grid, 24 pedestrians who flee from gunfire.
- **Wanted 0–5 stars** — stealing cars, shooting and speeding past police raise the heat. Cruisers chase and ram; at 3+ stars a helicopter circles with a spotlight. Heat decays when Mara is hidden from police. BUSTED or WASTED respawns her at the safehouse with a small cash penalty.
- **Combat** — pistol (infinite ammo) and SMG, hitscan shooting with muzzle flash, tracers, floating damage numbers and a kill feed. Cordon police shoot back. Health and armour pickups are scattered through the city.
- **Economy** — mission cash, car repair at Taller Lumen ($150), safehouse saving.
- **HUD** — minimap (roads, player arrow, mission marker, police blips, helicopter icon), wanted stars, health/armour bars, cash, speed, weapon + ammo, objective banner, event log, radio station, 18:40 clock.
- **Audio** — WebAudio synth only, no audio files: engine hum, two-tone sirens, gunshots, mission stingers and three original synthwave radio loops. Every oscillator frequency is guarded against non-finite values.
- **Save** — localStorage keeps mission progress, cash and position; the title screen offers Continue.

## Screenshots

Staged with `?shot=1..4` (seed 20261118) in a headless browser at 1280×720:

1. `1-chase.jpg` — high-speed chase with police and helicopter (cover).
2. `2-shootout.jpg` — on-foot shootout at Torre Lumen.
3. `3-job.jpg` — mission pickup at Marina Lumen.
4. `4-done.jpg` — JOB DONE banner at Playa Dorada.

## Tech

- three.js 0.170.0, vendored under `game/vendor/three/` (MIT).
- Procedural canvas textures (buildings, roads, sand, water, palms, neon, sky) from a seeded RNG — deterministic world, same seed, same city.
- Fixed-step simulation (1/60 s), deterministic seeded world.
- `main.ts` copies `game/` + `screenshots/` to `/output` (or `$MAKEFUN_OUTPUT_DIR`) and writes `dossier.json` via the vendored make.fun library.

## Files

- `game/index.html` — entry page with the three.js importmap.
- `game/src/config.js` — tuning, landmarks, the 12 missions, radio stations.
- `game/src/random.js` — seeded RNG and helpers.
- `game/src/textures.js` — procedural canvas textures.
- `game/src/city.js` — Puerto Lumen: roads, buildings, landmarks, palms, beach, ocean.
- `game/src/vehicles.js` — car physics, traffic AI, police pursuit, helicopter.
- `game/src/people.js` — Mara, pedestrians, cordon police.
- `game/src/missions.js` — the mission state machine.
- `game/src/audio.js` — synth audio and radio.
- `game/src/hud.js` — DOM HUD, minimap, title/pause/end screens.
- `game/src/render.js` — WebGL renderer, chase camera, tracers, damage numbers.
- `game/src/shots.js` — the four staged screenshot scenes.
- `game/src/input.js` — keyboard/mouse input.
- `game/src/main.js` — boot, fixed-step loop, wanted system, shooting, saving.
- `main.ts`, `serve.ts`, `shots.json`, `LICENSE`, `.makefun/owner.json`.

## License

MIT — see `LICENSE`. three.js is MIT, copyright three.js authors.

## Credits

Built by sandytaztaz-hue for make.fun gta6-01. Original story, characters, city and music — no Rockstar Games names, characters, maps, art or music are used. The sunset is the only thing borrowed, and it belongs to everyone.
