// LUMEN BAY r8 — the HUD, rebuilt on the top-3 formula and denser than r7:
// mission panel (job title, objectives with checkmarks, stage x/y, big
// timer, NEXT step, alert banners, controls hint, STORY + REP), WANTED stars
// top-center, big green cash + weapon slots + NOS + health/armour top-right,
// NOTIFICATION TOASTS (WANTED LEVEL UP / ROADBLOCK AHEAD / NOS READY / ...),
// police response list with unit names/distances/statuses, IN SIGHT banner
// ("IN SIGHT — search zone follows you"), RESPECT bar, detailed ROUND minimap
// with a SEARCH-ZONE ring while wanted, dialogue box, big speed + gear +
// vehicle + condition + radio. All of it readable at a glance, like the
// top-3 entries: lots of text, lots of notifications.
import { DISTRICTS, CLOCK, STREETS, FERRIS, SEARCH_ZONE_RADIUS } from './config.js';
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
    missionNext: $('hud-mission-next'), missionAlerts: $('hud-mission-alerts'),
    missionStory: $('hud-mission-story'), policeList: $('hud-police-list'),
    roadblockBanner: $('hud-roadblock-banner'), dialogue: $('hud-dialogue'),
    dialogueAvatar: $('hud-dialogue-avatar'), dialogueName: $('hud-dialogue-name'),
    dialogueText: $('hud-dialogue-text'), streetLabel: $('hud-street-label'),
    speedBig: $('hud-speed-big'), gear: $('hud-gear'), vehicleName: $('hud-vehicle-name'),
    conditionFill: $('hud-condition-fill'), wantedLabel: $('hud-wanted-label'),
    notifications: $('hud-notifications'), weapons: $('hud-weapons'),
    insight: $('hud-insight'), respectFill: $('hud-respect-fill'),
    respectLabel: $('hud-respect-label'),
  };
  el.clock.textContent = CLOCK;
  const lines = [];
  return {
    el,
    _panelCache: '',
    _policeCache: '',
    _weaponsCache: '',
    _alertsCache: '',
    _respectCache: '',
    /** r10: per-shot HUD clock — each screenshot shows its own time of day
     (18:45 / 23:20 / 21:40 / 06:10), never the shared 12:30. */
    setClock(t) { if (t) el.clock.textContent = t; },
    log(msg) {
      const div = document.createElement('div');
      div.textContent = msg;
      el.log.prepend(div);
      while (el.log.children.length > 3) el.log.removeChild(el.log.lastChild);
      lines.unshift(msg);
      if (lines.length > 30) lines.pop();
    },
    feed(msg) {
      const div = document.createElement('div');
      div.textContent = msg;
      el.feed.prepend(div);
      while (el.feed.children.length > 2) el.feed.removeChild(el.feed.lastChild);
    },
    /** Notification toast, top-right under the cash panel: title + sub-line,
     auto-expires after ~5 s unless `sticky` (shot staging keeps them for
     the screenshot, since SwiftShader boots slower than the timeout). */
    notify(title, sub, kind, sticky) {
      if (!el.notifications) return;
      const div = document.createElement('div');
      div.className = `toast ${kind || ''}`;
      const t = document.createElement('div');
      t.className = 'toast-title';
      t.textContent = title;
      div.appendChild(t);
      if (sub) {
        const s = document.createElement('div');
        s.className = 'toast-sub';
        s.textContent = sub;
        div.appendChild(s);
      }
      el.notifications.prepend(div);
      while (el.notifications.children.length > 3) el.notifications.removeChild(el.notifications.lastChild);
      if (!sticky) setTimeout(() => { if (div.parentNode) div.remove(); }, 5000);
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
    // r10: the HUD clock is set once from CLOCK at boot, then restamped per
    // shot by shots.js via setClock() — see the setClock method above.
  };
}
/** r9 — drawn character portraits for the dialogue box (Sand's order:
 the orange letter-circle becomes a real character logo). Flat-style SVG
 drawn in code, no image files: Mara (dark hair, orange jacket), Tio Reyes
 (cap + sunglasses), Lena Cruz (pink cap). Each reads as a face at 44 px. */
function portraitSVG(name) {
  const n = (name || '').toUpperCase();
  if (n.includes('LENA')) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44">'
      + '<rect width="44" height="44" fill="#7a1040"/>'
      + '<path d="M5 44 Q7 31 15 29 L29 29 Q37 31 39 44 Z" fill="#ff2a5e"/>'
      + '<path d="M22 29 L22 44" stroke="#ffd23f" stroke-width="1.6"/>'
      + '<rect x="19" y="25" width="6" height="6" fill="#e8b88a"/>'
      + '<circle cx="22" cy="16" r="9.5" fill="#e8c25a"/>'
      + '<circle cx="22" cy="19.5" r="8.5" fill="#f2c9a0"/>'
      + '<path d="M12.5 19 A9.5 9.5 0 0 1 31.5 19 L31.5 15.5 A9.5 9.5 0 0 0 12.5 15.5 Z" fill="#ff2a5e"/>'
      + '<rect x="11" y="17.5" width="22" height="3.4" rx="1.7" fill="#ff2a5e"/>'
      + '<circle cx="18.5" cy="20" r="1.3" fill="#1a1210"/><circle cx="25.5" cy="20" r="1.3" fill="#1a1210"/>'
      + '<path d="M19 24.5 Q22 27 25 24.5" stroke="#8a3a50" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
      + '<circle cx="13.5" cy="24" r="1.1" fill="#ffd23f"/><circle cx="30.5" cy="24" r="1.1" fill="#ffd23f"/></svg>';
  }
  if (n.includes('TIO')) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44">'
      + '<rect width="44" height="44" fill="#12324a"/>'
      + '<path d="M5 44 Q7 31 15 29 L29 29 Q37 31 39 44 Z" fill="#1c2a4a"/>'
      + '<path d="M18 29 L20 35 L24 35 L26 29 Z" fill="#9fd4ff"/>'
      + '<rect x="19" y="25" width="6" height="6" fill="#b57a45"/>'
      + '<circle cx="22" cy="19.5" r="8.5" fill="#c98d5a"/>'
      + '<path d="M13 19 A9 9 0 0 1 31 19 L31 14.5 A9 9 0 0 0 13 14.5 Z" fill="#1e3a5f"/>'
      + '<rect x="11" y="16.5" width="22" height="3.2" rx="1.6" fill="#16283e"/>'
      + '<rect x="14.5" y="18" width="7" height="4.4" rx="2" fill="#0d0d0d"/>'
      + '<rect x="22.5" y="18" width="7" height="4.4" rx="2" fill="#0d0d0d"/>'
      + '<rect x="21" y="19.6" width="2.4" height="1.2" fill="#0d0d0d"/>'
      + '<circle cx="16.5" cy="19.2" r="1" fill="#fff"/><circle cx="24.5" cy="19.2" r="1" fill="#fff"/>'
      + '<path d="M18.5 25.5 Q22 24 25.5 25.5" stroke="#3a2410" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
      + '<path d="M19.5 28 Q22 29.5 24.5 28" stroke="#5a3018" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>';
  }
  // MARA (default): dark hair, orange jacket — the crew's getaway driver.
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44">'
    + '<rect width="44" height="44" fill="#8a3c00"/>'
    + '<path d="M5 44 Q7 31 15 29 L29 29 Q37 31 39 44 Z" fill="#ff7a1a"/>'
    + '<path d="M22 29 L22 44" stroke="#ffe9d0" stroke-width="1.8"/>'
    + '<rect x="19" y="25" width="6" height="6" fill="#d9a066"/>'
    + '<circle cx="22" cy="16.5" r="9.5" fill="#1a1210"/>'
    + '<circle cx="22" cy="19.5" r="8.5" fill="#e8b07a"/>'
    + '<rect x="12.8" y="17" width="3.2" height="12" rx="1.6" fill="#1a1210"/>'
    + '<rect x="28" y="17" width="3.2" height="12" rx="1.6" fill="#1a1210"/>'
    + '<circle cx="18.5" cy="20" r="1.3" fill="#1a1210"/><circle cx="25.5" cy="20" r="1.3" fill="#1a1210"/>'
    + '<path d="M19 24.5 Q22 27 25 24.5" stroke="#7a3a10" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>';
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
  // IN SIGHT banner: visible while the police can see the player.
  if (el.insight) el.insight.style.display = s.inSight ? 'block' : 'none';
  // Mission panel (rebuilt only when its content changes).
  if (s.missionPanel) {
    const p = s.missionPanel;
    const key = JSON.stringify(p);
    if (key !== hud._panelCache) {
      hud._panelCache = key;
      el.missionTitle.textContent = p.title;
      el.missionObjectives.innerHTML = p.objectives.map((o) =>
        `<div class="obj ${o.done ? 'done' : ''}">${o.done ? '✓' : '○'} ${o.label}</div>`).join('');
      // STORY + REP ride on the stage line (one line, not a second row) so
      // the mission panel stays short enough for the police panel below it.
      el.missionStage.textContent = `STAGE ${p.stage}  ·  +$${p.reward}${p.story ? `  ·  ${p.story}` : ''}${p.rep ? `  ·  REP ${p.rep}` : ''}`;
      el.missionTimer.textContent = p.timer || (s.timerText ? s.timerText.replace('⏱ ', '') : '');
      el.missionTimer.style.display = (p.timer || s.timerText) ? 'block' : 'none';
      el.missionNext.innerHTML = `NEXT: ${p.next}`;
      if (el.missionStory) el.missionStory.textContent = '';
    }
  }
  // Mission alert lines (ROADBLOCK AHEAD / VEHICLE STOLEN), top-3 style.
  if (s.alerts && el.missionAlerts) {
    const key = s.alerts.join('|');
    if (key !== hud._alertsCache) {
      hud._alertsCache = key;
      el.missionAlerts.innerHTML = s.alerts.map((a) =>
        `<div class="alert ${a.kind === 'warn' ? 'warn' : 'info'}">${a.text}</div>`).join('');
    }
  }
  // Weapon slots row (FISTS / PISTOL / SMG with ammo), top-right.
  if (s.weapons && el.weapons) {
    const key = JSON.stringify(s.weapons);
    if (key !== hud._weaponsCache) {
      hud._weaponsCache = key;
      el.weapons.innerHTML = s.weapons.map((w) =>
        `<div class="wslot ${w.active ? 'active' : ''}"><span class="wkey">${w.key}</span> ${w.name}<span class="wammo">${w.ammo}</span></div>`).join('');
    }
  }
  // RESPECT bar under the minimap.
  if (s.respect !== undefined && el.respectFill) {
    const pct = Math.round((s.respect / 550) * 100);
    const key = `${s.respect}|${s.respectRank || ''}`;
    if (key !== hud._respectCache) {
      hud._respectCache = key;
      el.respectFill.style.width = `${pct}%`;
      if (el.respectLabel) el.respectLabel.textContent = `RESPECT · ${s.respectRank || 'SHOT CALLER'} ${s.respect}/550`;
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
  // Dialogue box — r9: a drawn character portrait, not a letter. Rebuilt
  // only when the speaker changes (the box refreshes every frame).
  if (s.dialogue) {
    el.dialogue.style.display = 'flex';
    if (hud._dlgName !== s.dialogue.name) {
      hud._dlgName = s.dialogue.name;
      el.dialogueAvatar.innerHTML = portraitSVG(s.dialogue.name);
    }
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
 the player arrow — plus a dashed red SEARCH-ZONE ring while wanted. Drawn on
 a round canvas (CSS border-radius: 50%). */
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
  // Search-zone ring: dashed red circle around the player while wanted —
  // the police search area follows the player (top-3 "IN SIGHT" look).
  if (s.searchZone) {
    const [px, py] = toMap(s.px, s.pz);
    const rPx = (SEARCH_ZONE_RADIUS / 480) * W;
    g.strokeStyle = 'rgba(255,42,42,0.9)';
    g.lineWidth = 2;
    g.setLineDash([6, 4]);
    g.beginPath(); g.arc(px, py, rPx, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
    g.fillStyle = 'rgba(255,42,42,0.10)';
    g.beginPath(); g.arc(px, py, rPx, 0, Math.PI * 2); g.fill();
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
