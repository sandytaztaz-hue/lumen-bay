// LUMEN BAY — missions.js
// The fifteen story jobs: start, the gold marker, arrival check,
// completion with rewards, and complete-all. A job completes when Mara
// reaches within 10 metres of its target (job 15 also needs its 4 vault
// guards down first).

import { JOBS } from './config.js';
import { takeNextTurf } from './turf.js';

// ctx carries: state, hud, audio, race, marker helpers (setMarker,
// clearMarker), spawnVaultGuards, saveGame.
export function currentJob(state) {
  if (state.jobIndex >= JOBS.length) return null;
  return JOBS[state.jobIndex];
}

export function startJob(ctx, n) {
  const state = ctx.state;
  const job = JOBS[n - 1];
  if (!job) return null;
  state.jobIndex = n - 1;
  state.jobStage = 1;
  state.guardsDown = 0;
  // Timed jobs (2, 12, 15) count down from the job clock; untimed jobs
  // have no timer line. The race clock owns job 12's countdown live.
  state.jobTimeLeft = job.time != null ? job.time : null;
  state.jobTimeTotal = job.time != null ? job.time : null;
  // The arrival check only fires after Mara has left the target radius
  // at least once: spawning on top of a target must not complete it.
  state.jobArmed = false;
  if (ctx.setMarker) ctx.setMarker(job);
  if (job.race && ctx.race) ctx.race.start();
  if (job.guards && ctx.spawnVaultGuards) ctx.spawnVaultGuards();
  if (ctx.hud) {
    ctx.hud.logLine('JOB ' + job.n + ': ' + job.title + ' — ' + job.brief);
  }
  return job;
}

export function completeJob(ctx, job, force = false) {
  const state = ctx.state;
  if (!job) return null;
  if (state.completed.includes(job.n)) return null;
  if (job.guards && !force && state.guardsDown < job.guards) return null;
  state.completed.push(job.n);
  state.cash += job.reward;
  state.rep += job.rep;
  state.kills += job.kills;
  let turfName = null;
  if (job.turf) turfName = takeNextTurf(state);
  if (job.garage) state.garageOwned = true;
  if (job.race && ctx.race) ctx.race.stop();
  if (job.n === 15) state.storyComplete = true;
  if (ctx.audio) ctx.audio.stinger();
  if (ctx.hud) {
    ctx.hud.toast('MISSION PASSED', job.title + ' +$' + job.reward.toLocaleString('en-US'), 'good');
    ctx.hud.logLine('MISSION PASSED: ' + job.title + ' — +$' + job.reward.toLocaleString('en-US') + ' · +' + job.rep + ' REP');
    if (turfName) ctx.hud.logLine('Turf taken: ' + turfName + ' — ' + state.turf.length + '/12');
    if (job.garage) ctx.hud.logLine('Bay Garage is yours — tune the Comet.');
  }
  if (ctx.clearMarker) ctx.clearMarker();
  if (ctx.saveGame) ctx.saveGame();
  return job;
}

// Complete the current job right now, whatever its conditions are.
// Used by the probe and by the race win.
export function completeCurrentJob(ctx) {
  const job = currentJob(ctx.state);
  if (!job) return null;
  if (job.guards) ctx.state.guardsDown = job.guards;
  const done = completeJob(ctx, job, true);
  if (!done) return null;
  // Advance to the next job in story order. The old code re-read the
  // current job here (same index) and restarted the job just finished,
  // so the story could never get past job 1 — and turf, the timed jobs
  // and the turf-unlocked weapons could never be reached in live play.
  const next = JOBS[job.n]; // job.n is 1-based, so JOBS[job.n] is next
  if (next) startJob(ctx, next.n);
  else ctx.state.jobIndex = JOBS.length;
  return done;
}

// Complete every job that is not done yet, in story order.
export function completeAllJobs(ctx) {
  const done = [];
  for (const job of JOBS) {
    if (ctx.state.completed.includes(job.n)) continue;
    ctx.state.jobIndex = job.n - 1;
    if (job.guards) ctx.state.guardsDown = job.guards;
    const d = completeJob(ctx, job, true);
    if (d) done.push(d.n);
  }
  ctx.state.jobIndex = JOBS.length;
  if (ctx.clearMarker) ctx.clearMarker();
  if (ctx.race) ctx.race.stop();
  return done;
}

// Live arrival check, run every frame: within 10 metres of the target.
export function checkArrival(ctx, pos) {
  const state = ctx.state;
  if (state.frozen || !state.started || state.paused) return;
  const job = currentJob(state);
  if (!job) return;
  if (job.race) return; // The race completes job 12 on its own win.
  const dx = pos.x - job.target.x;
  const dz = pos.z - job.target.z;
  const d2 = dx * dx + dz * dz;
  if (d2 > 10 * 10) {
    state.jobArmed = true;
    return;
  }
  if (!state.jobArmed) return;
  if (job.guards && state.guardsDown < job.guards) return;
  completeCurrentJob(ctx);
}
