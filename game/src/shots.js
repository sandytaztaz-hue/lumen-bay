// LUMEN BAY r12 — the screenshot scenes behind ?shot=1..4. All dialogue
// boxes show drawn character portraits (see hud.js), never letter circles.
// Lighting per shot comes from config.js LIGHTING_PRESETS via G.setLighting(),
// which also stamps the HUD clock to that shot's time. These stage REAL
// gameplay state (not a mock): the world runs its normal loop from there,
// the autopilot just holds the pose, and main.js sets window.__shotReady
// once the scene has rendered.
//
// Shot 1 is the BRIGHT-NIGHT beach-front chase (22:40) — the top-1
// Karimbu composition, shot at NIGHT (Sand 2026-11-21 ~10:36 WIT:
// "malam hari terang", then ~10:39: "buat kaya rank 1 harus 99% mirip
// dan 3D jelas"): LOW camera AHEAD of the hero, so the FRONT of the
// Comet RS + the fronts of the eight cruisers face the lens (front
// three-quarter, hero driving TOWARD the camera down a palm boulevard),
// the road vanishing to the horizon BEHIND the car, white police
// cruisers on the road around/behind the hero, heli ahead/above with a
// clear spotlight beam slanting down onto the hero, palms lining both
// sides, beach + sea on one side, buildings on the other, dense HUD.
// Night but BRIGHT: dark night sky + bright street lamps + lit windows
// + bright road + strong heli beam + red/blue siren glow, so the scene
// reads clearly, never pitch black. Shot 2 is the same bright night on
// the street shootout (23:20): Mara + a police cordon on a night
// sidewalk, city lights, a downed cop + blood in the foreground.
// Shot 3 is the FULL CITY MAP of Puerto Lumen (21:40) — APPROVED by Sand,
// DO NOT TOUCH. Shot 4 is the dawn marina escape (06:10) — the boat now
// sits IN THE WATER, big and side-on, white hull + red stripe, warm dawn
// light + visible sea (the sea planes used to sit under the grass and never
// showed).
import { ROB_TARGETS } from './config.js';
import { poseAim } from './people.js';

// BRIGHT-NIGHT FRONT-VIEW CHASE (Sand 2026-11-21 ~10:36 + 10:39 WIT):
// top-1 Karimbu "Isle of Embers" composition, copied pixel by pixel, not
// imagined — LOW camera AHEAD of the hero looking BACK at its front
// three-quarter as it drives TOWARD the lens down a palm boulevard: the
// road (asphalt + double-yellow + white dashes) runs 290 m EAST to the
// horizon BEHIND the car, palms lining BOTH sides, beach + sea on the
// south (right) side, city buildings framing the north (left) side,
// the eight-cruiser pack + roadblock BEHIND the hero down the road,
// heli ahead-east over the road with its spotlight beam slanting back
// down onto the hero car. The hero drives WEST (heading -PI/2) so the
// camera, sitting west of the hero looking east, sees buildings on the
// LEFT and beach + sea on the RIGHT — exactly like Karimbu shot 1.
// NIGHT but BRIGHT: the 'brightnight' preset (dark sky, bright ambient)
// + a row of lit street lamps down both sides of the road + wet
// puddles catching the light + the aimed heli beam, so the heli beam,
// the sirens and the cars all read clearly at night.
export function stageShot1(G) {
  G.setLighting('brightnight'); // 22:40 bright night — also stamps the HUD clock
  G.spawnSandPatch(0x8a7a62); // DARK-tinted sand for night: the untinted
  // pale-cream patch caught the lamp light and washed the whole
  // foreground pale in the first takes — the dark tint keeps the beach
  // a dark night beach under the lamps, like shot 2's tinted patch.
  G.spawnBeachRoad(-40, 380, 215); // the boulevard: 420 m east to the horizon
  G.spawnPalmRow(-30, 360, 206, 26); // palms lining the road, north side
  G.spawnPalmRow(-30, 360, 224, 30); // palms lining the road, beach side
  G.startPlay();
  G.enterCar(G.parked[0]);
  G.warpTo(90, 215); // south beach, heading WEST along the Playa front
  G.player.car.heading = -Math.PI / 2; // nose WEST, toward the camera
  G.player.car.mesh.group.rotation.y = -Math.PI / 2;
  G.player.car.speed = 34;
  G.garage.nos = 120;
  G.nosBurning = true;
  G.setWanted(5);
  G.spawnPoliceBehind(8); // the eight-cruiser pack, pinned BEHIND the hero by the autopilot
  G.spawnPoliceBikes(); // two police motorcycles flanking the hero (Sand 02:12)
  G.clearUmbrellasAll(); // Sand 02:08 — NO umbrella anywhere in shot 1
  G.heli.active = true;
  G.heli.hover = 2; // body at y=10, orbit 24: the 14 m rotor fits the frame
  G.heli.orbit = 24;
  // NO vertical searchlight cone: the 26 m additive cone hangs straight
  // down from the heli and reads as a giant white lampshade; the HELI
  // SPOTLIGHT BEAM below is the aimed one that touches the car.
  G.heli.cone.visible = false;
  G.heli.pool.visible = false;
  // HELI SPOTLIGHT BEAM (Sand 2026-11-21 ~02:12 WIT): the heli shines a
  // visible beam DOWN onto the hero car — a tapered cone from the heli
  // belly to the car + a bright pool around the car (heli.beam, aimed by
  // the shot-1 autopilot every frame). At BRIGHT NIGHT the beam is the
  // shot's centrepiece: it must slant visibly across the frame and land
  // ON the hero, so the heli reads as hunting the car, not parked in
  // the sky. The heli sits EAST of the hero (angle 0.15, pinned by the
  // autopilot), so the beam slants west-down onto the car.
  G.aimSpotlight(90, 1.0, 215);
  // LIT STREET LAMPS down both sides of the visible road (bright night,
  // Sand 10:36): warm lamp glow + halo at each head, so the boulevard
  // reads as a lamp-lit night street, not a dark plane. THREE lamps,
  // spaced wide: six overlapping pools washed the whole road pale in
  // the first takes — with three, the road falls DARK between bright
  // pools and the night reads as night, lit, not floodlit. The west
  // lamp sits on the BEACH side (45, 224), not the north sidewalk:
  // the north-side lamp sat 7 m off the camera axis and its pool
  // washed the whole foreground sand pale.
  G.addLampGlow(45, 224);
  G.addLampGlow(130, 224);
  G.addLampGlow(190, 206);
  // WET PUDDLES on the road (recent rain): near-mirror planes that catch
  // the lamp glows + the heli beam as bright streaks, so the night road
  // reads WET and bright instead of flat dark asphalt.
  G.spawnPuddle(70, 215, 10, 4);
  G.spawnPuddle(120, 212, 8, 3);
  G.spawnPuddle(160, 218, 10, 4);
  G.spawnTrafficNear(180, 215, 5); // traffic down the boulevard behind the hero, in frame
  G.clearTrafficNear(90, 215, 40); // NO stray car may overlap the hero
  G.clearPedsNear(90, 215, 15); // clear the hero's foreground
  G.spawnPedsNear(140, 206, 8); // pedestrians on the north sidewalk behind the hero
  G.spawnPedsNear(170, 228, 5); // beachgoers on the sand behind the hero, south side
  // Warm bounce light over the hero so the pink-red paint + chrome glow
  // under the lamps. 60, not 100: at bright night the old 100 + the beam
  // pool washed the pink to pale white — the paint still glows at 60.
  G.addPointLight(90, 6, 215, 0xffb347, 60, 26);
  G.missions.startMission(11); // Street King race is live: checkpoints on minimap
  G.setDialogue('LCPD DISPATCH', 'All units — suspect westbound on the Playa front, five stars. Air One overhead, eight units closing. Do not let her reach the pier.');
  G.hud.log('LCPD DISPATCH: "All units — suspect westbound on the Playa front."');
  G.hud.log('NOS burning — hold Shift on the straight.');
  G.hud.log('Night chase — eight units on you, heli beam on the car.');
  G.hud.notify('WANTED LEVEL UP', '5 stars — the whole LCPD is on you', 'danger', true);
  G.hud.notify('AIR-1 OVERHEAD', 'Heli has the light — eight units closing', 'danger', true);
  G.hud.notify('NOS READY', 'Tank full — hold Shift to burn', 'good', true);
  G.addAlert('info', 'VEHICLE STOLEN: VELOZ COMET RS');
  // LOW FRONT CAMERA ahead-west of the hero (the Karimbu angle): camera
  // sits WEST of the hero (camYaw = +PI/2, slightly offset so the hero
  // sits a touch right of centre), LOW (height 4.2), looking EAST at
  // the hero's FRONT three-quarter — grille + headlights + sloped hood
  // readable, the road + lane markings vanishing to the horizon BEHIND
  // the car, palms both sides, buildings left, sea right, heli ahead.
  // Dist 10.5, height 4.2: the first take at 9.0 / 3.4 CROPPED the
  // hero's nose + grille + headlights off the bottom edge (the front
  // three-quarter reads wider + taller than the rear view) — pulled
  // back + raised so the WHOLE car fits with road below it, near
  // Karimbu's ~25–30% of frame width.
  G.camYaw = Math.PI / 2 - 0.18;
  G.setCamDist(10.5);
  G.setCamHeight(4.2);
  G.camPitch = 0.08;
  G.state.cash = 18450;
  // Anchor: the chase autopilot holds speed 34, so without this the hero
  // drives hundreds of units during a slow SwiftShader settle and the
  // framing drifts. The anchor snaps it back every frame (staging hold).
  G.anchor = [90, 215];
}
// NIGHT STREET SHOOTOUT on the boulevard (23:20, bright night).
// Round-3 re-stage (Sand 2026-11-21 ~10:36 WIT: shot 2 at NIGHT, like
// Karimbu's second image — a character on a night sidewalk, city
// lights, a downed body on the ground): the SAME staging as the
// boulevard shootout — Mara further back, the duel on a PROFILE firing
// line, Mara facing WEST in full profile, the cordon WEST of her
// facing EAST toward her, the camera NORTH of Mara looking SOUTH,
// perpendicular to the firing line — but re-lit for BRIGHT NIGHT:
// dark sky, lit street lamps + lit windows, wet puddles, the heli's
// spotlight beam slanting down onto the duel, sirens visible. The
// camera sees Mara's profile (with a nose now, so she reads as a
// person, not a back-of-head) + her pistol arm extended + her own star
// muzzle flash at the barrel tip, the cordon in profile facing her
// with pistols + flashes of their own, and the background is the night
// street + palms + beach + sea + night sky — NO building anywhere in
// the frame (the Playa Drive towers sit 30 m north, behind the camera,
// and the only direction with no building at all is south, toward the
// water — the v2 north-looking take proved the towers fill the frame).
// Mara holds a PISTOL (not an SMG): G.player.weapon = 'pistol' and the
// gun mesh is the short pistol model, centred in front of her chest by
// poseAim so it reads in profile from either side. Mara + officers are
// scaled up (1.3 / 1.15) so the shootout reads at a glance, not as toy
// figures.
export function stageShot2(G) {
  // BRIGHT NIGHT (Sand 2026-11-21 ~10:36 WIT: "malam hari terang"):
  // the 'brightnight' preset (dark sky, bright ambient) + the clock
  // re-stamped to 23:20, the night-shootout hour. The old dusk preset
  // (golden hour, toned down) is kept in config.js for reference.
  G.setLighting('brightnight'); // also stamps the HUD clock to 22:40…
  G.setClock('23:20'); // …re-stamped here to the shootout hour
  G.spawnSandPatch(0xd8c098); // tan-tinted sand: the pale-cream foreground
  // survived the dusk preset + dimmed lights, so the light #f0d49a texture
  // itself is darkened here (shot 2 only — shots 1 + 4 keep the untinted patch).
  // 3D-BOULEVARD DENSITY (2026-11-21): the 3a5f34a take staged the duel
  // on EMPTY sand — a tan plane, a pink sky, a thin sea strip, nothing
  // else. The shootout now happens ON the same boulevard as shot 1:
  // the asphalt road with double-yellow + white dashes runs east-west
  // straight through the duel (Mara at z 214, cordon z 214–218, downed
  // cop at z 209 on the road's north edge — the blood pool at y 0.09+
  // sits above the asphalt at 0.07, so it still reads), and two palm
  // rows stand SOUTH of the duel (z 224 + 232) behind the cordon, so
  // the background is palms + beach + sea + night sky, not void. The
  // north row is skipped on purpose: the camera sits at z ~205 looking
  // south, so a z 206 row would loom over the lens. Traffic east down
  // the road (x 140–200) gives the street depth behind the duel.
  G.spawnBeachRoad(-40, 380, 215);
  G.spawnPalmRow(-20, 360, 224, 30);
  G.spawnPalmRow(40, 360, 232, 30);
  G.spawnTrafficNear(170, 215, 3);
  // LIT STREET LAMPS + WET PUDDLES (bright night, Sand 10:36): the
  // lamps light the duel from both sidewalks and the puddles catch the
  // lamp glows + the heli beam as bright streaks, so the night street
  // reads WET and lit, not dark. TWO lamps: four overlapping pools
  // washed the street pale in the first takes — with two, the street
  // falls dark between the pools and the beam + dress lights carry the
  // duel. Lamps alternate sides, clear of the firing line; puddles sit
  // on the road under the duel.
  G.addLampGlow(70, 206);
  G.addLampGlow(110, 224);
  G.spawnPuddle(85, 213, 10, 4);
  G.spawnPuddle(98, 216, 8, 3);
  G.startPlay();
  G.enterCar(G.parked[0]); // hot pink-red Comet RS, the hero car
  G.warpTo(78, 222); // park the Comet south of the cordon, nose east
  G.player.car.heading = Math.PI / 2;
  G.player.car.mesh.group.rotation.y = Math.PI / 2;
  G.exitCar(); // Mara steps out by the car
  G.warpTo(91, 214); // Mara on foot on the sand, facing west in profile
  G.player.heading = -Math.PI / 2;
  G.player.mesh.group.rotation.y = -Math.PI / 2;
  G.player.mesh.group.scale.setScalar(1.4); // Mara reads BIG
  G.player.weapon = 'pistol'; // PISTOL, not SMG — Sand's order
  poseAim(G.player.mesh.group); // two-handed aim, pistol out in front
  // Police cordon closing in ahead (WEST), tight and close, firing back
  // — four groups widening it north and south so the shootout reads
  // CROWDED, not a lone duel. Only 4–8 m from Mara so the officers read
  // LARGE from the camera (v3's 8–14 m cordon read as toy soldiers at
  // the frame edge) and the sim holds them in place (updateEnemy only
  // advances officers further than 20 m out). Every officer is posed
  // aiming and scaled up. The two northern groups sit SOUTH enough
  // (z 214/216, not 210/212) to stay inside the camera's view cone —
  // at camYaw -0.25 the old 210/212 groups fell off the right edge.
  const squad = [
    ...G.spawnEnemiesAt(85, 214, 4, 'police'),
    ...G.spawnEnemiesAt(87, 216, 3, 'police'),
    ...G.spawnEnemiesAt(83, 218, 3, 'police'),
    ...G.spawnEnemiesAt(86, 216, 2, 'police'),
  ];
  for (const e of squad) {
    poseAim(e.mesh);
    e.mesh.scale.setScalar(1.3);
  }
  // ONE parked cruiser flanking the cordon at its north end — static
  // prop (not in the police array, so updatePolice never drives it off),
  // light bar glowing, front facing EAST toward Mara and the lens. The
  // south flanker is dropped: the hero Comet parks there instead.
  G.parkPoliceCar(78, 206, Math.PI / 2);
  // ONE DOWNED POLICE OFFICER flat on the sand (Sand 2026-11-21 ~07:33
  // WIT): a static prop, never in the enemy loop — head toward the
  // cordon (west), blood pooled around the torso/head. FOREGROUND spot
  // (89, 210): the first take at (88.5, 216.5) sat INSIDE the cordon
  // spread and the standing officers hid the body behind their legs —
  // only the blood pool showed. Here it lies in the open sand between
  // the camera and the firing line, clear of Mara (91, 214), the cordon
  // (z 214–218), the cash burst (85, 213) and the loot pile (90, 216.5).
  // Second take moved it WEST to (87, 210): at (89, 210) its east half
  // sat behind the right-side dialogue/toast panels. That made it WORSE:
  // facing south, west is screen-RIGHT, so the head slid to sx 1038,
  // behind the panels. A three.js projection of the shot-2 camera
  // (93.23, 2.40, 205.28, fov 72) says feet (91, 209) land at sx 729 /
  // sy 553 and head at sx 888 / sy 524 — open foreground sand, clear of
  // the 940+ panels, below Mara (feet sx 589 / sy 448), above the bottom
  // bar (y 640+), 5 m clear of Mara, the cordon, the cash burst and the
  // loot pile. Third placement: (91, 209).
  G.spawnDownedOfficer(91, 209);
  // Muzzle flashes — SMALL starbursts (Sand 2026-11-21 ~02:10 WIT: the v3
  // flash was a giant white blob that whited out the scene): scale 1.0,
  // not 1.6 — compact 8-point stars with gaps, clearly past the muzzle
  // tips, never swallowing the pistol. Positions track the 2.0x chunkier
  // pistol (see people.js poseAim): Mara's tip is 2.60 m west of her
  // centre (x=88.40 at chest height 1.85), so her flash sits at 87.9 —
  // 0.5 m past the tip; officers' tips are 2.42 m east, so theirs sit
  // at e.x+2.9. The full barrel shows between hand and flash.
  G.addMuzzleFlash(87.9, 1.85, 214.2, 1.0);
  for (const e of squad.slice(0, 4)) G.addMuzzleFlash(e.x + 2.9, 1.72, e.z, 1.0);
  // Cash flying LOW between Mara and the cordon (knee-to-waist height now
  // — see spawnCashBurst) + a spill by her feet, set SOUTH of her gun
  // line so the gold bars never sit under the pistol in frame.
  G.spawnCashBurst(85, 213);
  G.spawnLootPile(90, 216.5);
  // Heli overhead SOUTH-WEST over the waterline (angle pinned by the
  // autopilot). Hover 2 (body at y=10), orbit 16: at orbit 24 + angle PI
  // the heli sat 66° off-axis and out of frame; angle 2.4 puts it 34°
  // right of centre, upper-right, over the cordon.
  // HELI SPOTLIGHT BEAM (Sand 10:36: the beam must read at night): the
  // aimed beam + pool land ON Mara and the duel (aimed by the shot-2
  // autopilot every frame), so the heli hunts the street, not just the
  // sky. The old vertical cone stays hidden (it reads as a lampshade).
  G.heli.active = true;
  G.heli.hover = 2;
  G.heli.orbit = 16;
  G.heli.cone.visible = false;
  G.heli.pool.visible = false;
  G.aimSpotlight(91, 1.0, 214);
  // Night dressing: warm pools of light over Mara + the cordon so the
  // figures read — 30, not 12: the old dusk dress lights were tuned
  // for golden hour, and at night the figures need the extra warmth to
  // read against the dark street. Beachgoers scattering west beyond
  // the cordon.
  G.addPointLight(84, 8, 206, 0xffb347, 30, 20);
  G.addPointLight(78, 8, 216, 0xffb347, 30, 20);
  G.spawnPedsNear(64, 230, 4); // beachgoers scattering west, clear of the lens
  G.spawnPedsNear(60, 216, 3);
  G.clearPedsNear(91, 205, 14); // NO ped may loom in the foreground (v3's giant)
  G.clearTrafficNear(91, 214, 22); // no stray car may cross the duel
  G.missions.startMission(14); // El Puerto Es Nuestro finale
  G.setWanted(5); // finale heat, pinned AFTER startMission
  G.setDialogue('MARA', "Street's hot — heli beam on us, cash in the air. Hold the door!");
  G.hud.log('MARA: "Street\'s hot — heli beam on us, cash in the air."');
  G.hud.feed('Mara downed a police officer');
  G.hud.feed('Cash flying on the street — $21,700');
  G.hud.notify('NIGHT SHOOTOUT', 'LCPD cordon on the street — hold the door', 'danger', true);
  G.hud.notify('WANTED LEVEL UP', '5 stars — the whole LCPD is on you', 'danger', true);
  G.state.cash = 21700;
  G.state.health = 100;
  G.state.armour = 100; // the cordon shoots back through the whole settle
  // LOW ground-level PROFILE view from the NORTH, looking SOUTH across
  // the firing line: the camera sits 9 out (Sand 2026-11-21 ~07:33 WIT:
  // Mara pulled FURTHER BACK — the CAMERA moves out, not her staging,
  // so she reads smaller and deeper with more beach/cordon/sea visible;
  // was 6.5, 9 first, 8.5 if the pistol stops reading), 2.6 high, at
  // camYaw -0.25 (turned slightly west, down the firing line, so the
  // cordon stays in frame) — Mara faces west in profile with her pistol
  // + flash toward the cordon, the cordon fills the centre in profile
  // facing her with its muzzle flashes, the Comet reads at the right
  // edge, and the background is open beach + sea + night sky. NO
  // building in the frame. ALL umbrellas are cleared outright below
  // (Sand 02:08), so none looms in the foreground or behind the duel.
  // Mara reads BIG in frame.
  G.camYaw = -0.25;
  G.setCamDist(9);
  G.setCamHeight(2.6);
  G.camPitch = -0.05;
  G.clearUmbrellasAll(); // Sand 02:08 — NO umbrella anywhere in shot 2
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
// r12 round-2 targeted pass (Sand: the boat was a thin strip partly
// hidden behind the car + umbrella, NOT the focal point): the boat is
// 3.6x and moored FURTHER out (z=252) with a slight three-quarter angle
// so the WHOLE boat fits in frame with sea + sky around it — the first
// 4.5x take at z=247 filled the whole width and read as a flat white
// wall, its deck + windshield + motor cut off at the frame edges. The
// camera is higher (4.5) so the deck reads as a surface and the
// windshield sits on it instead of floating as a slab. The beach
// umbrellas around the camera are cleared so none looms over the boat,
// and the MISSION PASSED banner is lifted to 12% — above the boat's
// cabin top — so it can never cover the boat. The car stays foreground
// centre; it occludes only a thin slice of the boat's length, like a
// car parked on the beach in front of a moored boat.
export function stageShot4(G) {
  G.setLighting('dawn'); // 06:10 — also stamps the HUD clock
  G.spawnSandPatch(); // the dawn beach, deterministically tan
  G.startPlay();
  G.enterCar(G.parked[0]);
  G.warpTo(-158, 230); // on the south sand at the water's edge
  G.player.car.heading = 0; // nose SOUTH, toward the boat
  G.player.car.speed = 0;
  G.holdStill = true;
  for (let i = 0; i < 12; i += 1) G.turf.owners[i] = 'crew';
  G.state.cash = 21400;
  G.missions.missionIdx = 15;
  G.missions.active = false;
  G.missions.objective = 'Story complete — Puerto Lumen is yours. Free roam!';
  // The getaway boat, moored IN THE WATER directly south of the car
  // (dead-ahead in frame, centre) — 3.6x, THREE-QUARTER angle
  // (2026-11-21: the old dead side-on take read as a flat white wall —
  // a 20-degree turn shows the tapered bow + deck + windshield with
  // depth, like the top-10 beach scenes) so the WHOLE boat fits in
  // frame with sea + sky around it. White hull + red stripe, 32 m
  // long. It sits in the centre of the frame, BELOW and CLEAR of the
  // MISSION PASSED banner — never behind it.
  G.spawnBoat(-158, 250, Math.PI / 2 - 0.35, 3.6);
  // Sun glitter on the water behind the boat (see spawnSunGlitter):
  // the dawn sun sits almost dead ahead (sunPos [-150, 30, 480]), so
  // a soft warm glow path from the boat toward the sun makes the sea
  // reflect the sunrise. Starts clear of the stern (z 270+).
  G.spawnSunGlitter(-158, 290, 12, 40);
  // Framing palms at the waterline, one each side of the boat — in
  // frame at the edges (~46-50 deg off-axis), clear of the boat, so
  // the dawn beach reads as a place, not a void.
  G.spawnPalmRow(-182, -182, 238, 15);
  G.spawnPalmRow(-134, -134, 238, 15);
  // NO umbrella anywhere in shot 4 (Sand 02:08 — clear them ALL, not
  // just near the camera; the z=224 row used to loom in the foreground
  // and hide the boat behind a giant canopy).
  G.clearUmbrellasAll();
  // Morning mist over the sea, kept SMALL and OFF the boat.
  G.spawnMist(-230, 258, 35);
  G.spawnMist(-105, 272, 35);
  G.spawnMist(-165, 285, 30);
  // Wet-sand strip along the waterline (dark glossy band, above the sand
  // patch and the sea) so the shore reads as a shore, not a flat tan plane.
  const wet = G.spawnPuddle(-158, 240, 60, 6);
  wet.position.y = 0.09;
  // The crew standing by the car, facing the boat and the sunrise.
  G.spawnAlly(-155, 233, 0);
  G.spawnAlly(-161, 233, 0);
  G.spawnPedsNear(-150, 222, 4); // foreground beachgoers by the waterline
  G.spawnPedsNear(-166, 224, 3);
  G.clearTrafficNear(-158, 230, 30); // no stray car may cross the duel
  G.setDialogue('TIO REYES', 'Dawn breaks over the marina, Mara. The boat\'s waiting — Puerto Lumen is ours.');
  G.hud.showBanner('MISSION PASSED', '+$8,000  ·  +500 REP  ·  UNLOCKED: PIER SAFEHOUSE', 600000, '12%');
  G.hud.notify('MISSION PASSED', 'El Puerto Es Nuestro  +$8,000', 'good', true);
  G.hud.notify('STORY 15/15 — SAVE SLOT 1', '100% COMPLETE — Puerto Lumen is yours', 'good', true);
  G.hud.log('MISSION PASSED: El Puerto Es Nuestro — +$8,000  ·  +500 REP');
  G.hud.log('STORY 15/15 — SAVE SLOT 1  100% COMPLETE.');
  // LOW wide ESTABLISHING — camera north of the car on the beach, 13.5
  // out, 4.5 high (high enough to look down on the boat's deck so the
  // windshield + seats read as boat parts, not floating slabs): the boat
  // sits side-on and BIG in the centre of the frame, clear of the
  // banner, the sunrise glows low over the visible sea behind it, the
  // car + crew anchor the foreground.
  // The car is parked (G.holdStill) and anchored, so the slow settle can
  // never drift the frame.
  G.camYaw = 0.15;
  G.setCamDist(13.5);
  G.setCamHeight(4.5);
  G.camPitch = 0.05;
  G.anchor = [-158, 230]; // on the car — pins the frame; boat sits just south
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
  // 2 s ends it). The heli's spotlight beam is re-aimed onto Mara every
  // frame, like shot 1 — at night the beam is what makes the heli hunt.
  if (G.shotMode === 2) {
    if (G.heli) G.heli.angle = 2.0; // SOUTH-WEST of Mara, over the waterline
    if (G.heli && G.heli.beam) G.aimSpotlight(G.player.x, 1.0, G.player.z);
    // Second rank of cruisers WEST of the cordon, facing east toward Mara
    // and the lens — depth behind the staged cordon, never on top of it.
    const spots = [[-20, -6], [-22, 4], [-24, 0], [-19, 8]];
    (G.police || []).forEach((c, i) => {
      const [bx, bz] = spots[i % spots.length];
      c.x = G.player.x + bx; c.z = G.player.z + bz;
      c.heading = Math.PI / 2; c.speed = 0;
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
    // ahead-east in frame, circling over the chase. Heli angle 0.15 puts it
    // EAST of the hero (cos 0.99, sin 0.15 — ahead over the road behind
    // the hero, dead-centre in the frame the front camera looks at):
    // the old 0.45 put it south-east, off-axis toward the beach.
    G.player.car.speed = 34;
    G.player.car.heading += Math.sin(performance.now() * 0.0004) * 0.05 * dt;
    if (G.heli) { G.heli.angle = 0.15; }
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
    // hero, lat = lateral (+ = south, beach side). FRONT-VIEW REBUILD:
    // the camera sits AHEAD of the hero (west) looking EAST, so the pack
    // is pinned BEHIND the hero (POSITIVE back) down the boulevard —
    // like top-1 Karimbu, where the police column sits down the road
    // behind/around the hero, all facing the lens. Pinned AHEAD (the old
    // negative backs), they would sit on top of the camera.
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
    pin('chase', 12, -5, G.player.car.heading, 34);
    pin('chase2', 18, 5, G.player.car.heading, 34);
    // Flank trio: staggered depths on both sides of the pursuit column.
    const flank = (G.police || []).filter((c) => c.kind === 'flank');
    const flankSlots = [[16, -9], [24, 9], [32, -3]];
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
    const headonSlots = [[14, -3], [22, 5], [30, 1]];
    headon.forEach((c, i) => {
      const [back, lat] = headonSlots[i] || headonSlots[0];
      c.x = G.player.x - fx * back + rx * lat;
      c.z = G.player.z - fz * back + rz * lat;
      c.heading = G.player.car.heading;
      c.speed = 34;
      c.mesh.group.position.set(c.x, 0, c.z);
      c.mesh.group.rotation.y = c.heading;
    });
    // Police bikes flanking the hero (Sand 02:12 + 06:20) + heli spotlight beam
    // onto the car (Sand 02:12): pinned + aimed every frame, like the
    // cruiser pack. ONE bike in EACH lane beside the hero — north lane
    // by the REAR HALF (back +2, lat −4), south lane by the REAR HALF
    // (back +4, lat +3). BOTH behind the hero's nose line: the first
    // take pinned the north bike at back −1, ahead of the nose, and it
    // LOOMED huge in the left foreground, 7 m from the lens. Behind
    // the nose they flank the hero in frame without looming.
    const bikeSlots = [[2, -4], [4, 3]];
    (G.bikes || []).forEach((b, i) => {
      const [back, lat] = bikeSlots[i] || bikeSlots[0];
      b.x = G.player.x - fx * back + rx * lat;
      b.z = G.player.z - fz * back + rz * lat;
      b.heading = G.player.car.heading;
      b.group.position.set(b.x, 0, b.z);
      b.group.rotation.y = b.heading;
    });
    if (G.heli && G.heli.beam) G.aimSpotlight(G.player.x, 1.0, G.player.z);
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
