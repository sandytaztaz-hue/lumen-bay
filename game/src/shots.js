// LUMEN BAY — screenshot scenes behind ?shot=1..4.
// Each shot plays the real game forward from a fresh world with a fixed
// autopilot, so the frame is what genuine play looks like and the same seed
// always gives the same frame. The main loop paints twice, then sets
// window.__shotReady so the screenshot tool knows the scene is ready.
//
//   shot 1 — high-speed chase: Mara in the Comet GT, 3 stars, police cruisers
//            behind and the helicopter overhead, full HUD.
//   shot 2 — on-foot shootout at Torre Lumen: cordon police, muzzle flash.
//   shot 3 — mission pickup at the marina: Mara by the Comet GT, crates, docks.
//   shot 4 — job done at the beach: banner, cash reward, sunset over Playa Dorada.
import { COMET_GT, LANDMARKS } from './config.js';

const SAMPLE = 1 / 60;

function placeInCar(game, x, z, yaw, speed) {
  game.enterCar(game.cometCar);
  game.playerCar.x = x;
  game.playerCar.z = z;
  game.playerCar.yaw = yaw;
  game.playerCar.speed = speed;
  game.player.x = x;
  game.player.z = z;
}

function driveForward(game, seconds, steer) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    game.simulateInput({ forward: true, back: false, left: steer < 0, right: steer > 0, sprint: false, handbrake: false });
    game.stepFixed(SAMPLE);
  }
}

function walkForward(game, seconds) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    game.simulateInput({ forward: true, back: false, left: false, right: false, sprint: true, handbrake: false });
    game.stepFixed(SAMPLE);
  }
}

// Stage the named shot (1..4) on a live game object and return the screen
// the main loop should paint over it.
export function stageShot(number, game) {
  game.startPlay({ silent: true });
  if (number === 1) {
    // Chase down the coast road: 3 stars, heli up, cruisers in pursuit.
    game.setWanted(3);
    placeInCar(game, -180, -40, 0, 34);
    game.startMissionByIndex(8);
    driveForward(game, 2.2, 0);
    game.fireWeaponAt(game.nearestPoliceCar());
    return 'play';
  }
  if (number === 2) {
    // Shootout at the tower: Mara on foot south of it, camera behind her looking north.
    game.player.x = LANDMARKS.tower.x;
    game.player.z = LANDMARKS.tower.z + 30;
    game.player.yaw = Math.PI;
    game.camYaw = Math.PI;
    game.spawnCordon(LANDMARKS.tower.x, LANDMARKS.tower.z, 4);
    game.setWanted(2);
    game.startMissionByIndex(5);
    game.missions.step = 1;
    game.setShotTarget(LANDMARKS.tower.x, LANDMARKS.tower.z, 'Break the cordon — take down the police');
    game.fireWeaponAt(game.enemies[0] ? { x: game.enemies[0].x, y: 1.2, z: game.enemies[0].z } : null);
    walkForward(game, 0.6);
    return 'play';
  }
  if (number === 3) {
    // Marina pickup: Mara beside the Comet GT at the docks, crate in view.
    game.player.x = COMET_GT.x + 6;
    game.player.z = COMET_GT.z + 8;
    game.player.yaw = Math.atan2(COMET_GT.x - game.player.x, COMET_GT.z - game.player.z);
    game.camYaw = game.player.yaw;
    game.startMissionByIndex(3);
    game.missions.active = true;
    game.missions.step = 0;
    game.missions.timer = 0;
    walkForward(game, 0.25);
    return 'play';
  }
  // Shot 4 — job done at the beach: the banner and the reward over the sunset.
  game.player.x = LANDMARKS.beach.x + 15;
  game.player.z = LANDMARKS.beach.z + 5;
  game.player.yaw = -2.4;
  game.camYaw = -2.4;
  game.setWanted(0);
  game.cash += 1300;
  game.showJobDone(9, 'Beach Run', 1300);
  walkForward(game, 0.3);
  return 'play';
}
