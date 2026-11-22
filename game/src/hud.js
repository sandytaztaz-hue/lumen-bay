// LUMEN BAY — hud.js
// The HUD writers, the per-frame refresh, the minimap and the full city
// map drawing. Dark translucent panels with gold accents, Arial.

import { DISTRICTS, WORLD, formatCash, clockText, respectRank, RADIO_LINE, CREW } from './config.js';
import { TURF_TOTAL } from './turf.js';

function el(id) {
  return document.getElementById(id);
}

export class Hud {
  constructor() {
    this.pin = null;
    this.mapOpen = false;
    this.logLines = [];
    this.miniCtx = null;
    const mini = el('minimap');
    if (mini) this.miniCtx = mini.getContext('2d');
    this.mapCanvas = el('citymap');
  }

  setPin(pin) {
    this.pin = pin || null;
    if (this.pin) this.renderPin();
  }

  clearPin() {
    this.pin = null;
  }

  setMapOpen(open) {
    this.mapOpen = open;
    const overlay = el('mapOverlay');
    if (overlay) overlay.style.display = open ? 'block' : 'none';
    if (open) this.drawCityMap();
  }

  // -- toasts and log -------------------------------------------------------
  toast(title, text, kind) {
    const box = el('toasts');
    if (!box) return;
    const card = document.createElement('div');
    card.className = 'toast ' + (kind === 'bad' ? 'bad' : 'good');
    const t = document.createElement('div');
    t.className = 'toast-title';
    t.textContent = title;
    const b = document.createElement('div');
    b.className = 'toast-text';
    b.textContent = text;
    card.appendChild(t);
    card.appendChild(b);
    box.prepend(card);
    while (box.children.length > 3) box.removeChild(box.lastChild);
    if (!this.pin) {
      window.setTimeout(() => {
        if (card.parentNode) card.parentNode.removeChild(card);
      }, 7000);
    }
  }

  logLine(text) {
    this.logLines.push(text);
    if (this.logLines.length > 3) this.logLines.shift();
    const box = el('eventlog');
    if (!box) return;
    box.innerHTML = '';
    for (const line of this.logLines) {
      const d = document.createElement('div');
      d.className = 'log-line';
      d.textContent = line;
      box.appendChild(d);
    }
  }

  dialogue(speakerKey, text) {
    const crew = CREW[speakerKey] || CREW.mara;
    const circle = el('dlgInitial');
    const name = el('dlgName');
    const body = el('dlgText');
    if (circle) {
      circle.textContent = crew.initial;
      circle.style.background = crew.color;
    }
    if (name) {
      name.textContent = crew.name;
      name.style.color = crew.color;
    }
    if (body) body.textContent = text;
  }

  showMissionPassed(text) {
    const banner = el('missionPassed');
    if (banner) banner.style.display = 'block';
    const sub = el('missionPassedSub');
    if (sub && text) sub.textContent = text;
  }

  hideMissionPassed() {
    const banner = el('missionPassed');
    if (banner) banner.style.display = 'none';
  }

  // -- pinned shot HUD ------------------------------------------------------
  renderPin() {
    const p = this.pin;
    if (!p) return;
    const set = (id, text) => {
      const n = el(id);
      if (n) n.textContent = text;
    };
    set('jobTitle', p.jobTitle);
    set('jobBrief', '○ ' + p.jobBrief);
    set('jobStage', 'STAGE ' + p.stageText + ' · +$' + p.reward.toLocaleString('en-US') + ' · STORY ' + p.story + ' · REP ' + p.rep);
    set('jobNext', 'NEXT: ' + p.nextText);
    const banner = el('jobBanner');
    if (banner) {
      banner.style.display = p.banner ? 'block' : 'none';
      banner.textContent = p.banner || '';
    }
    set('cashText', formatCash(p.cash));
    set('clockText', p.clock);
    const wanted = el('wantedLabel');
    if (wanted) {
      wanted.textContent = p.wanted > 0 ? 'WANTED' : 'NOT WANTED';
      wanted.style.color = p.wanted > 0 ? '#ff4d4d' : '#6db3ff';
    }
    const stars = el('wantedStars');
    if (stars) {
      stars.textContent = '';
      for (let i = 0; i < 5; i++) {
        const s = document.createElement('span');
        s.className = 'star' + (i < p.wanted ? ' filled' : '');
        s.textContent = '★';
        stars.appendChild(s);
      }
    }
    const pill = el('wantedPill');
    if (pill) pill.style.display = p.wanted > 0 ? 'inline-block' : 'none';
    set('weaponLabel', p.weapon === 'smg' ? 'SMG 30/120' : p.weapon === 'pistol' ? 'PISTOL ∞' : 'FISTS ∞');
    for (const w of ['fists', 'pistol', 'smg']) {
      const slot = el('slot-' + w);
      if (slot) slot.classList.toggle('active', w === p.weapon);
    }
    set('speedText', String(p.speed));
    set('gearText', p.inCar ? 'GEAR ' + p.gear : 'ON FOOT');
    set('carNameText', p.carName);
    set('streetText', p.street);
    set('turfText', 'TURF ' + p.turf + '/' + TURF_TOTAL);
    set('respectText', 'RESPECT · ' + p.rank + ' ' + p.respect + '/550');
    const respectBar = el('respectBar');
    if (respectBar) respectBar.style.width = Math.min(100, (p.respect / 550) * 100) + '%';
    const hb = el('healthBar');
    if (hb) hb.style.width = '100%';
    const ab = el('armourBar');
    if (ab) ab.style.width = '0%';
    const nb = el('nosBar');
    if (nb) nb.style.width = '100%';
    this.dialogue(p.speaker, p.dialogue);
    const toasts = el('toasts');
    if (toasts) {
      toasts.innerHTML = '';
      if (p.toastsTop) toasts.style.top = p.toastsTop + 'px';
      for (const t of p.toasts) {
        const card = document.createElement('div');
        card.className = 'toast ' + (t.kind === 'bad' ? 'bad' : 'good');
        const ti = document.createElement('div');
        ti.className = 'toast-title';
        ti.textContent = t.title;
        const tx = document.createElement('div');
        tx.className = 'toast-text';
        tx.textContent = t.text;
        card.appendChild(ti);
        card.appendChild(tx);
        toasts.appendChild(card);
      }
    }
    this.logLines = [...p.log];
    const logBox = el('eventlog');
    if (logBox) {
      logBox.innerHTML = '';
      for (const line of p.log) {
        const d = document.createElement('div');
        d.className = 'log-line';
        d.textContent = line;
        logBox.appendChild(d);
      }
    }
    const police = el('policeRows');
    if (police) {
      police.innerHTML = '';
      if (p.police.length === 0) {
        const row = document.createElement('div');
        row.className = 'police-row';
        const nm = document.createElement('span');
        nm.textContent = 'NO UNITS';
        const pillEl = document.createElement('span');
        pillEl.className = 'pill clear';
        pillEl.textContent = 'CLEAR';
        row.appendChild(nm);
        row.appendChild(pillEl);
        police.appendChild(row);
      } else {
        for (const u of p.police) {
          police.appendChild(this.policeRow(u.name, u.dist, u.status));
        }
        const more = document.createElement('div');
        more.className = 'police-row';
        const nm = document.createElement('span');
        nm.textContent = '+4 MORE UNITS';
        const pillEl = document.createElement('span');
        pillEl.className = 'pill enroute';
        pillEl.textContent = 'EN ROUTE';
        more.appendChild(nm);
        more.appendChild(pillEl);
        police.appendChild(more);
      }
    }
    if (p.missionPassed) {
      this.showMissionPassed(p.missionPassedText);
    } else {
      this.hideMissionPassed();
    }
    if (p.mapOpen) this.setMapOpen(true);
  }

  policeRow(name, dist, status) {
    const row = document.createElement('div');
    row.className = 'police-row';
    const nm = document.createElement('span');
    nm.textContent = name;
    const d = document.createElement('span');
    d.className = 'police-dist';
    d.textContent = dist + 'm';
    const pillEl = document.createElement('span');
    const cls = status === 'CHASING' ? 'chasing' : status === 'FLANKING' ? 'flanking' : status === 'SPOTLIGHT' ? 'spotlight' : 'enroute';
    pillEl.className = 'pill ' + cls;
    pillEl.textContent = status;
    row.appendChild(nm);
    row.appendChild(d);
    row.appendChild(pillEl);
    return row;
  }

  // -- live per-frame refresh ------------------------------------------------
  update(state, view) {
    if (this.pin) {
      // Pinned shots never recompute: redraw the minimap only.
      if (view && view.minimap) this.drawMinimap(view.minimap);
      return;
    }
    const set = (id, text) => {
      const n = el(id);
      if (n) n.textContent = text;
    };
    const job = view.job;
    if (job) {
      set('jobTitle', 'JOB ' + job.n + ': ' + job.title);
      set('jobBrief', '○ ' + job.brief);
      set('jobStage', 'STAGE ' + (state.jobStage || 1) + '/3 · +$' + job.reward.toLocaleString('en-US') + ' · STORY ' + job.n + '/15 · REP ' + job.rep);
      set('jobNext', 'NEXT: ' + job.next);
    } else {
      set('jobTitle', 'STORY COMPLETE');
      set('jobBrief', 'El puerto es nuestro — Puerto Lumen is yours');
      set('jobStage', 'STAGE 15/15 · +$8,000 · REP 290');
      set('jobNext', 'NEXT: Free roam — rob, race, take turf.');
    }
    const banner = el('jobBanner');
    if (banner) banner.style.display = 'none';
    set('cashText', formatCash(state.cash));
    set('clockText', clockText(state.clockMin));
    const wanted = el('wantedLabel');
    if (wanted) {
      wanted.textContent = state.wanted > 0 ? 'WANTED' : 'NOT WANTED';
      wanted.style.color = state.wanted > 0 ? '#ff4d4d' : '#6db3ff';
    }
    const stars = el('wantedStars');
    if (stars) {
      stars.textContent = '';
      for (let i = 0; i < 5; i++) {
        const s = document.createElement('span');
        s.className = 'star' + (i < state.wanted ? ' filled' : '');
        s.textContent = '★';
        stars.appendChild(s);
      }
    }
    const pill = el('wantedPill');
    if (pill) pill.style.display = state.wanted > 0 ? 'inline-block' : 'none';
    const weaponLabel = state.weapon === 'smg'
      ? 'SMG ' + state.smgMag + '/' + state.smgReserve
      : state.weapon === 'pistol' ? 'PISTOL ∞' : 'FISTS ∞';
    set('weaponLabel', weaponLabel);
    for (const w of ['fists', 'pistol', 'smg']) {
      const slot = el('slot-' + w);
      if (slot) slot.classList.toggle('active', w === state.weapon);
    }
    set('speedText', String(Math.round(view.speedKmh)));
    set('gearText', view.inCar ? 'GEAR ' + view.gear : 'ON FOOT');
    set('carNameText', view.inCar ? view.carName : 'ON FOOT');
    set('streetText', view.street);
    set('turfText', 'TURF ' + state.turf.length + '/' + TURF_TOTAL);
    const rank = respectRank(state.rep);
    set('respectText', 'RESPECT · ' + rank + ' ' + state.rep + '/550');
    const respectBar = el('respectBar');
    if (respectBar) respectBar.style.width = Math.min(100, (state.rep / 550) * 100) + '%';
    const hb = el('healthBar');
    if (hb) hb.style.width = Math.max(0, state.health) + '%';
    const ab = el('armourBar');
    if (ab) ab.style.width = Math.max(0, state.armour) + '%';
    const nb = el('nosBar');
    if (nb) nb.style.width = Math.max(0, state.nos) + '%';
    const police = el('policeRows');
    if (police) {
      police.innerHTML = '';
      if (!view.police || view.police.length === 0) {
        const row = document.createElement('div');
        row.className = 'police-row';
        const nm = document.createElement('span');
        nm.textContent = 'NO UNITS';
        const pillEl = document.createElement('span');
        pillEl.className = 'pill clear';
        pillEl.textContent = 'CLEAR';
        row.appendChild(nm);
        row.appendChild(pillEl);
        police.appendChild(row);
      } else {
        for (const u of view.police) police.appendChild(this.policeRow(u.name, u.dist, u.status));
        const more = document.createElement('div');
        more.className = 'police-row';
        const nm = document.createElement('span');
        nm.textContent = '+' + Math.max(0, view.policeExtra || 4) + ' MORE UNITS';
        const pillEl = document.createElement('span');
        pillEl.className = 'pill enroute';
        pillEl.textContent = 'EN ROUTE';
        more.appendChild(nm);
        more.appendChild(pillEl);
        police.appendChild(more);
      }
    }
    if (view.minimap) this.drawMinimap(view.minimap);
  }

  // -- minimap ----------------------------------------------------------------
  drawMinimap(data) {
    const ctx = this.miniCtx;
    if (!ctx) return;
    const S = 190;
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    const mx = (x) => ((x - WORLD.minX) / (WORLD.maxX - WORLD.minX)) * S;
    const mz = (z) => ((z - WORLD.minZ) / (WORLD.maxZ - WORLD.minZ)) * S;
    // Land above, sea at the bottom.
    ctx.fillStyle = '#2e5d3a';
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = '#0e5a6b';
    ctx.fillRect(0, mz(WORLD.beachZ0), S, S - mz(WORLD.beachZ0));
    ctx.fillStyle = '#e3c98f';
    ctx.fillRect(0, mz(WORLD.beachZ0), S, mz(WORLD.seaZ) - mz(WORLD.beachZ0));
    if (data.miniMap) {
      // Miniature city map: same grid and labels, gold triangle at the
      // vault, three blue dots, gold player diamond.
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      for (const ax of [0, 60, 120, 180, 240, 300]) {
        ctx.beginPath(); ctx.moveTo(mx(ax), 0); ctx.lineTo(mx(ax), S); ctx.stroke();
      }
      for (const sz of [40, 90, 140, 190, 240, 290]) {
        ctx.beginPath(); ctx.moveTo(0, mz(sz)); ctx.lineTo(S, mz(sz)); ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px Arial';
      ctx.textAlign = 'center';
      for (const d of DISTRICTS) ctx.fillText(d.name, mx(d.x), mz(d.z));
      const vx = mx(185);
      const vy = mz(62);
      ctx.fillStyle = '#ffd21c';
      ctx.beginPath();
      ctx.moveTo(vx, vy - 6); ctx.lineTo(vx - 5, vy + 4); ctx.lineTo(vx + 5, vy + 4);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4aa3ff';
      for (const [bx, bz] of [[140, 100], [200, 100], [110, 160]]) {
        ctx.beginPath(); ctx.arc(mx(bx), mz(bz), 3, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      // Street grid in white, district labels in small white capitals.
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 1;
      for (const ax of [0, 60, 120, 180, 240, 300]) {
        ctx.beginPath(); ctx.moveTo(mx(ax), 0); ctx.lineTo(mx(ax), S); ctx.stroke();
      }
      for (const sz of [40, 90, 140, 190, 240, 290]) {
        ctx.beginPath(); ctx.moveTo(0, mz(sz)); ctx.lineTo(S, mz(sz)); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '7px Arial';
      ctx.textAlign = 'center';
      for (const d of DISTRICTS) ctx.fillText(d.name, mx(d.x), mz(d.z));
      // Blue dot for the active mission target.
      if (data.target) {
        ctx.fillStyle = '#4aa3ff';
        ctx.beginPath(); ctx.arc(mx(data.target.x), mz(data.target.z), 4, 0, Math.PI * 2); ctx.fill();
      }
      // Red blips for live police, or a standing ring of four when none.
      ctx.fillStyle = '#ff3c3c';
      if (data.police && data.police.length > 0) {
        for (const p of data.police) {
          ctx.beginPath(); ctx.arc(mx(p.x), mz(p.z), 3, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + 0.4;
          ctx.beginPath();
          ctx.arc(mx(data.playerX) + Math.cos(a) * 26, mz(data.playerZ) + Math.sin(a) * 26, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // Gold diamond for Mara.
    const px = mx(data.playerX);
    const py = mz(data.playerZ);
    ctx.fillStyle = '#ffd21c';
    ctx.beginPath();
    ctx.moveTo(px, py - 6); ctx.lineTo(px + 5, py); ctx.lineTo(px, py + 6); ctx.lineTo(px - 5, py);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // -- full city map (approved layout, do not change) --------------------------
  drawCityMap() {
    const canvas = this.mapCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = 1280;
    const H = 720;
    ctx.clearRect(0, 0, W, H);
    // Panel: x 385..985, y 30..585, dark maroon with a border.
    ctx.fillStyle = '#2a0e14';
    ctx.fillRect(385, 30, 600, 555);
    ctx.strokeStyle = '#8a6d3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(385, 30, 600, 555);
    // Teal sea strip on the west edge with a gold divider.
    ctx.fillStyle = '#0e5a6b';
    ctx.fillRect(385, 30, 34, 555);
    ctx.strokeStyle = '#ffd21c';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(421, 30); ctx.lineTo(421, 585); ctx.stroke();
    // Faint grid.
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let x = 385; x <= 985; x += 25) {
      ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, 585); ctx.stroke();
    }
    for (let y = 30; y <= 585; y += 25) {
      ctx.beginPath(); ctx.moveTo(385, y); ctx.lineTo(985, y); ctx.stroke();
    }
    // Major streets in white.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (const x of [570, 685, 765, 837, 910]) {
      ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, 585); ctx.stroke();
    }
    for (const y of [99, 263, 348, 448]) {
      ctx.beginPath(); ctx.moveTo(385, y); ctx.lineTo(985, y); ctx.stroke();
    }
    // Green park block.
    ctx.fillStyle = '#2e5d23';
    ctx.fillRect(585, 329, 128, 107);
    // District labels, bold white 15pt.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'left';
    const labels = [
      ['MARINA', 540, 130], ['MERCADO VIEJO', 660, 130], ['TORRE', 775, 130], ['FAROL ROJO', 880, 130],
      ['TALLER', 540, 305], ['OLD TOWN', 660, 305], ['CASINO ROW', 775, 305], ['FESTIVAL SQ', 880, 305],
      ['PLAYA DORADA', 530, 475], ['NORTH DOCKS', 650, 475], ['DUNES', 772, 475], ['HILLSIDE', 880, 475],
    ];
    for (const [text, x, y] of labels) ctx.fillText(text, x, y);
    // Horizontal street labels.
    ctx.font = '12px Arial';
    ctx.fillStyle = '#e8e8e8';
    ctx.fillText('FESTIVAL AVE', 640, 258);
    ctx.fillText('PLAYA DR', 640, 343);
    ctx.fillText('MIRAMAR STRIP', 640, 440);
    ctx.fillText('MARINA RD', 700, 95);
    // Vertical street labels (rotated).
    const verticals = [
      ['OCEAN BLVD', 570], ['PALM AVE', 685], ['MERCADO ST', 765], ['CASINO AVE', 837], ['TORRE BLVD', 910],
    ];
    for (const [text, x] of verticals) {
      ctx.save();
      ctx.translate(x, 300);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(text, -40, 4);
      ctx.restore();
    }
    // Escape route: dashed gold line vault -> west -> south -> boat.
    ctx.strokeStyle = '#ffd21c';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 7]);
    ctx.beginPath();
    ctx.moveTo(770, 100);
    ctx.lineTo(554, 100);
    ctx.lineTo(554, 432);
    ctx.lineTo(512, 468);
    ctx.stroke();
    ctx.setLineDash([]);
    // Red dashed search circle around the vault.
    ctx.strokeStyle = '#ff3c3c';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(772, 162, 79, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // White triangle marker at the vault with an "H" label.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(770, 88); ctx.lineTo(758, 110); ctx.lineTo(782, 110);
    ctx.closePath(); ctx.fill();
    ctx.font = 'bold 16px Arial';
    ctx.fillText('H', 788, 108);
    // Blue dots.
    ctx.fillStyle = '#4aa3ff';
    for (const [x, y] of [[700, 205], [790, 205], [640, 345]]) {
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    }
    // Gold dollar signs.
    ctx.fillStyle = '#ffd21c';
    ctx.font = 'bold 16px Arial';
    for (const [x, y] of [[550, 210], [840, 385], [615, 505], [835, 505]]) {
      ctx.fillText('$', x, y);
    }
    // "BOAT — PLAYA DORADA" label with a gold arrow down to the boat.
    ctx.fillStyle = '#ffd21c';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('BOAT — PLAYA DORADA', 477, 455);
    ctx.strokeStyle = '#ffd21c';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(512, 458); ctx.lineTo(512, 466); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(512, 472); ctx.lineTo(506, 463); ctx.lineTo(518, 463);
    ctx.closePath(); ctx.fill();
    // Legend at the bottom left of the panel.
    const legend = [
      ['dash', '#ffd21c', '— ESCAPE ROUTE — VAULT → BOAT'],
      ['triangle', '#ffffff', 'MARA — YOU'],
      ['dot', '#4aa3ff', 'MISSION TARGET — BOAT'],
      ['dot', '#9fd8ff', 'LCPD UNITS ON THE STREET'],
      ['dollar', '#ffd21c', 'ROBBERY TARGETS / PROPERTIES'],
      ['square', '#2fae4e', 'CREW / TURF'],
      ['square', '#d21c1c', 'TIBURONES TURF'],
    ];
    ctx.font = '12px Arial';
    let ly = 505;
    for (const [kind, color, text] of legend) {
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      if (kind === 'dash') {
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(400, ly - 4); ctx.lineTo(424, ly - 4); ctx.stroke();
      } else if (kind === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(412, ly - 10); ctx.lineTo(404, ly + 2); ctx.lineTo(420, ly + 2);
        ctx.closePath(); ctx.fill();
      } else if (kind === 'dot') {
        ctx.beginPath(); ctx.arc(412, ly - 4, 5, 0, Math.PI * 2); ctx.fill();
      } else if (kind === 'dollar') {
        ctx.font = 'bold 13px Arial';
        ctx.fillText('$', 408, ly);
        ctx.font = '12px Arial';
      } else if (kind === 'square') {
        ctx.fillRect(404, ly - 11, 14, 12);
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, 432, ly);
      ly += 13;
    }
    // Compass at (975, 66): white ring, red north arrow, "N" above.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(975, 66, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ff3c3c';
    ctx.beginPath();
    ctx.moveTo(975, 52); ctx.lineTo(969, 74); ctx.lineTo(981, 74);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('N', 975, 42);
    ctx.textAlign = 'left';
    // Title pill at the bottom centre.
    ctx.fillStyle = '#1a0a10';
    ctx.strokeStyle = '#ffd21c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(450, 581, 379, 48, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd21c';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PUERTO LUMEN — CITY MAP', 640, 612);
    ctx.textAlign = 'left';
  }

  showDamageNumber(x, y, text) {
    const layer = el('damageLayer');
    if (!layer) return;
    const d = document.createElement('div');
    d.className = 'damage-number';
    d.textContent = text;
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    layer.appendChild(d);
    window.setTimeout(() => {
      if (d.parentNode) d.parentNode.removeChild(d);
    }, 900);
  }
}

export { RADIO_LINE };
