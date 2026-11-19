// LUMEN BAY r11 — the screenshot scenes behind ?shot=1..4. r11 fixes the
// four r10 defects Sand called out ("Benerin bro koreksi msh ada waktu kan"):
// shot 4's hero car is BIG and close now (camera 26 out, not 40; car on a
// palm-gap axis at x=-157), the boat is bigger and closer to shore, the dawn
// sun is smaller and warmer; shot 3's vault walls are 13 high so the HOTEL
// LUMEN sign and the rooftop cruiser are hidden behind them, with more loot
// and figures filling the floor; shot 2's hero car is fully in frame (wider
// camera, car nudged west), muzzle flashes are bigger, puddles read as wet;
// shot 1's heli rotor is thin translucent crossed blades and the chase
// cruiser peeks out beside the hero. Times / weather / camera angles are
// UNCHANGED from r10 — same four different situations.
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
  G.warpTo(-177.5, -144); // r11: was -176 — the car cropped off the left
  // edge; 1.5 west + the wider camera below pull it fully in frame
  G.player.car.heading = 0;
  G.exitCar(); // Mara steps out 3 units east of the car, behind its door
  G.warpTo(-183, -144); // r11: was -181 — at 3.5 from the car the "Press E to
  // enter" prompt showed (interact range is 4.5); at 5.5 it stays off, so
  // the frame has no prompt bar. Mara is still west of the car, in front
  // of it from the west-side camera, firing south past it
  G.player.heading = 0;
  G.player.mesh.group.rotation.y = 0;
  G.player.weapon = 'smg';
  // Police cordon closing in ahead (south), tight and close, firing back.
  G.spawnEnemiesAt(-177, -136, 3, 'police');
  G.spawnEnemiesAt(-174, -134, 2, 'police');
  G.spawnEnemiesAt(-180, -132, 2, 'police');
  // Muzzle flashes: Mara's gun + the cordon's guns, persistent in the still.
  // r11: scale 3.6–4.0 (was 2.2) — the r10 flashes were too small to read
  // at night; Mara's is the biggest, right at her gun on the camera side.
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
  // NIGHT street dressing: two LIT lamps down the road ahead (warm glows
  // at the real lamp posts), a warm pool of light over Mara so she reads
  // against the dark road, rain puddles on the road catching the light,
  // dockworkers scattering further down the pier.
  // r11: puddles BIGGER and MORE, with a long wet strip down the road under
  // the heli cone — the r10 puddles (3x1.5, faint) read as subtle dark
  // patches, not a wet street. Emissive is brighter too (see main.js).
  G.addLampGlow(-180, -113);
  G.addLampGlow(-180, -53);
  G.addPointLight(-177, 5, -141, 0xffb347, 150, 18); // r11: was 200 — the
  // pool light washed the road tan and drowned the puddles; 150 keeps Mara
  // readable while the wet dark + puddle reflections read.
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
  G.hud.notify('SMG READY', '30/120 — hold click to spray', 'good', true);
  G.state.cash = 21700;
  G.state.health = 82;
  G.state.armour = 45;
  // LOW ground-level SIDE view: camera NORTH-WEST of Mara on the ROAD
  // (camYaw 0.6), 10.5 out, 1.6 high — r11: was 0.5 / 9.0, which cropped the
  // hero car off the left edge; the wider, slightly swung camera pulls the
  // whole car in frame with Mara, the cordon and the heli cone.
  G.camYaw = 0.6;
  G.setCamDist(10.5);
  G.setCamHeight(1.6);
  G.camPitch = -0.1;
}
// r10 — VAULT INTERIOR heist at Torre Lumen (21:40, warm vault light,
// dust in the beams, NO weather, NO sky). INSIDE the vault: gold bars +
// cash piles, guards down, Mara + an ally inside, the round gold vault
// door blown open on the north wall (r11: the lit VAULT sign above it is
// gone — it collided with the DOM WANTED stars). This
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
  // The loot: FIVE gold/cash piles now (was three) + cash frozen mid-air
  // over the floor — r11: the big empty brown floor read as dead space.
  G.spawnLootPile(55, -148);
  G.spawnLootPile(65, -152);
  G.spawnLootPile(60, -145.5);
  G.spawnLootPile(57, -151);
  G.spawnLootPile(63, -149.5);
  G.spawnCashBurst(60, -148);
  // Guards down on the vault floor + TWO allies covering the door (was one).
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
  // ~13 high — r11: was 13 / 16; the closer camera makes the figures and
  // loot bigger so the floor reads full, not empty. The 13-high walls (see
  // main.js spawnVaultRoom) now hide the HOTEL LUMEN sign and the rooftop
  // cruiser that showed over the old 8-high walls, and the VAULT sign plane
  // is gone — it sat under the DOM WANTED stars, a text-on-text collision.
  G.camYaw = Math.PI;
  G.setCamDist(11);
  G.setCamHeight(13);
  G.camPitch = 0.25;
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
  // r11 — THE FIX. r10 parked the car at (-157, 222) with the camera 40 out:
  // the hero was ~60 px and the z=190 palm row put a palm at (-158, 190)
  // dead on the camera-car axis, its fronds covering the car. Now the car
  // sits at (-157, 228) on the PALM-GAP axis (palms at z=190 stand at
  // x=-158/-143, so x=-157 threads between them; both palm rows are BEHIND
  // the new closer camera) and the camera is 26 out, 10 high — the hero
  // fills ~25–30% of the frame, big and close, mid-ground. Umbrella columns
  // at z=224 stand at x=-164/-150, flanking the car, never on its axis.
  // r11 take 2 — SIDE-ON and TIGHTER. Take 1 (camera 26 out, car facing
  // south) still left the hero ~45 px: from directly behind, only the car's
  // 2.8-unit width faces the lens. Now the car faces WEST (nose toward the
  // boat) and the camera sits 15 out at a 0.3 yaw — the 6.6-unit flank faces
  // the lens and fills ~25% of the frame. The umbrella row at z=224
  // flanks the axis (columns -164/-150, axis threads -159), framing rather
  // than covering the car.
  G.warpTo(-157, 228); // on the south sand at the water's edge — on the
  // palm-gap axis, clear of the umbrella lines
  G.player.car.heading = -Math.PI / 2; // nose WEST, toward the boat
  G.player.car.speed = 0;
  G.holdStill = true;
  for (let i = 0; i < 12; i += 1) G.turf.owners[i] = 'crew';
  G.state.cash = 21400;
  G.missions.missionIdx = 15;
  G.missions.active = false;
  G.missions.objective = 'Story complete — Puerto Lumen is yours. Free roam!';
  // The getaway boat, moored just off the beach WEST of the car (screen
  // right when facing south, clear of the MISSION PASSED banner) — r11:
  // was (-175, 244) at 2.0×, a sliver at the horizon; now (-172, 242) at
  // 2.2×, ~14 units off the shore, big enough to read as the escape boat.
  // Morning mist over the sea, kept SMALL and OFF the boat (the first
  // takes' radius-70–110 mist blobs sat on the boat and washed it out).
  // take 5: (-166, 242) (was -172) — the 1.8× boat fit in frame but its
  // stern hid behind the right toast stack; 6 east puts ~260 px of hull
  // clear of the toasts, still just off the shore by the car.
  G.spawnBoat(-166, 242, Math.PI / 2, 1.8);
  G.spawnMist(-230, 258, 35);
  G.spawnMist(-120, 260, 35);
  G.spawnMist(-140, 278, 30);
  // The crew standing by the car, facing the boat and the sunrise.
  G.spawnAlly(-154, 231, -Math.PI / 2);
  G.spawnAlly(-160, 231, -Math.PI / 2);
  G.spawnPedsNear(-168, 214, 6); // beachgoers at dawn (r11: moved south of
  // the new closer camera so nobody spawns on the lens)
  G.clearTrafficNear(-157, 228, 30); // no stray car may overlap the hero
  G.setDialogue('TIO REYES', 'Dawn breaks over the marina, Mara. The boat\'s waiting — Puerto Lumen is ours.');
  G.hud.showBanner('MISSION PASSED', '+$8,000  ·  +500 REP  ·  UNLOCKED: PIER SAFEHOUSE', 600000);
  G.hud.notify('MISSION PASSED', 'El Puerto Es Nuestro  +$8,000', 'good', true);
  G.hud.notify('UNLOCKED: PIER SAFEHOUSE', 'New safehouse on the marina pier', 'good', true);
  G.hud.notify('STORY 15/15 — SAVE SLOT 1', '100% COMPLETE — Puerto Lumen is yours', 'good', true);
  G.hud.log('MISSION PASSED: El Puerto Es Nuestro — +$8,000  ·  +500 REP');
  G.hud.log('STORY 15/15 — SAVE SLOT 1  100% COMPLETE.');
  // HIGH wide establishing: camera north of the car on the beach, 18 out,
  // ~11 high — r11 take 3: take 2 (15 out / 6 high) made the hero big but
  // the LOW camera put the near umbrella row (z=224, 10 away, tops above the
  // boat in frame) over the boat and hid the sea. At 11 high the sightline
  // to the boat (20° down) clears the umbrella tops (27° down), so the boat
  // reads above them and the sea + sunrise stay in frame. The hero's flank
  // is still ~20% of the frame — big, close, mid-ground. The palm rows
  // (z=170/190) are BEHIND the camera (z≈211), and the camera threads the
  // palm gap at x=-157, so no frond can cover the car.
  // take 4: camYaw 0.2 (was 0.3) — swings the frame ~6° west so the boat
  // centres better and the distant road strip at the far-left horizon
  // mostly leaves the frame.
  G.camYaw = 0.2;
  G.setCamDist(18);
  G.setCamHeight(11);
  G.camPitch = 0.1;
  G.anchor = [-157, 228];
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
    // r11 TIGHTER chase: the cruiser sits closer behind the hero (back 2.2,
    // lat -4.8 instead of 1.8/-3.0) — pushed to the CAMERA side so it peeks
    // out beside the hero instead of hiding directly astern behind it.
    // (r10's 1.8/-3.0 put it dead astern: the hero's body covered it and
    // only the LCPD list said a cruiser was 3 m back.)
    const chase = (G.police || []).filter((c) => c.kind === 'chase');
    chase.forEach((c) => {
      c.x = G.player.x - fx * 2.2 + rx * -4.8;
      c.z = G.player.z - fz * 2.2 + rz * -4.8;
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
