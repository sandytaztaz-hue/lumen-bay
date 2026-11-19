// LUMEN BAY r9b (V2) — the screenshot scenes behind ?shot=1..4. Shot 1 is
// the r8c cover re-shot from a LOWER FLANK angle (more side-on, lower
// camera — the hero reads pinker and bigger, fixing r8c's rear-high
// darkness). Shot 2 is NEW: NOS DRIFT CHASE through Festival Square —
// hero car drifting past the crowd, police cruiser inches behind, lanterns,
// NOS burning. Shots 3–4 are the r8c festival robbery + MISSION PASSED
// frames. All dialogue boxes now show drawn character portraits (see
// hud.js), never letter circles.
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
  G.heli.hover = 20; // r9b: higher than r8b's 12 — from the lower flank
  // camera the 12-hover heli's rotor bar crossed the top of the frame;
  // 16 still crossed it, 20 lifts the rotor toward the top edge.
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
  // r9b LOWER FLANK angle: a stronger side offset (-0.65, ~37°) plus a
  // slightly LOWER camera (camPitch -0.1 → eye ~2.8) shows the hero's pink
  // flank + driver instead of its dark cabin roof — the r8c rear-high shot
  // read the car dark navy; from the flank the pink paint owns the frame.
  // (First try at -0.85/-0.2 cropped the hero's nose off the right edge and
  // put the low heli's rotor bar across the top — backed off both.)
  G.camYaw = Math.PI / 2 - 0.65;
  G.camPitch = -0.1;
  G.setCamDist(11);
  // r9b: pull the camera back a touch (dist 11) — at 9.5 the long hero nose
  // cropped off the right edge from this side-on angle.
  G.state.cash = 18450;
  // Anchor: the chase autopilot holds speed 34, so without this the hero
  // drives hundreds of units during a slow SwiftShader settle and the
  // framing drifts. The anchor snaps it back every frame (staging hold).
  G.anchor = [-150, 180];
}
// r9b V2 — NOS DRIFT CHASE through Festival Square: the hero Comet RS
// drifting past the festival crowd with NOS burning, a police cruiser inches
// behind, two head-on cruisers ahead, heli low overhead, lanterns + crowd
// all around. Foreground FILLED — car, cruiser, crowd, no empty road.
// Staged at the PLAZA CENTRE (180,0): the NOS FOV kick (76°) shows more
// foreground than shot 3's 72°, and from the old (150,30) anchor that extra
// foreground fell past the plaza's edge onto grass.
export function stageShot2(G) {
  G.startPlay();
  G.enterCar(G.parked[0]); // hot pink-red Comet RS, the hero car
  G.warpTo(180, 0); // Festival Square centre, heading into the lanterns
  G.player.car.heading = 2.6;
  G.player.car.speed = 34;
  G.garage.nos = 120;
  G.nosBurning = true;
  G.setFestival(true); // lanterns + festival crowd
  G.setWanted(4);
  G.spawnPoliceBehind(3); // ONE tight chaser + TWO head-on, HALCYON layout
  G.heli.active = true;
  G.heli.hover = 12; // low heli, searchlight cone over the square
  G.spawnTrafficNear(195, -15, 4); // cars ahead in the square
  G.clearTrafficNear(180, 0, 12); // nothing may overlap the hero
  G.clearTrafficNear(172, 6, 14); // ...or loom at the lens (camera ≈ (172,6))
  G.spawnPedsNear(170, 10, 10);
  G.spawnPedsNear(200, -10, 14);
  // r9: the ped clusters' spread can drop a ped right on the lens
  // (camera ≈ (172,6) for this camYaw) — clear a 12-unit bubble around it.
  G.clearPedsNear(172, 6, 12);
  G.missions.startMission(11); // Street King race is live
  G.missions.hudTimerText = '2:05';
  G.setDialogue('MARA', "Drift the square — cruiser's on our bumper, crowd's going wild!");
  G.hud.log('MARA: "Drift the square — cruiser\'s on our bumper."');
  G.hud.log('NOS burning — hold Shift on the straight.');
  G.hud.notify('NOS BURNING', 'Drift through Festival Square — 34 km/h sideways', 'good', true);
  G.hud.notify('WANTED LEVEL UP', '4 stars — LCPD is all over you', 'danger', true);
  G.hud.notify('DRIFT!', 'Festival crowd is cheering — +250 REP', 'good', true);
  G.addAlert('info', 'DRIFT: NOS BURNING IN THE SQUARE');
  // 3/4 rear angle (like shot 3): the offset shows the flank + driver and
  // the car reads ~2x bigger than dead-behind.
  G.camYaw = 2.6 - 0.38;
  G.state.cash = 15800;
  // Anchor: the drift autopilot holds speed 34, so without this the hero
  // drives out of the square during a slow SwiftShader settle.
  G.anchor = [180, 0];
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
  if (!G.player.inCar || !G.player.car) return;
  if (G.shotMode === 3) {
    // Festival robbery shot: hold still so the robbery channel stays live.
    G.player.car.speed = 0;
    return;
  }
  if (G.shotMode === 2) {
    // r9b NOS drift chase: hold speed 34 + NOS burn, keep the cruiser tight
    // behind (the chase look) and the heli low over the square, gentle
    // drift sway on the heading. The anchor (frame()) keeps the hero in
    // the square; this keeps the chase glued to it.
    G.player.car.speed = 34;
    G.nosBurning = true;
    G.player.car.heading += Math.sin(performance.now() * 0.0006) * 0.08 * dt;
    if (G.heli) { G.heli.angle = 0.5; }
    const fx = Math.sin(G.player.car.heading), fz = Math.cos(G.player.car.heading);
    const rx = Math.cos(G.player.car.heading), rz = -Math.sin(G.player.car.heading);
    const chase = (G.police || []).filter((c) => c.kind === 'chase');
    chase.forEach((c) => {
      c.x = G.player.x - fx * 2.5 + rx * -3.5;
      c.z = G.player.z - fz * 2.5 + rz * -3.5;
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
    // Pin the chase: ONE cruiser tight behind the hero (back 2.5, lat -2.5)
    // and TWO head-on cruisers ahead of it (13/16 m, lats -4.5/+4.5,
    // facing the hero) — the HALCYON composition. The far-side fan is
    // dead: the offset chase camera puts any further-back cruiser past a
    // 45-degree bearing, cropped as a giant wheel at the frame edge.
    const chase = (G.police || []).filter((c) => c.kind === 'chase');
    chase.forEach((c) => {
      c.x = G.player.x - fx * 2.5 + rx * -3.5;
      c.z = G.player.z - fz * 2.5 + rz * -3.5;
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
