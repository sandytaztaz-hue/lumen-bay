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
// Shot 3 is the FULL CITY MAP of Puerto Lumen (21:40) — the vault interior
// is gone (Sand rejected it: sparse brown, gold read as debris, figures
// tiny). The map is the game's own minimap data rendered full-screen with
// the escape route, districts, streets and landmarks, HUD panels on top.
// Shot 4 is the dawn marina escape (06:10) — r12 FIXES the r11 boat defect:
// the boat now sits EAST of the car, on the screen-LEFT side of the frame
// (the camera looks south, so screen-right is west), clear of the MISSION
// PASSED banner (top-centre) and the toast stack (top-right), big and close
// to shore, with the car facing east toward it.
import { ROB_TARGETS } from './config.js';

// Cover: NIGHT boulevard chase. Hot pink-red Comet RS LARGE in frame, NOS
// burning, EIGHT cruisers close around it with flashing light bars, heli
// overhead with a visible searchlight cone, roadblock ahead, neon signs,
// full dense HUD: mission panel + alerts, WANTED 5 stars, big green cash,
// police response list (eight units + AIR-1, capped display + footer),
// notification toasts, weapon slots, IN SIGHT banner, RESPECT bar,
// search-zone minimap, dispatch dialogue, big speed. CLEAR night, neon
// glow, wet-looking asphalt.
// r12 revision (BRISA BAY: crowded + clear + exciting): the pack grows
// from six to eight cruisers — a centre head-on charger down the middle
// and a close far-side flanker — the heli drops to hover 3 so its body
// sits INSIDE the frame (at hover 5 only the cone showed, the body sat
// just above the top edge), and the night lighting is brightened in
// config.js so the cars, road and action read clearly instead of
// muddy/dark.
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
  G.spawnPoliceBehind(8); // the eight-cruiser pack: chase + 3 head-on + 3 flank + 2nd chaser
  G.heli.active = true;
  G.heli.hover = 3; // body at y=11: the cone's apex (the heli) sat just
  // above the frame's top edge at hover 5 — the beam showed but the body
  // didn't. Hover 3 pulls the body + rotor into the frame; the cone
  // still reads long (11 m of beam over the road).
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
  G.hud.log('Night chase — eight units on you, heli overhead, roadblock ahead.');
  G.hud.notify('WANTED LEVEL UP', '5 stars — the whole LCPD is on you', 'danger', true);
  G.hud.notify('ROADBLOCK AHEAD', 'Ram it or dodge — 24m', 'danger', true);
  G.hud.notify('NOS READY', 'Tank full — hold Shift to burn', 'good', true);
  G.addAlert('info', 'VEHICLE STOLEN: VELOZ COMET RS');
  // WIDER rear 3/4 chase cam (BRISA BAY framing): dist 9 kept the hero
  // at ~50% of the frame, cropped at the bottom, with the pack squeezed
  // to partial cars at the edges and no sky for the heli. At dist 12 /
  // height 4 the hero reads ~30%, the flankers + head-on pair + roadblock
  // fit around it, and the sky opens up at the top of the frame. The
  // side offset (-0.5) still shows the hero's flank + driver.
  G.camYaw = Math.PI / 2 - 0.5;
  G.setCamDist(12);
  G.setCamHeight(4.0);
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
// r12 revision (BRISA BAY: crowded + clear): the cordon grows — TWO parked
// police cruisers flank it (light bars glowing, facing the lens) and four
// more officers widen it east and west so the shootout reads CROWDED, not
// a lone duel. Muzzle flashes shrink (4.0→2.4, 3.6→2.0) so they read as
// flashes, not one giant white blob. The camera pulls closer (11→9.5) so
// Mara reads BIG, the heli drops to hover 2 so its body sits IN the frame
// over the cordon (at hover 5 it flew above the top edge with this
// down-pitched camera; at hover 0 the cone shrank to a stub), and the
// night lighting is brightened in config.js.
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
  // west camera instead of hiding behind the Comet's flank. Two extra
  // groups widen the cordon east and west so the frame reads CROWDED.
  G.spawnEnemiesAt(-177, -136, 3, 'police');
  G.spawnEnemiesAt(-174, -134, 2, 'police');
  G.spawnEnemiesAt(-180, -132, 2, 'police');
  G.spawnEnemiesAt(-168, -134, 2, 'police');
  G.spawnEnemiesAt(-166, -130, 2, 'police');
  G.spawnEnemiesAt(-186, -136, 2, 'police');
  G.spawnEnemiesAt(-164, -132, 2, 'police');
  // TWO parked cruisers flanking the cordon — static props (not in the
  // police array, so updatePolice never drives them off), light bars
  // glowing, angled toward the lens. They make the cordon read as a real
  // police presence, not just officers on foot. Placed at the cordon ENDS,
  // close to the camera: at the old spots (-172/-186, -128/-130) they sat
  // 22–29 m out at the building base and vanished into the dark.
  G.parkPoliceCar(-170, -133, -2.4);
  G.parkPoliceCar(-190, -136, 2.4);
  // Muzzle flashes: Mara's gun + the cordon's guns, persistent in the still.
  // SMALLER than r12 (2.4/2.0): a flash, not a white blob.
  G.addMuzzleFlash(-180.5, 1.4, -142.5, 2.4);
  G.addMuzzleFlash(-177, 1.4, -135.5, 2.0);
  G.addMuzzleFlash(-174.5, 1.4, -133.5, 2.0);
  G.addMuzzleFlash(-179.5, 1.4, -131.5, 1.8);
  G.addMuzzleFlash(-175.5, 1.4, -134.5, 1.8);
  // Cash flying in the air around the shootout + a spill by the car door.
  G.spawnCashBurst(-178, -138);
  G.spawnLootPile(-179, -146);
  // Heli overhead with its spotlight cone on the road (angle pinned by the
  // autopilot so the cone stays in frame over the cordon). Hover 2 (body
  // at y=10, ~12° elevation over the cordon): at hover 5 the body sat at
  // ~19° elevation, right on the frame's top edge with this down-pitched
  // camera, and never appeared; at hover 0 the cone shrank to a 7 m stub
  // (the cone hangs 26 m below the heli) and the body sat too low.
  G.heli.active = true;
  G.heli.hover = 2;
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
  // CLOSER elevated side view: camera NORTH-WEST of Mara on the ROAD
  // (camYaw 0.6), 9.5 out, 4.6 high, pitched down — Mara reads BIG in
  // frame, the high angle still sees OVER the Comet's flank to the cordon
  // behind it, and the two cordon cruisers + widened cordon fill the frame.
  G.camYaw = 0.6;
  G.setCamDist(9.5);
  G.setCamHeight(4.6);
  G.camPitch = -0.30;
}
// FULL CITY MAP of Puerto Lumen (21:40) — the finale's escape plan, not a
// 3D scene. Sand rejected the vault interior (sparse brown/orange, gold
// read as debris, figures tiny) and ordered a full denah map kota like the
// top entries' big detailed minimaps, full-screen. The map is the game's
// OWN minimap data (hud.js drawFullMap: districts, streets, landmarks,
// route, blips) rendered on a full-screen canvas with the HUD panels
// floating on top — mission panel, LCPD response, wanted stars, cash,
// weapon slots, toasts, dialogue, speed. The 3D scene still runs behind
// the opaque map canvas; the staging below only sets the GAME STATE the
// map reads: Mara at the Torre Lumen vault, mission 15 advanced to the
// escape stage (vault cracked, drive to Playa Dorada), 5 stars, $48,500.
// The escape route on the map runs vault → Marina Road → Ocean Boulevard
// → Playa Dorada boat. No vault room, no loot piles, no muzzle flashes:
// the map IS the shot.
export function stageShot3(G) {
  G.setLighting('interior'); // 21:40 — also stamps the HUD clock
  G.noBeacon = true; // no 3D beacon pillar behind the map
  G.mapMode = true; // hud.js draws the full-screen city map this shot
  document.body.classList.add('map-mode'); // hide corner minimap + turf row
  G.startPlay();
  G.warpTo(60, -150); // Mara on foot AT the Torre Lumen vault
  G.player.heading = Math.PI;
  G.player.mesh.group.rotation.y = Math.PI;
  G.player.weapon = 'smg';
  G.missions.startMission(14); // El Puerto Es Nuestro finale
  G.clearEnemies(); // the tower squad stays OUT of the map still
  G.setWanted(5); // finale heat, pinned AFTER startMission
  // Advance the finale to its escape stage: vault guards beaten, vault
  // cracked, NOW drive to Playa Dorada — so the mission panel reads
  // STAGE 3/3 with the escape as NEXT, and the map's mission target sits
  // on the Playa Dorada boat. (completeStage only advances the stage
  // index; no cash or rep is awarded by staging.)
  G.missions.completeStage();
  G.missions.completeStage();
  G.setDialogue('MARA', "Vault's cracked — $48,500. Map's open: gold line to the boat at Playa Dorada. Five stars, so we run it clean.");
  G.hud.log('MARA: "Vault\'s cracked — $48,500. Map\'s open."');
  G.hud.log('Escape route set — Torre Lumen vault to the Playa Dorada boat.');
  G.hud.notify('VAULT CRACKED', 'Torre Lumen vault — $48,500 in gold and cash', 'good', true);
  G.hud.notify('WANTED LEVEL UP', '5 stars — the whole LCPD is on you', 'danger', true);
  G.hud.notify('ESCAPE ROUTE SET', 'Gold line to Playa Dorada — boat\'s waiting', 'good', true);
  G.state.cash = 48500;
  G.state.health = 82;
  G.state.armour = 45;
  // No camera framing: the map canvas covers the screen. The camera keeps
  // its default framing behind the map; nothing in the 3D scene is visible.
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
  G.clearTrafficNear(-158, 230, 30); // no stray car may cross the duel
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
  // Pier shootout (shotMode 2, on foot): pin the heli north-east of the
  // player, over the cordon, so its body + spotlight cone stay in frame —
  // at the old PI/2 (dead north of Mara) the body never appeared in any
  // take. PI/4 puts it at the cordon's depth, in front of the building,
  // ~11° off the camera axis.
  if (G.shotMode === 2 && G.heli) G.heli.angle = Math.PI / 4;
  // Shot 3 is the FULL CITY MAP: Mara is on foot at the vault and the four
  // LCPD cruisers updateWanted spawns would drive straight to her and
  // BUST the run mid-still (no vault walls any more). Pin them at fixed
  // map spots instead — they read as converging blips on the map and can
  // never reach her. The heli keeps circling overhead (its blip orbits).
  if (G.shotMode === 3) {
    const spots = [[-30, -180], [150, -120], [30, 30], [-60, -60]];
    (G.police || []).forEach((c, i) => {
      const [x, z] = spots[i % spots.length];
      c.x = x; c.z = z; c.speed = 0;
      c.mesh.group.position.set(x, 0, z);
      c.mesh.group.rotation.y = c.heading;
    });
    return;
  }
  if (!G.player.inCar || !G.player.car) return;
  if (G.shotMode === 1) {
    // Cover chase: pin the speed high so the speedo reads big all the time,
    // keep the roadblock parked 22 units ahead of the hero car so it stays
    // in frame, keep the EIGHT cruisers pinned in their slots, and keep the
    // helicopter ahead-right in frame, circling over the chase. Heli angle
    // +0.5 puts it AHEAD-SOUTH over the beach (open sky, +z is south):
    // -0.8 was tried and put it ahead-NORTH behind the tall building,
    // invisible in the take. Body lands upper-centre with its cone down
    // onto the road.
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
    // The eight-cruiser pack, pinned every frame to its staging slot:
    // chase tight behind on the camera side, second chaser behind far side,
    // three head-on ahead (left, right, centre charger), three flankers at
    // the hero's sides (two ahead, one close on the far side).
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
    // Flank trio: one per side ahead, plus a close one on the far side.
    const flank = (G.police || []).filter((c) => c.kind === 'flank');
    const flankSlots = [[8, -7], [8, 7], [2, 8.5]];
    flank.forEach((c, i) => {
      const [back, lat] = flankSlots[i] || flankSlots[0];
      c.x = G.player.x + fx * back + rx * lat;
      c.z = G.player.z + fz * back + rz * lat;
      c.heading = G.player.car.heading;
      c.speed = 34;
      c.mesh.group.position.set(c.x, 0, c.z);
      c.mesh.group.rotation.y = c.heading;
    });
    // Head-on trio: two cruisers, one per side, plus a centre charger
    // straight down the middle at 20 m.
    const headon = (G.police || []).filter((c) => c.kind === 'headon');
    const headonSlots = [[13, -4.5], [16, 4.5], [20, 0]];
    headon.forEach((c, i) => {
      const [ahead, lat] = headonSlots[i] || headonSlots[0];
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
