// LUMEN BAY r12 — the screenshot scenes behind ?shot=1..4. All dialogue
// boxes show drawn character portraits (see hud.js), never letter circles.
// Lighting per shot comes from config.js LIGHTING_PRESETS via G.setLighting(),
// which also stamps the HUD clock to that shot's time. These stage REAL
// gameplay state (not a mock): the world runs its normal loop from there,
// the autopilot just holds the pose, and main.js sets window.__shotReady
// once the scene has rendered.
//
// Shot 1 is the SUNSET beach-front chase (18:45) — the top-entry look Sand
// ordered, re-shot to his 22:15 orders: NO building in the frame (the chase
// runs on the open south beach, not walled-in Playa Drive), camera AHEAD of
// the hero so the FRONT of the Comet RS + the fronts of the eight cruisers
// face the lens (front-three-quarter, like top-10 el-net / top-1 madsrepo),
// heli a visible 3D model overhead, warm golden-hour light so the cars read
// stylized-real instead of flat toy. Shot 2 is the sunset beach shootout
// (18:45): Mara + a 12-officer cordon in a two-handed aiming stance, pistol
// out, muzzle flashes, no building anywhere in the frame.
// Shot 3 is the FULL CITY MAP of Puerto Lumen (21:40) — APPROVED by Sand,
// DO NOT TOUCH. Shot 4 is the dawn marina escape (06:10) — the boat now
// sits IN THE WATER, big and side-on, white hull + red stripe, warm dawn
// light + visible sea (the sea planes used to sit under the grass and never
// showed).
import { ROB_TARGETS } from './config.js';
import { poseAim } from './people.js';

// Cover: SUNSET beach-front chase. Hot pink-red Comet RS LARGE in frame,
// nose toward the lens, NOS burning, EIGHT cruisers behind it at staggered
// depths with flashing light bars and headlights ON, heli overhead with a
// visible body + searchlight cone, traffic + beachgoers down the beach,
// palms, the ferris wheel on the horizon, full dense HUD: mission panel +
// alerts, WANTED 5 stars, big green cash, police response list (eight units
// + AIR-1, capped display + footer), notification toasts, weapon slots,
// IN SIGHT banner, RESPECT bar, search-zone minimap, dispatch dialogue,
// big speed. Warm golden-hour light, long shadows, wet-looking sand.
// r12 shot-1/2/4 revision (Sand 22:15: REMOVE the building, camera faces
// FORWARD, fronts not rears; "bikin bagus, jangan terlalu kartun"):
// the chase moves OFF Playa Drive — the buildings sit centred ON the road
// grid, so at (-150,180) a 30 m tower face stood 17 m ahead of the hero
// and filled the frame. On the open south sand (z 198-240) there is no
// building for 100 m in any direction: beach left, palms + distant
// buildings far right, sea + sunset ahead. The camera sits AHEAD of the
// hero (camYaw -0.5, dist 11) looking back west at his front-three-quarter
// — the top-10 angle — and every cruiser faces east with him, so the lens
// sees eight grilles + light bars, not eight tailgates. No roadblock: one
// ahead of the hero would sit behind the lens.
export function stageShot1(G) {
  G.setLighting('sunset'); // 18:45 — also stamps the HUD clock
  G.spawnSandPatch(); // deterministic tan sand at a grazing camera angle
  G.startPlay();
  G.enterCar(G.parked[0]);
  G.warpTo(90, 215); // south beach, heading east along the Playa front
  G.player.car.heading = Math.PI / 2 - 0.2; // nose turned toward the lens
  G.player.car.mesh.group.rotation.y = Math.PI / 2 - 0.2;
  G.player.car.speed = 34;
  G.garage.nos = 120;
  G.nosBurning = true;
  G.setWanted(5);
  G.spawnPoliceBehind(8); // the eight-cruiser pack, all facing east
  G.heli.active = true;
  G.heli.hover = 3; // body at y=11: low enough to sit in the frame
  // NO searchlight cone in golden hour: the 26 m additive cone reads as a
  // giant white lampshade in daylight and swallows the sky + the heli.
  // The heli body + rotor + lamp carry it; the HUD keeps the SPOTLIGHT row.
  G.heli.cone.visible = false;
  G.heli.pool.visible = false;
  G.spawnTrafficNear(20, 215, 6); // traffic down the beach, in the background
  G.clearTrafficNear(90, 215, 30); // NO stray car may overlap the hero
  G.clearPedsNear(90, 215, 15); // clear the hero's foreground
  G.spawnPedsNear(55, 205, 10); // beachgoers down the beach, in frame
  // Warm bounce light over the hero so the pink-red paint + chrome glow.
  G.addPointLight(90, 6, 215, 0xffb347, 200, 26);
  G.missions.startMission(11); // Street King race is live: checkpoints on minimap
  G.missions.hudTimerText = '1:47';
  G.setDialogue('LCPD DISPATCH', 'All units — suspect eastbound on the Playa front, five stars. Air One overhead, eight units closing. Do not let her reach the pier.');
  G.hud.log('LCPD DISPATCH: "All units — suspect eastbound on the Playa front."');
  G.hud.log('NOS burning — hold Shift on the straight.');
  G.hud.log('Sunset chase — eight units on you, heli overhead, beach run.');
  G.hud.notify('WANTED LEVEL UP', '5 stars — the whole LCPD is on you', 'danger', true);
  G.hud.notify('AIR-1 OVERHEAD', 'Heli has the light — eight units closing', 'danger', true);
  G.hud.notify('NOS READY', 'Tank full — hold Shift to burn', 'good', true);
  G.addAlert('info', 'VEHICLE STOLEN: VELOZ COMET RS');
  // FRONT-three-quarter chase cam (top-10 el-net angle): the camera sits
  // AHEAD-EAST of the hero (camYaw -0.5), low (height 3.0), looking back
  // west at the hero's nose + north flank. At dist 9 the hero reads
  // ~30% of the frame, the cruiser pack stacks behind him down the beach,
  // and the sky opens up at the top of the frame for the heli.
  G.camYaw = -0.5;
  G.setCamDist(9);
  G.setCamHeight(3.2);
  G.camPitch = 0.1;
  G.state.cash = 18450;
  // Anchor: the chase autopilot holds speed 34, so without this the hero
  // drives hundreds of units during a slow SwiftShader settle and the
  // framing drifts. The anchor snaps it back every frame (staging hold).
  G.anchor = [90, 215];
}
// SUNSET BEACH SHOOTOUT on the south sand (18:45, golden hour, no rain).
// Mara on foot, BIG in frame, in a two-handed aiming stance with her pistol
// out in front and a muzzle flash at the barrel; a 12-officer police cordon
// closing in ahead-south-east, also aiming, with two parked cruisers
// flanking it (light bars glowing, fronts to the lens) and the heli
// overhead; cash flying in the air, $21,700 on the line. The camera sits
// NORTH-WEST of Mara looking SOUTH-EAST toward the sea: Mara faces the
// cordon (south-east), the cordon fills the centre of the frame facing the
// lens, the hero Comet sits at the left edge, and the background is open
// beach + sea + sunset sky — NO building anywhere in the frame. (v1 looked
// NORTH and the Playa Drive tower row filled the background; v2 looked WEST
// and the tower row's far end filled the centre — the row runs the whole
// beach, so only looking SOUTH toward the sea keeps it out of frame.)
// The duel sits at z=220, near the waterline: the beach umbrellas run in
// rows at z=204 and z=224, and a camera at z=206 sat 2 m from one — its
// canopy filled a quarter of the frame as a teal triangle. At z=220 the
// camera sits between the rows (10 m from each) and the umbrellas read as
// normal beach dressing.
// Mara + the officers are scaled up (1.3 / 1.15) so the shootout reads at
// a glance instead of as toy figures on a road.
export function stageShot2(G) {
  G.setLighting('sunset'); // 18:45 — also stamps the HUD clock
  G.spawnSandPatch(); // deterministic tan sand at a grazing camera angle
  G.startPlay();
  G.enterCar(G.parked[0]); // hot pink-red Comet RS, the hero car
  G.warpTo(66, 214); // park the Comet north-east of the duel, nose south-west
  G.player.car.heading = -0.785;
  G.player.car.mesh.group.rotation.y = -0.785;
  G.exitCar(); // Mara steps out by the car
  G.warpTo(60, 220); // Mara on foot on the sand, facing east in profile
  G.player.heading = Math.PI / 2;
  G.player.mesh.group.rotation.y = Math.PI / 2;
  G.player.mesh.group.scale.setScalar(1.3); // Mara reads BIG
  G.player.weapon = 'smg';
  poseAim(G.player.mesh.group); // two-handed aim, pistol out in front
  // Police cordon closing in ahead (south-east), tight and close, firing
  // back — four groups widening it north and south so the shootout reads
  // CROWDED, not a lone duel. All within 14 m of Mara so the sim holds
  // them in place (updateEnemy only advances officers further than 20 m
  // out) and they read LARGE from the 8 m camera. Every officer is posed
  // aiming and scaled up.
  const squad = [
    ...G.spawnEnemiesAt(70, 228, 4, 'police'),
    ...G.spawnEnemiesAt(72, 224, 3, 'police'),
    ...G.spawnEnemiesAt(68, 232, 3, 'police'),
    ...G.spawnEnemiesAt(74, 228, 2, 'police'),
  ];
  for (const e of squad) {
    poseAim(e.mesh);
    e.mesh.scale.setScalar(1.15);
  }
  // TWO parked cruisers flanking the cordon — static props (not in the
  // police array, so updatePolice never drives them off), light bars
  // glowing, fronts facing north-west toward Mara and the lens, at the
  // cordon's north and south ends.
  G.parkPoliceCar(76, 226, -Math.PI * 0.75);
  G.parkPoliceCar(62, 235, -Math.PI * 0.75);
  // Muzzle flashes: Mara's gun first (at her barrel tip, big enough to
  // read but not a beach ball — v1's scale 3.0 hid her whole arm) + the
  // cordon's guns, persistent in the still. Mara faces east in profile, so
  // her gun side is toward the north-west camera: the flash sits at her
  // barrel tip, clearly past her silhouette.
  G.addMuzzleFlash(61.5, 1.6, 219.4, 1.8);
  G.addMuzzleFlash(69, 1.4, 227, 1.4);
  G.addMuzzleFlash(71, 1.4, 223, 1.4);
  G.addMuzzleFlash(67, 1.4, 231, 1.4);
  G.addMuzzleFlash(73, 1.4, 227, 1.4);
  // Cash flying in the air between Mara and the cordon + a spill by her feet.
  G.spawnCashBurst(65, 224);
  G.spawnLootPile(63, 223);
  // Heli overhead with its spotlight cone on the cordon (angle pinned by
  // the autopilot so the cone stays in frame over the cordon). Hover 2
  // (body at y=10): low enough to sit in the frame with this low camera.
  // NO cone in golden hour (same as shot 1: it reads as a white lampshade).
  G.heli.active = true;
  G.heli.hover = 2;
  G.heli.cone.visible = false;
  G.heli.pool.visible = false;
  // Golden-hour dressing: a warm pool of light over Mara, another over the
  // cordon so the officers read, beachgoers scattering south by the water.
  G.addPointLight(55, 5, 220, 0xffb347, 150, 18);
  G.addPointLight(70, 5, 228, 0xffb347, 150, 18);
  G.spawnPedsNear(72, 236, 4); // beachgoers scattering south
  G.spawnPedsNear(78, 226, 3);
  G.clearTrafficNear(60, 220, 22); // no stray car may cross the duel
  G.missions.startMission(14); // El Puerto Es Nuestro finale
  G.setWanted(5); // finale heat, pinned AFTER startMission
  G.setDialogue('MARA', "Beach is hot — heli on us, cash in the air. Hold the door!");
  G.hud.log('MARA: "Beach is hot — heli on us, cash in the air."');
  G.hud.feed('Mara downed a police officer');
  G.hud.feed('Cash flying on the beach — $21,700');
  G.hud.notify('BEACH SHOOTOUT', 'LCPD cordon on the sand — hold the door', 'danger', true);
  G.hud.notify('WANTED LEVEL UP', '5 stars — the whole LCPD is on you', 'danger', true);
  G.state.cash = 21700;
  G.state.health = 100;
  G.state.armour = 100; // the cordon shoots back through the whole settle
  // LOW ground-level view from the NORTH-WEST, looking SOUTH-EAST toward
  // the sea: the camera sits 8 out, 2.8 high, at camYaw 0.785 — Mara faces
  // the cordon (south-east), the cordon fills the centre facing the lens
  // with its muzzle flashes, the Comet reads front-on at the left edge,
  // and the background is the sea + sunset sky. The Playa Drive towers sit
  // behind the camera. Mara reads BIG in frame.
  G.camYaw = 0.785;
  G.setCamDist(8);
  G.setCamHeight(2.8);
  G.camPitch = -0.05;
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
// APPROVED by Sand 2026-11-20 ~21:53 WIT — DO NOT TOUCH.
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
// r12 shot-1/2/4 revision (Sand: the boat reads small/ambiguous and the
// scene reads flat): the boat now sits IN THE WATER (z=249, past the sand
// edge at 240 — at z=232 it sat ON the sand and read as a flat red
// platform), BIG (3.4x, ~31 m long) and SIDE-ON to a LOW camera, so the
// white hull + red stripe + windshield + outboard read as a BOAT, not a
// deck. The sea is visible now (seaLevel raised above the grass plane,
// which used to hide it entirely), the dawn preset's sun is bigger and
// hotter, and a wet-sand strip marks the waterline. The car faces EAST
// (nose toward the boat) so the escape reads: car → boat → sea → sunrise.
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
  // The getaway boat, moored IN THE WATER east of the car (screen-right
  // when facing south) — 3.4x, side-on to the low camera, white hull + red
  // stripe + windshield + outboard motor. It sits close to the waterline
  // (z=244) and right of centre so it reads BELOW the MISSION PASSED
  // banner, not behind it.
  G.spawnBoat(-138, 244, Math.PI / 2, 3.4);
  // Morning mist over the sea, kept SMALL and OFF the boat.
  G.spawnMist(-230, 258, 35);
  G.spawnMist(-105, 272, 35);
  G.spawnMist(-165, 285, 30);
  // Wet-sand strip along the waterline (dark glossy band, above the sand
  // patch and the sea) so the shore reads as a shore, not a flat tan plane.
  const wet = G.spawnPuddle(-158, 240, 60, 6);
  wet.position.y = 0.09;
  // The crew standing by the car, facing the boat and the sunrise.
  G.spawnAlly(-155, 233, Math.PI / 2);
  G.spawnAlly(-161, 233, Math.PI / 2);
  G.spawnPedsNear(-150, 222, 4); // foreground beachgoers by the waterline
  G.spawnPedsNear(-166, 224, 3);
  G.clearTrafficNear(-158, 230, 30); // no stray car may cross the duel
  G.setDialogue('TIO REYES', 'Dawn breaks over the marina, Mara. The boat\'s waiting — Puerto Lumen is ours.');
  G.hud.showBanner('MISSION PASSED', '+$8,000  ·  +500 REP  ·  UNLOCKED: PIER SAFEHOUSE', 600000);
  G.hud.notify('MISSION PASSED', 'El Puerto Es Nuestro  +$8,000', 'good', true);
  G.hud.notify('STORY 15/15 — SAVE SLOT 1', '100% COMPLETE — Puerto Lumen is yours', 'good', true);
  G.hud.log('MISSION PASSED: El Puerto Es Nuestro — +$8,000  ·  +500 REP');
  G.hud.log('STORY 15/15 — SAVE SLOT 1  100% COMPLETE.');
  // LOW wide ESTABLISHING — camera north of the car on the beach, 14 out,
  // 6.5 high, pitched slightly up: the boat sits side-on and BIG in the
  // mid-frame below the banner, the sunrise glows low over the visible
  // sea behind it, the car + crew anchor the foreground. The car is parked
  // (G.holdStill) and anchored, so the slow settle can never drift the frame.
  G.camYaw = 0.2;
  G.setCamDist(14);
  G.setCamHeight(6.5);
  G.camPitch = 0.1;
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
  // Beach shootout (shotMode 2, on foot): pin the heli SOUTH-EAST of the
  // player, over the cordon, so its body stays in frame — the camera looks
  // south-east from the north-west side, so the cordon (south-east) is the
  // background and the heli belongs over it. The two parked cordon cruisers
  // are static; the four cruisers updateWanted spawns are PINNED at fixed
  // offsets south-east of Mara, facing north-west — otherwise they drive
  // straight at her and BUST the run mid-still (a cruiser within 2.5 m for
  // 2 s ends it).
  if (G.shotMode === 2) {
    if (G.heli) G.heli.angle = 0.8;
    const spots = [[14, 10], [10, 14], [17, 13], [12, 17]];
    (G.police || []).forEach((c, i) => {
      const [bx, bz] = spots[i % spots.length];
      c.x = G.player.x + bx; c.z = G.player.z + bz;
      c.heading = -Math.PI * 0.75; c.speed = 0;
      c.mesh.group.position.set(c.x, 0, c.z);
      c.mesh.group.rotation.y = c.heading;
    });
  }
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
    // keep the EIGHT cruisers pinned in their slots, and keep the helicopter
    // ahead-south-west in frame, circling over the chase. Heli angle 2.4
    // puts it SOUTH-WEST of the hero (over the beach, in the background the
    // front camera looks at): the old 0.5 put it EAST, behind the lens.
    // Body lands upper-left with its cone down onto the sand.
    G.player.car.speed = 34;
    G.player.car.heading += Math.sin(performance.now() * 0.0004) * 0.05 * dt;
    if (G.heli) { G.heli.angle = 2.4; }
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
    // The eight-cruiser pack, pinned every frame to its staging slot.
    // Convention (same as spawnPoliceBehind): back = metres BEHIND the
    // hero, lat = lateral (+ = north, camera side). Every cruiser faces
    // the hero's heading, so the front camera sees eight grilles +
    // light bars at staggered depths — a pursuit column, not a wall of
    // tailgates.
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
    pin('chase', 7, -6, G.player.car.heading, 34);
    pin('chase2', 11, 6, G.player.car.heading, 34);
    // Flank trio: staggered depths on both sides of the pursuit column.
    const flank = (G.police || []).filter((c) => c.kind === 'flank');
    const flankSlots = [[13, -10], [17, 10], [22, -3]];
    flank.forEach((c, i) => {
      const [back, lat] = flankSlots[i] || flankSlots[0];
      c.x = G.player.x - fx * back + rx * lat;
      c.z = G.player.z - fz * back + rz * lat;
      c.heading = G.player.car.heading;
      c.speed = 34;
      c.mesh.group.position.set(c.x, 0, c.z);
      c.mesh.group.rotation.y = c.heading;
    });
    // Closers: three more cruisers down the middle of the column, so the
    // pursuit reads eight deep instead of five + three stragglers.
    const headon = (G.police || []).filter((c) => c.kind === 'headon');
    const headonSlots = [[12, -3], [19, 5], [26, 1]];
    headon.forEach((c, i) => {
      const [back, lat] = headonSlots[i] || headonSlots[0];
      c.x = G.player.x - fx * back + rx * lat;
      c.z = G.player.z - fz * back + rz * lat;
      c.heading = G.player.car.heading;
      c.speed = 34;
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
