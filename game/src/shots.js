// LUMEN BAY r12 — the screenshot scenes behind ?shot=1..4. All dialogue
// boxes show drawn character portraits (see hud.js), never letter circles.
// Lighting per shot comes from config.js LIGHTING_PRESETS via G.setLighting(),
// which also stamps the HUD clock to that shot's time. These stage REAL
// gameplay state (not a mock): the world runs its normal loop from there,
// the autopilot just holds the pose, and main.js sets window.__shotReady
// once the scene has rendered.
//
// Shot 1 is NEW in r12: the cover is a NIGHT boulevard chase (22:40) — the
// top-entry look Sand ordered: MANY police cruisers + helicopter, detailed
// city minimap, night neon, wanted stars, police-response panel, weapon
// slots, dispatch dialogue. Shot 2 is the night pier shootout (23:20).
// Shot 3 is the vault interior (21:40). Shot 4 is the dawn marina escape
// (06:10) — r12 FIXES the r11 boat defect: the boat now sits EAST of the
// car, on the screen-LEFT side of the frame (the camera looks south, so
// screen-right is west), clear of the MISSION PASSED banner (top-centre)
// and the toast stack (top-right), big and close to shore, with the car
// facing east toward it.
import { ROB_TARGETS } from './config.js';

// Cover: NIGHT boulevard chase. Hot pink-red Comet RS LARGE in frame, NOS
// burning, SIX cruisers close around it with flashing light bars, heli
// overhead with a visible searchlight cone, roadblock ahead, neon signs,
// full dense HUD: mission panel + alerts, WANTED 5 stars, big green cash,
// police response list (six units + AIR-1), notification toasts, weapon
// slots, IN SIGHT banner, RESPECT bar, search-zone minimap, dispatch
// dialogue, big speed. CLEAR night, neon glow, wet-looking asphalt.
export function stageShot1(G) {
  G.setLighting('nightchase'); // 22:40 — also stamps the HUD clock
  G.startPlay();
  G.enterCar(G.parked[0]);
  G.warpTo(-150, 180); // Playa Drive, heading east along the beach
  G.player.car.heading = Math.PI / 2;
  G.player.car.speed = 34;
  G.garage.nos = 120;
  G.nosBurning = true;
  G.setWanted(5);
  G.spawnPoliceBehind(6); // the six-cruiser pack: chase + 2 head-on + 2 flank + 2nd chaser
  G.heli.active = true;
  G.heli.hover = 12;
  G.spawnRoadblockAhead();
  G.spawnTrafficNear(-40, 180, 8); // far ahead of the hero, in the mid-road
  G.clearTrafficNear(-150, 180, 30); // NO stray pickup may overlap the hero
  G.spawnPedsNear(-100, 192, 14);
  // Lit lamps down the boulevard so the night street reads lamp-lit, and a
  // warm pool of light over the chase.
  G.addLampGlow(-142, 180);
  G.addLampGlow(-118, 180);
  G.addPointLight(-150, 6, 180, 0xffb347, 200, 26);
  G.missions.startMission(11); // Street King race is live: checkpoints on minimap
  G.missions.hudTimerText = '1:47';
  G.setDialogue('LCPD DISPATCH', 'All units — suspect eastbound on Playa Drive, five stars. Air One overhead, roadblock at Miramar Strip. Do not let her reach the beach.');
  G.hud.log('LCPD DISPATCH: "All units — suspect eastbound on Playa Drive."');
  G.hud.log('NOS burning — hold Shift on the straight.');
  G.hud.log('Night chase — six units on you, heli overhead, roadblock ahead.');
  G.hud.notify('WANTED LEVEL UP', '5 stars — the whole LCPD is on you', 'danger', true);
  G.hud.notify('ROADBLOCK AHEAD', 'Ram it or dodge — 24m', 'danger', true);
  G.hud.notify('NOS READY', 'Tank full — hold Shift to burn', 'good', true);
  G.addAlert('info', 'VEHICLE STOLEN: VELOZ COMET RS');
  // LOW rear 3/4 chase cam: a stronger side offset (-0.5) shows the hero's
  // flank + driver and puts the far-side chase fan at ~the hero's distance
  // from the lens, so the cruisers match its scale instead of looming.
  G.camYaw = Math.PI / 2 - 0.5;
  G.setCamDist(9.0);
  G.setCamHeight(2.8);
  G.state.cash = 18450;
  // Anchor: the chase autopilot holds speed 34, so without this the hero
  // drives hundreds of units during a slow SwiftShader settle and the
  // framing drifts. The anchor snaps it back every frame (staging hold).
  G.anchor = [-150, 180];
}
// NIGHT PIER SHOOTOUT at the marina (23:20, recent rain, wet street, neon
// glow, lamp-lit). Mara on foot, firing from behind the hero Comet RS's
// door, a police cordon closing in ahead, the heli spotlight cone overhead,
// muzzle flashes everywhere, cash flying in the air, $21,700 on the line.
// NOTHING like shot 1: on foot, low ground-level side view, the cordon
// ahead-south with its own muzzle flashes, dockworkers scattering.
// CAMERA: LOW ground-level SIDE view from the WEST — the camera sits on the
// west sidewalk at ground level (height 1.6), looking east at Mara's left
// profile with the hero car SIDE-ON behind her. Mara stands WEST of the car,
// on the road's west edge — so from the west camera she is in front, the car
// reads side-on directly behind her as cover, and the cordon stands
// ahead-south (screen-right) with its muzzle flashes. A warm point light
// hangs over Mara so she reads against the dark road.
export function stageShot2(G) {
  G.setLighting('night'); // 23:20 — also stamps the HUD clock
  G.startPlay();
  G.enterCar(G.parked[0]); // hot pink-red Comet RS, the hero car
  G.warpTo(-177.5, -144);
  G.player.car.heading = 0;
  G.exitCar(); // Mara steps out east of the car, behind its door
  G.warpTo(-183, -144); // 5.5 from the car: no "Press E" prompt in frame
  G.player.heading = 0;
  G.player.mesh.group.rotation.y = 0;
  G.player.weapon = 'smg';
  // Police cordon closing in ahead (south), tight and close, firing back —
  // spread WIDE of the hero car so the cordon reads clear of it from the
  // west camera instead of hiding behind the Comet's flank.
  G.spawnEnemiesAt(-177, -136, 3, 'police');
  G.spawnEnemiesAt(-174, -134, 2, 'police');
  G.spawnEnemiesAt(-180, -132, 2, 'police');
  G.spawnEnemiesAt(-168, -134, 2, 'police');
  G.spawnEnemiesAt(-166, -130, 2, 'police');
  // Muzzle flashes: Mara's gun + the cordon's guns, persistent in the still.
  G.addMuzzleFlash(-180.5, 1.4, -142.5, 4.0);
  G.addMuzzleFlash(-177, 1.4, -135.5, 3.6);
  G.addMuzzleFlash(-174.5, 1.4, -133.5, 3.6);
  G.addMuzzleFlash(-179.5, 1.4, -131.5, 3.6);
  G.addMuzzleFlash(-175.5, 1.4, -134.5, 3.2);
  // Cash flying in the air around the shootout + a spill by the car door.
  G.spawnCashBurst(-178, -138);
  G.spawnLootPile(-179, -146);
  // Heli overhead with its spotlight cone on the road (angle pinned by the
  // autopilot so the cone stays in frame over the cordon).
  G.heli.active = true;
  G.heli.hover = 10;
  // NIGHT street dressing: two LIT lamps down the road ahead, a warm pool of
  // light over Mara, rain puddles on the road catching the light,
  // dockworkers scattering further down the pier.
  G.addLampGlow(-180, -113);
  G.addLampGlow(-180, -53);
  G.addPointLight(-177, 5, -141, 0xffb347, 150, 18);
  G.addPointLight(-174, 5, -132, 0xffb347, 150, 18); // warm light over the cordon so the officers read
  G.spawnPuddle(-178, -132, 6, 3);
  G.spawnPuddle(-174, -128, 6, 3);
  G.spawnPuddle(-182, -136, 5, 3);
  G.spawnPuddle(-179, -140, 5, 2.5);
  G.spawnPuddle(-176, -124, 6, 3);
  G.spawnPuddle(-177, -138, 4, 10); // long wet strip down the road
  G.spawnPedsNear(-170, -126, 6); // dockworkers scattering
  G.clearTrafficNear(-181, -144, 22); // no stray car may cross the duel
  G.missions.startMission(14); // El Puerto Es Nuestro finale
  G.setWanted(5); // finale heat, pinned AFTER startMission
  G.setDialogue('MARA', "Pier's hot — heli on us, cash in the air. Hold the door!");
  G.hud.log('MARA: "Pier\'s hot — heli on us, cash in the air."');
  G.hud.feed('Mara downed a police officer');
  G.hud.feed('Cash flying at the marina pier — $21,700');
  G.hud.notify('PIER SHOOTOUT', 'LCPD cordon at the marina — hold the door', 'danger', true);
  G.hud.notify('WANTED LEVEL UP', '5 stars — the whole LCPD is on you', 'danger', true);
  G.state.cash = 21700;
  G.state.health = 82;
  G.state.armour = 45;
  // ELEVATED SIDE view: camera NORTH-WEST of Mara on the ROAD (camYaw 0.6),
  // 11 out, 5 high, pitched down — the high angle sees OVER the Comet's
  // flank to the cordon behind it and pulls Mara, the car and the whole
  // cordon big in frame instead of a wide empty road.
  G.camYaw = 0.6;
  G.setCamDist(11);
  G.setCamHeight(5.0);
  G.camPitch = -0.35;
}
// VAULT INTERIOR heist at Torre Lumen (21:40, warm vault light, dust in the
// beams, NO weather, NO sky). INSIDE the vault: gold bars + cash piles,
// guards down, Mara + two allies inside, the round gold vault door blown
// open on the north wall. The sky dome is HIDDEN for this shot (preset
// 'interior'); the room is a staged set in the world with its south side
// open as a cutaway. CAMERA: HIGH wide looking DOWN into the room from the
// south — camera 11 out, ~13 high, steep down-angle, the whole vault floor
// in frame with the door on the far wall. The mission's live tower squad is
// cleared silently (G.clearEnemies) so no guard walks in shooting during
// the still; the beacon pillar is suppressed (it would poke through the
// north wall).
export function stageShot3(G) {
  G.setLighting('interior'); // 21:40 — also stamps the HUD clock
  G.noBeacon = true;
  G.startPlay();
  G.spawnVaultRoom(60, -150); // Torre Lumen vault, south of the tower
  G.warpTo(58, -147); // Mara on foot INSIDE the vault, facing the door (north)
  G.player.heading = Math.PI;
  G.player.mesh.group.rotation.y = Math.PI;
  G.player.weapon = 'smg';
  G.missions.startMission(14); // El Puerto Es Nuestro finale
  G.clearEnemies(); // the tower squad stays OUT of the vault still
  G.setWanted(5); // finale heat, pinned AFTER startMission
  // The loot: SIX gold/cash piles + cash frozen mid-air over the floor.
  G.spawnLootPile(55, -148);
  G.spawnLootPile(65, -152);
  G.spawnLootPile(60, -145.5);
  G.spawnLootPile(57, -151);
  G.spawnLootPile(63, -149.5);
  G.spawnLootPile(58, -153);
  G.spawnCashBurst(60, -148);
  // Guards down on the vault floor + TWO allies covering the door.
  G.spawnDowned(54, -147, 'shark');
  G.spawnDowned(66, -153, 'shark');
  G.spawnDowned(62, -150, 'shark');
  G.spawnAlly(64, -147, Math.PI);
  G.spawnAlly(57, -150.5, Math.PI * 0.75);
  // Muzzle flashes: Mara's gun + the ally's, persistent in the still.
  G.addMuzzleFlash(58.5, 1.4, -146);
  G.addMuzzleFlash(63.5, 1.4, -145.5);
  // Warm vault light: one big gold light over the loot + two smaller ones,
  // plus dust motes hanging in the beams.
  G.addPointLight(60, 6, -150, 0xffc46b, 500, 45);
  G.addPointLight(54, 5, -146, 0xff9a3c, 250, 25);
  G.addPointLight(66, 5, -154, 0xff9a3c, 250, 25);
  G.spawnDustMotes(60, -149, 10);
  G.clearPedsNear(60, -150, 16); // no wanderer may stroll through the vault
  G.setDialogue('MARA', "Vault's open — gold everywhere. Grab it all and go!");
  G.hud.log('MARA: "Vault\'s open — gold everywhere."');
  G.hud.log('Torre Lumen vault cracked — $48,500 in gold and cash.');
  G.hud.notify('VAULT CRACKED', 'Torre Lumen vault — $48,500 in gold and cash', 'good', true);
  G.hud.notify('WANTED LEVEL UP', '5 stars — the whole LCPD is on you', 'danger', true);
  G.hud.notify('LOOT SECURED', 'Gold bars + cash stacks — grab it all', 'good', true);
  G.state.cash = 48500;
  G.state.health = 82;
  G.state.armour = 45;
  // HIGH wide looking down into the room: camera south of Mara, 11 out,
  // ~13 high — the closer camera makes the figures and loot bigger so the
  // floor reads full, not empty. The 13-high walls hide the HOTEL LUMEN sign
  // and the rooftop cruiser; there is no VAULT sign plane (it collided with
  // the DOM WANTED stars).
  G.camYaw = Math.PI;
  G.setCamDist(11);
  G.setCamHeight(13);
  G.camPitch = 0.25;
}
// DAWN MARINA ESCAPE / MISSION PASSED on the south beach (06:10, morning
// mist over the water, pink-orange sunrise low over the sea). The hero car
// parked on the sand at the water's edge, the speedboat moored just off it,
// Mara's crew standing by the car, MISSION PASSED banner and the
// story-progress line (STORY 15/15, SAVE SLOT 1).
// r12 — THE BOAT FIX. r11 parked the boat WEST of the car (x=-166), which
// from this south-looking camera is the SCREEN-RIGHT side — exactly where
// the toast stack sits, so the hull hid behind the toasts and the stern hid
// behind the MISSION PASSED title. Now the boat sits EAST of the car and
// CLOSE to it (x=-140, 18 east but only 2 south of the car, 3.0x — ~27
// long), with the camera anchor on the car so the hull + stern sit LOW in
// the frame below the banner, big and readable, clear of the banner
// (top-centre) and the toasts (top-right). The car faces EAST (nose toward
// the boat) so the escape reads: car → boat → sea → sunrise. Only TWO
// toasts now, so nothing stacks over the boat. The beach is dressed (umbrellas flanking the car,
// beachgoers at dawn, peds in the near foreground) so the sand is not a big
// empty foreground.
// CAMERA: HIGH wide ESTABLISHING — camera north of the car on the beach, 19
// out, ~12 high, pitched down: car + boat + mist + sunrise + sea all in one
// frame, the boat pulled down from the top edge into mid-frame clear of the
// banner, the foreground umbrella shrunk. The sun low ahead-south over the
// water. The car is parked (G.holdStill) and anchored, so the slow settle
// can never drift the frame.
export function stageShot4(G) {
  G.setLighting('dawn'); // 06:10 — also stamps the HUD clock
  G.spawnSandPatch(); // the dawn beach, deterministically tan
  G.startPlay();
  G.enterCar(G.parked[0]);
  G.warpTo(-158, 230); // on the south sand at the water's edge
  G.player.car.heading = Math.PI / 2; // nose EAST, toward the boat
  G.player.car.speed = 0;
  G.holdStill = true;
  for (let i = 0; i < 12; i += 1) G.turf.owners[i] = 'crew';
  G.state.cash = 21400;
  G.missions.missionIdx = 15;
  G.missions.active = false;
  G.missions.objective = 'Story complete — Puerto Lumen is yours. Free roam!';
  // The getaway boat, moored just off the beach EAST of the car
  // (screen-LEFT when facing south, clear of banner + toasts) — 3.0x, 18
  // east but only 2 south of the car, so it sits LOW in the frame below the
  // MISSION PASSED banner, hull + stern fully in frame.
  G.spawnBoat(-140, 232, Math.PI / 2, 3.0);
  // Morning mist over the sea, kept SMALL and OFF the boat.
  G.spawnMist(-230, 258, 35);
  G.spawnMist(-105, 272, 35);
  G.spawnMist(-165, 285, 30);
  // The crew standing by the car, facing the boat and the sunrise.
  G.spawnAlly(-155, 233, Math.PI / 2);
  G.spawnAlly(-161, 233, Math.PI / 2);
  G.spawnPedsNear(-168, 214, 6); // beachgoers at dawn (south of the camera)
  G.spawnPedsNear(-146, 216, 4); // near-foreground beachgoers, bottom of frame
  G.spawnPedsNear(-166, 218, 3);
  G.clearTrafficNear(-158, 230, 30); // no stray car may overlap the hero
  G.setDialogue('TIO REYES', 'Dawn breaks over the marina, Mara. The boat\'s waiting — Puerto Lumen is ours.');
  G.hud.showBanner('MISSION PASSED', '+$8,000  ·  +500 REP  ·  UNLOCKED: PIER SAFEHOUSE', 600000);
  G.hud.notify('MISSION PASSED', 'El Puerto Es Nuestro  +$8,000', 'good', true);
  G.hud.notify('STORY 15/15 — SAVE SLOT 1', '100% COMPLETE — Puerto Lumen is yours', 'good', true);
  G.hud.log('MISSION PASSED: El Puerto Es Nuestro — +$8,000  ·  +500 REP');
  G.hud.log('STORY 15/15 — SAVE SLOT 1  100% COMPLETE.');
  G.camYaw = 0.2;
  G.setCamDist(19);
  G.setCamHeight(13);
  G.camPitch = 0.12;
  G.anchor = [-158, 230]; // on the car — pins the frame; boat sits just east
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
  // Pier shootout (shotMode 2, on foot): pin the heli ahead-south of the
  // player so its spotlight cone stays in frame over the cordon — otherwise
  // the circling heli drifts out of frame during the settle.
  if (G.shotMode === 2 && G.heli) G.heli.angle = Math.PI / 2;
  if (!G.player.inCar || !G.player.car) return;
  if (G.shotMode === 3) {
    G.player.car.speed = 0;
    return;
  }
  if (G.shotMode === 1) {
    // Cover chase: pin the speed high so the speedo reads big all the time,
    // keep the roadblock parked 22 units ahead of the hero car so it stays
    // in frame, keep the SIX cruisers pinned in their slots, and keep the
    // helicopter ahead-right in frame, circling over the chase.
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
    // The six-cruiser pack, pinned every frame to its staging slot:
    // chase tight behind on the camera side, second chaser behind far side,
    // two head-on ahead, two flankers at the hero's sides.
    const pin = (kind, back, lat, face, speed) => {
      for (const c of (G.police || []).filter((c) => c.kind === kind)) {
        c.x = G.player.x - fx * back + rx * lat;
        c.z = G.player.z - fz * back + rz * lat;
        c.heading = face;
        c.speed = speed;
        c.mesh.group.position.set(c.x, 0, c.z);
        c.mesh.group.rotation.y = c.heading;
      }
    };
    pin('chase', 2.2, -4.8, G.player.car.heading, 34);
    pin('chase2', 5, 4.5, G.player.car.heading, 34);
    // Flank pair: one per side — per-car slots, like the head-on pair.
    const flank = (G.police || []).filter((c) => c.kind === 'flank');
    flank.forEach((c, i) => {
      const lat = i === 0 ? -7 : 7;
      c.x = G.player.x + fx * 8 + rx * lat;
      c.z = G.player.z + fz * 8 + rz * lat;
      c.heading = G.player.car.heading;
      c.speed = 34;
      c.mesh.group.position.set(c.x, 0, c.z);
      c.mesh.group.rotation.y = c.heading;
    });
    // Head-on pair: two cruisers, one per side — pin() above matches by
    // kind, so the head-on pair needs its own per-car slot.
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
    if (G.holdStill) { G.player.car.speed = 0; return; }
    G.player.car.speed = 20;
    return;
  }
  G.player.car.speed = Math.min(G.player.car.speed + 2 * dt, 30);
  G.player.car.heading += Math.sin(performance.now() * 0.0004) * 0.1 * dt;
}
