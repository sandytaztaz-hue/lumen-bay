// LUMEN BAY r6 — the screenshot scenes behind ?shot=1..4. Each one stages a
// real gameplay state (not a mock): the world runs its normal loop from there,
// the autopilot just holds the pose, and main.js sets window.__shotReady once
// the scene has rendered. Shot 1 is the cover: mid-action NOS chase, full HUD.
import { ROB_TARGETS } from './config.js';

// Put the player in a car at speed, NOS burning, police behind, heli above,
// roadblock ahead — the cover chase.
export function stageShot1(G) {
  G.startPlay();
  G.enterCar(G.parked[0]);
  G.warpTo(-60, -60);
  G.player.car.heading = 0;
  G.player.car.speed = 34;
  G.garage.nos = 120;
  G.nosBurning = true;
  G.setWanted(3);
  G.spawnPoliceNear(2);
  G.heli.active = true;
  G.spawnRoadblockAhead();
  G.missions.startMission(11); // Street King race is live: checkpoints on minimap
  G.missions.objective = 'Job 12: Street King — Win the street race — 8 checkpoints';
  G.hud.log('TIO REYES: "Race night. Eight checkpoints, one shark driver."');
  G.hud.log('NOS burning — hold Shift on the straight.');
  G.camYaw = 0;
  G.state.cash = 8450;
}

// On-foot shootout at Torre Lumen: guards, muzzle flash, kill feed, wanted 2.
export function stageShot2(G) {
  G.startPlay();
  G.warpTo(60, -120);
  G.player.heading = Math.PI;
  G.player.mesh.group.rotation.y = Math.PI;
  G.player.weapon = 'smg';
  G.setWanted(2);
  G.spawnEnemiesAt(60, -155, 4, 'shark');
  G.spawnEnemiesAt(72, -142, 2, 'shark');
  G.missions.startMission(14); // El Puerto Es Nuestro finale
  G.missions.objective = 'Job 15: El Puerto Es Nuestro — Storm the Torre Lumen vault guards (4)';
  G.hud.log('MARA: "El puerto es nuestro."');
  G.hud.feed('Mara downed a Tiburones shark');
  G.hud.feed('Mara downed a Tiburones shark');
  G.state.cash = 12300;
  G.state.health = 82;
  G.state.armour = 45;
  G.camYaw = Math.PI;
}

// Festival street race / robbery at Festival Square: lanterns, crowds, race.
export function stageShot3(G) {
  G.startPlay();
  G.enterCar(G.parked[1]);
  G.warpTo(150, 30);
  G.player.car.heading = 2.6;
  G.player.car.speed = 0;
  G.setFestival(true);
  G.setWanted(3);
  G.spawnPoliceNear(1);
  G.missions.startMission(12); // Festival de las Luces
  G.missions.objective = 'Job 13: Festival de las Luces — Rob the Tiburones stash at Festival Square (hold E)';
  G.turf.startRobbery(ROB_TARGETS.find((t) => t.id === 'stash-fest'));
  G.hud.log('LENA CRUZ: "Lanterns, fireworks, crowds — perfect cover."');
  G.hud.log('Robbing the Tiburones stash… 3s');
  G.state.cash = 9800;
  G.camYaw = 2.6;
}

// Job-done banner at Playa Dorada, turf 12/12, sunset beach escape.
export function stageShot4(G) {
  G.startPlay();
  G.enterCar(G.parked[0]);
  G.warpTo(-180, 190);
  G.player.car.heading = 0;
  for (let i = 0; i < 12; i += 1) G.turf.owners[i] = 'crew';
  G.state.cash = 21400;
  G.missions.missionIdx = 15;
  G.missions.active = false;
  G.missions.objective = 'Story complete — Puerto Lumen is yours. Free roam!';
  G.hud.showBanner('JOB DONE', 'El Puerto Es Nuestro  +$8,000  —  TURF 12/12', 600000);
  G.hud.log('JOB DONE: El Puerto Es Nuestro — +$8,000');
  G.hud.log('EL PUERTO ES NUESTRO — all 12 districts held. 12/12 TURF.');
  G.camYaw = 0;
}

/** Stage shot N (1..4) on the live game; any other value stages shot 1. */
export function stageShot(n, G) {
  if (n === 2) stageShot2(G);
  else if (n === 3) stageShot3(G);
  else if (n === 4) stageShot4(G);
  else stageShot1(G);
}

// ---- shot-mode autopilot ----------------------------------------------------

// In ?shot mode the game plays itself just enough to look alive: traffic and
// peds keep moving, the camera holds, the player car holds its line.
export function shotAutopilot(G, dt) {
  if (!G.player.inCar || !G.player.car) return;
  if (G.shotMode === 3) {
    // Festival robbery shot: hold still so the robbery channel stays live.
    G.player.car.speed = 0;
    return;
  }
  G.player.car.speed = Math.min(G.player.car.speed + 2 * dt, 30);
  G.player.car.heading += Math.sin(performance.now() * 0.0004) * 0.1 * dt;
}
