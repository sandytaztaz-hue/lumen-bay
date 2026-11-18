// LUMEN BAY — the 12-mission story engine.
// Missions run in order. Each step is a small objective (go to, steal, pick up,
// deliver, wait out a hack, evade the police, shoot a cordon). The manager
// tracks the current step, timers and kill counts, and reports events the
// game turns into banners, cash and dialogue.
import { MISSIONS } from './config.js';

export function createMissionManager() {
  return {
    index: 0,
    step: 0,
    active: false,
    timer: 0,
    kills: 0,
    waitProgress: 0,
    completed: [],
    allDone: false,
    dialogueQueue: [],
    dialogueTimer: 0,
  };
}

export function currentMission(manager) {
  return MISSIONS[manager.index] ?? null;
}

export function currentStep(manager) {
  const mission = currentMission(manager);
  if (!mission) return null;
  return mission.steps[manager.step] ?? null;
}

export function missionTarget(manager) {
  const step = currentStep(manager);
  if (!step) return null;
  return { x: step.x, z: step.z, label: step.label };
}

// Start the next mission (M key). Returns the mission or null when finished.
export function startMission(manager, log) {
  const mission = currentMission(manager);
  if (!mission || manager.active) return mission;
  manager.active = true;
  manager.step = 0;
  manager.kills = 0;
  manager.waitProgress = 0;
  const step = currentStep(manager);
  manager.timer = step && step.seconds ? step.seconds : 0;
  manager.dialogueQueue = mission.dialogue.slice();
  manager.dialogueTimer = 0.5;
  if (log) log(`JOB ${mission.id}: ${mission.title} — $${mission.reward}`);
  return mission;
}

function advanceStep(manager, log) {
  const mission = currentMission(manager);
  manager.step += 1;
  manager.kills = 0;
  manager.waitProgress = 0;
  if (manager.step >= mission.steps.length) {
    completeMission(manager, log);
    return;
  }
  const step = currentStep(manager);
  manager.timer = step && step.seconds ? step.seconds : 0;
  if (log) log(step.label);
}

function completeMission(manager, log) {
  const mission = currentMission(manager);
  manager.completed.push(mission.id);
  manager.active = false;
  manager.index += 1;
  if (manager.index >= MISSIONS.length) manager.allDone = true;
  if (log) log(`JOB DONE: ${mission.title} — +$${mission.reward}`);
}

// Called by the game when the player does something mission-relevant.
// `event` is one of: reached (arrived at the step marker), stole, stolePolice,
// pickedUp, killed, waited. Returns 'completed' when a mission just finished.
export function missionEvent(manager, event, log) {
  if (!manager.active) return null;
  const step = currentStep(manager);
  if (!step) return null;
  const mission = currentMission(manager);
  let done = false;
  if (event === 'reached') {
    if (step.kind === 'goto') advanceStep(manager, log);
  } else if (event === 'stole' && step.kind === 'steal') {
    advanceStep(manager, log);
  } else if (event === 'stolePolice' && step.kind === 'stealPolice') {
    advanceStep(manager, log);
  } else if (event === 'pickedUp' && step.kind === 'pickup') {
    advanceStep(manager, log);
  } else if (event === 'killed' && step.kind === 'shoot') {
    manager.kills += 1;
    if (manager.kills >= (step.count || 1)) advanceStep(manager, log);
  }
  if (!manager.active && manager.completed.includes(mission.id)) return 'completed';
  return done ? 'completed' : null;
}

// Per-frame mission update: timers, wait-out hacks, evade checks.
// `world` carries the live facts the steps need: playerPos, wanted, inCar,
// nearTarget (distance to the current marker), speed.
export function updateMissions(manager, world, dt, log) {
  if (!manager.active) return null;
  const mission = currentMission(manager);
  const step = currentStep(manager);
  if (!mission || !step) return null;

  // Dialogue lines drip out one at a time.
  if (manager.dialogueQueue.length > 0) {
    manager.dialogueTimer -= dt;
    if (manager.dialogueTimer <= 0) {
      const line = manager.dialogueQueue.shift();
      if (log) log(line);
      manager.dialogueTimer = 4;
    }
  }

  // Timed steps count down; running out fails the mission back to its start.
  if (step.seconds && manager.timer > 0) {
    manager.timer -= dt;
    if (manager.timer <= 0) {
      manager.active = false;
      if (log) log(`JOB FAILED: ${mission.title} — out of time. Press M to retry.`);
      return 'failed';
    }
  }

  // Wait steps: hold inside the marker radius while the hack runs.
  if (step.kind === 'wait') {
    if (world.nearTarget < 9) {
      manager.waitProgress += dt;
      if (manager.waitProgress >= (step.seconds || 8)) {
        advanceStep(manager, log);
        if (!manager.active) return 'completed';
      }
    } else {
      manager.waitProgress = Math.max(0, manager.waitProgress - dt * 0.5);
    }
    return null;
  }

  // Evade steps complete when the wanted level reaches zero.
  if (step.kind === 'evade') {
    if (world.wanted === 0) {
      advanceStep(manager, log);
      if (!manager.active) return 'completed';
    }
    return null;
  }

  // Arrive steps: goto completes on arrival; deliver completes on arrival by car.
  // Radii are generous because landmark buildings have real colliders: a car
  // can only get within ~10 m of the safehouse/garage doors, and Mara on foot
  // within ~9 m of the lighthouse.
  if (step.kind === 'goto' && world.nearTarget < 9) {
    advanceStep(manager, log);
    if (!manager.active) return 'completed';
  } else if (step.kind === 'deliver' && world.inCar && world.nearTarget < 12) {
    advanceStep(manager, log);
    if (!manager.active) return 'completed';
  }
  return null;
}

// Human-readable objective line for the HUD banner.
export function objectiveText(manager) {
  const mission = currentMission(manager);
  if (!mission) return 'All jobs complete — Puerto Lumen is yours, Mara.';
  if (!manager.active) return `Next job: ${mission.title} — press M to start ($${mission.reward})`;
  const step = currentStep(manager);
  let text = `JOB ${mission.id} ${mission.title}: ${step.label}`;
  if (step.kind === 'shoot') text += ` (${manager.kills}/${step.count || 1})`;
  if (step.kind === 'wait') text += ` — hack ${Math.min(100, Math.round((manager.waitProgress / (step.seconds || 8)) * 100))}%`;
  if (step.seconds && manager.timer > 0) text += ` — ${Math.ceil(manager.timer)}s`;
  return text;
}

export function missionReward(manager, id) {
  const mission = MISSIONS.find((m) => m.id === id);
  return mission ? mission.reward : 0;
}
