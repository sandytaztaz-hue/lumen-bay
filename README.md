# LUMEN BAY: Midday Getaway — 15 story missions, turf war, garage upgrades, NOS, robberies & properties in bright midday Puerto Lumen

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/sandytaztaz-hue/lumen-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/sandytaztaz-hue/lumen-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game built for the make.fun bounty
[gta6-01 — Make GTA 6](https://make.fun/bounty/gta6-01) ($1,666, top 100 paid).
Nothing in it comes from Rockstar Games or any commercial game: the city, the
characters, the story, the art and the music are all original, built fresh for
this entry in a single recorded session.

## The game

Puerto Lumen is a sun-soaked island city at BRIGHT MIDDAY (12:30): blue sky
with white clouds, turquoise sea and sandy beaches, a ferris wheel over Playa
Dorada, palm-lined Ocean Boulevard, beach umbrellas and food carts, pastel
buildings with big bright signs. You are **Mara Solis**, getaway driver for a
small crew — fixer **Tio Reyes**, hacker **Lena Cruz**, wheelman **Big Dario**.
The rival crew **Los Tiburones**, led by El Tiburon, holds all 12 districts of
the city. Take it back, one district at a time — in a big red **Veloz Comet RS**
convertible, down streets packed with traffic, crowds and police.

## The look — rebuilt for the daylight

The cover shot is a mid-action beach-avenue chase: the red convertible big in
frame, NOS burning, police cruisers close behind, the helicopter overhead, a
roadblock ahead, the ferris wheel and umbrellas on the beach. The HUD is dense
and readable at a glance: a mission panel with the job title, named objectives
with checkmarks, stage x/y, a big timer and the NEXT step; WANTED stars up
top; a live LCPD response list with unit names, distances and statuses; big
green cash; a detailed round minimap with street names, district labels,
police blips, roadblocks and the heli; a dialogue box with the crew talking;
and a big speedo with gear, vehicle name and radio.

## The hook — turf war

Robberies and street races win turf; owned properties hold it. The HUD turf
meter shows districts held / 12. The finale takes the last district at Torre
Lumen, and the city flies crew colours at 12/12.

## Systems

- **On foot and by car** — third-person WASD + mouse orbit, sprint; arcade
  driving with a low close chase camera, handbrake, steal any car with E.
- **15 story missions** — steal, deliver, timed, evade, shootout, race, rob,
  multi-stage finale. Each pays cash and unlocks the next.
- **Wanted 0–5 stars** — police cruisers chase and ram; at 3+ stars a
  helicopter circles with a spotlight and police set **roadblocks** across the
  road ahead. **Line-of-sight chases**: break sight behind buildings and the
  heat decays faster.
- **Combat** — fists, pistol (infinite ammo), SMG pickup; hitscan shooting,
  muzzle flash, tracers, floating damage numbers, kill feed. Health and armour
  pickups around the city.
- **Garage upgrades (Taller Lumen)** — Engine Lv 1–3 (top speed), Armour Lv 1–3
  (damage resistance + visible plates), NOS Tank Lv 1–3 (bigger boost).
- **NOS boost** — hold Shift while driving: speed burst, flames, FOV kick,
  whoosh; the meter refills slowly and at repair.
- **Robberies** — hold E at a marked shop or rival stash (5 s channel): cash
  payout, +2 stars, alarm sting. Stash houses pay more and flip their district.
- **Ownable properties** — buy a garage ($2,500), a shop ($4,000), a safehouse
  upgrade ($6,000): passive income per hour, heat shield in their district,
  shown on the minimap.
- **Street races** — checkpoint races against a Tiburones rival who burns NOS
  on the straights. Win cash + flip a district.
- **Traffic** (20 AI cars), **pedestrians** (40+, flee gunfire), **radio**
  (3 original midday stations, WebAudio synth only), **save** (localStorage,
  Continue on the title screen), pause menu, BUSTED / WASTED respawn.

## Controls

WASD move / drive · Mouse orbit & aim · Click shoot · E enter / steal / interact
· Shift sprint / NOS · Space handbrake · M mission · 1/2/3 weapons · R radio · Esc pause

## Play

```sh
node serve.ts
# open http://localhost:8080
```

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output dir and writes
`dossier.json` with the vendored make.fun library. Screenshots are real
headless-Chrome renders of the game (`?shot=1..4`).

## Tech

three.js 0.170.0 vendored under `game/vendor/three/` (MIT). All art is
procedural canvas textures from a seeded RNG; all sound is WebAudio synth —
no external assets, no network requests at runtime.

## License

LUMEN BAY: Midday Getaway is released under the MIT License (see LICENSE).
three.js is vendored under `game/vendor/three/` under its own MIT License.

## Screenshots

Four real headless-Chrome renders live in `screenshots/`: the beach-avenue
NOS chase cover, the Torre Lumen shootout, the Festival Square robbery and
the JOB DONE beach finale — all bright midday, full HUD.
