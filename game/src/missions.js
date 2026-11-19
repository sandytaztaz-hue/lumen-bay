// LUMEN BAY r6 — the story engine: 15 missions in order, each a list of staged
// objectives. A stage completes from the world state the main loop feeds in
// (position, car, kills, robbery, race, purchase); the engine never touches the
// renderer directly — it reports events and the main loop acts on them.
import { MISSIONS, dist2 } from './config.js';

export class MissionEngine {
  constructor(ctx) {
    this.ctx = ctx;
    this.missionIdx = 0;      // index into MISSIONS (0-based); 15 = story done
    this.stageIdx = 0;
    this.active = false;
    this.timer = 0;
    this.waitT = 0;
    this.killBase = 0;
    this.done = false;
    this.banner = null;       // { title, sub, until } shown by the HUD
    this.objective = 'Press M to start the story';
  }

  current() {
    return this.missionIdx < MISSIONS.length ? MISSIONS[this.missionIdx] : null;
  }

  stage() {
    const m = this.current();
    return m ? m.stages[this.stageIdx] : null;
  }

  startMission(i) {
    const m = MISSIONS[i];
    if (!m) return false;
    this.missionIdx = i;
    this.stageIdx = 0;
    this.active = true;
    this.done = false;
    this.timer = 0;
    this.waitT = 0;
    this.killBase = this.ctx.enemiesKilled || 0;
    this.ctx.log(`JOB ${m.id}: ${m.title} — ${m.brief}`);
    for (const line of m.dialogue) this.ctx.log(line);
    if (m.wanted) this.ctx.setWanted(m.wanted);
    if (m.patrols) this.ctx.spawnPatrols(m.patrols);
    this.setupStage();
    this.ctx.onMissionStart(m);
    return true;
  }

  setupStage() {
    const s = this.stage();
    if (!s) return;
    this.timer = s.seconds || 0;
    this.waitT = 0;
    this.killBase = this.ctx.enemiesKilled || 0;
    if (s.t === 'combat' || s.t === 'defend') {
      const kind = s.t === 'defend' ? 'shark' : (this.missionIdx + 1 === 6 ? 'police' : 'shark');
      const at = s.at || [0, 0];
      this.ctx.spawnEnemies(at[0], at[1], s.count, kind);
    }
    if (s.t === 'race') this.ctx.startRace(s.checkpoints);
    if (s.t === 'evade' && this.ctx.wanted < 2) this.ctx.setWanted(this.missionIdx + 1 === 10 ? 4 : 2);
    this.refreshObjective();
  }

  refreshObjective() {
    const m = this.current();
    const s = this.stage();
    if (!m) { this.objective = 'Story complete — Puerto Lumen is yours. Free roam!'; return; }
    if (!this.active) { this.objective = `Job ${m.id}: ${m.title} — press M to start`; return; }
    this.objective = `Job ${m.id}: ${m.title} — ${s ? s.label : ''}`;
  }

  completeStage() {
    const m = this.current();
    this.stageIdx += 1;
    if (this.stageIdx >= m.stages.length) {
      this.completeMission();
      return;
    }
    this.ctx.log(`Objective done — next: ${m.stages[this.stageIdx].label}`);
    this.setupStage();
  }

  completeMission() {
    const m = this.current();
    this.active = false;
    this.ctx.addCash(m.reward);
    if (m.flip) this.ctx.flipDistrict(m.flip);
    this.ctx.log(`JOB DONE: ${m.title} — +$${m.reward}`);
    this.ctx.onMissionComplete(m);
    this.banner = { title: 'JOB DONE', sub: `${m.title}  +$${m.reward}`, until: performance.now() + 4000 };
    this.missionIdx += 1;
    this.stageIdx = 0;
    const next = this.current();
    if (next) {
      this.objective = `Job ${next.id}: ${next.title} — press M to start`;
    } else {
      this.objective = 'Story complete — Puerto Lumen is yours. Free roam!';
      this.ctx.log('EL PUERTO ES NUESTRO — all 12 districts held. 12/12 TURF.');
    }
  }

  failTimed() {
    const m = this.current();
    this.ctx.log(`Too slow — ${m.title} failed. Press M to retry.`);
    this.active = false;
    this.stageIdx = 0;
    this.refreshObjective();
  }
}

// ---- per-frame stage checks -------------------------------------------------

MissionEngine.prototype.update = function update(dt) {
  if (!this.active) return;
  const s = this.stage();
  const ctx = this.ctx;
  if (!s) return;
  const px = ctx.playerX;
  const pz = ctx.playerZ;

  if (s.t === 'goto' || s.t === 'drive' || s.t === 'pickup') {
    if (dist2([px, pz], s.pos) < s.radius) {
      if (s.t === 'pickup') ctx.log('Picked up.');
      this.completeStage();
    }
    return;
  }
  if (s.t === 'timed') {
    this.timer -= dt;
    if (dist2([px, pz], s.pos) < s.radius) { this.completeStage(); return; }
    if (this.timer <= 0) { this.failTimed(); return; }
    return;
  }
  if (s.t === 'wait') {
    if (dist2([px, pz], s.pos) < 14) {
      this.waitT += dt;
      if (this.waitT >= s.seconds) { ctx.log('Hack complete.'); this.completeStage(); }
    } else {
      this.waitT = Math.max(0, this.waitT - dt * 2);
    }
    return;
  }
  if (s.t === 'combat' || s.t === 'defend') {
    const killed = (ctx.enemiesKilled || 0) - this.killBase;
    if (killed >= s.count) { this.completeStage(); return; }
    if (s.t === 'defend') {
      this.timer -= dt;
      if (this.timer <= 0) { this.failTimed(); }
    }
    return;
  }
  if (s.t === 'evade') {
    if (ctx.wanted <= 0) { this.completeStage(); }
    return;
  }
  if (s.t === 'enterCar') {
    if (ctx.enteredCar) {
      if (s.police && ctx.enteredCar !== 'police') {
        ctx.log('That is not a police cruiser.');
        ctx.enteredCar = null;
        return;
      }
      ctx.enteredCar = null;
      this.completeStage();
    }
    return;
  }
  if (s.t === 'rob') {
    if (ctx.robbedTarget === s.target) {
      ctx.robbedTarget = null;
      this.completeStage();
    }
    return;
  }
  if (s.t === 'race') {
    if (ctx.raceWon) {
      ctx.raceWon = false;
      this.completeStage();
    } else if (ctx.raceLost) {
      ctx.raceLost = false;
      this.failTimed();
    }
    return;
  }
  if (s.t === 'buy') {
    if (ctx.boughtProp === s.prop) {
      ctx.boughtProp = null;
      this.completeStage();
    }
    return;
  }
};

/** Seconds left on a timed / wait stage, for the HUD timer. */
MissionEngine.prototype.stageTimeLeft = function stageTimeLeft() {
  const s = this.stage();
  if (!s || !this.active) return null;
  if (s.t === 'timed' || s.t === 'defend') return Math.max(0, this.timer);
  if (s.t === 'wait') return Math.max(0, s.seconds - this.waitT);
  return null;
};

/** Current stage target position for the beacon / minimap, or null. */
MissionEngine.prototype.stageTarget = function stageTarget() {
  const s = this.stage();
  if (!s || !this.active) return null;
  if (s.pos) return s.pos;
  if (s.at) return s.at;
  if (s.t === 'buy') return [-210, -40];
  if (s.t === 'race') return null;
  return null;
};
