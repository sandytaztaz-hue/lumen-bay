// The 12 story missions of LUMEN BAY. A mission is an ordered list of stages
// from config.js; this module runs the state machine over them. The game loop
// owns the world (player position, car, wanted level, kills); this module owns
// only mission progress and asks the game loop questions through a small
// context object, so the logic stays testable in a headless probe:
//
//   ctx = { px, pz, inCar, carSpeed, kills, wanted, time, nearCar, nearPoliceCar,
//           onEnterCar, onStageEvent }
//
// Stages and their verbs:
//   go     — reach a radius around a point (on foot or in a car)
//   drive  — reach a radius while in a car (timed when the stage says so)
//   steal  — press E next to the mission car
//   stealPolice — press E next to any police cruiser
//   shoot  — kill N cordon officers (the game loop spawns the cordon)
//   wait   — stay inside a radius for N seconds (Lena hacks)
//   evade  — survive until wanted heat reaches zero
//
// The module reports events back through ctx.emit: 'stage', 'mission',
// 'failed', 'dialogue', 'cordon' (spawn N officers at a point), 'heat'
// (set wanted to a value), 'banner' (show a job-done banner with cash).

import { MISSIONS } from './config.js';

export function createMissionState(save) {
  const done = save && Array.isArray(save.missionsDone) ? save.missionsDone.slice() : [];
  let current = 0;
  if (save && Number.isInteger(save.missionIndex)) current = save.missionIndex;
  else {
    // First uncompleted mission in order.
    for (let i = 0; i < MISSIONS.length; i += 1) {
      if (!done.includes(MISSIONS[i].id)) { current = i; break; }
      current = MISSIONS.length;
    }
  }
  return {
    index: current, // index into MISSIONS, or MISSIONS.length when all done
    stage: 0,
    done,
    active: false, // M starts the current mission
    timer: 0, timerMax: 0,
    waitLeft: 0, killsLeft: 0,
    stageDone: false,
    dialogue: null, dialogueAt: 0,
    banner: null, bannerAt: 0,
    log: [],
  };
}

export function currentMission(state) {
  return state.index < MISSIONS.length ? MISSIONS[state.index] : null;
}

export function currentStage(state) {
  const m = currentMission(state);
  return m ? m.stages[state.stage] : null;
}

export function stageText(state) {
  const m = currentMission(state);
  if (!m) return 'All 12 missions complete — Puerto Lumen is yours, Mara.';
  if (!state.active) return `Next job: ${m.name} — press M to start`;
  const s = currentStage(state);
  if (!s) return m.name;
  let text = `Job ${m.id}/12 ${m.name}: ${s.text}`;
  if (s.timed && state.timer > 0) text += ` — ${Math.ceil(state.timer)}s`;
  if (s.verb === 'shoot' && state.killsLeft > 0) text += ` (${state.killsLeft} left)`;
  if (s.verb === 'wait' && state.waitLeft > 0) text += ` (${Math.ceil(state.waitLeft)}s)`;
  return text;
}

// Start the current mission: reset stage, timer and dialogue, set the heat
// the mission opens with, and spawn a cordon if the first stage needs one.
export function startMission(state, emit) {
  const m = currentMission(state);
  if (!m || state.active) return false;
  state.active = true;
  state.stage = 0;
  state.killsLeft = 0;
  state.waitLeft = 0;
  state.timer = m.timer || 0;
  state.timerMax = m.timer || 0;
  state.dialogue = m.dialogue;
  state.dialogueAt = 0;
  emit('dialogue', m.dialogue);
  emit('log', `Job ${m.id} started: ${m.name} — ${m.brief}`);
  emit('heat', m.heat || 0);
  const s = m.stages[0];
  if (s && s.verb === 'shoot') {
    state.killsLeft = s.kills || 1;
    emit('cordon', { x: s.x, z: s.z, count: s.kills || 1 });
  }
  return true;
}

function advanceStage(state, emit) {
  const m = currentMission(state);
  if (!m) return;
  state.stage += 1;
  state.waitLeft = 0;
  if (state.stage >= m.stages.length) {
    completeMission(state, emit);
    return;
  }
  const s = m.stages[state.stage];
  emit('log', `Stage: ${s.text}`);
  if (s.verb === 'shoot') {
    state.killsLeft = s.kills || 1;
    emit('cordon', { x: s.x, z: s.z, count: s.kills || 1 });
  }
  if (s.verb === 'wait') state.waitLeft = s.wait || 5;
}

function completeMission(state, emit) {
  const m = currentMission(state);
  state.active = false;
  state.done.push(m.id);
  state.index += 1;
  state.stage = 0;
  state.banner = { title: 'JOB DONE', sub: `${m.name} — +$${m.reward.toLocaleString('en-US')}`, cash: m.reward };
  state.bannerAt = 0;
  emit('banner', state.banner);
  emit('log', `JOB DONE: ${m.name} — +$${m.reward}`);
  emit('cash', m.reward);
  const next = currentMission(state);
  if (next) emit('log', `Next job unlocked: ${next.name} (press M)`);
  else emit('log', 'ALL 12 JOBS DONE — Mara owns the sunset.');
}

// One fixed step. Returns nothing; all effects go through emit. `ctx` carries
// the live world: player position, car state, kill count since the stage
// started, and the wanted level.
export function updateMissions(state, ctx, dt, emit) {
  const m = currentMission(state);
  if (!m) return;
  if (state.banner) {
    state.bannerAt += dt;
    if (state.bannerAt > 4) state.banner = null;
  }
  if (!state.active) return;
  const s = currentStage(state);
  if (!s) return;

  // Mission timers (The Drop, Beach Run) tick down whenever the job is live.
  if (s.timed && state.timer > 0) {
    state.timer -= dt;
    if (state.timer <= 0) {
      state.timer = 0;
      state.active = false;
      state.stage = 0;
      emit('failed', `${m.name}: out of time — press M to retry`);
      emit('log', `${m.name} failed: time ran out`);
      return;
    }
  }

  const dist = Math.hypot(ctx.px - s.x, ctx.pz - s.z);
  switch (s.verb) {
    case 'go':
      if (dist < s.radius) advanceStage(state, emit);
      break;
    case 'drive':
      if (ctx.inCar && dist < s.radius) advanceStage(state, emit);
      break;
    case 'steal':
      // The game loop sets ctx.stoleMissionCar when E is pressed near the car.
      if (ctx.stoleMissionCar) advanceStage(state, emit);
      break;
    case 'stealPolice':
      if (ctx.stolePoliceCar) advanceStage(state, emit);
      break;
    case 'shoot': {
      // ctx.kills is the running kill count; the stage completes when the
      // required number of officers are down.
      if (ctx.kills >= state.killsLeft) advanceStage(state, emit);
      break;
    }
    case 'wait':
      if (dist < s.radius) {
        state.waitLeft -= dt;
        if (state.waitLeft <= 0) advanceStage(state, emit);
      } else {
        state.waitLeft = s.wait || 5; // leaving the mark resets the hack
      }
      break;
    case 'evade':
      if (ctx.wanted <= 0.05) advanceStage(state, emit);
      break;
    default:
      break;
  }
}

// Called by the game loop when Mara kills a cordon officer during a shoot stage.
export function registerKill(state, emit) {
  const m = currentMission(state);
  if (!m || !state.active) return;
  const s = currentStage(state);
  if (s && s.verb === 'shoot') {
    emit('log', `Officer down — ${Math.max(0, state.killsLeft - 1)} to go`);
  }
}

// The shoot stage counts kills through ctx.kills, which the game loop resets
// to zero whenever a shoot stage begins. This helper is what the loop calls
// at that moment so the count and the stage agree.
export function resetStageKills(ctx) {
  ctx.kills = 0;
  return ctx;
}

// Save-friendly snapshot: mission index, completed ids, nothing else.
export function missionSave(state) {
  return { missionIndex: state.index, missionsDone: state.done.slice() };
}

// Human-readable mission list for the pause menu and the dossier text.
export function missionListText(state) {
  return MISSIONS.map((m) => {
    const mark = state.done.includes(m.id) ? '[DONE]' : (currentMission(state) === m ? '[NEXT]' : '[LOCKED]');
    return `${mark} ${m.id}. ${m.name} — $${m.reward} — ${m.brief}`;
  }).join('\n');
}
