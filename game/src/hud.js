// LUMEN BAY r6 — the HUD: dense DOM overlay plus a canvas minimap. Always
// legible at 1280x720: wanted stars, health/armour bars, cash, speed, NOS,
// weapon, objective banner, event log, radio, clock, turf meter, kill feed.
import { DISTRICTS, CLOCK } from './config.js';
import { turfLabel as turfLabelFn } from './turf.js';

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const el = {
    stars: $('hud-stars'), cash: $('hud-cash'), health: $('hud-health-fill'),
    armour: $('hud-armour-fill'), speed: $('hud-speed'), nos: $('hud-nos-fill'),
    weapon: $('hud-weapon'), objective: $('hud-objective'), log: $('hud-log'),
    radio: $('hud-radio'), clock: $('hud-clock'), turf: $('hud-turf'),
    banner: $('hud-banner'), bannerTitle: $('hud-banner-title'), bannerSub: $('hud-banner-sub'),
    minimap: $('hud-minimap'), prompt: $('hud-prompt'), timer: $('hud-timer'),
    feed: $('hud-feed'), garage: $('hud-garage'), garageList: $('hud-garage-list'),
    title: $('screen-title'), pause: $('screen-pause'), busted: $('screen-busted'),
  };
  el.clock.textContent = CLOCK;
  const mm = el.minimap.getContext('2d');
  const lines = [];
  return {
    el,
    log(msg) {
      const div = document.createElement('div');
      div.textContent = msg;
      el.log.prepend(div);
      while (el.log.children.length > 6) el.log.removeChild(el.log.lastChild);
      lines.unshift(msg);
      if (lines.length > 30) lines.pop();
    },
    feed(msg) {
      const div = document.createElement('div');
      div.textContent = msg;
      el.feed.prepend(div);
      while (el.feed.children.length > 4) el.feed.removeChild(el.feed.lastChild);
    },
    showBanner(title, sub, ms) {
      el.bannerTitle.textContent = title;
      el.bannerSub.textContent = sub || '';
      el.banner.style.display = 'block';
      setTimeout(() => { el.banner.style.display = 'none'; }, ms || 3500);
    },
    setPrompt(text) {
      el.prompt.textContent = text || '';
      el.prompt.style.display = text ? 'block' : 'none';
    },
    showGarage(rows, cash) {
      el.garageList.innerHTML = rows.map((r) => `<div>${r}</div>`).join('') + `<div class="dim">Cash $${cash} — 1/2/3 buy, 4 repair $150, E close</div>`;
      el.garage.style.display = 'block';
    },
    hideGarage() { el.garage.style.display = 'none'; },
  };
}

/** Per-frame HUD refresh from the live game state. */
export function updateHud(hud, s) {
  const el = hud.el;
  el.stars.textContent = '★'.repeat(s.wanted) + '☆'.repeat(5 - s.wanted);
  el.stars.style.color = s.wanted >= 3 ? '#ff5252' : '#ffd23f';
  el.cash.textContent = `$${Math.floor(s.cash).toLocaleString('en-US')}`;
  el.health.style.width = `${Math.max(0, s.health)}%`;
  el.armour.style.width = `${Math.max(0, s.armour)}%`;
  el.speed.textContent = s.inCar ? `${Math.round(Math.abs(s.speed) * 3.2)} km/h` : 'ON FOOT';
  el.nos.style.width = `${Math.max(0, Math.min(100, (s.nos / s.nosMax) * 100))}%`;
  el.weapon.textContent = `${s.weapon}  ${s.ammo}`;
  el.objective.textContent = s.objective;
  el.radio.textContent = s.radio;
  el.turf.textContent = turfLabelFn(s.turf);
  el.timer.textContent = s.timerText || '';
  el.timer.style.display = s.timerText ? 'block' : 'none';
  drawMinimap(el.minimap, s);
}

/** The minimap: district turf colours, roads, mission marker, police, heli,
// owned properties, robbery targets, race checkpoints and the player arrow. */
function drawMinimap(canvas, s) {
  const g = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const toMap = (x, z) => [(x + 240) / 480 * W, (z + 240) / 480 * H];
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#10151f';
  g.fillRect(0, 0, W, H);
  // District turf colours.
  for (let i = 0; i < DISTRICTS.length; i += 1) {
    const r = DISTRICTS[i].rect;
    const [x0, y0] = toMap(r[0], r[1]);
    const [x1, y1] = toMap(r[2], r[3]);
    g.fillStyle = s.turf.owners[i] === 'crew' ? 'rgba(55,201,120,0.35)' : 'rgba(229,72,77,0.22)';
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  // Roads.
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 1;
  for (let i = -4; i <= 4; i += 1) {
    const c = (i * 60 + 240) / 480 * W;
    g.beginPath(); g.moveTo(c, 0); g.lineTo(c, H); g.stroke();
    g.beginPath(); g.moveTo(0, c); g.lineTo(W, c); g.stroke();
  }
  // Sea on the south + west edges.
  g.fillStyle = 'rgba(29,111,142,0.8)';
  g.fillRect(0, H - 6, W, 6);
  g.fillRect(0, 0, 6, H);
  // Owned properties (green houses), robbery targets (orange $).
  g.font = 'bold 11px system-ui, sans-serif';
  g.textAlign = 'center';
  for (const p of s.properties) {
    const [x, y] = toMap(p.pos[0], p.pos[1]);
    g.fillStyle = s.turf.isOwned(p.id) ? '#37c978' : '#e8e8e8';
    g.fillText(s.turf.isOwned(p.id) ? '⌂' : '$', x, y);
  }
  for (const t of s.robTargets) {
    const [x, y] = toMap(t.pos[0], t.pos[1]);
    g.fillStyle = '#ff9a56';
    g.fillText('$', x, y);
  }
  // Race checkpoints.
  if (s.raceCheckpoints) {
    g.fillStyle = '#ffd23f';
    for (const [x, z] of s.raceCheckpoints) {
      const [mx, my] = toMap(x, z);
      g.fillRect(mx - 2, my - 2, 4, 4);
    }
  }
  // Mission marker (pulsing yellow diamond).
  if (s.missionTarget) {
    const [x, y] = toMap(s.missionTarget[0], s.missionTarget[1]);
    const pulse = 3 + Math.sin(performance.now() * 0.006) * 1.5;
    g.fillStyle = '#ffd23f';
    g.beginPath();
    g.moveTo(x, y - pulse - 3); g.lineTo(x + pulse + 3, y); g.lineTo(x, y + pulse + 3); g.lineTo(x - pulse - 3, y);
    g.closePath(); g.fill();
  }
  // Police blips (blue) and roadblocks (red squares).
  g.fillStyle = '#4d8dff';
  for (const [x, z] of s.policeBlips) {
    const [mx, my] = toMap(x, z);
    g.beginPath(); g.arc(mx, my, 3, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#ff2a2a';
  for (const [x, z] of s.roadblocks) {
    const [mx, my] = toMap(x, z);
    g.fillRect(mx - 3, my - 3, 6, 6);
  }
  // Helicopter icon.
  if (s.heli) {
    const [x, y] = toMap(s.heli[0], s.heli[1]);
    g.fillStyle = '#fff';
    g.font = 'bold 12px system-ui, sans-serif';
    g.fillText('H', x, y);
  }
  // Player arrow (rotates with heading).
  const [px, py] = toMap(s.px, s.pz);
  g.save();
  g.translate(px, py);
  g.rotate(Math.atan2(Math.sin(s.heading), Math.cos(s.heading)) * -1 + Math.PI);
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(-5, 5);
  g.closePath(); g.fill();
  g.restore();
}
