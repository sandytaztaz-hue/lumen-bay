# LUMEN BAY: Sunset Getaway

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/sandytaztaz-hue/lumen-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/sandytaztaz-hue/lumen-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game in the spirit of GTA 6: **Mara Solis**,
getaway driver of Puerto Lumen, a sun-soaked island city. Eight story jobs,
a 5-star wanted level with police chases and a helicopter, traffic and
pedestrians, cars to steal, combat, a HUD with a minimap, a save, and an
original synth radio. Everything — the city, the characters, the cars, the
story, the art, the sound and the music — is invented here. Nothing from
Rockstar Games, nothing from any other game.

## Run it

```sh
node serve.ts
# open http://localhost:8080/game/
```

Or open `game/index.html` directly from any static server. No network
needed: three.js is vendored under `game/vendor/three/`.

## Play

- **WASD** move / drive · **Mouse drag** look around · **E** enter / steal a car
- **Click** shoot · **1 / 2 / 3** fists / pistol / SMG · **Shift** sprint
- **M** start the next job · **R** change radio station · **P** pause

Jobs: First Keys, The Drop, Hot Wheels, The Marina Job, Payday, The
Informant, High Tide, The Last Sunset. Wanted stars rise on crime and fall
when you stay hidden; at 3 stars the LCPD helicopter joins the chase, and
getting caught on foot means BUSTED. Progress saves to the browser
(localStorage) — continue from the title screen.

## Screenshots

The four staged scenes live under `screenshots/` (see `shots.json` for the
`?shot=` queries that stage them): a police chase down the marina straight,
a shootout at Torre Lumen, the marina job, and a job done at Playa Dorada.

## Build

`main.ts` (Node 22) copies `game/` and `screenshots/` to `/output` and
writes `dossier.json` with the vendored make.fun library. Three.js 0.170.0
is vendored byte-for-byte from the official release under
`game/vendor/three/` (MIT, see its LICENSE); all other code in this repo was
written for this entry.

---

<sub>Entered on [make.fun](https://make.fun/?ref=6sv3wnda&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
