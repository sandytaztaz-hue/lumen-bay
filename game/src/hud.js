import { DISTRICTS, WORLD, STREETS, AVENUES, formatCash, clockText, respectRank, RADIO_LINE, CREW, RESPECT_BAR_MAX, WEAPONS, WEAPON_ORDER, weaponOwned, CREW_ABILITIES } from './config.js';
import { TURF_TOTAL, districtAt } from './turf.js';

export { RADIO_LINE } from './config.js';

function $(id) {
  return document.getElementById(id);
}

function formatTimer(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function weaponLabelFor(id, mag, reserve) {
  if (id === 'smg') return 'SMG ' + mag + '/' + reserve;
  if (id === 'shotgun') return 'SHOTGUN ' + mag + '/' + reserve;
  if (id === 'rifle') return 'RIFLE ' + mag + '/' + reserve;
  if (id === 'bat') return 'BAT ∞';
  if (id === 'pistol') return 'PISTOL ∞';
  return 'FISTS ∞';
}

// Drawn portraits for the dialogue bar: simple canvas faces, one per
// speaker, replacing the old letter circles. Every face is a skin disc
// with eyes and a mouth, plus the speaker's own hair or headgear: Mara's
// orange headband, Tio's teal flat cap and grey moustache, Lena's purple
// side hair, Dario's green bandana and beard, dispatch's navy cap and
// headset mic.
function drawFace(canvas, speaker) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 42, 42);
  const c = CREW[speaker] || CREW.mara;
  ctx.fillStyle = c.color;
  ctx.beginPath();
  ctx.arc(21, 21, 21, 0, Math.PI * 2);
  ctx.fill();
  const skin = { mara: '#e8b88a', tio: '#d9a06b', lena: '#f0c8a0', dario: '#7a4a28', dispatch: '#e8b88a' }[speaker] || '#e8b88a';
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(21, 23, 14, 0, Math.PI * 2);
  ctx.fill();
  if (speaker === 'mara') {
    ctx.fillStyle = '#3a2415';
    ctx.beginPath();
    ctx.arc(21, 20, 14, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(7, 18, 4, 14);
    ctx.fillRect(31, 18, 4, 14);
    ctx.fillStyle = '#ff8c1a';
    ctx.fillRect(8, 12, 26, 3);
  } else if (speaker === 'tio') {
    ctx.fillStyle = '#2e5d5a';
    ctx.fillRect(6, 7, 30, 6);
    ctx.fillStyle = '#1d3a38';
    ctx.fillRect(5, 12, 32, 3);
    ctx.fillStyle = '#c8c8c8';
    ctx.beginPath();
    ctx.ellipse(21, 30, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (speaker === 'lena') {
    ctx.fillStyle = '#7a3fd0';
    ctx.fillRect(6, 16, 5, 20);
    ctx.fillRect(31, 16, 5, 20);
    ctx.beginPath();
    ctx.arc(21, 19, 14, Math.PI, 0);
    ctx.fill();
  } else if (speaker === 'dario') {
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.arc(21, 19, 14, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#1c1c1c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(21, 26, 8, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (speaker === 'dispatch') {
    ctx.fillStyle = '#1d2f5e';
    ctx.beginPath();
    ctx.arc(21, 19, 14, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(5, 12, 32, 3);
    ctx.strokeStyle = '#1c1c1c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(21, 23, 16, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath();
    ctx.arc(31, 31, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Eyes and mouth, same for everyone.
  ctx.fillStyle = '#1c1c1c';
  ctx.beginPath();
  ctx.arc(15.5, 22, 1.8, 0, Math.PI * 2);
  ctx.arc(26.5, 22, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a3a20';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(21, 28, 4, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

export class Hud {
  constructor() {
    this.pin = null;
    this.mapOpen = false;
    this.logLines = [];
    this.miniCtx = $('minimap').getContext('2d');
    this.mapCanvas = $('citymap');
  }

  setPin(pin) {
    this.pin = pin;
    this.renderPin();
  }

  clearPin() {
    this.pin = null;
  }

  setMapOpen(open) {
    this.mapOpen = open;
    $('mapOverlay').style.display = open ? 'block' : 'none';
    if (open) this.drawCityMap();
  }

  toast(title, text, kind) {
    const box = $('toasts');
    const el = document.createElement('div');
    el.className = kind === 'bad' ? 'toast toast-bad' : 'toast';
    const titleEl = document.createElement('div');
    titleEl.className = 'toast-title';
    titleEl.textContent = title;
    const textEl = document.createElement('div');
    textEl.className = 'toast-text';
    textEl.textContent = text;
    el.appendChild(titleEl);
    el.appendChild(textEl);
    box.prepend(el);
    while (box.children.length > 3) box.lastChild.remove();
    if (!this.pin) setTimeout(() => el.remove(), 7000);
  }

  logLine(text) {
    this.logLines.push(text);
    if (this.logLines.length > 3) this.logLines.shift();
    const box = $('eventlog');
    box.innerHTML = '';
    for (const line of this.logLines) {
      const el = document.createElement('div');
      el.className = 'log-line';
      el.textContent = line;
      box.appendChild(el);
    }
  }

  dialogue(speaker, text) {
    const c = CREW[speaker] || CREW.mara;
    drawFace($('dlgFace'), speaker);
    $('dlgName').textContent = c.name;
    $('dlgName').style.color = c.color;
    $('dlgText').textContent = text;
  }

  // Crew ability chips: key, name, READY or the seconds left on the
  // cooldown. The same renderer serves the pinned and the live HUD.
  renderCrew(crewCd) {
    for (const a of CREW_ABILITIES) {
      const el = $('chip-' + a.id);
      if (!el) continue;
      const cd = Math.ceil(crewCd[a.id] || 0);
      el.classList.toggle('ready', cd <= 0);
      el.classList.toggle('cooling', cd > 0);
      el.innerHTML = '<span class="chip-key">' + a.key + '</span> ' + a.name + ' <span class="chip-cd">' + (cd > 0 ? cd + 's' : 'READY') + '</span>';
    }
  }

  // The six-slot weapon bar: owned slots show their ammo, locked slots
  // show the price. `ammo` carries the current weapon's live label.
  renderWeapons(owned, current, ammo) {
    for (const id of WEAPON_ORDER) {
      const el = $('slot-' + id);
      if (!el) continue;
      const w = WEAPONS[id];
      const n = WEAPON_ORDER.indexOf(id) + 1;
      const isOwned = owned.includes(id);
      el.classList.toggle('active', current === id);
      el.classList.toggle('locked', !isOwned);
      if (!isOwned) {
        el.textContent = n + ' ' + w.name + ' 🔒 $' + w.price.toLocaleString('en-US');
      } else if (id === current) {
        el.textContent = n + ' ' + ammo;
      } else {
        el.textContent = n + ' ' + w.label;
      }
    }
  }

  renderDayStanding(day, district, pct) {
    $('dayLine').textContent = 'DAY ' + day + ' · ' + district + ' ' + pct + '%';
    $('standingBar').style.width = pct + '%';
  }

  showMissionPassed(text) {
    $('missionPassed').style.display = 'block';
    if (text != null) $('missionPassedSub').textContent = text;
  }

  hideMissionPassed() {
    $('missionPassed').style.display = 'none';
  }

  policeRow(name, dist, status) {
    const row = document.createElement('div');
    row.className = 'police-row';
    const nameEl = document.createElement('span');
    nameEl.className = 'police-name';
    nameEl.textContent = name;
    const distEl = document.createElement('span');
    distEl.className = 'police-dist';
    distEl.textContent = dist ? dist + 'm' : '';
    const pillEl = document.createElement('span');
    pillEl.className = 'police-pill ' + (status === 'CHASING' ? 'pill-chasing' : status === 'FLANKING' ? 'pill-flanking' : status === 'SPOTLIGHT' ? 'pill-spotlight' : status === 'ROADBLOCK' ? 'pill-roadblock' : status === 'CLEAR' ? 'pill-clear' : 'pill-enroute');
    pillEl.textContent = status;
    row.appendChild(nameEl);
    row.appendChild(distEl);
    row.appendChild(pillEl);
    return row;
  }

  setStars(n) {
    const box = $('wantedStars');
    box.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('span');
      s.textContent = i < n ? '★' : '☆';
      s.style.color = i < n ? '#ffd23e' : '#5a5a5a';
      box.appendChild(s);
    }
  }

  setWanted(n) {
    $('wantedLabel').textContent = n > 0 ? 'WANTED' : 'NOT WANTED';
    $('wantedLabel').style.color = n > 0 ? '#ff5a4e' : '#8ecbff';
    this.setStars(n);
    $('wantedPill').style.display = n > 0 ? 'block' : 'none';
  }

  renderPin() {
    const pin = this.pin;
    if (!pin) return;
    $('jobTitle').textContent = pin.jobTitle;
    $('jobBrief').textContent = '○ ' + pin.jobBrief;
    $('jobStage').textContent = 'STAGE ' + pin.stageText + ' · +' + formatCash(pin.reward) + ' · STORY ' + pin.story + ' · REP ' + pin.rep;
    const timer = $('jobTimer');
    if (pin.jobTimeLeft != null) {
      timer.style.display = 'block';
      timer.textContent = '⏱ ' + formatTimer(pin.jobTimeLeft);
    } else {
      timer.style.display = 'none';
    }
    $('stageBar').style.width = Math.round((pin.stageFill ?? 0) * 100) + '%';
    this.renderCrew(pin.crewCd || { tio: 0, dario: 0, lena: 0 });
    $('jobNext').textContent = 'NEXT: ' + pin.nextText;
    const banner = $('jobBanner');
    if (pin.banner) {
      banner.style.display = 'block';
      banner.textContent = pin.banner;
    } else {
      banner.style.display = 'none';
      banner.textContent = '';
    }
    $('cashText').textContent = formatCash(pin.cash);
    $('clockText').textContent = pin.clock;
    this.setWanted(pin.wanted);
    const pinAmmo = pin.weapon === 'smg' ? weaponLabelFor('smg', 30, 120)
      : pin.weapon === 'shotgun' ? weaponLabelFor('shotgun', 6, 24)
      : pin.weapon === 'rifle' ? weaponLabelFor('rifle', 30, 90)
      : weaponLabelFor(pin.weapon, 0, 0);
    $('weaponLabel').textContent = pinAmmo;
    this.renderWeapons(pin.weaponsOwned || ['fists', 'pistol', 'smg'], pin.weapon, pinAmmo);
    $('speedText').textContent = String(pin.speed);
    $('gearText').textContent = pin.inCar ? 'GEAR ' + pin.gear : 'ON FOOT';
    $('carNameText').textContent = pin.inCar ? pin.carName : 'ON FOOT';
    $('streetText').textContent = pin.street;
    $('turfText').textContent = 'TURF ' + pin.turf + '/' + TURF_TOTAL;
    this.renderDayStanding(pin.day || 1, pin.standing ? pin.standing.district : 'MARINA', pin.standing ? pin.standing.pct : 0);
    $('respectText').textContent = 'RESPECT · ' + pin.rank + ' ' + pin.respect + '/' + RESPECT_BAR_MAX;
    $('respectBar').style.width = Math.min(100, pin.respect / RESPECT_BAR_MAX * 100) + '%';
    $('healthBar').style.width = '100%';
    $('armourBar').style.width = '0%';
    $('nosBar').style.width = '100%';
    $('conditionBar').style.width = '100%';
    this.dialogue(pin.speaker, pin.dialogue);
    const toasts = $('toasts');
    toasts.innerHTML = '';
    toasts.style.top = pin.toastsTop ? pin.toastsTop + 'px' : '';
    for (let i = pin.toasts.length - 1; i >= 0; i--) {
      const t = pin.toasts[i];
      this.toast(t.title, t.text, t.kind);
    }
    this.logLines = [];
    for (const line of pin.log) this.logLine(line);
    const rows = $('policeRows');
    rows.innerHTML = '';
    if (pin.police && pin.police.length) {
      for (const u of pin.police) rows.appendChild(this.policeRow(u.name, u.dist, u.status));
      rows.appendChild(this.policeRow('+4 MORE UNITS', '', 'EN ROUTE'));
    } else {
      rows.appendChild(this.policeRow('NO UNITS', '', 'CLEAR'));
    }
    if (pin.missionPassed) this.showMissionPassed(pin.missionPassedText);
    else this.hideMissionPassed();
    this.setMapOpen(!!pin.mapOpen);
  }

  update(state, view) {
    view = view || {};
    if (this.pin) {
      if (view.minimap) this.drawMinimap(view.minimap);
      return;
    }
    const job = view.job;
    if (job && !state.storyComplete) {
      $('jobTitle').textContent = 'JOB ' + job.n + ': ' + job.title;
      $('jobBrief').textContent = '○ ' + job.brief;
      $('jobStage').textContent = 'STAGE ' + state.jobStage + '/3 · +' + formatCash(job.reward) + ' · STORY ' + job.n + '/15 · REP ' + job.rep;
      const tl = view.race && view.race.active ? view.race.timeLeft : state.jobTimeLeft;
      const timer = $('jobTimer');
      if (tl != null) {
        timer.style.display = 'block';
        timer.textContent = '⏱ ' + formatTimer(tl);
      } else {
        timer.style.display = 'none';
      }
      const fill = view.race && view.race.active ? view.race.index / 8 : state.jobStage / 3;
      $('stageBar').style.width = Math.round(fill * 100) + '%';
      this.renderCrew(state.crewCd || { tio: 0, dario: 0, lena: 0 });
      $('jobNext').textContent = 'NEXT: ' + job.next;
    } else {
      $('jobTitle').textContent = 'STORY COMPLETE';
      $('jobBrief').textContent = 'El puerto es nuestro — Puerto Lumen is yours';
      $('jobStage').textContent = 'STAGE 15/15 · +$8,000 · REP 290';
      $('jobTimer').style.display = 'none';
      $('stageBar').style.width = '100%';
      this.renderCrew(state.crewCd || { tio: 0, dario: 0, lena: 0 });
      $('jobNext').textContent = 'NEXT: Free roam — rob, race, take turf.';
    }
    $('jobBanner').style.display = 'none';
    $('cashText').textContent = formatCash(state.cash);
    $('clockText').textContent = clockText(state.clockMin);
    this.setWanted(state.wanted);
    const w = state.weapon;
    const ammo = weaponLabelFor(w, state.smgMag, state.smgReserve);
    $('weaponLabel').textContent = w === 'shotgun'
      ? weaponLabelFor('shotgun', state.shotgunMag, state.shotgunReserve)
      : w === 'rifle'
        ? weaponLabelFor('rifle', state.rifleMag, state.rifleReserve)
        : ammo;
    const owned = WEAPON_ORDER.filter((id) => weaponOwned(id, state));
    const curAmmo = w === 'shotgun'
      ? weaponLabelFor('shotgun', state.shotgunMag, state.shotgunReserve)
      : w === 'rifle'
        ? weaponLabelFor('rifle', state.rifleMag, state.rifleReserve)
        : ammo;
    this.renderWeapons(owned, w, curAmmo);
    $('speedText').textContent = String(Math.round(view.speedKmh || 0));
    $('gearText').textContent = view.inCar ? 'GEAR ' + view.gear : 'ON FOOT';
    $('carNameText').textContent = view.inCar ? view.carName : 'ON FOOT';
    $('streetText').textContent = view.street || '';
    $('turfText').textContent = 'TURF ' + (state.turf ? state.turf.length : 0) + '/' + TURF_TOTAL;
    const day = Math.floor(state.clockMin / 1440) + 1;
    const district = view.minimap ? districtAt(view.minimap.playerX, view.minimap.playerZ) : { name: 'MARINA' };
    const standing = state.turf && state.turf.includes(district.name)
      ? 100
      : Math.min(95, Math.floor(state.rep / 15));
    this.renderDayStanding(day, district.name, standing);
    $('respectText').textContent = 'RESPECT · ' + respectRank(state.rep) + ' ' + state.rep + '/' + RESPECT_BAR_MAX;
    $('respectBar').style.width = Math.min(100, state.rep / RESPECT_BAR_MAX * 100) + '%';
    $('healthBar').style.width = Math.max(0, state.health) + '%';
    $('armourBar').style.width = Math.max(0, state.armour) + '%';
    $('nosBar').style.width = Math.max(0, state.nos) + '%';
    $('conditionBar').style.width = '100%';
    const rows = $('policeRows');
    rows.innerHTML = '';
    if (view.police && view.police.length) {
      for (const u of view.police) rows.appendChild(this.policeRow(u.name, u.dist, u.status));
      rows.appendChild(this.policeRow('+' + Math.max(0, view.policeExtra ?? 4) + ' MORE UNITS', '', 'EN ROUTE'));
    } else {
      rows.appendChild(this.policeRow('NO UNITS', '', 'CLEAR'));
    }
    if (view.minimap) this.drawMinimap(view.minimap);
  }

  showDamageNumber(x, y, text) {
    const el = document.createElement('div');
    el.className = 'dmg-num';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    $('damageLayer').appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  drawMinimap(mm) {
    if (!mm) return;
    const ctx = this.miniCtx;
    const mapX = (x) => (x - WORLD.minX) / (WORLD.maxX - WORLD.minX) * 190;
    const mapZ = (z) => (z - WORLD.minZ) / (WORLD.maxZ - WORLD.minZ) * 190;
    ctx.save();
    ctx.clearRect(0, 0, 190, 190);
    ctx.beginPath();
    ctx.arc(95, 95, 95, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#2e5d39';
    ctx.fillRect(0, 0, 190, 190);
    ctx.fillStyle = '#ecd8ae';
    ctx.fillRect(0, mapZ(WORLD.beachZ0), 190, mapZ(WORLD.seaZ) - mapZ(WORLD.beachZ0));
    ctx.fillStyle = '#10596c';
    ctx.fillRect(0, mapZ(WORLD.seaZ), 190, 190 - mapZ(WORLD.seaZ));
    if (mm.miniMap) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const x of STREETS) {
        ctx.moveTo(mapX(x), 0);
        ctx.lineTo(mapX(x), 190);
      }
      for (const z of AVENUES) {
        ctx.moveTo(0, mapZ(z));
        ctx.lineTo(190, mapZ(z));
      }
      ctx.stroke();
      ctx.font = 'bold 7px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      for (const d of DISTRICTS) ctx.fillText(d.name, mapX(d.x), mapZ(d.z));
      const vx = mapX(185);
      const vy = mapZ(62);
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.moveTo(vx, vy - 7);
      ctx.lineTo(vx - 6, vy + 5);
      ctx.lineTo(vx + 6, vy + 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4aa3ff';
      for (const dot of [[140, 100], [200, 100], [110, 160]]) {
        ctx.beginPath();
        ctx.arc(mapX(dot[0]), mapZ(dot[1]), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (const x of STREETS) {
        ctx.moveTo(mapX(x), 0);
        ctx.lineTo(mapX(x), 190);
      }
      for (const z of AVENUES) {
        ctx.moveTo(0, mapZ(z));
        ctx.lineTo(190, mapZ(z));
      }
      ctx.stroke();
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < DISTRICTS.length; i++) {
        const d = DISTRICTS[i];
        const lx = mapX(d.x);
        // Lift each name so neighbours never share a baseline: with four
        // names per row, the lift steps 0, 12 or 24 pixels up, chosen by
        // the diagonal (row plus column) modulo three, so long neighbours
        // like MERCADO VIEJO and FAROL ROJO sit on different heights.
        const gridRow = (i / 4) | 0;
        const gridCol = i - gridRow * 4;
        const lift = 12 * ((gridRow + gridCol) % 3);
        const ly = mapZ(d.z) - lift;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.strokeText(d.name, lx, ly);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(d.name, lx, ly);
      }
      if (mm.target) {
        ctx.beginPath();
        ctx.arc(mapX(mm.target.x), mapZ(mm.target.z), 6, 0, Math.PI * 2);
        ctx.fillStyle = '#3d9bff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
      if (mm.police && mm.police.length) {
        for (const p of mm.police) {
          ctx.beginPath();
          ctx.arc(mapX(p.x), mapZ(p.z), 5, 0, Math.PI * 2);
          ctx.fillStyle = '#fc3f46';
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        }
      } else {
        const px = mapX(mm.playerX);
        const py = mapZ(mm.playerZ);
        for (let k = 0; k < 4; k++) {
          const a = (k * 90 + 18) * Math.PI / 180;
          const bx = px + 25 * Math.cos(a);
          const by = py + 25 * Math.sin(a);
          ctx.beginPath();
          ctx.arc(bx, by, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#fc3f46';
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        }
      }
    }
    const px = mapX(mm.playerX);
    const py = mapZ(mm.playerZ);
    const half = mm.miniMap ? 6 : 8;
    ctx.beginPath();
    ctx.moveTo(px, py - half);
    ctx.lineTo(px + half, py);
    ctx.lineTo(px, py + half);
    ctx.lineTo(px - half, py);
    ctx.closePath();
    ctx.fillStyle = '#ffcc1e';
    ctx.fill();
    if (!mm.miniMap) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(95, 95, 93.5, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  drawCityMap() {
    const ctx = this.mapCanvas.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, 1280, 720);
    ctx.fillStyle = '#2b0e13';
    ctx.fillRect(385, 30, 600, 555);
    ctx.strokeStyle = '#9c7a33';
    ctx.lineWidth = 2;
    ctx.strokeRect(385, 30, 600, 555);
    ctx.fillStyle = '#11596c';
    ctx.fillRect(385, 30, 34, 555);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(419, 30, 2, 555);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 385.5; x <= 985.5; x += 25) {
      ctx.moveTo(x, 30);
      ctx.lineTo(x, 585);
    }
    for (let y = 30.5; y <= 580.5; y += 25) {
      ctx.moveTo(385, y);
      ctx.lineTo(985, y);
    }
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const x of [570, 685, 765, 837, 910]) {
      ctx.moveTo(x, 30);
      ctx.lineTo(x, 585);
    }
    for (const y of [99, 263, 348, 448]) {
      ctx.moveTo(385, y);
      ctx.lineTo(985, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#2d5d23';
    ctx.fillRect(586, 330, 127, 106);
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('MARINA', 505, 130);
    ctx.fillText('MERCADO VIEJO', 620, 130);
    // TORRE drops a row below MERCADO VIEJO: the two ran together as
    // one word at the same height. A leader line points back up to its row.
    ctx.fillText('TORRE', 745, 158);
    ctx.fillText('FAROL ROJO', 905, 130);
    ctx.fillText('TALLER', 520, 310);
    // OLD TOWN lifts above CASINO ROW: the two ran together at the same
    // height. A leader line points back down to its row.
    ctx.fillText('OLD TOWN', 625, 282);
    ctx.fillText('CASINO ROW', 745, 310);
    ctx.fillText('FESTIVAL SQ', 885, 310);
    ctx.fillText('PLAYA DORADA', 445, 463);
    // NORTH DOCKS drops below PLAYA DORADA: the two ran together at the
    // same height. A leader line points back up to its row.
    ctx.fillText('NORTH DOCKS', 630, 491);
    ctx.fillText('DUNES', 780, 463);
    ctx.fillText('HILLSIDE', 905, 463);
    ctx.font = '12px Arial';
    ctx.fillStyle = '#c8c8c8';
    ctx.textAlign = 'center';
    // MARINA RD lifts clear of the white player triangle that hid its tail.
    // A leader line points back down to the road it names.
    ctx.fillText('MARINA RD', 730, 78);
    ctx.fillText('FESTIVAL AVE', 677, 257);
    // PLAYA DR lifts clear of the solid green block it sat on, to just
    // above the block's top edge. A leader line points back down to the
    // street it names.
    ctx.fillText('PLAYA DR', 612, 326);
    ctx.fillText('MIRAMAR STRIP', 662, 437);
    for (const street of [['OCEAN BLVD', 570], ['PALM AVE', 685], ['MERCADO ST', 765], ['CASINO AVE', 837], ['TORRE BLVD', 910]]) {
      ctx.save();
      ctx.translate(street[1], 325);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(street[0], 0, 4);
      ctx.restore();
    }
    // Short thin leader lines from each staggered label back to the place
    // it names, so the stagger reads as a pointer and not a stray label.
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(770, 144); ctx.lineTo(770, 133); // TORRE up to its row
    ctx.moveTo(665, 286); ctx.lineTo(665, 306); // OLD TOWN down to its row
    ctx.moveTo(700, 477); ctx.lineTo(700, 464); // NORTH DOCKS up to its row
    ctx.moveTo(730, 82); ctx.lineTo(730, 95); // MARINA RD down to its road
    ctx.moveTo(612, 330); ctx.lineTo(612, 345); // PLAYA DR down to its street
    ctx.stroke();
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(755, 99);
    ctx.lineTo(553, 99);
    ctx.lineTo(553, 436);
    ctx.lineTo(515, 452);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#d8402f';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 7]);
    ctx.beginPath();
    ctx.arc(770, 161, 80, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(755, 87);
    ctx.lineTo(739, 118);
    ctx.lineTo(771, 118);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('H', 778, 118);
    ctx.fillStyle = '#4aa3ff';
    for (const dot of [[699, 205], [790, 205], [640, 345]]) {
      ctx.beginPath();
      ctx.arc(dot[0], dot[1], 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 553, 203);
    ctx.fillText('$', 844, 379);
    ctx.fillText('$', 619, 498);
    ctx.fillText('$', 840, 499);
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left';
    // BOAT label lifts up-left of the white PLAYA DORADA district label so
    // the two never touch; a short leader line points down to the boat.
    ctx.fillText('BOAT — PLAYA DORADA', 400, 430);
    ctx.beginPath();
    ctx.moveTo(440, 460);
    ctx.lineTo(432, 472);
    ctx.lineTo(448, 472);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(440, 434);
    ctx.lineTo(440, 457);
    ctx.stroke();
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    // Legend stays in the bottom-left interior, but drops to rows
    // 505-571 at 10px: the old 12px rows at 484-562 ran on NORTH
    // DOCKS' own line (its label spans x630-750 at y479-491, and the
    // old first line ended at x640), so the two read as one jumbled
    // line, and the first row crowded PLAYA DORADA above it. The new
    // rows sit clearly below NORTH DOCKS (5px under its glyphs, 24px
    // left of its start), 33px below PLAYA DORADA, with the first
    // line ending at x606 — 8px clear of the gold $ marker at (619,
    // 498) — and the last row still 9px clear of the banner pill.
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(400, 501);
    ctx.lineTo(420, 501);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('ESCAPE ROUTE — VAULT → BOAT', 428, 505);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(410, 506);
    ctx.lineTo(404, 515);
    ctx.lineTo(416, 515);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('MARA — YOU', 428, 516);
    ctx.fillStyle = '#4aa3ff';
    ctx.beginPath();
    ctx.arc(410, 523, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('MISSION TARGET — BOAT', 428, 527);
    ctx.fillStyle = '#fc3f46';
    ctx.beginPath();
    ctx.arc(410, 534, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('LCPD UNITS ON THE STREET', 428, 538);
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('$', 410, 545);
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('ROBBERY TARGETS / PROPERTIES', 428, 549);
    ctx.fillStyle = '#2d8a3e';
    ctx.fillRect(404, 551, 12, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CREW / TURF', 428, 560);
    ctx.fillStyle = '#d8402f';
    ctx.fillRect(404, 562, 12, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('TIBURONES TURF', 428, 571);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(930, 62, 21, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#d8402f';
    ctx.beginPath();
    ctx.moveTo(930, 46);
    ctx.lineTo(921, 74);
    ctx.lineTo(939, 74);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('N', 930, 34);
    ctx.fillStyle = '#160a0d';
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(475, 580);
    ctx.lineTo(805, 580);
    ctx.arc(805, 605, 25, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(475, 630);
    ctx.arc(475, 605, 25, Math.PI / 2, Math.PI * 3 / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PUERTO LUMEN — CITY MAP', 640, 605);
    ctx.restore();
  }
}

export const hud = new Hud();
export default hud;
