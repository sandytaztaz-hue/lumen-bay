// LUMEN BAY r9c (V3) — the screenshot scenes behind ?shot=1..4. Shot 1 is
// the r8c cover re-shot TIGHTER (camera pulled in to dist 8.0, lower at
// 2.8, police cruiser pinned closer behind — the hero reads ~30% of the
// frame). Shot 2 is NEW: PIER SHOOTOUT at the marina — Mara firing from
// behind the hero car's door, police cordon ahead, heli spotlight cone
// overhead, muzzle flashes, cash flying in the air. Shots 3–4 are the r8c
// festival robbery + MISSION PASSED frames. All dialogue boxes now show
// drawn character portraits (see hud.js), never letter circles.
// real gameplay state (not a mock): the world runs its normal loop from there,
// the autopilot just holds the pose, and main.js sets window.__shotReady once
// the scene has rendered. Shot 1 is the cover: BRIGHT MIDDAY beach-avenue chase
// under a high white sun — big red Comet RS with clearcoat paint, NOS burning, THREE
// cruisers close behind with flashing light bars, heli overhead with a visible
// searchlight cone, roadblock ahead, dust puffs, full dense HUD: mission panel
// + alerts, WANTED 4 stars, big green cash, police response list, notification
// toasts, weapon slots, IN SIGHT banner, RESPECT bar, search-zone minimap,
// dialogue, big speed. Shots 2–4 are the feed thumbnails: action shootout,
// festival robbery, MISSION PASSED + story progress.
import { ROB_TARGETS } from './config.js';

// Cover: bright midday beach avenue chase. Red Comet RS LARGE in frame, NOS
// burning, 3 cruisers close behind, heli overhead, roadblock ahead, Street
// King race live, toasts up, 4 stars.
export function stageShot1(G) {
  G.startPlay();
  G.enterCar(G.parked[0]);
  G.warpTo(-150, 180); // Playa Drive, heading east along the beach, into the sun
  G.player.car.heading = Math.PI / 2;
  G.player.car.speed = 34;
  G.garage.nos = 120;
  G.nosBurning = true;
  G.setWanted(4);
  G.spawnPoliceBehind(3); // cruisers RIGHT behind the hero, in frame
  G.heli.active = true;
  G.heli.hover = 12; // r8b: lower + 1.35x bigger body, so the heli reads in frame
  G.spawnRoadblockAhead();
  G.spawnTrafficNear(-40, 180, 8); // r8b: far ahead of the hero, in the mid-road
  G.clearTrafficNear(-150, 180, 30); // r8b: NO stray pickup may overlap the hero
  G.spawnPedsNear(-100, 192, 14);
  G.missions.startMission(11); // Street King race is live: checkpoints on minimap
  G.missions.hudTimerText = '1:47';
  G.setDialogue('TIO REYES', 'Race night. Eight checkpoints, one shark driver. Burn the NOS on the straight!');
  G.hud.log('TIO REYES: "Race night. Eight checkpoints, one shark driver."');
  G.hud.log('NOS burning — hold Shift on the straight.');
  G.hud.notify('WANTED LEVEL UP', '4 stars — LCPD is all over you', 'danger', true);
  G.hud.notify('ROADBLOCK AHEAD', 'Ram it or dodge — 24m', 'danger', true);
  G.hud.notify('NOS READY', 'Tank full — hold Shift to burn', 'good', true);
  G.addAlert('info', 'VEHICLE STOLEN: VELOZ COMET RS');
  // 3/4 rear angle: a stronger side offset (-0.5) shows the hero's flank +
  // driver and puts the far-side chase fan at ~the hero's distance from the
  // lens, so the cruisers match its scale instead of looming over it.
  G.camYaw = Math.PI / 2 - 0.5;
  // r9c TIGHTER chase: camera pulled in (dist 9.0, height 2.8) so the hero
  // fills ~30% of the frame; the autopilot pins the chase cruiser closer
  // behind (back 1.8, lat -3.0 — see shotAutopilot below). (First try at
  // dist 8.0 made the hero ~45% of the frame — too big, cruiser hidden.)
  G.setCamDist(9.0);
  G.setCamHeight(2.8);
  G.state.cash = 18450;
  // Anchor: the chase autopilot holds speed 34, so without this the hero
  // drives hundreds of units during a slow SwiftShader settle and the
  // framing drifts. The anchor snaps it back every frame (staging hold).
  G.anchor = [-150, 180];
}
// r9c V3 — PIER SHOOTOUT at the marina: Mara on foot, firing from behind
// the hero Comet RS's door, a police cordon closing in ahead, the heli
// spotlight cone overhead, muzzle flashes everywhere, cash flying in the
// air, $21,700 on the line. Foreground FILLED — car door, flying cash,
// muzzle flashes, police — no empty road.
// Framing (fixed after two takes): facing WEST put the pink marina
// building across the whole background AND inside it the pinned heli —
// and the car sat 8 units from the lens, filling the frame and hiding
// Mara. So the shootout now faces SOUTH down the marina road (x=-180):
// the car is 3 units to Mara's left, 14+ units from the lens, the cordon
// stands on the road ahead, and the heli is pinned ahead-south over the
// road where its cone is visible.
export function stageShot2(G) {
  G.startPlay();
  G.enterCar(G.parked[0]); // hot pink-red Comet RS, the hero car
  G.warpTo(-180, -150); // marina road, facing south toward the beach
  G.player.car.heading = 0;
  G.exitCar(); // Mara steps out 3 units east of the car, behind its door
  G.warpTo(-175, -150); // 2 further east — clear of the car's silhouette,
  // fully visible on the road with the car as cover on her left
  G.player.heading = 0;
  G.player.mesh.group.rotation.y = 0;
  G.player.weapon = 'smg';
  // Police cordon closing in ahead (south), tight and close, firing back.
  G.spawnEnemiesAt(-177, -142, 3, 'police');
  G.spawnEnemiesAt(-174, -140, 2, 'police');
  G.spawnEnemiesAt(-180, -138, 2, 'police');
  // Muzzle flashes: Mara's gun + the cordon's guns, persistent in the still.
  G.addMuzzleFlash(-175.5, 1.4, -148.5);
  G.addMuzzleFlash(-177, 1.4, -141.5);
  G.addMuzzleFlash(-174.5, 1.4, -139.5);
  G.addMuzzleFlash(-179.5, 1.4, -137.5);
  // Cash flying in the air around the shootout + a spill by the car door.
  G.spawnCashBurst(-178, -144);
  G.spawnLootPile(-178, -152);
  // Heli overhead with its spotlight cone on the road (angle pinned by the
  // autopilot so the cone stays in frame over the cordon).
  G.heli.active = true;
  G.heli.hover = 10;
  G.spawnPedsNear(-170, -132, 6); // dockworkers scattering
  G.missions.startMission(14); // El Puerto Es Nuestro finale
  G.setWanted(5); // finale heat, pinned AFTER startMission
  G.setDialogue('MARA', "Pier's hot — heli on us, cash in the air. Hold the door!");
  G.hud.log('MARA: "Pier\'s hot — heli on us, cash in the air."');
  G.hud.feed('Mara downed a police officer');
  G.hud.feed('Cash flying at the marina pier — $21,700');
  G.hud.notify('PIER SHOOTOUT', 'LCPD cordon at the marina — hold the door', 'danger', true);
  G.hud.notify('WANTED LEVEL UP', '5 stars — the whole LCPD is on you', 'danger', true);
  G.hud.notify('SMG READY', '30/120 — hold click to spray', 'good', true);
  G.state.cash = 21700;
  G.state.health = 82;
  G.state.armour = 45;
  // Camera behind Mara (north of her), looking south down the road at the
  // cordon; the car door is on her left. Pulled back to dist 14 so the car
  // reads as cover, not as the whole frame.
  G.camYaw = 0;
  G.setCamDist(14);
}
// Festival robbery at Festival Square: lanterns GLOWING at dusk, crowds,
// stalls, red Comet RS, wanted 3.
export function stageShot3(G) {
  G.startPlay();
  G.enterCar(G.parked[0]); // red Comet RS, the hero car, for every shot
  G.warpTo(150, 30);
  G.player.car.heading = 2.6;
  G.player.car.speed = 0;
  G.setFestival(true);
  G.setWanted(3);
  G.spawnPoliceNear(1);
  G.spawnTrafficNear(150, 8, 4);
  // Crowd PAST the car, away from the chase camera (camera sits front-right
  // of the car at ~(156,22)): peds wander during the slow SwiftShader
  // settle, and one landing next to the lens reads as a giant. Cluster at
  // (140,40) keeps everyone ≥10 units from the lens even after wandering.
  G.spawnPedsNear(140, 40, 10);
  G.spawnPedsNear(180, 0, 14);
  // r9: the (140,40) cluster's ±35 spread can drop a ped right on the lens
  // (camera ≈ (144,35) for this camYaw) — clear a 12-unit bubble around it.
  G.clearPedsNear(144, 35, 12);
  G.missions.startMission(12); // Festival de las Luces
  G.missions.hudTimerText = '3:12';
  G.turf.startRobbery(ROB_TARGETS.find((t) => t.id === 'stash-fest'));
  G.setDialogue('LENA CRUZ', 'Lanterns, music, crowds — perfect cover. Hit the stash, then run!');
  G.hud.log('LENA CRUZ: "Lanterns, music, crowds — perfect cover."');
  G.hud.log('Robbing the Tiburones stash… 3s');
  G.hud.notify('ROBBERY IN PROGRESS', 'Tiburones stash — stay close, 5s', 'danger', true);
  G.hud.notify('WANTED LEVEL UP', '3 stars — heli is up', 'danger', true);
  G.state.cash = 9800;
  // 3/4 rear angle (like shot 1): dead-behind the car shows only its 2-unit
  // rear end-on (~100px) — the offset shows the flank + driver and the car
  // reads ~2x bigger, poster-size.
  G.camYaw = 2.6 - 0.38;
}
// MISSION PASSED at Playa Dorada: bright midday beach, turf 12/12, umbrellas +
// ferris wheel, MISSION PASSED banner (+$8,000 · +500 REP · UNLOCKED: PIER
// SAFEHOUSE) and the story-progress line (STORY 15/15, SAVE SLOT 1).
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
  G.hud.showBanner('MISSION PASSED', '+$8,000  ·  +500 REP  ·  UNLOCKED: PIER SAFEHOUSE', 600000);
  G.hud.notify('MISSION PASSED', 'El Puerto Es Nuestro  +$8,000', 'good', true);
  G.hud.notify('UNLOCKED: PIER SAFEHOUSE', 'New safehouse on the marina pier', 'good', true);
  G.hud.notify('STORY 15/15 — SAVE SLOT 1', '100% COMPLETE — Puerto Lumen is yours', 'good', true);
  G.hud.log('MISSION PASSED: El Puerto Es Nuestro — +$8,000  ·  +500 REP');
  G.hud.log('STORY 15/15 — SAVE SLOT 1  100% COMPLETE.');
  G.camYaw = Math.PI / 2 - 0.38;
  G.anchor = [-180, 180];
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
  // r9c pier shootout (shotMode 2, on foot): pin the heli ahead-south of the
  // player so its spotlight cone stays in frame over the cordon — otherwise
  // the circling heli drifts out of frame during the settle.
  if (G.shotMode === 2 && G.heli) G.heli.angle = Math.PI / 2;
  if (!G.player.inCar || !G.player.car) return;
  if (G.shotMode === 3) {
    // Festival robbery shot: hold still so the robbery channel stays live.
    G.player.car.speed = 0;
    return;
  }
  if (G.shotMode === 1) {
    // Cover chase: pin the speed high so the speedo reads big all the time,
    // keep the roadblock parked 26 units ahead of the hero car so it stays
    // in frame, keep the 3 cruisers CLOSE behind (the chase look), and keep
    // the helicopter ahead-right in frame, circling over the chase.
    G.player.car.speed = 34;
    G.player.car.heading += Math.sin(performance.now() * 0.0004) * 0.05 * dt;
    if (G.heli) { G.heli.angle = 0.5; }
    const fx = Math.sin(G.player.car.heading), fz = Math.cos(G.player.car.heading);
    const rx = Math.cos(G.player.car.heading), rz = -Math.sin(G.player.car.heading);
    for (const rb of G.roadblocks || []) {
      rb.x = G.player.x + fx * 22; rb.z = G.player.z + fz * 22;
      rb.cars.forEach((c, i) => {
        const off = i === 0 ? -4 : 4;
        c.x = rb.x + rx * off; c.z = rb.z + rz * off;
        c.heading = G.player.car.heading + Math.PI / 2;
        c.mesh.group.position.set(c.x, 0, c.z);
        c.mesh.group.rotation.y = c.heading;
      });
    }
    // r9c TIGHTER chase: the cruiser sits closer behind the hero (back 1.8,
    // lat -3.0 instead of 2.5/-3.5) to match the pulled-in camera — police
    // inches off the bumper, hero ~30% of the frame.
    const chase = (G.police || []).filter((c) => c.kind === 'chase');
    chase.forEach((c) => {
      c.x = G.player.x - fx * 1.8 + rx * -3.0;
      c.z = G.player.z - fz * 1.8 + rz * -3.0;
      c.heading = G.player.car.heading;
      c.speed = 34;
      c.mesh.group.position.set(c.x, 0, c.z);
      c.mesh.group.rotation.y = c.heading;
    });
    const headon = (G.police || []).filter((c) => c.kind === 'headon');
    headon.forEach((c, i) => {
      const ahead = i === 0 ? 13 : 16;
      const lat = i === 0 ? -4.5 : 4.5;
      c.x = G.player.x + fx * ahead + rx * lat;
      c.z = G.player.z + fz * ahead + rz * lat;
      c.heading = G.player.car.heading + Math.PI;
      c.speed = 0;
      c.mesh.group.position.set(c.x, 0, c.z);
      c.mesh.group.rotation.y = c.heading;
    });
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
