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
// r12 round-2 re-shoot (Sand ~23:45: the 91f401a take still read as Lego
// boxes): the chase now runs on a REAL BEACHFRONT ROAD (top-1 Karimbu /
// top-2 Tangerine Mile layout — asphalt + double-yellow centre line +
// white dashes + palms lining it, sea on one side), NOT bare sand; the
// camera sits further round the front (camYaw -1.15) so the Comet's nose +
// sloped hood + grille + headlights face the lens; the cruiser pack is
// widened so its fronts flank the hero instead of hiding behind him.
// The centre "1:47" timer is GONE — it overlapped the IN SIGHT banner.
export function stageShot1(G) {
  G.setLighting('sunset'); // 18:45 — also stamps the HUD clock
  G.spawnSandPatch(); // deterministic tan sand at a grazing camera angle
  G.spawnBeachRoad(-40, 220, 215); // the beachfront road: asphalt + lines
  G.spawnPalmRow(-30, 210, 206, 24); // palms lining the road, north side
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
  G.spawnPoliceBikes(); // two police motorcycles flanking the hero (Sand 02:12)
  G.clearUmbrellasAll(); // Sand 02:08 — NO umbrella anywhere in shot 1
  G.heli.active = true;
  G.heli.hover = 2; // body at y=10, orbit 24: the 14 m rotor fits the frame
  G.heli.orbit = 24;
  // NO searchlight cone in golden hour: the 26 m additive cone reads as a
  // giant white lampshade in daylight and swallows the sky + the heli.
  // The heli body + rotor + lamp carry it; the HUD keeps the SPOTLIGHT row.
  G.heli.cone.visible = false;
  G.heli.pool.visible = false;
  // HELI SPOTLIGHT BEAM (Sand 2026-11-21 ~02:12 WIT): the heli shines a
  // visible beam DOWN onto the hero car — a tapered cone from the heli
  // belly to the car + a bright pool around the car (heli.beam, aimed by
  // the shot-1 autopilot every frame). NOT the old vertical cone above.
  G.aimSpotlight(90, 1.0, 215);
  G.spawnTrafficNear(20, 215, 6); // traffic down the beach, in the background
  G.clearTrafficNear(90, 215, 30); // NO stray car may overlap the hero
  G.clearPedsNear(90, 215, 15); // clear the hero's foreground
  G.spawnPedsNear(55, 205, 10); // beachgoers down the beach, in frame
  // Warm bounce light over the hero so the pink-red paint + chrome glow.
  G.addPointLight(90, 6, 215, 0xffb347, 200, 26);
  G.missions.startMission(11); // Street King race is live: checkpoints on minimap
  G.setDialogue('LCPD DISPATCH', 'All units — suspect eastbound on the Playa front, five stars. Air One overhead, eight units closing. Do not let her reach the pier.');
  G.hud.log('LCPD DISPATCH: "All units — suspect eastbound on the Playa front."');
  G.hud.log('NOS burning — hold Shift on the straight.');
  G.hud.log('Sunset chase — eight units on you, heli overhead, beach run.');
  G.hud.notify('WANTED LEVEL UP', '5 stars — the whole LCPD is on you', 'danger', true);
  G.hud.notify('AIR-1 OVERHEAD', 'Heli has the light — eight units closing', 'danger', true);
  G.hud.notify('NOS READY', 'Tank full — hold Shift to burn', 'good', true);
  G.addAlert('info', 'VEHICLE STOLEN: VELOZ COMET RS');
  // FRONT-three-quarter chase cam (top-1 madsrepo angle, pushed further
  // round the nose): the camera sits AHEAD-EAST of the hero (camYaw
  // -1.15), LOW (height 2.7), looking back west at the hero's nose +
  // sloped hood + grille + headlights. At dist 8 the hero reads ~30% of
  // the frame, the cruiser pack stacks behind him down the beachfront
  // road, and the sky opens up at the top of the frame for the heli.
  G.camYaw = -0.8;
  G.setCamDist(8.5);
  G.setCamHeight(2.8);
  G.camPitch = 0.1;
  G.state.cash = 18450;
  // Anchor: the chase autopilot holds speed 34, so without this the hero
  // drives hundreds of units during a slow SwiftShader settle and the
  // framing drifts. The anchor snaps it back every frame (staging hold).
  G.anchor = [90, 215];
}
// SUNSET BEACH SHOOTOUT on the south sand (18:45, golden hour, no rain).
// Round-2 re-stage (Sand ~23:45: the 91f401a take showed Mara's BACK with
// an SMG-length gun and no visible flash): the duel now runs on a PROFILE
// firing line — Mara faces WEST in full profile, the cordon stands WEST of
// her facing EAST toward her, and the camera sits NORTH of Mara looking
// SOUTH, perpendicular to the firing line. The camera sees Mara's profile
// (with a nose now, so she reads as a person, not a back-of-head) + her
// pistol arm extended + her own star muzzle flash at the barrel tip, the
// cordon in profile facing her with pistols + flashes of their own, and
// the background is open beach + SEA + sunset sky — NO building anywhere
// in the frame (the Playa Drive towers sit 30 m north, behind the camera,
// and the only direction with no building at all is south, toward the
// water — the v2 north-looking take proved the towers fill the frame).
// Mara holds a PISTOL (not an SMG): G.player.weapon = 'pistol' and the
// gun mesh is the short pistol model, centred in front of her chest by
// poseAim so it reads in profile from either side. Mara + officers are
// scaled up (1.3 / 1.15) so the shootout reads at a glance, not as toy
// figures.
export function stageShot2(G) {
  // FULL REBUILD (Sand 2026-11-21 ~02:10 WIT: "semuanya terlalu terang
  // dan ga jelas" — the sunset take was a blown-white beach): the DUSK
  // preset — same golden-hour sky, exposure + sun + hemi toned down so
  // the sand + sky stop blowing out and the figures read. Smaller
  // flashes, dimmer dress lights, bigger pistol (see below).
  G.setLighting('dusk'); // 18:45 golden hour, toned down — also stamps the HUD clock
  G.spawnSandPatch(0xd8c098); // tan-tinted sand: the pale-cream foreground
  // survived the dusk preset + dimmed lights, so the light #f0d49a texture
  // itself is darkened here (shot 2 only — shots 1 + 4 keep the untinted patch).
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
  // NO cone in golden hour (same as shot 1: it reads as a white lampshade).
  G.heli.active = true;
  G.heli.hover = 2;
  G.heli.orbit = 16;
  G.heli.cone.visible = false;
  G.heli.pool.visible = false;
  // Golden-hour dressing: a warm pool of light over Mara, another over the
  // cordon so the officers read — DIMMED to 12 (was 40, then 18): the old
  // dress lights + the flash lights were bleaching the foreground sand
  // pale (Sand 02:10). Beachgoers scattering west beyond the cordon.
  G.addPointLight(84, 8, 206, 0xffb347, 12, 20);
  G.addPointLight(78, 8, 216, 0xffb347, 12, 20);
  G.spawnPedsNear(64, 230, 4); // beachgoers scattering west, clear of the lens
  G.spawnPedsNear(60, 216, 3);
  G.clearPedsNear(91, 205, 14); // NO ped may loom in the foreground (v3's giant)
  G.clearTrafficNear(91, 214, 22); // no stray car may cross the duel
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
  // LOW ground-level PROFILE view from the NORTH, looking SOUTH across
  // the firing line: the camera sits 6.5 out (was 7 — closer so Mara's
  // pistol + flash read at a glance), 2.6 high, at camYaw -0.25 (turned
  // slightly west, down the firing line, so the cordon stays in frame)
  // — Mara faces west in profile with her pistol + flash toward the
  // cordon, the cordon fills the centre in profile facing her with its
  // muzzle flashes, the Comet reads at the right edge, and the background
  // is open beach + sea + sunset sky. NO building in the frame. ALL
  // umbrellas are cleared outright below (Sand 02:08), so none looms in
  // the foreground or behind the duel.
  // Mara reads BIG in frame.
  G.camYaw = -0.25;
  G.setCamDist(6.5);
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
  // (dead-ahead in frame, centre) — 3.6x, slight three-quarter angle so
  // the tapered bow + deck + windshield + outboard motor all read, white
  // hull + red stripe, 32 m long so the whole boat fits in frame with
  // margins instead of being cut off at the edges. It sits in the
  // centre of the frame, BELOW and CLEAR of the MISSION PASSED banner —
  // never behind it.
  G.spawnBoat(-158, 252, Math.PI / 2 - 0.12, 3.6);
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
  // 2 s ends it).
  if (G.shotMode === 2) {
    if (G.heli) G.heli.angle = 2.0; // SOUTH-WEST of Mara, over the waterline
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
    // Police bikes flanking the hero (Sand 02:12) + heli spotlight beam
    // onto the car (Sand 02:12): pinned + aimed every frame, like the
    // cruiser pack. Bikes sit a few metres back on both sides of the hero.
    const bikeSlots = [[-1, -10], [0, -8]];
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
