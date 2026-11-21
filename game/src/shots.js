// LUMEN BAY — screenshot staging. Each shot pins the world to one fixed,
// readable moment: the night chase, the beach shootout, the full city map,
// the dawn boat. Shot 1 is the ped-cleanup shot: the north-sidewalk spawn
// that used to drift onto the road is GONE, the right-sidewalk group
// (pink / green / purple) stays, and a road-band clear runs after every
// spawn as a belt-and-braces. Peds are frozen in shot mode — they bob
// in place like walking, but cannot wander anywhere during the slow
// SwiftShader settle.

import { SHOT_PINS, CREW } from './config.js';

function pinHud(G, n) {
  G.hud.applyPin(SHOT_PINS[n]);
  G.wanted = SHOT_PINS[n].wanted;
  G.cash = SHOT_PINS[n].cash;
  G.clockMinutes = clockToMinutes(SHOT_PINS[n].clock);
}

function clockToMinutes(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

export function stageShot1(G) {
  G.setPreset('night');
  G.shotMode = true;
  G.freezePeds = true;
  // Hero: red Ferrari at (90, 215), nose WEST toward the camera.
  G.placeHero(90, 215, -Math.PI / 2, true);
  G.player.inCar = true;
  G.player.speedKmh = 117;
  // Camera: low, just west of the hero on the road, looking east down
  // the boulevard — the car's FRONT faces the lens.
  G.setShotCamera({ x: 78, y: 3.1, z: 217.5 }, { x: 100, y: 2.6, z: 214.5 });
  // Police column: 8 black-white cruisers up the road ahead + flanks.
  G.clearPolice();
  const cruiserSpots = [
    [105, 211, -Math.PI / 2], [115, 219, -Math.PI / 2], [128, 212, -Math.PI / 2],
    [140, 218, -Math.PI / 2], [155, 213, -Math.PI / 2], [170, 219, -Math.PI / 2],
    [98, 209, -Math.PI / 2], [100, 221, -Math.PI / 2],
  ];
  for (const [x, z, h] of cruiserSpots) G.spawnCruiser(x, z, h);
  // Two police bikes, one each side, in lane alongside the hero.
  G.spawnBike(87, 220, -Math.PI / 2); // south lane, beside the nose
  G.spawnBike(93, 210.5, -Math.PI / 2); // north lane, beside the rear half
  // Heli overhead with the spotlight beam down onto the hero car — low
  // and close enough to read as a real helicopter in the frame.
  G.placeHeli(95, 8, 212, 90, 215);
  // Traffic further up the road; clear the hero's foreground.
  G.clearTrafficNear(90, 215, 40);
  G.spawnTrafficNear(180, 215, 5);
  // PEDESTRIANS — the cleanup. The right-sidewalk group (beach-side
  // sidewalk, just east of the hero) is the ONLY near group. There is NO
  // north-sidewalk spawn: that group wandered south onto the road.
  G.clearPedsNear(90, 215, 15);
  G.spawnPedsNear(108, 225, 5);
  G.spawnPedsNear(108, 228, 3);
  G.spawnPedsNear(104, 228, 2);
  // Beachgoers far east on the sand (right edge of frame, small).
  G.spawnPedsNear(170, 228, 5);
  // Belt-and-braces: nothing may stand in the road band z 208-222.
  // The right-sidewalk group sits at z 225-228 — untouched by this.
  G.clearRoadPeds();
  // HUD + story dressing.
  pinHud(G, 1);
  G.hud.setPolice([
    { name: 'PELICAN-11', dist: 13, status: 'CHASING' },
    { name: 'GECKO-25', dist: 19, status: 'CHASING' },
    { name: 'BARRACUDA-18', dist: 18, status: 'FLANKING' },
    { name: 'TAC-45', dist: 26, status: 'FLANKING' },
    { name: 'AIR-1', dist: 17, status: 'SPOTLIGHT' },
  ], 9);
  G.hud.toast('NOS READY', 'Tank full — hold Shift to burn', 'good', true);
  G.hud.toast('AIR-1 OVERHEAD', 'Heli has the light — eight units closing', 'bad', true);
  G.hud.toast('WANTED LEVEL UP', '5 stars — the whole LCPD is on you', 'bad', true);
  G.hud.dialogue('LCPD DISPATCH',
    'All units — suspect westbound on the Playa front, five stars. Air One overhead, eight units closing. Do not let her reach the pier.', '#2e6f8e');
  G.hud.log('LUMEN BAY — Puerto Lumen, 22:40. Press M to start the story.');
  G.hud.log('Night chase — eight units on you, heli beam on the car.');
  G.hud.log('NOS burning — hold Shift on the straight.');
  G.setStreetLabel('DUNES — Torre Boulevard');
  G.nosBurning = true;
  return 1;
}

export function stageShot2(G) {
  G.setPreset('sunset');
  G.shotMode = true;
  G.freezePeds = true;
  // The duel moves OFF the road and ONTO the sand: Mara left-centre,
  // the cordon ahead of her, the downed cop in the foreground, the sea
  // behind them. Camera closer (7.5 m) so the pistol and the flash read.
  G.placeMara(70, 234, Math.PI / 2);
  G.setShotCamera({ x: 62, y: 3.2, z: 227 }, { x: 86, y: 1.0, z: 238 });
  // Cordon: 12 officers in a loose arc east of Mara, all aiming west.
  G.clearOfficers();
  const cordon = [
    [82, 230], [86, 232], [90, 229], [94, 232], [83, 236], [88, 237],
    [92, 239], [95, 236], [84, 241], [89, 242], [93, 242], [97, 239],
  ];
  for (const [x, z] of cordon) G.spawnOfficer(x, z, -Math.PI / 2, true);
  // ONE downed cop, flat in the foreground on the camera axis, with a
  // big blood pool — between Mara and the cordon, impossible to miss.
  G.placeDownedCop(73, 232, Math.PI / 2);
  // Two parked cruisers flanking the cordon ends.
  G.clearPolice();
  G.spawnCruiser(96, 228, -Math.PI / 2);
  G.spawnCruiser(98, 242, -Math.PI / 2);
  // Heli overhead, big and clear, low enough to sit fully in frame.
  G.placeHeli(90, 11, 232, 84, 234);
  // Cash burst in the air + a loot pile by the cordon.
  G.spawnCashBurst(78, 232, 14);
  G.spawnCashPile(86, 229);
  pinHud(G, 2);
  G.hud.setPolice([
    { name: 'PELICAN-11', dist: 19, status: 'CHASING' },
    { name: 'GECKO-25', dist: 20, status: 'CHASING' },
    { name: 'BARRACUDA-18', dist: 22, status: 'CHASING' },
    { name: 'TAC-45', dist: 18, status: 'CHASING' },
    { name: 'AIR-1', dist: 17, status: 'SPOTLIGHT' },
  ], 5);
  G.hud.toast('WANTED LEVEL UP', '5 stars — the whole LCPD is on you', 'bad', true);
  G.hud.toast('BEACH SHOOTOUT', 'LCPD cordon on the sand — hold the door', 'bad', true);
  G.hud.dialogue('MARA', CREW.mara.line, '#ff7a1a');
  G.hud.log('LUMEN BAY — Puerto Lumen, 18:45. Press M to start the story.');
  G.hud.log('Cash flying on the beach — $21,700');
  G.hud.log('Mara downed a police officer');
  G.setStreetLabel('DUNES — Festival Avenue');
  G.flashMara = true;
  return 2;
}

export function stageShot3(G) {
  G.setPreset('night');
  G.shotMode = true;
  G.freezePeds = true;
  // Camera high over the city — the map overlay covers the centre, the
  // 3D city just frames the edges.
  G.setShotCamera({ x: 130, y: 70, z: 300 }, { x: 130, y: 0, z: 200 });
  G.placeHero(180, 150, 0, false);
  G.clearPolice();
  for (const [x, z] of [[120, 165], [200, 165], [150, 215]]) G.spawnCruiser(x, z, 0);
  G.placeHeli(195, 18, 140, 180, 150);
  pinHud(G, 3);
  // No IN SIGHT pill on the map shot — the map covers the centre.
  G.hud.inSight.style.display = 'none';
  G.hud.setPolice([
    { name: 'PELICAN-11', dist: 94, status: 'CHASING' },
    { name: 'GECKO-25', dist: 94, status: 'CHASING' },
    { name: 'BARRACUDA-18', dist: 182, status: 'CHASING' },
    { name: 'TAC-45', dist: 148, status: 'CHASING' },
    { name: 'AIR-1', dist: 17, status: 'SPOTLIGHT' },
  ], 5);
  G.hud.toast('ESCAPE ROUTE SET', "Gold line to Playa Dorada — boat's waiting", 'good', true);
  G.hud.toast('WANTED LEVEL UP', '5 stars — the whole LCPD is on you', 'bad', true);
  G.hud.toast('VAULT CRACKED', 'Torre Lumen vault — $48,500 in gold and cash', 'good', true);
  G.hud.dialogue('MARA', "Vault's cracked — $48,500. Map's open: gold line to the boat at Playa Dorada. Five stars, so we run it clean.", '#ff7a1a');
  G.hud.log('LUMEN BAY — Puerto Lumen, 21:40. Press M to start the story.');
  G.hud.log('Escape route set — Torre Lumen vault to the Playa Dorada boat.');
  G.hud.log('MARA: "Vault\'s cracked — $48,500. Map\'s open."');
  G.setStreetLabel('TORRE — City Map');
  G.hud.showMap(G);
  return 3;
}

export function stageShot4(G) {
  G.setPreset('dawn');
  G.shotMode = true;
  G.freezePeds = true;
  // Speedboat fully visible, centre frame, in the water south of the
  // sand; hero car + two allies in the foreground on the sand.
  G.placeBoat(60, 252, Math.PI / 2 - 0.35, 3.4);
  G.placeHero(60, 236, 0, true); // nose south, rear to the camera
  G.placeAlly(55, 238, 0xff7a1a);
  G.placeAlly(65, 238, 0x2e6f8e);
  // Camera north of the car, looking south: sand, car, boat, sea, sun.
  // z=226, NOT 222 — a lamp post stands at (60, 224.5) and at z=222 it
  // sat 2.5 m in front of the lens, a full-height black bar down the
  // centre of the frame. At 226 the lamp is behind the camera.
  G.setShotCamera({ x: 60, y: 4.5, z: 226 }, { x: 60, y: 1.5, z: 252 });
  // Pull the dawn sun into the centre of this south-looking frame.
  G.moveSun(150, 80, 480);
  G.clearPolice();
  G.clearOfficers();
  pinHud(G, 4);
  G.hud.setPolice([], 0);
  G.hud.banner('MISSION PASSED', '+$8,000 · +500 REP · UNLOCKED: PIER SAFEHOUSE', true);
  G.hud.toast('STORY 15/15 — SAVE SLOT 1', '100% COMPLETE — Puerto Lumen is yours', 'good', true);
  G.hud.toast('MISSION PASSED', 'El Puerto Es Nuestro +$8,000', 'good', true);
  G.hud.dialogue('TIO REYES', CREW.tio.line, '#2e6f8e');
  G.hud.log('LUMEN BAY — Puerto Lumen, 06:10. Press M to start the story.');
  G.hud.log('STORY 15/15 — SAVE SLOT 1  100% COMPLETE.');
  G.hud.log('MISSION PASSED: El Puerto Es Nuestro — +$8,000 · +500 REP');
  G.setStreetLabel('PLAYA DORADA — Ocean Boulevard');
  return 4;
}

export function stageShot(G, n) {
  if (n === 2) return stageShot2(G);
  if (n === 3) return stageShot3(G);
  if (n === 4) return stageShot4(G);
  return stageShot1(G);
}
