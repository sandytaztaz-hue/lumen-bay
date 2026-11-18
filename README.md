# LUMEN BAY: Sunset Getaway

An original open-world crime game in the sun-soaked island city of **Puerto Lumen**, built for the make.fun bounty [gta6-01 — Make GTA 6](https://make.fun/bounty/gta6-01) ($1,666, top 100 paid).

You are **Mara Solis**, getaway driver. Her crew: fixer **Tio Reyes**, hacker **Lena Cruz**, wheelman **Big Dario**. Across **12 story missions** you steal the Comet GT sports car, run timed drops, lose police tails, ambush a courier van, break a police cordon, hack three terminals, steal a police cruiser, smuggle crates down Playa Dorada, outrun a helicopter, rob the casino vault, and finish with the Last Sunset heist at Torre Lumen.

## The city

A seeded, deterministic island at golden hour (18:40): Torre Lumen clock tower, Marina Lumen docks, Mercado Viejo market square, Playa Dorada beach, Farol Rojo lighthouse, Taller Lumen garage, the safehouse and Casino del Sol. Ocean on two sides, palm trees, neon shop signs, colourful low-rise buildings, 12 traffic cars on road loops and 24 pedestrians who flee gunfire.

## Systems

- **On foot and by car** — third-person walking with mouse orbit, arcade driving with chase camera, Space handbrake, E to steal/enter any car.
- **Wanted 0–5 stars** — stealing, shooting and speeding raise heat; police cruisers chase and ram; at 3+ stars a helicopter circles with a spotlight. Hide to cool off. Busted or Wasted respawns you at the safehouse with a cash penalty.
- **Combat** — pistol (infinite ammo) and SMG pickup, hitscan shooting, muzzle flash, tracers, floating damage numbers, kill feed, police on foot who shoot back.
- **Economy** — mission cash, car repair at Taller Lumen, health/armour/SMG pickups.
- **HUD** — minimap (roads, player arrow, mission marker, police blips, helicopter), wanted stars, health/armour bars, cash, speed, weapon, objective banner, event log, radio station, golden-hour clock.
- **Audio** — WebAudio synth only: engine hum, sirens, gunshots, mission stingers and a three-station synthwave radio (Lumen FM, Marina Wave, Playa Chill). Press R to change station.
- **Save** — localStorage keeps mission progress, cash and position; the title screen offers Continue.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move / drive |
| Mouse | Orbit camera, click to shoot |
| E | Enter / steal car (exit car too) |
| Shift | Sprint |
| Space | Handbrake |
| 1 / 2 | Pistol / SMG |
| M | Start / advance the current story mission |
| R | Change radio station |
| Esc | Pause |

## Missions

1. First Keys — steal the Comet GT, drive it home
2. The Drop — 90-second delivery to Mercado Viejo
3. Hot Wheels — lose a 2-star tail
4. The Marina Job — crate pickup and delivery
5. Payday — ambush the courier van
6. The Informant — break the cordon, rescue Dario
7. Night Shift — three hack checkpoints with Lena
8. The Swap — steal a police cruiser
9. Beach Run — 120-second smuggle to the lighthouse
10. High Tide — helicopter chase to Farol Rojo
11. The Getaway — casino vault robbery
12. The Last Sunset — finale heist and beach escape

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests at runtime. three.js 0.170.0 is vendored under `game/vendor/three/`. Everything else is original code written for this entry.

## License

MIT — see [LICENSE](LICENSE).

## Screenshots

The four screenshots under `screenshots/` are real renders of this game in headless Chrome at 1280x720: `1-chase.jpg` (cover — high-speed chase with police and helicopter), `2-shootout.jpg` (on-foot shootout at Torre Lumen), `3-job.jpg` (mission pickup at the marina), `4-done.jpg` (job-done banner at Playa Dorada). They are staged with `?shot=1..4`, which plays the real game forward with a fixed autopilot.
