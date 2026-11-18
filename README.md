# LUMEN BAY — Sunset Getaway

An original open-world crime game for the make.fun bounty
[Make GTA 6 (gta6-01)](https://make.fun/bounty/gta6-01): a sun-soaked island
city, a getaway driver, twelve story jobs, five-star police and a helicopter.

## The game

Puerto Lumen, golden hour, 18:40. You are **Mara Solis**, getaway driver,
working with fixer **Tio Reyes**, hacker **Lena Cruz** and wheelman **Big Dario**.
Steal cars, outrun the police, escape the helicopter, and pull the last sunset
heist at the Torre Lumen clock tower.

Landmarks: Torre Lumen clock tower, Marina Lumen docks, Mercado Viejo market
square, Playa Dorada beach, Farol Rojo lighthouse, Taller Lumen garage, and
Mara's safehouse. The ocean borders the city to the north and the south.

## How to play

Serve `game/` with any static server (`node serve.ts`, then open
http://localhost:8080) and play with keyboard and mouse. No network requests:
every texture is painted procedurally, every sound is synthesized with
WebAudio, and three.js 0.170.0 is vendored under `game/vendor/three/`.

- **WASD** move / drive, **mouse drag** orbit camera, **click** shoot
- **E** steal / enter a car (repair at Taller Lumen when the car is damaged)
- **Shift** sprint, **Space** handbrake
- **1** pistol, **2** SMG (find a yellow pickup first)
- **M** start the next story job, **R** cycle radio stations, **Esc** pause

## Systems

- **12 story missions** — steal, deliver, timed runs, evades, shootouts and a
  two-stage finale, each with dialogue, a map beacon and a cash reward.
- **Traffic** — 12 AI cars looping the road grid; **24 pedestrians** who flee
  from gunfire.
- **Wanted 0–5 stars** — stealing, shooting and speeding past police raise
  the heat. Cruisers chase and ram; at 3+ stars a helicopter circles with a
  spotlight. Heat decays when you break line of sight. Get caught and you are
  BUSTED; die and you are WASTED — both cost you at the safehouse.
- **Combat** — pistol and SMG, hitscan shots, tracers, muzzle flash, floating
  damage numbers, a kill feed, and police on foot who shoot back.
- **Economy** — mission cash, car repair at Taller Lumen, health and armour
  pickups, and a localStorage save (Continue on the title screen).
- **HUD** — minimap with roads, the player arrow, the mission marker, police
  blips and the helicopter; wanted stars, health and armour bars, cash, speed,
  weapon, objective banner, event log, radio station and the 18:40 clock.
- **Audio** — engine hum, sirens, gunshots, mission stingers and three
  original synthwave radio stations, all synthesized live.

## The 12 jobs

1. First Keys — steal the Comet GT at the marina
2. The Drop — 90-second delivery to Mercado Viejo
3. Hot Wheels — lose a 2-star tail
4. The Marina Job — crate run to Taller Lumen
5. Payday — ambush the courier van
6. The Informant — rescue Dario from the market cordon
7. Night Shift — drive Lena to three hack checkpoints
8. The Swap — steal a police cruiser
9. Beach Run — 120-second smuggle run to the lighthouse
10. High Tide — helicopter chase to Farol Rojo
11. The Getaway — rob the Casino Sol vault
12. The Last Sunset — the Torre Lumen finale

## Layout

- `game/index.html` — page, HUD markup, import map
- `game/src/config.js` — tuning numbers and colours
- `game/src/random.js` — seeded RNG
- `game/src/textures.js` — procedural canvas textures
- `game/src/city.js` — Puerto Lumen: roads, buildings, landmarks, ocean
- `game/src/vehicles.js` — cars, traffic AI, police cruisers, helicopter
- `game/src/people.js` — pedestrians, foot police, pickups, crew
- `game/src/missions.js` — the 12 story missions and their state machine
- `game/src/audio.js` — WebAudio synth: engine, sirens, shots, radio
- `game/src/hud.js` — minimap, bars, banner, event log, damage numbers
- `game/src/render.js` — sunset sky, lighting, cameras, tracers, beacon
- `game/src/shots.js` — the four staged screenshot scenes (`?shot=1..4`)
- `game/src/input.js` — keyboard and mouse
- `game/src/main.js` — boot, the fixed-step loop, screens, save/load
- `main.ts` — hands the game in: copies `game/` + `screenshots/` to `/output`
  and writes `dossier.json`
- `screenshots/` — 1-chase.jpg (cover), 2-shootout.jpg, 3-job.jpg, 4-done.jpg

## License

MIT — see `LICENSE`. three.js is MIT-licensed; its license is in
`game/vendor/three/LICENSE`.
