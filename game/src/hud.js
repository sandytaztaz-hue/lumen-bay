import { DISTRICTS, WORLD, STREETS, AVENUES, formatCash, clockText, respectRank, RESPECT_RANKS, JOB_TOTALS, RADIO_LINE, CREW, RESPECT_BAR_MAX, WEAPONS, WEAPON_ORDER, weaponOwned, CREW_ABILITIES } from './config.js';
import { drawMapStats } from './mapstats.js';
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
    // The full map screen IS the map: hide the round minimap while it
    // is open so no circular minimap shows in the corner (shot 3).
    $('minimap').style.display = open ? 'none' : '';
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
    $('wantedLabel').style.color = n > 0 ? '#ff5a4e' : '#10233f';
    this.setStars(n);
    if (n === 0) {
      for (const s of $('wantedStars').children) s.style.color = '#10233f';
    }
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
    this.liveState = state;
    this.liveView = view;
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
      // District names are drawn after the markers, below, so no marker
      // ever covers a letter. (Text is never overlapped.)
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
    // District names paint last, over the markers: the police dots and
    // the player diamond sit on the districts they mark, and a marker
    // must never cover a letter.
    if (!mm.miniMap) {
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < DISTRICTS.length; i++) {
        const d = DISTRICTS[i];
        // Rim labels sit clear of the circle: the four names nearest the
        // edge had their outer letters clipped by the ring, so each is
        // nudged inward (PLAYA DORADA, MERCADO VIEJO and MARINA right,
        // FAROL ROJO left).
        const rimNudge = { 'PLAYA DORADA': 14, 'MERCADO VIEJO': 16, MARINA: 14, 'FAROL ROJO': -12 }[d.name] || 0;
        const lx = mapX(d.x) + rimNudge;
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
    drawMapStats(ctx, this.mapStatsValues());
  }

  // Values for the full map/stats screen: the pinned shot values when a
  // shot is staged, else the live game state.
  mapStatsValues() {
    const pin = this.pin;
    const crew = [
      { name: 'Mara', role: 'driver' },
      { name: 'Tio Reyes', role: 'heat off' },
      { name: 'Lena Cruz', role: 'decoy' },
      { name: 'Big Dario', role: 'pit crew' },
    ];
    let nextRank = 'KINGPIN';
    let nextAt = 800;
    const pickNext = (rep) => {
      for (const r of RESPECT_RANKS) {
        if (r.min > rep) { nextRank = r.name; nextAt = r.min; break; }
      }
    };
    if (pin) {
      const story = String(pin.story || '15/15').split('/');
      const title = String(pin.jobTitle || '').replace(/^JOB \d+: /, '');
      pickNext(pin.respect);
      return {
        cash: pin.cash,
        clock: pin.clock,
        day: pin.day || 1,
        wanted: pin.wanted,
        rank: pin.rank,
        respect: pin.respect,
        respectMax: RESPECT_BAR_MAX,
        nextRank,
        nextRankAt: nextAt,
        turf: pin.turf,
        turfTotal: TURF_TOTAL,
        standingDistrict: pin.standing ? pin.standing.district : 'MARINA',
        standingPct: pin.standing ? pin.standing.pct : 0,
        jobN: parseInt(story[0], 10) || 15,
        jobTotal: parseInt(story[1], 10) || 15,
        jobTitle: title,
        jobStage: pin.stageText,
        jobReward: pin.reward,
        jobRep: pin.rep,
        kills: JOB_TOTALS.kills,
        crew,
      };
    }
    const s = this.liveState || {};
    const v = this.liveView || {};
    const rep = s.rep || 0;
    pickNext(rep);
    const district = v.minimap ? districtAt(v.minimap.playerX, v.minimap.playerZ) : { name: 'MARINA' };
    const standing = s.turf && s.turf.includes(district.name) ? 100 : Math.min(95, Math.floor(rep / 15));
    const job = v.job;
    return {
      cash: s.cash || 0,
      clock: clockText(s.clockMin || 0),
      day: Math.floor((s.clockMin || 0) / 1440) + 1,
      wanted: s.wanted || 0,
      rank: respectRank(rep),
      respect: rep,
      respectMax: RESPECT_BAR_MAX,
      nextRank,
      nextRankAt: nextAt,
      turf: s.turf ? s.turf.length : 0,
      turfTotal: TURF_TOTAL,
      standingDistrict: district.name,
      standingPct: standing,
      jobN: job ? job.n : 15,
      jobTotal: 15,
      jobTitle: job ? job.title : 'EL PUERTO ES NUESTRO',
      jobStage: (s.jobStage || 3) + '/3',
      jobReward: job ? job.reward : 8000,
      jobRep: job ? job.rep : 290,
      kills: JOB_TOTALS.kills,
      crew,
    };
  }
}

export const hud = new Hud();
export default hud;
