// The story: eight jobs for Mara Solis, from first keys to the last sunset.
// A small data-driven stage machine — each stage is one goal (reach a
// place, steal a car, lose the heat, beat a cordon, hold a spot) with an
// optional timer and a line of dialogue. Finishing a job pays cash and
// unlocks the next one.
import { SPOTS, CREW } from './config.js';
import { dist2d } from './random.js';

export const STORY = [
  {
    id: 1, name: 'FIRST KEYS', giver: CREW.tio, pay: 400,
    brief: 'Steal the Comet GT waiting at Marina Lumen. No noise, no heat.',
    lines: [
      [CREW.tio, 'Mara. A Comet GT is parked at the marina, keys behind the sun visor. Take it before the owner wakes.'],
      [CREW.mara, 'Consider it gone, Tio. Quiet as the tide rolling in.'],
    ],
    stages: [
      { type: 'enterCar', model: 0, x: -196, z: 175, r: 6, text: 'Steal the Comet GT at Marina Lumen' },
    ],
  },
  {
    id: 2, name: 'THE DROP', giver: CREW.lena, pay: 600,
    brief: 'A package for Mercado Viejo. Ninety seconds. The streets are watching.',
    lines: [
      [CREW.lena, 'The package is in the boot. Mercado Viejo, ninety seconds — the buyer leaves at 18:41 sharp.'],
      [CREW.mara, 'Ninety seconds. I drive quicker than the gossip in this town, Lena.'],
    ],
    stages: [
      { type: 'goto', x: SPOTS.mercado.x, z: SPOTS.mercado.z, r: 8, timer: 90, needCar: true, text: 'Deliver the package to Mercado Viejo — 90 s' },
    ],
  },
  {
    id: 3, name: 'HOT WHEELS', giver: CREW.tio, pay: 800,
    brief: 'Two stars and a tail. Lose them before the net closes.',
    lines: [
      [CREW.tio, 'You picked up a tail at the drop. Two stars on you now. Shake them off, Mara.'],
      [CREW.dispatch, 'All units: orange Comet GT, last seen near Mercado Viejo. Box it in.'],
    ],
    stages: [
      { type: 'escape', stars: 2, timer: 150, text: 'Lose the heat — get your wanted level to zero' },
    ],
  },
  {
    id: 4, name: 'THE MARINA JOB', giver: CREW.lena, pay: 1000,
    brief: "Lena's cargo is on the dock. Collect it, run it to the safehouse.",
    lines: [
      [CREW.lena, 'My cargo is on the far dock, blue crates. Bring it home to Calle Sol — quietly.'],
      [CREW.mara, 'Blue crates, Calle Sol. Loud is for other drivers.'],
    ],
    stages: [
      { type: 'goto', x: -210, z: 205, r: 7, text: "Collect Lena's cargo at the marina dock" },
      { type: 'goto', x: SPOTS.safehouse.x, z: SPOTS.safehouse.z, r: 8, text: 'Deliver the cargo to the safehouse' },
    ],
  },
  {
    id: 5, name: 'PAYDAY', giver: CREW.dario, pay: 1500,
    brief: 'The courier van runs Calle Sol at dusk. Take the cash, lose the heat.',
    lines: [
      [CREW.dario, 'Courier van on Calle Sol, full of casino cash. Ram it, grab the bag, run.'],
      [CREW.mara, 'Ram, grab, run. My three favourite verbs.'],
    ],
    stages: [
      { type: 'hit', x: 105, z: -35, r: 10, hits: 3, text: 'Ram the courier van 3 times to crack it open' },
      { type: 'goto', x: SPOTS.taller.x, z: SPOTS.taller.z, r: 8, text: 'Get the cash to Taller Lumen' },
    ],
  },
  {
    id: 6, name: 'THE INFORMANT', giver: CREW.tio, pay: 1200,
    brief: 'Dario is pinned in a police cordon. Shoot your way in, walk him out.',
    lines: [
      [CREW.tio, 'Dario is stuck near the park — three cops, no way out. Go and get him, Mara.'],
      [CREW.dario, 'Mara! About time. These boys shoot like they aim with their eyes shut.'],
    ],
    stages: [
      { type: 'defeat', x: -35, z: 105, r: 16, count: 3, text: 'Clear the police cordon — take down 3 officers' },
      { type: 'goto', x: -35, z: 105, r: 6, text: 'Reach Dario and walk him out' },
    ],
  },
  {
    id: 7, name: 'HIGH TIDE', giver: CREW.lena, pay: 1800,
    brief: 'Four stars and a helicopter. Run for the lighthouse and vanish.',
    lines: [
      [CREW.lena, 'Four stars, bird in the air. The lighthouse road is the only gap in the net.'],
      [CREW.dispatch, 'Air One has the suspect. All ground units converge on Farol Rojo.'],
    ],
    stages: [
      { type: 'escape', stars: 4, timer: 150, gotoX: SPOTS.lighthouse.x, gotoZ: SPOTS.lighthouse.z, gotoR: 10, text: 'Reach Farol Rojo and lose 4 stars of heat' },
    ],
  },
  {
    id: 8, name: 'THE LAST SUNSET', giver: CREW.tio, pay: 2500,
    brief: 'The Torre vault, one last job. Crack it, then run for the beach.',
    lines: [
      [CREW.tio, 'The Torre vault opens once a year — tonight. Crack it, Mara, and we all retire.'],
      [CREW.mara, 'One last sunset job. After this, Puerto Lumen is just a postcard.'],
    ],
    stages: [
      { type: 'hold', x: SPOTS.torre.x + 14, z: SPOTS.torre.z, r: 8, hold: 20, text: 'Crack the Torre vault — hold the spot 20 s' },
      { type: 'goto', x: SPOTS.playa.x, z: SPOTS.playa.z, r: 12, timer: 120, text: 'Escape to Playa Dorada — the boat is waiting' },
    ],
  },
];

export function newStory() {
  return {
    index: 0, // next mission to start (0-based); 8 means the story is done
    active: null, // { mission, stage, timer, holdLeft, hits, defeated }
    done: [],
  };
}

/** Look a mission up by its 1-based id. */
export function findJob(id) {
  return STORY.find((m) => m.id === id) || null;
}

/** Begin mission i (0-based). Returns the mission or null. */
export function startJob(state, i) {
  if (i < 0 || i >= STORY.length) return null;
  const mission = STORY[i];
  state.active = { mission, stage: 0, timer: 0, holdLeft: 0, hits: 0, defeated: 0 };
  state.index = i;
  return mission;
}

export function currentStage(state) {
  if (!state.active) return null;
  return state.active.mission.stages[state.active.stage] || null;
}

export function markerAt(state) {
  const s = currentStage(state);
  if (!s) return null;
  return { x: s.x ?? s.gotoX ?? 0, z: s.z ?? s.gotoZ ?? 0, r: s.r ?? s.gotoR ?? 8 };
}

/**
 * Advance the active mission. ctx carries the player's position, car and
 * wanted state plus an onEvent(kind, data) callback — events are
 * dialogue, objective, stage, complete, failed, hit, defeated.
 * Returns 'active' | 'complete' | 'failed' | 'idle'.
 */
export function progressJob(state, ctx) {
  if (!state.active) return 'idle';
  const a = state.active;
  const stage = currentStage(state);
  if (!stage) return 'idle';
  a.timer += ctx.dt;
  const d = stage.x !== undefined ? dist2d(ctx.x, ctx.z, stage.x, stage.z) : Infinity;

  if (stage.timer && a.timer > stage.timer) {
    ctx.onEvent('failed', { reason: `Out of time on ${a.mission.name}` });
    state.active = null;
    return 'failed';
  }

  switch (stage.type) {
    case 'goto': {
      if (stage.needCar && !ctx.inCar) break;
      if (d < stage.r) return nextStage(state, ctx);
      break;
    }
    case 'enterCar': {
      if (ctx.inCar && ctx.carModel === stage.model) return nextStage(state, ctx);
      break;
    }
    case 'escape': {
      if (stage.gotoX !== undefined) {
        const gd = dist2d(ctx.x, ctx.z, stage.gotoX, stage.gotoZ);
        if (gd < stage.gotoR && ctx.wanted === 0) return nextStage(state, ctx);
      } else if (ctx.wanted === 0) {
        return nextStage(state, ctx);
      }
      break;
    }
    case 'hit': {
      if (ctx.hitVan) {
        a.hits++;
        ctx.onEvent('hit', { hits: a.hits, need: stage.hits });
        if (a.hits >= stage.hits) return nextStage(state, ctx);
      }
      break;
    }
    case 'defeat': {
      if (ctx.defeated > a.defeated) {
        a.defeated = ctx.defeated;
        ctx.onEvent('defeated', { n: a.defeated, need: stage.count });
        if (a.defeated >= stage.count) return nextStage(state, ctx);
      }
      break;
    }
    case 'hold': {
      if (d < stage.r) {
        a.holdLeft = a.holdLeft || stage.hold;
        a.holdLeft -= ctx.dt;
        ctx.onEvent('hold', { left: Math.max(0, a.holdLeft) });
        if (a.holdLeft <= 0) return nextStage(state, ctx);
      } else {
        a.holdLeft = stage.hold;
      }
      break;
    }
    default:
      break;
  }
  return 'active';
}

function nextStage(state, ctx) {
  const a = state.active;
  a.stage++;
  a.timer = 0;
  a.holdLeft = 0;
  if (a.stage >= a.mission.stages.length) {
    const m = a.mission;
    state.done.push(m.id);
    state.active = null;
    state.index = m.id; // the next mission to start (id is 1-based)
    ctx.onEvent('complete', { mission: m });
    return 'complete';
  }
  ctx.onEvent('stage', { mission: a.mission, stage: currentStage(state) });
  return 'active';
}

/** Objective line for the HUD: title + current stage text + countdown.
 * The free-roam line doubles as the prompt to start the next job. */
export function objectiveText(state) {
  if (!state.active) {
    if (state.index >= STORY.length) {
      return { title: 'STORY COMPLETE', text: 'Puerto Lumen is yours, Mara. Free roam — or start again.' };
    }
    const next = STORY[state.index];
    return { title: 'FREE ROAM', text: `Press M to start Job ${next.id}: ${next.name} — $${next.pay}` };
  }
  const a = state.active;
  const s = currentStage(state);
  let text = s.text;
  if (s.timer) text += ` — ${Math.max(0, Math.ceil(s.timer - a.timer))} s`;
  if (s.type === 'hold') text += ` — ${Math.max(0, Math.ceil(a.holdLeft || s.hold))} s`;
  if (s.type === 'hit') text += ` — ${a.hits}/${s.hits} hits`;
  if (s.type === 'defeat') text += ` — ${a.defeated}/${s.count} down`;
  return { title: `JOB ${a.mission.id}: ${a.mission.name}`, text };
}
