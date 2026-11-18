// The four screenshot scenes (?shot=chase|shootout|job|done). Each one sets
// up a real game state — a live chase, a live shootout, a live job, a job
// completed — then steps the simulation forward a fixed number of fixed
// steps with scripted inputs, so the frame is what short real play looks
// like, and the same seed always gives the same frame.
// Shot 0 (chase) is the cover: mid-action, full HUD, never a menu.
import { LANDMARKS } from './config.js';

const STEP = 1 / 60;

/** Drive forward for `seconds` with an optional steer, then stop. */
function driveFor(game, seconds, steer = 0) {
  const input = {
    forward: true, back: false, left: steer < 0, right: steer > 0, run: false,
    fire: false, aiming: false, camHeading: 0, camYaw: 0, camPitch: 0.32,
    pressed: new Set(),
  };
  for (let i = 0; i < seconds / STEP; i++) game.step(STEP, input);
}

/** Walk forward for `seconds`, optionally firing once at the end. */
function walkFor(game, seconds, fireAtEnd = false) {
  const input = {
    forward: true, back: false, left: false, right: false, run: false,
    fire: false, aiming: true, camHeading: 0, camYaw: 0, camPitch: 0.32,
    pressed: new Set(),
  };
  for (let i = 0; i < seconds / STEP; i++) game.step(STEP, input);
  if (fireAtEnd) {
    input.fire = true;
    game.step(STEP, input);
    input.fire = false;
    game.step(STEP, input);
  }
}

/**
 * Stage the named scene on a fresh game and return the screen state.
 * `game` is the object main.js builds (see main.js for its API).
 * Any other name stages the chase (the cover).
 */
export function stageShot(game, name) {
  game.resetWorld();
  game.hideScreens();
  if (name === 'shootout') {
    // On foot by the Torre, pistol out, police closing in, peds fleeing.
    // Mara starts well south of the tower plaza and walks north, so the
    // clock tower and its TORRE LUMEN sign stay in frame with sky above;
    // cruisers approach from the flanks instead of piling onto her.
    game.teleportPlayer(35, 18, Math.PI);
    game.setWeapon('pistol');
    game.setWanted(3);
    game.spawnPolice(2, 0, -70);
    game.spawnPolice(1, 70, -70);
    game.fleePeds(35, -35);
    game.startMission(5); // The Informant — cordon banner on screen
    game.say('TIO REYES', 'Dario is cornered near the park — three cops, no exit. Get him out, Mara.', 8);
    walkFor(game, 1.0, true);
    game.log('LCPD DISPATCH: Shots fired at Torre Lumen — all units respond.');
    game.log('MARA SOLIS: You picked the wrong driver to corner.');
    return 'play';
  }
  if (name === 'job') {
    // The Marina Job: cargo on the dock, Comet parked, Lena on the radio.
    // Mara starts north of the dock and walks a short way south, so the
    // blue crates, the moored boats and the ocean sunset all stay in frame
    // instead of the crates filling the lens.
    game.teleportPlayer(-218, 200, 0.1);
    game.setWanted(0);
    game.startMission(3); // The Marina Job
    game.say('LENA CRUZ', "My cargo is on the far dock, blue crates. Bring it to Calle Sol — quietly.", 8);
    game.log('LENA CRUZ: Blue crates, far dock. The patrol passes every two minutes.');
    walkFor(game, 0.4, false);
    return 'play';
  }
  if (name === 'done') {
    // Job complete at Playa Dorada: sunset, Comet parked, payout banner.
    // Mara drives the Comet down onto the sand, facing the ocean sunset.
    game.moveParked(0, 104, 232, 0);
    game.teleportPlayer(104, 232, 0);
    game.putPlayerInCar(0); // Comet GT
    game.setWanted(0);
    game.completeJobForShot(3, 1000); // The Marina Job paid out
    game.showBanner('JOB DONE', '+$1,000 — THE MARINA JOB', 30);
    game.log('JOB DONE: The Marina Job — +$1,000');
    game.log('TIO REYES: Clean, Mara. The crew eats tonight.');
    driveFor(game, 0.4);
    return 'play';
  }
  // Default: 'chase' — the cover. Driving the Comet GT down the marina
  // straight at speed, two cruisers on the tail, the helicopter overhead,
  // 3 stars, mission banner live.
  game.teleportPlayer(-196, 175, Math.PI / 2);
  game.putPlayerInCar(0);
  game.cash = 2400;
  game.setWanted(3);
  game.spawnPolice(2, -258, 175); // tail: two cruisers well behind, not on the bumper
  game.spawnPolice(2, -40, 168); // roadblock: two cruisers ahead, in frame
  // Street traffic ahead so the road reads as a living city.
  game.stageTraffic(0, -70, 172, Math.PI / 2, [[-70, 172], [220, 172], [220, 178], [-70, 178]]);
  game.stageTraffic(1, -20, 179, Math.PI / 2, [[-20, 179], [220, 179], [220, 172], [-20, 172]]);
  game.heliOn();
  game.startMission(4); // Payday — courier van banner on screen
  game.say('BIG DARIO', 'Courier van, Calle Sol, fat with casino cash. Ram it, grab the bag, run.', 8);
  game.log('LCPD DISPATCH: Air One has the suspect. All ground units converge.');
  game.log('MARA SOLIS: You will have to catch me first.');
  driveFor(game, 3.4, 0);
  return 'play';
}
