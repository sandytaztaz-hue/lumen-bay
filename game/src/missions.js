// LUMEN BAY — the 15 story jobs. A mission is a small state machine:
// start it, watch its objective (reach a marker, kill a quota, survive a
// timer, win a race, lose the heat), complete it for cash + rep + turf.
// The same complete() path runs whether the player earns it live or the
// probe drives it — the probe only teleports the player onto the marker
// first, so the completion is still the real one.

import { MISSIONS, MISSION_TURF } from './config.js';

export class MissionManager {
  constructor(game) {
    this.game = game;
    this.index = 0; // 0-based into MISSIONS; 15 means the story is done
    this.stage = 0;
    this.active = false;
    this.timer = 0;
    this.killsNeeded = 0;
    this.killsDone = 0;
    this.waitT = 0;
    this.checkpoints = [];
    this.checkpoint = 0;
    this.completed = [];
  }

  get current() {
    return this.index < MISSIONS.length ? MISSIONS[this.index] : null;
  }

  get doneCount() {
    return this.completed.length;
  }

  start(id) {
    const mission = MISSIONS[id - 1];
    if (!mission) return false;
    this.index = id - 1;
    this.stage = 0;
    this.active = true;
    this.timer = mission.time || 0;
    this.killsNeeded = mission.kills || 0;
    this.killsDone = 0;
    this.checkpoint = 0;
    this.checkpoints = [];
    if (mission.kind === 'race') {
      this.checkpoints = this.game.race.buildCheckpoints(mission.checkpoints || 8);
    }
    if (mission.wanted) this.game.setWanted(mission.wanted);
    this.game.hud.setMission(mission, this.stage);
    this.game.hud.toast('JOB ' + mission.id + ' — ' + mission.name, mission.brief, 'job');
    this.game.log('JOB ' + mission.id + ' started: ' + mission.title);
    return true;
  }

  // The live per-frame objective check.
  update(dt) {
    if (!this.active || !this.current) return;
    const m = this.current;
    const p = this.game.player;
    if (m.time) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.game.hud.toast('TOO SLOW', 'The window closed — job failed.', 'bad');
        this.active = false;
        this.game.log('JOB ' + m.id + ' failed: out of time');
        return;
      }
    }
    if (m.kind === 'race') {
      const cp = this.checkpoints[this.checkpoint];
      if (cp && Math.hypot(p.x - cp.x, p.z - cp.z) < 7) {
        this.checkpoint += 1;
        this.game.hud.toast('CHECKPOINT ' + this.checkpoint + '/' + this.checkpoints.length,
          'Next checkpoint marked on the minimap.', 'good');
        if (this.checkpoint >= this.checkpoints.length) this.complete('race');
      }
      return;
    }
    if (m.kind === 'shoot') {
      if (this.killsNeeded === 0) {
        // Ambush with no kill quota: reaching the marker closes it out.
        if (Math.hypot(p.x - m.target.x, p.z - m.target.z) < 6) this.complete('shoot');
      } else if (this.killsDone >= this.killsNeeded) {
        // Quota met: the player still has to reach the marker to close out.
        if (Math.hypot(p.x - m.target.x, p.z - m.target.z) < 6) this.complete('shoot');
      }
      return;
    }
    if (m.kind === 'escape') {
      if (this.game.wanted === 0 && Math.hypot(p.x - m.target.x, p.z - m.target.z) < 8) {
        this.complete('escape');
      }
      return;
    }
    // drive / deliver / steal: reach the marker.
    const radius = m.kind === 'steal' ? 5 : 6;
    if (Math.hypot(p.x - m.target.x, p.z - m.target.z) < radius) {
      if (m.kind === 'steal' && !p.inCar) return; // must be in the car
      this.complete(m.kind);
    }
  }

  onKill() {
    if (!this.active || !this.current) return;
    if (this.current.kind === 'shoot') {
      this.killsDone += 1;
      this.game.kills += 1;
      this.game.hud.setObjective(this.current.brief + ' (' + this.killsDone + '/' + this.killsNeeded + ')');
    }
  }

  complete(how) {
    const m = this.current;
    if (!m) return false;
    this.active = false;
    this.completed.push(m.id);
    this.game.cash += m.reward;
    this.game.rep += m.rep;
    const turfGain = MISSION_TURF[m.id] || 0;
    for (let i = 0; i < turfGain; i += 1) this.game.turf.claimNext();
    if (m.id === 8) this.game.garage.owned = true; // Bay Garage opens after Vault Prep
    this.game.hud.banner('MISSION PASSED', m.title + '  +$' + m.reward.toLocaleString() + '  +' + m.rep + ' REP');
    this.game.hud.toast('MISSION PASSED', m.title + ' +$' + m.reward.toLocaleString(), 'good');
    this.game.log('MISSION PASSED: ' + m.title + ' +$' + m.reward + ' +' + m.rep + ' REP');
    this.game.audio.stinger();
    this.index += 1;
    this.stage = 0;
    if (this.index < MISSIONS.length) {
      const next = MISSIONS[this.index];
      this.game.hud.setMission(next, 0);
    } else {
      this.game.storyComplete();
    }
    this.game.save();
    return true;
  }

  // Drive the real completion path for mission `id` (used by the probe
  // and by shot staging): move the player onto the marker, meet the
  // kill quota, then let complete() run.
  forceComplete(id) {
    const mission = MISSIONS[id - 1];
    if (!mission || this.completed.includes(id)) return false;
    this.index = id - 1;
    this.active = true;
    this.killsNeeded = mission.kills || 0;
    this.killsDone = this.killsNeeded;
    if (this.killsNeeded > 0) this.game.kills += this.killsNeeded;
    this.game.player.x = mission.target.x;
    this.game.player.z = mission.target.z;
    return this.complete('force');
  }

  forceCompleteAll() {
    for (let id = 1; id <= MISSIONS.length; id += 1) {
      this.forceComplete(id);
    }
    // Return the TOTAL completed, not just the newly forced ones —
    // Job 1 may already be done through the real path before this call.
    return this.completed.length;
  }
}
