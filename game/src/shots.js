// LUMEN BAY r7 — the screenshot scenes behind ?shot=1..4. Each one stages a
// real gameplay state (not a mock): the world runs its normal loop from there,
// the autopilot just holds the pose, and main.js sets window.__shotReady once
// the scene has rendered. Shot 1 is the cover: bright midday beach avenue,
// palms + umbrellas + ferris wheel, big red convertible, NOS burning, police
// close behind, heli overhead, roadblock ahead, full dense HUD.
import { ROB_TARGETS } from './config.js';

// Cover: beach avenue chase. Red Comet RS LARGE in frame, NOS burning, 2
// cruisers close, heli overhead, roadblock ahead, Street King race live.
export function stageShot1(G) {
  G.startPlay();
  G.enterCar(G.parked[0]);
  G.warpTo(-150, 180); // Playa Drive, heading east along the beach
  G.player.car.heading = Math.PI / 2;
  G.player.car.speed = 34;
  G.garage.nos = 120;
  G.nosBurning = true;
  G.setWanted(3);
  G.spawnPoliceNear(2);
  G.heli.active = true;
  G.heli.hover = 16; // low enough to sit inside the chase-cam frame, not above it
  G.spawnRoadblockAhead();
  G.spawnTrafficNear(-80, 180, 6); // ahead of the hero car, in the mid-road
  G.spawnPedsNear(-100, 192, 10);
  G.missions.startMission(11); // Street King race is live: checkpoints on minimap
  G.missions.hudTimerText = '1:27';
  G.setDialogue('TIO REYES', 'Race night. Eight checkpoints, one shark driver. Burn the NOS on the straight!');
  G.hud.log('TIO REYES: "Race night. Eight checkpoints, one shark driver."');
  G.hud.log('NOS burning — hold Shift on the straight.');
  G.camYaw = Math.PI / 2;
  G.state.cash = 8450;
}
// On-foot shootout at Torre Lumen: BRIGHT day, guards, muzzle flash, kill
// feed, dialogue, wanted 2.
export function stageShot2(G) {
  G.startPlay();
  G.warpTo(60, -120);
  G.player.heading = Math.PI;
  G.player.mesh.group.rotation.y = Math.PI;
  G.player.weapon = 'smg';
  G.setWanted(2);
  G.spawnEnemiesAt(60, -136, 3, 'shark');
  G.spawnEnemiesAt(68, -148, 3, 'shark');
  G.spawnPedsNear(60, -120, 6);
  G.missions.startMission(14); // El Puerto Es Nuestro finale
  G.setDialogue('MARA', 'El puerto es nuestro. The tower vault is ours — now we run!');
  G.hud.log('MARA: "El puerto es nuestro."');
  G.hud.feed('Mara downed a Tiburones shark');
  G.hud.feed('Mara downed a Tiburones shark');
  G.state.cash = 12300;
  G.state.health = 82;
  G.state.armour = 45;
  G.camYaw = Math.PI;
}
// Festival race / robbery at Festival Square: lanterns, crowds, stalls, BRIGHT.
export function stageShot3(G) {
  G.startPlay();
  G.enterCar(G.parked[0]); // red Comet RS, the hero car, for every shot
  G.warpTo(150, 30);
  G.player.car.heading = 2.6;
  G.player.car.speed = 0;
  G.setFestival(true);
  G.setWanted(3);
  G.spawnPoliceNear(1);
  G.spawnTrafficNear(150, 0, 4);
  G.spawnPedsNear(180, 0, 14);
  G.missions.startMission(12); // Festival de las Luces
  G.missions.hudTimerText = '3:12';
  G.turf.startRobbery(ROB_TARGETS.find((t) => t.id === 'stash-fest'));
  G.setDialogue('LENA CRUZ', 'Lanterns, music, crowds — perfect cover. Hit the stash, then run!');
  G.hud.log('LENA CRUZ: "Lanterns, music, crowds — perfect cover."');
  G.hud.log('Robbing the Tiburones stash… 3s');
  G.state.cash = 9800;
  G.camYaw = 2.6;
}
// Job-done banner at Playa Dorada: BRIGHT beach, turf 12/12, umbrellas + ferris.
export function stageShot4(G) {
  G.startPlay();
  G.enterCar(G.parked[0]);
  G.warpTo(-180, 180); // Playa Drive itself, not the palm row at z=190
  G.player.car.heading = Math.PI / 2;
  G.player.car.speed = 20;
  for (let i = 0; i < 12; i += 1) G.turf.owners[i] = 'crew';
  G.state.cash = 21400;
  G.missions.missionIdx = 15;
  G.missions.active = false;
  G.missions.objective = 'Story complete — Puerto Lumen is yours. Free roam!';
  G.spawnTrafficNear(-120, 180, 5);
  G.spawnPedsNear(-150, 200, 12);
  G.setDialogue('TIO REYES', 'El puerto es nuestro, Mara. The whole city flies our colours now.');
  G.hud.showBanner('JOB DONE', 'El Puerto Es Nuestro  +$8,000  —  TURF 12/12', 600000);
  G.hud.log('JOB DONE: El Puerto Es Nuestro — +$8,000');
  G.hud.log('EL PUERTO ES NUESTRO — all 12 districts held. 12/12 TURF.');
  G.camYaw = Math.PI / 2;
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
// peds keep moving, the camera holds, the player car holds its line and speed.
export function shotAutopilot(G, dt) {
  if (!G.player.inCar || !G.player.car) return;
  if (G.shotMode === 3) {
    // Festival robbery shot: hold still so the robbery channel stays live.
    G.player.car.speed = 0;
    return;
  }
  if (G.shotMode === 1) {
    // Cover chase: pin the speed high so the speedo reads big all the time,
    // and keep the roadblock parked 26 units ahead of the hero car so it
    // stays in frame (the car drives forward during the slow render).
    G.player.car.speed = 34;
    G.player.car.heading += Math.sin(performance.now() * 0.0004) * 0.05 * dt;
    // Keep the helicopter ahead-right in frame, circling over the chase.
    if (G.heli) { G.heli.angle = 0.35; }
    for (const rb of G.roadblocks || []) {
      const fx = Math.sin(G.player.car.heading), fz = Math.cos(G.player.car.heading);
      const rx = Math.cos(G.player.car.heading), rz = -Math.sin(G.player.car.heading);
      rb.x = G.player.x + fx * 26; rb.z = G.player.z + fz * 26;
      rb.cars.forEach((c, i) => {
        const off = i === 0 ? -4 : 4;
        c.x = rb.x + rx * off; c.z = rb.z + rz * off;
        c.heading = G.player.car.heading + Math.PI / 2;
        c.mesh.group.position.set(c.x, 0, c.z);
        c.mesh.group.rotation.y = c.heading;
      });
    }
    return;
  }
  if (G.shotMode === 4) {
    // Beach cruise: steady easy speed along Playa Drive.
    G.player.car.speed = 20;
    return;
  }
  G.player.car.speed = Math.min(G.player.car.speed + 2 * dt, 30);
  G.player.car.heading += Math.sin(performance.now() * 0.0004) * 0.1 * dt;
}
