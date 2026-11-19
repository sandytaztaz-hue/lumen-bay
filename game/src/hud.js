// LUMEN BAY r7 — the HUD, rebuilt on the top-3 formula: dense, bold, readable
// at a glance. Top-left mission panel (job title, objectives with checkmarks,
// stage x/y, big timer, NEXT step). Top-center WANTED stars. Top-right big
// green cash + weapon + NOS + health/armour. Left-middle police response list
// + ROADBLOCK AHEAD banner. Bottom-left detailed ROUND minimap (streets with
// names, district labels, markers, police, roadblocks, heli). Bottom-center
// dialogue box. Bottom-right big speed + gear + vehicle name + radio.
import { DISTRICTS, CLOCK, STREETS, FERRIS } from './config.js';
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
    missionTitle: $('hud-mission-title'), missionObjectives: $('hud-mission-objectives'),
    missionStage: $('hud-mission-stage'), missionTimer: $('hud-mission-timer'),
    missionNext: $('hud-mission-next'), policeList: $('hud-police-list'),
    roadblockBanner: $('hud-roadblock-banner'), dialogue: $('hud-dialogue'),
    dialogueAvatar: $('hud-dialogue-avatar'), dialogueName: $('hud-dialogue-name'),
    dialogueText: $('hud-dialogue-text'), streetLabel: $('hud-street-label'),
    speedBig: $('hud-speed-big'), gear: $('hud-gear'), vehicleName: $('hud-vehicle-name'),
    conditionFill: $('hud-condition-fill'), wantedLabel: $('hud-wanted-label'),
  };
  el.clock.textContent = CLOCK;
  const lines = [];
  return {
    el,
    _panelCache: '',
    _policeCache: '',
    log(msg) {
      const div = document.createElement('div');
      div.textContent = msg;
      el.log.prepend(div);
      while (el.log.children.length > 4) el.log.removeChild(el.log.lastChild);
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
  el.wantedLabel.textContent = s.wanted > 0 ? 'WANTED' : 'NOT WANTED';
  el.wantedLabel.style.color = s.wanted >= 3 ? '#ff5252' : '#9fd4ff';
  el.cash.textContent = `$${Math.floor(s.cash).toLocaleString('en-US')}`;
  el.health.style.width = `${Math.max(0, s.health)}%`;
  el.armour.style.width = `${Math.max(0, s.armour)}%`;
  el.speed.textContent = s.inCar ? `${Math.round(Math.abs(s.speed) * 4.4)} km/h` : 'ON FOOT';
  el.speedBig.textContent = s.inCar ? `${Math.round(Math.abs(s.speed) * 4.4)}` : '0';
  el.gear.textContent = s.inCar ? `GEAR ${s.gear || 1}` : 'ON FOOT';
  el.vehicleName.textContent = (s.vehicleName || 'VELOZ COMET RS').toUpperCase();
  el.conditionFill.style.width = `${Math.max(0, Math.min(100, s.condition === undefined ? 100 : s.condition))}%`;
  el.nos.style.width = `${Math.max(0, Math.min(100, (s.nos / s.nosMax) * 100))}%`;
  el.weapon.textContent = `${s.weapon}  ${s.ammo}`;
  el.objective.textContent = s.objective;
  el.radio.textContent = s.radio;
  el.turf.textContent = turfLabelFn(s.turf);
  el.timer.textContent = s.timerText || '';
  el.timer.style.display = s.timerText ? 'block' : 'none';
  el.streetLabel.textContent = s.streetLabel || '';
  // Mission panel (rebuilt only when its content changes).
  if (s.missionPanel) {
    const p = s.missionPanel;
    const key = JSON.stringify(p);
    if (key !== hud._panelCache) {
      hud._panelCache = key;
      el.missionTitle.textContent = p.title;
      el.missionObjectives.innerHTML = p.objectives.map((o) =>
        `<div class="obj ${o.done ? 'done' : ''}">${o.done ? '✓' : '○'} ${o.label}</div>`).join('');
      el.missionStage.textContent = `STAGE ${p.stage}  ·  +$${p.reward}`;
      el.missionTimer.textContent = p.timer || (s.timerText ? s.timerText.replace('⏱ ', '') : '');
      el.missionTimer.style.display = (p.timer || s.timerText) ? 'block' : 'none';
      el.missionNext.innerHTML = `NEXT: ${p.next}`;
    }
  }
  // Police response list (rebuilt only when it changes).
  if (s.policeUnits) {
    const key = JSON.stringify(s.policeUnits) + (s.roadblockAhead ? '|RB' : '');
    if (key !== hud._policeCache) {
      hud._policeCache = key;
      el.policeList.innerHTML = s.policeUnits.map((u) =>
        `<div class="unit"><span class="uname">${u.name}</span><span class="udist">${u.dist}m</span><span class="ustat ${u.status.toLowerCase()}">${u.status}</span></div>`).join('')
        || '<div class="unit"><span class="uname">NO UNITS</span><span class="udist">—</span><span class="ustat">CLEAR</span></div>';
      el.roadblockBanner.style.display = s.roadblockAhead ? 'block' : 'none';
    }
  }
  // Dialogue box.
  if (s.dialogue) {
    el.dialogue.style.display = 'flex';
    el.dialogueAvatar.textContent = s.dialogue.initial || '?';
    el.dialogueName.textContent = s.dialogue.name || '';
    el.dialogueText.textContent = s.dialogue.text || '';
  } else {
    el.dialogue.style.display = 'none';
  }
  drawMinimap(el.minimap, s);
}
/** The detailed minimap: turquoise sea + sand, district turf colours + labels,
 streets with names, ferris wheel + lighthouse icons, mission marker, police
 blips, roadblocks, heli, properties, robbery targets, race checkpoints and
 the player arrow. Drawn on a round canvas (CSS border-radius: 50%). */
function drawMinimap(canvas, s) {
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const toMap = (x, z) => [(x + 240) / 480 * W, (z + 240) / 480 * H];
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#0e2a3a';
  g.fillRect(0, 0, W, H);
  // Turquoise sea (south + west edges) + sand band.
  g.fillStyle = '#19b8c4';
  g.fillRect(0, H - 26, W, 26);
  g.fillRect(0, 0, 26, H);
  g.fillStyle = '#f2ddab';
  g.fillRect(0, H - 38, W, 12);
  g.fillRect(26, 0, 12, H);
  // District turf colours + names.
  g.textAlign = 'center';
  for (let i = 0; i < DISTRICTS.length; i += 1) {
    const r = DISTRICTS[i].rect;
    const [x0, y0] = toMap(r[0], r[1]);
    const [x1, y1] = toMap(r[2], r[3]);
    g.fillStyle = s.turf.owners[i] === 'crew' ? 'rgba(55,201,120,0.30)' : 'rgba(229,72,77,0.16)';
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.font = 'bold 8px system-ui, sans-serif';
    g.fillText(DISTRICTS[i].name.toUpperCase(), (x0 + x1) / 2 + 1, (y0 + y1) / 2 + 1);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fillText(DISTRICTS[i].name.toUpperCase(), (x0 + x1) / 2, (y0 + y1) / 2);
  }
  // Roads: pale lines on the grid.
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineWidth = 2;
  for (let i = -4; i <= 4; i += 1) {
    const c = (i * 60 + 240) / 480 * W;
    g.beginPath(); g.moveTo(c, 0); g.lineTo(c, H); g.stroke();
    g.beginPath(); g.moveTo(0, c); g.lineTo(W, c); g.stroke();
  }
  // Street names, placed BETWEEN the district-label rows so nothing collides:
  // avenues run vertically at y=80, drives run horizontally clear of labels.
  g.fillStyle = 'rgba(255,255,255,0.95)';
  g.font = 'bold 7px system-ui, sans-serif';
  const vNames = [['OCEAN BLVD', -180], ['PALMA AVE', -120], ['MERCADO ST', -60], ['CASINO AVE', 0], ['TORRE BLVD', 60], ['FESTIVAL AVE', 120], ['FAROL WAY', 180]];
  for (const [name, at] of vNames) {
    const [x] = toMap(at, 0);
    g.save();
    g.translate(x - 3, 80);
    g.rotate(-Math.PI / 2);
    g.fillText(name, 0, 0);
    g.restore();
  }
  for (const [name, at, yOff] of [['PLAYA DR', 180, 224], ['MIRAMAR STRIP', 120, 177], ['MARINA RD', -180, 22]]) {
    const [, y] = toMap(0, at);
    g.fillText(name, W / 2, yOff === undefined ? y - 3 : yOff);
  }
  // Ferris wheel + lighthouse icons.
  const [fx, fy] = toMap(FERRIS.pos[0], FERRIS.pos[1]);
  g.fillStyle = '#ff2a5e';
  g.beginPath(); g.arc(fx, fy, 5, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 7px system-ui, sans-serif';
  g.fillText('F', fx, fy + 2.5);
  const [lx, ly] = toMap(180, -180);
  g.fillStyle = '#ffd23f';
  g.beginPath(); g.arc(lx, ly, 4, 0, Math.PI * 2); g.fill();
  // Owned properties (green houses), robbery targets (orange $).
  g.font = 'bold 11px system-ui, sans-serif';
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
  // Police blips (blue circles, white ring) and roadblocks (red squares).
  for (const [x, z] of s.policeBlips) {
    const [mx, my] = toMap(x, z);
    g.fillStyle = '#4d8dff';
    g.beginPath(); g.arc(mx, my, 3.5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 1;
    g.beginPath(); g.arc(mx, my, 3.5, 0, Math.PI * 2); g.stroke();
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
  // Compass north.
  g.fillStyle = '#fff';
  g.font = 'bold 10px system-ui, sans-serif';
  g.fillText('N', W - 12, 14);
}
