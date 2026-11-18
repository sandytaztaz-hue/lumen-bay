// The four staged screenshot scenes behind ?shot=1..4. Each one puts the real
// game into a real state — a live mission, live wanted level, live traffic and
// police — then lets the normal loop run a few steps so the frame is what a
// short session really looks like. The same seed always gives the same frame.
//
//   shot 1 — high-speed chase: Mara in the Comet GT on the coast road, 3 stars,
//            two cruisers on her tail, the helicopter overhead (the COVER).
//   shot 2 — on-foot shootout at Torre Lumen: cordon officers, tracer fire.
//   shot 3 — mission pickup at the marina: Mara beside the Comet GT, beacon on.
//   shot 4 — job done at Playa Dorada: JOB DONE banner, beach sunset, car.
//
// The staging never invents pixels: every car, officer and the helicopter are
// the game's own actors, placed by the same functions the live game uses.

import { LANDMARKS } from './config.js';
import { spawnPoliceCar } from './vehicles.js';

function placePlayerOnFoot(G, x, z, heading) {
  const p = G.player;
  if (p.inCar) { p.inCar = null; p.mesh.visible = true; }
  p.x = x; p.z = z; p.heading = heading; p.speed = 0;
  p.mesh.position.set(x, 0, z);
  p.mesh.rotation.y = heading;
}

function placePlayerInCar(G, car, x, z, heading, speed) {
  const p = G.player;
  car.x = x; car.z = z; car.heading = heading; car.speed = speed;
  car.mesh.position.set(x, 0, z);
  car.mesh.rotation.y = heading;
  p.inCar = car;
  p.x = x; p.z = z; p.heading = heading; p.speed = speed;
  p.mesh.visible = false;
}

export function stageShot(G, name, helpers) {
  const { emit, scene } = helpers;
  const p = G.player;
  G.wanted = 0;
  G.lastCrimeAt = G.time;

  if (name === '1' || name === 'chase') {
    // Coast-road chase, heading north up the beach road, sun low ahead.
    placePlayerInCar(G, G.heroCar, -208, 60, Math.PI, 34);
    G.heroStolen = true;
    // Mission 1 is live at its drive stage: the objective banner reads as a
    // real job, not a staged caption.
    G.missions.active = true;
    G.missions.stage = 2;
    G.missions.index = 0;
    G.missions.dialogue = null;
    G.wanted = 3;
    G.lastCrimeAt = G.time;
    // Helicopter ahead of Mara, in frame, spotlight sweeping the road.
    G.heli.angle = -Math.PI / 2;
    // Two cruisers ahead on the road, closing head-on — the chase reads in
    // one frame because the pursuit is in front of the camera, not behind it.
    const c1 = spawnPoliceCar(scene, -204, 8);
    c1.heading = 0; c1.speed = 30;
    const c2 = spawnPoliceCar(scene, -212, 28);
    c2.heading = 0; c2.speed = 29;
    G.police.cars.push(c1, c2);
    G.police.spawnTimer = 5;
    helpers.rigYaw(Math.PI);
    return;
  }

  if (name === '2' || name === 'shootout') {
    // Mercado Viejo — the real Informant location: Mara on foot south-east
    // of the market square, cordon officers among the stalls, camera looking
    // north-west across the plaza so the officers and the stalls are in frame.
    placePlayerOnFoot(G, LANDMARKS.mercado.x + 16, LANDMARKS.mercado.z + 20, 0);
    G.missions.index = 5; // The Informant
    G.missions.active = true;
    G.missions.stage = 1; // shoot stage
    G.missions.killsLeft = 3;
    G.missions.dialogue = [
      ['BIG DARIO', 'Mara! Get these cops off me and I owe you a lifetime of tacos.'],
    ];
    G.dialogue = G.missions.dialogue;
    G.dialogueUntil = G.time + 30;
    G.wanted = 2;
    G.lastCrimeAt = G.time;
    emit('cordon', { x: LANDMARKS.mercado.x, z: LANDMARKS.mercado.z, count: 3 });
    // Face the nearest officer and fire once, so the frame has a tracer and
    // a muzzle flash in it.
    const o = G.cordon.find((c) => c.alive);
    if (o) {
      p.heading = Math.atan2(o.x - p.x, o.z - p.z);
      p.mesh.rotation.y = p.heading;
      G.shotFire = true;
    }
    helpers.rigYaw(Math.PI * 1.25);
    return;
  }

  if (name === '3' || name === 'job') {
    // Marina pickup: Mara on foot south of the crate stack, Comet GT just
    // north-east of her, camera south-west looking north-east so Mara, the
    // car, the beacon and the docks all read in one frame.
    placePlayerOnFoot(G, LANDMARKS.marina.x + 10, LANDMARKS.marina.z + 16, Math.PI + 0.32);
    // Stage the hero car clear of the crate stack so it reads in the frame.
    G.heroCar.x = -164; G.heroCar.z = -168; G.heroCar.heading = Math.PI / 2;
    G.heroCar.mesh.position.set(-164, 0, -168);
    G.heroCar.mesh.rotation.y = Math.PI / 2;
    G.missions.index = 0;
    G.missions.active = true;
    G.missions.stage = 0;
    G.missions.dialogue = [
      ['TIO REYES', 'Mara. The Comet GT is sitting at Marina Lumen, keys in it. Take it.'],
    ];
    G.dialogue = G.missions.dialogue;
    G.dialogueUntil = G.time + 30;
    G.wanted = 0;
    helpers.rigYaw(Math.PI * 1.05);
    return;
  }

  // Shot 4 (default): job done at the beach.
  placePlayerInCar(G, G.heroCar, -232, 30, Math.PI, 0);
  G.heroStolen = true;
  G.missions.done = [1];
  G.missions.index = 1;
  G.missions.active = false;
  G.missions.stage = 0;
  G.missions.banner = { title: 'JOB DONE', sub: 'First Keys — +$500', cash: 500 };
  G.missions.bannerAt = 0;
  G.cash = 750;
  G.wanted = 0;
  G.dialogue = null;
  helpers.rigYaw(Math.PI * 1.5);
}
