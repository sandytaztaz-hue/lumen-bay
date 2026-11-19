// LUMEN BAY r10 — the screenshot scenes behind ?shot=1..4. r10: every shot
// is a DIFFERENT situation — different time, different weather, different
// camera angle — like the top entries. Shot 1 is the GOLDEN-HOUR sunset
// chase (18:45, warm haze, low orange sun ahead, LOW rear 3/4 chase cam).
// Shot 2 is the NIGHT pier shootout (23:20, wet street, neon + lamp glow,
// LOW ground-level side view over Mara's shoulder). Shot 3 is the VAULT
// INTERIOR heist (21:40, warm vault light, dust in the beams, HIGH wide
// camera looking down into the room). Shot 4 is the DAWN marina escape
// (06:10, mist over the water, sunrise, HIGH wide establishing shot).
// All dialogue boxes show drawn character portraits (see hud.js), never
// letter circles. Lighting per shot comes from config.js LIGHTING_PRESETS
// via G.setLighting(), which also stamps the HUD clock to that shot's time.
// real gameplay state (not a mock): the world runs its normal loop from there,
// the autopilot just holds the pose, and main.js sets window.__shotReady once
// the scene has rendered. Shot 1 is the cover: GOLDEN-HOUR beach-avenue chase
// under a LOW orange sun — big red Comet RS with clearcoat paint, NOS burning,
// THREE cruisers close behind with flashing light bars, heli overhead with a
// visible searchlight cone, roadblock ahead, dust puffs, full dense HUD: mission
// panel + alerts, WANTED 4 stars, big green cash, police response list,
// notification toasts, weapon slots, IN SIGHT banner, RESPECT bar, search-zone
// minimap, dialogue, big speed. Shots 2–4 are the feed thumbnails: night
// shootout, vault interior, dawn MISSION PASSED + story progress.
import { ROB_TARGETS } from './config.js';

// Cover: GOLDEN-HOUR sunset chase. Red Comet RS LARGE in frame, NOS burning,
// 3 cruisers close behind, heli overhead, roadblock ahead, Street King race
// live, toasts up, 4 stars. CLEAR golden hour, warm haze, LONG shadows from
// the low sun ahead-east — the sun disc sits low over the road's vanishing
// point (preset 'sunset', clock 18:45), NOT the high white midday disc.
export function stageShot1(G) {
  G.setLighting('sunset'); // 18:45 — also stamps the HUD clock
  G.startPlay();
  G.enterCar(G.parked[0]);
  G.warpTo(-150, 180); // Playa Drive, heading east along the beach, into the low sun
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
  G.hud.log('Golden hour — sunset chase down Playa Drive, lose them before dark.');
  G.hud.notify('WANTED LEVEL UP', '4 stars — LCPD is all over you', 'danger', true);
  G.hud.notify('ROADBLOCK AHEAD', 'Ram it or dodge — 24m', 'danger', true);
  G.hud.notify('NOS READY', 'Tank full — hold Shift to burn', 'good', true);
  G.addAlert('info', 'VEHICLE STOLEN: VELOZ COMET RS');
  // LOW rear 3/4 chase cam (Sand's angle table: sunset = low rear chase):
  // a stronger side offset (-0.5) shows the hero's flank + driver and puts
  // the far-side chase fan at ~the hero's distance from the lens, so the
  // cruisers match its scale instead of looming over it.
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
// r10 — NIGHT PIER SHOOTOUT at the marina (23:20, recent rain, wet
// street, neon glow, lamp-lit). Mara on foot, firing from behind the hero
// Comet RS's door, a police cordon closing in ahead, the heli spotlight
// cone overhead, muzzle flashes everywhere, cash flying in the air, $21,700
// on the line. NOTHING like shot 1: dark blue starry sky, no sun disc, cool
// moonlight, warm lamp glows, rain puddles catching the light.
// CAMERA (Sand's angle table: night = low ground side): LOW ground-level
// SIDE view from the WEST — the camera sits on the west sidewalk at
// ground level (height 1.2), looking east at Mara's left profile with the
// hero car SIDE-ON behind her. GEOMETRY (fixed after the first take, which
// cropped the car off the left edge and lost Mara in the dark): Mara stands
// WEST of the car, on the road's west edge — so from the west camera she is
// in front, the car reads side-on directly behind her as cover, and the
// cordon stands ahead-south (screen-right) with its muzzle flashes. A warm
// point light hangs over Mara so she reads against the dark road.
export function stageShot2(G) {
  G.setLighting('night'); // 23:20 — also stamps the HUD clock
  G.startPlay();
  G.enterCar(G.parked[0]); // hot pink-red Comet RS, the hero car
  G.warpTo(-176, -144); // marina road, facing south toward the beach
  G.player.car.heading = 0;
  G.exitCar(); // Mara steps out 3 units east of the car, behind its door
  G.warpTo(-181, -144); // 5 WEST of the car, on the road's west edge — in
  // front of the car from the west-side camera, firing south past it
  G.player.heading = 0;
  G.player.mesh.group.rotation.y = 0;
  G.player.weapon = 'smg';
  // Police cordon closing in ahead (south), tight and close, firing back.
  G.spawnEnemiesAt(-177, -136, 3, 'police');
  G.spawnEnemiesAt(-174, -134, 2, 'police');
  G.spawnEnemiesAt(-180, -132, 2, 'police');
  // Muzzle flashes: Mara's gun + the cordon's guns, persistent in the still.
  G.addMuzzleFlash(-180.5, 1.4, -142.5);
  G.addMuzzleFlash(-177, 1.4, -135.5);
  G.addMuzzleFlash(-174.5, 1.4, -133.5);
  G.addMuzzleFlash(-179.5, 1.4, -131.5);
  // Cash flying in the air around the shootout + a spill by the car door.
  G.spawnCashBurst(-178, -138);
  G.spawnLootPile(-179, -146);
  // Heli overhead with its spotlight cone on the road (angle pinned by the
  // autopilot so the cone stays in frame over the cordon).
  G.heli.active = true;
  G.heli.hover = 10;
  // NIGHT street dressing: two LIT lamps down the road ahead (warm glows
  // at the real lamp posts), a warm pool of light over Mara so she reads
  // against the dark road, rain puddles on the road catching the light,
  // dockworkers scattering further down the pier.
  G.addLampGlow(-180, -113);
  G.addLampGlow(-180, -53);
  G.addPointLight(-177, 5, -141, 0xffb347, 200, 18);
  G.spawnPuddle(-178, -132, 3, 1.5);
  G.spawnPuddle(-174, -128, 3, 1.5);
  G.spawnPuddle(-182, -136, 2.5, 1.5);
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
  G.hud.notify('SMG READY', '30/120 — hold click to spray', 'good', true);
  G.state.cash = 21700;
  G.state.health = 82;
  G.state.armour = 45;
  // LOW ground-level SIDE view: camera NORTH-WEST of Mara on the ROAD
  // (camYaw 0.5), 9 out, 1.2 high — a low 3/4 over her shoulder: Mara's
  // profile fills the foreground, the hero car reads SIDE-ON behind her,
  // the cordon + heli cone ahead-south. (First take used due-west: the
  // camera sat over the sand strip, so a bright tan expanse filled the
  // bottom 2/3 and the heli fell out of frame. The 0.3 take fixed the
  // foreground but cropped the car off the left edge and left an empty
  // road — 0.5 is the framing that works, and Mara + car have moved 2 EAST
  // so this camera now sits on the dark asphalt instead of the pale
  // sidewalk, with the warm pool light dimmed to 200/18.)
  G.camYaw = 0.5;
  G.setCamDist(9);
  G.setCamHeight(1.6);
  G.camPitch = -0.1;
}
// r10 — VAULT INTERIOR heist at Torre Lumen (21:40, warm vault light,
// dust in the beams, NO weather, NO sky). INSIDE the vault: gold bars +
// cash piles, guards down, Mara + an ally inside, the round gold vault
// door blown open on the north wall with a lit VAULT sign above it. This
// brings in r9a's best idea, but as a real interior set — not a street
// scene, not the festival. The sky dome is HIDDEN for this shot (preset
// 'interior'); the room is a staged set in the world with its south side
// open as a cutaway.
// CAMERA (Sand's angle table: vault = high wide): HIGH wide looking DOWN
// into the room from the south — camera 13 out, ~17 high, steep down-angle,
// the whole vault floor in frame with the door + sign on the far wall.
// The mission's live tower squad is cleared silently (G.clearEnemies) so
// no guard walks in shooting during the still; the beacon pillar is
// suppressed (it would poke through the north wall).
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
  // The loot: three gold/cash piles + cash frozen mid-air over the floor.
  G.spawnLootPile(55, -148);
  G.spawnLootPile(65, -152);
  G.spawnLootPile(60, -145.5);
  G.spawnCashBurst(60, -148);
  // Guards down on the vault floor + an ally covering the door.
  G.spawnDowned(54, -147, 'shark');
  G.spawnDowned(66, -153, 'shark');
  G.spawnAlly(64, -147, Math.PI);
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
  // HIGH wide looking down into the room: camera south of Mara, 13 out,
  // ~17 high — the whole 26x20 vault floor in frame, door + VAULT sign on
  // the far (north) wall, tower looming behind it.
  G.camYaw = Math.PI;
  G.setCamDist(13);
  G.setCamHeight(16);
  G.camPitch = 0.2;
}
// r10 — DAWN MARINA ESCAPE / MISSION PASSED on the south beach (06:10,
// morning mist over the water, pink-orange sunrise low over the sea). The
// hero car parked on the sand at the water's edge, the speedboat moored
// just off it, Mara's crew standing by the car, MISSION PASSED banner
// (+$8,000 · +500 REP · UNLOCKED: PIER SAFEHOUSE) and the story-progress
// line (STORY 15/15, SAVE SLOT 1). Different time (dawn) AND place (water /
// beach) AND weather (mist) from all others — and a different angle again.
// STAGING NOTE: the escape is on Playa Dorada's south sand, NOT the west
// marina road — the marina's western block fills any west-looking frame
// with a solid building facade (the first take proved it: a purple wall
// across the whole image, no car, no boat, no sun). The south beach is the
// city's one open sea horizon, and the boat + pier-safehouse story is the
// same; the dialogue still says the marina.
// CAMERA (Sand's angle table: dawn = high wide marina): HIGH wide
// ESTABLISHING shot — camera 40 out, ~13 high, a shallow wide angle (not
// the vault's steep down-shot): car + boat + mist + sunrise + sea all in
// one frame, the sun low ahead-south over the water. The car is parked
// (G.holdStill) and anchored, so the slow settle can never drift the frame.
export function stageShot4(G) {
  G.setLighting('dawn'); // 06:10 — also stamps the HUD clock
  G.spawnSandPatch(); // the dawn beach, deterministically tan (see main.js)
  G.startPlay();
  G.enterCar(G.parked[0]);
  G.warpTo(-157, 222); // on the south sand at the water's edge, facing the
  // sea (south) — 32 south of the palm row (z=190) and clear of the
  // umbrella lines (x=-164/-150), so nothing stands between the camera
  // and the car; the camera sits on the sand north of the umbrellas
  G.player.car.heading = 0;
  G.player.car.speed = 0;
  G.holdStill = true;
  for (let i = 0; i < 12; i += 1) G.turf.owners[i] = 'crew';
  G.state.cash = 21400;
  G.missions.missionIdx = 15;
  G.missions.active = false;
  G.missions.objective = 'Story complete — Puerto Lumen is yours. Free roam!';
  // The getaway boat, moored just off the beach 40 WEST of the car — off
  // the frame's centre, so the MISSION PASSED banner never covers it —
  // + morning mist over the sea, kept SMALL and OFF the boat (the first
  // takes' radius-70–110 mist blobs sat on the boat and washed it out —
  // the boat is inside any mist sphere whose centre is within its radius).
  // The boat is moored SIDE-ON (heading PI/2, bow east) at 2× scale: the
  // live-camera probe put the 1.5× boat at screen x 777–856, y 321 — a
  // 79×15px white sliver on the green sea that read as a road marking.
  // At 2× and 59 units it spans ~220px and reads as a real boat.
  G.spawnBoat(-175, 244, Math.PI / 2, 2.0);
  G.spawnMist(-230, 258, 35);
  G.spawnMist(-120, 260, 35);
  G.spawnMist(-150, 278, 30);
  // The crew standing by the car, facing the boat and the sunrise.
  G.spawnAlly(-154, 218, 0);
  G.spawnAlly(-160, 218, 0);
  G.spawnPedsNear(-170, 200, 6); // beachgoers at dawn
  G.clearTrafficNear(-157, 222, 30); // no stray car may overlap the hero
  G.setDialogue('TIO REYES', 'Dawn breaks over the marina, Mara. The boat\'s waiting — Puerto Lumen is ours.');
  G.hud.showBanner('MISSION PASSED', '+$8,000  ·  +500 REP  ·  UNLOCKED: PIER SAFEHOUSE', 600000);
  G.hud.notify('MISSION PASSED', 'El Puerto Es Nuestro  +$8,000', 'good', true);
  G.hud.notify('UNLOCKED: PIER SAFEHOUSE', 'New safehouse on the marina pier', 'good', true);
  G.hud.notify('STORY 15/15 — SAVE SLOT 1', '100% COMPLETE — Puerto Lumen is yours', 'good', true);
  G.hud.log('MISSION PASSED: El Puerto Es Nuestro — +$8,000  ·  +500 REP');
  G.hud.log('STORY 15/15 — SAVE SLOT 1  100% COMPLETE.');
  // HIGH wide establishing: camera north of the car on the beach, 40 out,
  // ~14 high — a shallow wide angle with the horizon + sunrise in frame
  // (steepness ~17°, vs the vault's ~45° down-shot: a different angle, not
  // a repeat of shot 3's high wide). camYaw 0 = camera NORTH of the car
  // (tz = pz − dist), looking south at the car, the boat and the sunrise.
  // (First take used PI by mistake: the camera sat in the sea SOUTH of the
  // car looking north — city in frame, sun behind the camera, boat unseen.
  // The 34-out take rendered the beach GREEN: the sand plane sits only
  // 0.01 above the grass base, so at that camera's grazing angle the two
  // z-fight and the grass wins — 40 out / 14 high is the position that
  // rendered tan sand in two takes.)
  G.camYaw = 0;
  G.setCamDist(40);
  G.setCamHeight(14);
  G.camPitch = 0.2;
  G.anchor = [-157, 222];
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
    // r10 dawn marina: the hero car is PARKED at the pier (holdStill) — the
    // escape is staged, not cruising. (r9c drove it at 20 along the beach.)
    if (G.holdStill) { G.player.car.speed = 0; return; }
    // Beach cruise: steady easy speed along Playa Drive.
    G.player.car.speed = 20;
    return;
  }
  G.player.car.speed = Math.min(G.player.car.speed + 2 * dt, 30);
  G.player.car.heading += Math.sin(performance.now() * 0.0004) * 0.1 * dt;
}
