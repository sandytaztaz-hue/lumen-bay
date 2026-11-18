// The four screenshot scenes behind ?shot=1..4. Each one drives the real game
// forward from a fresh world with a fixed script — a chase, a shootout, a marina
// pickup, a job-done banner — then renders a few frames and sets
// window.__shotReady so the screenshot tool knows the frame is ready.
// Shot 1 (the cover) is mid-action gameplay with the full HUD, never a menu.
import * as THREE from 'three';

function driveForward(game, seconds) {
  const steps = Math.floor(seconds * 60);
  for (let i = 0; i < steps; i += 1) {
    game.input.press('KeyW');
    game.step(1);
    game.input.release('KeyW');
  }
}

// Let the smoothed chase camera converge on its target before the shot.
function settle(game, n = 80) {
  for (let i = 0; i < n; i += 1) game.frame();
}

export function stageShot(n, game) {
  const { player, state, city, missions, hud, audio } = game;
  if (n === 1) {
    // COVER: high-speed chase down the coast road — Comet GT, two cruisers
    // on the tail, the helicopter overhead, 3 stars, full HUD.
    const gt = game.addParked('gt', 0xff5a2a, 0, 150, 0, 'Comet GT');
    player.pos.set(0, 0, 150);
    game.enterCarDirect(gt);
    game.setWanted(3);
    game.syncCruisers();
    missions.nextIndex = 0;
    missions.startNext();
    missions.advance();
    missions.advance();
    driveForward(game, 2.2);
    settle(game);
  } else if (n === 2) {
    // Shootout on foot at the Torre Lumen plaza: cordon police, muzzle flash,
    // 4 stars, Mara firing her pistol at the tower guards.
    player.pos.set(-14, 0, -186);
    player.angle = Math.PI;
    game.cam.yaw = Math.PI;
    game.setWanted(4);
    game.syncCruisers();
    game.spawnFootCops(-6, -196, 4);
    missions.nextIndex = 5;
    missions.startNext();
    game.step(6);
    game.frame();
    game.fireWeapon();
    game.step(14);
    game.fireWeapon();
    game.step(8);
    settle(game);
  } else if (n === 3) {
    // Marina pickup: Mara on foot at the docks beside the Comet GT, Lena's
    // crate on the pier, the boats and the sunset behind them.
    player.pos.set(-8, 0, -252);
    player.angle = Math.PI * 0.9;
    game.cam.yaw = Math.PI * 0.85;
    missions.nextIndex = 3;
    missions.startNext();
    game.step(20);
    settle(game);
  } else if (n === 4) {
    // Job done at Playa Dorada: the JOB DONE banner with the cash reward,
    // Mara in the Comet GT on the beach road at sunset.
    const gt = game.addParked('gt', 0xff5a2a, -30, 280, Math.PI * 0.15, 'Comet GT');
    player.pos.set(-30, 0, 280);
    game.enterCarDirect(gt);
    player.cash += 2500;
    missions.nextIndex = 4;
    missions.completedCount = 4;
    missions.totalEarned = 5700;
    hud.banner('JOB DONE', 'Payday — +$2,500', 60000);
    hud.log('JOB 5 COMPLETE — Payday: +$2,500');
    driveForward(game, 1.2);
    settle(game);
  }
  window.__shotReady = true;
}
