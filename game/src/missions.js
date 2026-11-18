// The 12 story missions of LUMEN BAY. Each mission is a list of stages; a stage
// is one verb — walk to a point, steal a car, drive somewhere (sometimes against
// a timer), lose the heat, shoot a cordon, wait for a hack, rescue a crew member.
// The manager only tracks state and completion; the world effects (spawning the
// target car, the cordon police, the courier van) live in main.js, called through
// the hooks the manager is given.
import { MISSION_REWARDS } from './config.js';

const V = (x, z) => ({ x, z });
const MARINA = V(0, -258);
const SAFEHOUSE = V(-65, 195);
const MERCADO = V(-130, 0);
const GARAGE = V(130, 130);
const TOWER = V(0, -200);
const LIGHTHOUSE = V(230, 265);
const CASINO = V(195, -65);
const BEACH = V(-40, 292);

export const MISSIONS = [
  {
    id: 1, name: 'First Keys', giver: 'Tio Reyes',
    brief: 'Steal the Comet GT from the marina docks and bring it to the safehouse.',
    dialogue: [
      'TIO REYES: "Mara, the Comet GT is sitting at the marina. Keys in it. Take it."',
      'MARA: "First job, first car. On my way."',
    ],
    stages: [
      { type: 'goto', name: 'Reach the marina', text: 'Walk to the Comet GT at the marina docks', pos: MARINA },
      { type: 'steal', name: 'Steal the Comet GT', text: 'Press E to steal the Comet GT', carKind: 'gt', pos: MARINA },
      { type: 'driveTo', name: 'Drive to the safehouse', text: 'Drive the Comet GT to the safehouse', pos: SAFEHOUSE },
    ],
  },
  {
    id: 2, name: 'The Drop', giver: 'Tio Reyes',
    brief: 'A package for Mercado Viejo. Ninety seconds. Do not be late.',
    dialogue: ['TIO REYES: "Package in the trunk. Mercado Viejo, ninety seconds. Go."'],
    stages: [
      { type: 'timed', name: 'Deliver to Mercado Viejo', text: 'Drive the package to Mercado Viejo — 90 seconds!', pos: MERCADO, time: 90 },
    ],
  },
  {
    id: 3, name: 'Hot Wheels', giver: 'Lena Cruz',
    brief: 'Two stars on you. Break line of sight and let the heat die.',
    dialogue: ['LENA: "Cops are on you. Duck down a side street and stay hidden till it cools off."'],
    stages: [
      { type: 'evade', name: 'Lose the police', text: 'Stay out of police sight until your wanted level drops to zero', heat: 2 },
    ],
  },
  {
    id: 4, name: 'The Marina Job', giver: 'Lena Cruz',
    brief: 'Pick up my cargo crate at the docks and run it to Taller Lumen.',
    dialogue: ['LENA: "Crate is on pier two. Patrol cars are out — keep moving."'],
    stages: [
      { type: 'pickup', name: 'Collect the crate', text: 'Pick up Lena\'s crate at the marina docks', pos: MARINA },
      { type: 'driveTo', name: 'Deliver to Taller Lumen', text: 'Deliver the crate to Taller Lumen', pos: GARAGE, patrols: true },
    ],
  },
  {
    id: 5, name: 'Payday', giver: 'Tio Reyes',
    brief: 'Ambush the courier van on the coast road, grab the cash, get out.',
    dialogue: ['TIO REYES: "Courier van, coast road, one escort. Take the cash, leave the van."'],
    stages: [
      { type: 'goto', name: 'Reach the coast road', text: 'Get to the ambush point on the coast road', pos: V(195, 130) },
      { type: 'shoot', name: 'Stop the escort', text: 'Shoot out the courier escort (3 guards)', pos: V(195, 130), count: 3 },
      { type: 'pickup', name: 'Grab the cash', text: 'Grab the courier cash', pos: V(195, 130) },
      { type: 'driveTo', name: 'Escape to the safehouse', text: 'Escape to the safehouse with the cash', pos: SAFEHOUSE },
    ],
  },
  {
    id: 6, name: 'The Informant', giver: 'Lena Cruz',
    brief: 'Dario is pinned in a police cordon at the market. Get him out.',
    dialogue: ['LENA: "They have Dario cornered in the market square. Clear the cordon, Mara."'],
    stages: [
      { type: 'shoot', name: 'Break the cordon', text: 'Shoot the cordon police at Mercado Viejo (4 officers)', pos: MERCADO, count: 4 },
      { type: 'goto', name: 'Reach Dario', text: 'Reach Dario in the market square', pos: MERCADO },
      { type: 'driveTo', name: 'Drive Dario out', text: 'Drive Dario out of the market', pos: SAFEHOUSE },
    ],
  },
  {
    id: 7, name: 'Night Shift', giver: 'Lena Cruz',
    brief: 'Drive Lena to three hack checkpoints. Wait at each until her hack finishes.',
    dialogue: ['LENA: "Three checkpoints, one night. Park, wait for my hack, move. No patrols."'],
    stages: [
      { type: 'wait', name: 'Hack checkpoint 1', text: 'Wait at the tower checkpoint while Lena hacks', pos: TOWER, time: 8 },
      { type: 'wait', name: 'Hack checkpoint 2', text: 'Wait at the casino checkpoint while Lena hacks', pos: CASINO, time: 8 },
      { type: 'wait', name: 'Hack checkpoint 3', text: 'Wait at the garage checkpoint while Lena hacks', pos: GARAGE, time: 8 },
    ],
  },
  {
    id: 8, name: 'The Swap', giver: 'Big Dario',
    brief: 'Steal a police cruiser and deliver it to Taller Lumen. Loud job.',
    dialogue: ['BIG DARIO: "I need a cruiser. Take one. Bring it to the garage. Try not to die."'],
    stages: [
      { type: 'steal', name: 'Steal a police cruiser', text: 'Steal a police cruiser (press E near one)', carKind: 'police', heat: 3 },
      { type: 'driveTo', name: 'Deliver the cruiser', text: 'Deliver the cruiser to Taller Lumen', pos: GARAGE },
    ],
  },
  {
    id: 9, name: 'Beach Run', giver: 'Tio Reyes',
    brief: 'Smuggle crates down Playa Dorada to the lighthouse. Two minutes.',
    dialogue: ['TIO REYES: "Crates to the lighthouse, coast road, two minutes. Beach patrols are out."'],
    stages: [
      { type: 'timed', name: 'Run the coast road', text: 'Drive the coast road to the Farol Rojo lighthouse — 120 seconds!', pos: LIGHTHOUSE, time: 120, patrols: true },
    ],
  },
  {
    id: 10, name: 'High Tide', giver: 'Lena Cruz',
    brief: 'Four stars and a helicopter. Reach the lighthouse, then vanish in the dunes.',
    dialogue: ['LENA: "The helicopter is up. Get to the lighthouse and lose them in the dunes."'],
    stages: [
      { type: 'driveTo', name: 'Reach the lighthouse', text: 'Reach the Farol Rojo lighthouse under helicopter pursuit', pos: LIGHTHOUSE, heat: 4 },
      { type: 'evade', name: 'Lose the helicopter', text: 'Hide in the dunes until the heat drops to zero', heat: 0 },
    ],
  },
  {
    id: 11, name: 'The Getaway', giver: 'Tio Reyes',
    brief: 'Rob the casino vault, fight the guards, escape by car to the marina boat.',
    dialogue: ['TIO REYES: "Casino Sol vault. Guards inside. Cash out, boat at the marina."'],
    stages: [
      { type: 'shoot', name: 'Fight through the guards', text: 'Fight through the casino guards (5 guards)', pos: CASINO, count: 5 },
      { type: 'pickup', name: 'Grab the vault cash', text: 'Grab the vault cash', pos: CASINO },
      { type: 'driveTo', name: 'Escape to the marina boat', text: 'Escape by car to the marina boat', pos: MARINA },
    ],
  },
  {
    id: 12, name: 'The Last Sunset', giver: 'Tio Reyes',
    brief: 'The finale: vault heist at Torre Lumen, then a beach escape in the Comet GT.',
    dialogue: [
      'TIO REYES: "Last one, Mara. Torre Lumen vault, then the coast road to the boat."',
      'MARA: "One last sunset. Let\'s make it count."',
    ],
    stages: [
      { type: 'shoot', name: 'Clear the tower guards', text: 'Clear the tower guards (5 guards)', pos: TOWER, count: 5 },
      { type: 'pickup', name: 'Take the vault cash', text: 'Take the Torre Lumen vault cash', pos: TOWER },
      { type: 'driveTo', name: 'Beach escape', text: 'Drive the Comet GT down the coast road to the boat', pos: BEACH, heat: 5 },
    ],
  },
];

export function missionReward(id) { return MISSION_REWARDS[id - 1] || 500; }

/** Mission state machine: which mission is active, which stage, timers and kill
 *  counts. It calls back into main.js for world effects and for the HUD. */
export class MissionManager {
  constructor(hooks) {
    this.hooks = hooks;
    this.nextIndex = 0;        // index into MISSIONS of the next mission to start
    this.active = null;        // the mission object currently running
    this.stageIndex = 0;
    this.stageTimer = 0;
    this.stageKills = 0;
    this.stageProgress = 0;
    this.completedCount = 0;
    this.totalEarned = 0;
  }

  get current() { return this.active; }
  get stage() { return this.active ? this.active.stages[this.stageIndex] : null; }

  objectiveText() {
    if (!this.active) {
      return this.nextIndex < MISSIONS.length
        ? `Press M — next job: ${MISSIONS[this.nextIndex].name}`
        : 'All 12 jobs done. Puerto Lumen is yours.';
    }
    const s = this.stage;
    let text = `JOB ${this.active.id}/12 — ${this.active.name}: ${s.text}`;
    if (s.type === 'timed' && this.stageTimer > 0) text += `  [${Math.ceil(this.stageTimer)}s]`;
    if (s.type === 'wait' && this.stageProgress > 0) text += `  [${Math.floor(this.stageProgress / s.time * 100)}%]`;
    if (s.type === 'shoot') text += `  [${this.stageKills}/${s.count}]`;
    return text;
  }

  markerPos() {
    const s = this.stage;
    if (!s || !s.pos) return null;
    return { x: s.pos.x, z: s.pos.z };
  }

  startNext() {
    if (this.active || this.nextIndex >= MISSIONS.length) return false;
    this.active = MISSIONS[this.nextIndex];
    this.stageIndex = 0;
    this.beginStage();
    for (const line of this.active.dialogue) this.hooks.log(line);
    this.hooks.log(`JOB ${this.active.id} STARTED — ${this.active.name}: ${this.active.brief}`);
    this.hooks.onMissionStart(this.active);
    return true;
  }

  beginStage() {
    const s = this.stage;
    this.stageTimer = s.type === 'timed' ? s.time : 0;
    this.stageKills = 0;
    this.stageProgress = 0;
    if (s.heat) this.hooks.setWanted(s.heat);
    this.hooks.onStageStart(this.active, s);
    this.hooks.log(`> ${s.name}: ${s.text}`);
  }

  noteKill() { this.stageKills += 1; }

  noteSteal(carKind) {
    const s = this.stage;
    if (s && s.type === 'steal' && (!s.carKind || s.carKind === carKind)) this.advance();
  }

  advance() {
    this.hooks.log(`✓ ${this.stage.name} complete`);
    this.stageIndex += 1;
    if (this.stageIndex >= this.active.stages.length) this.completeMission();
    else this.beginStage();
  }

  completeMission() {
    const m = this.active;
    const reward = missionReward(m.id);
    this.completedCount += 1;
    this.totalEarned += reward;
    this.nextIndex += 1;
    this.active = null;
    this.hooks.onMissionComplete(m, reward);
  }

  update(dt, ctx) {
    if (!this.active) return;
    const s = this.stage;
    const dx = s.pos ? ctx.playerPos.x - s.pos.x : 0;
    const dz = s.pos ? ctx.playerPos.z - s.pos.z : 0;
    const dist = Math.hypot(dx, dz);
    switch (s.type) {
      case 'goto':
      case 'pickup':
        if (dist < 6) this.advance();
        break;
      case 'driveTo':
        if (dist < 9) this.advance();
        break;
      case 'timed':
        this.stageTimer -= dt;
        if (dist < 9) { this.advance(); break; }
        if (this.stageTimer <= 0) {
          this.stageTimer = s.time;
          this.hooks.log('Too slow — the drop window closed. Try again.');
          this.hooks.onStageStart(this.active, s);
        }
        break;
      case 'evade':
        if (ctx.wanted <= 0) this.advance();
        break;
      case 'shoot':
        if (this.stageKills >= s.count) this.advance();
        break;
      case 'wait': {
        if (dist < 10) {
          this.stageProgress += dt;
          if (this.stageProgress >= s.time) this.advance();
        } else {
          this.stageProgress = 0;
        }
        break;
      }
      default:
        break;
    }
  }
}
