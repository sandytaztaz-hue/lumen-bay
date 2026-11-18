// The HUD: a dense DOM overlay on top of the 3D view — minimap, wanted stars,
// health and armour bars, cash, speed, weapon, objective banner, event log,
// radio station and the fixed 18:40 golden-hour clock. Floating damage numbers
// are projected from the world onto the screen.
import { ROADS, WORLD } from './config.js';

export class HUD {
  constructor() {
    this.el = (id) => document.getElementById(id);
    this.map = this.el('minimap').getContext('2d');
    this.logLines = [];
    this.damagePool = [];
    this.bannerTimer = 0;
    this.prepareMap();
  }

  prepareMap() {
    const c = this.el('minimap');
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(10,16,28,0.85)';
    g.fillRect(0, 0, c.width, c.height);
    const toMap = (v) => ((v + WORLD.half + 30) / (WORLD.half * 2 + 60)) * c.width;
    g.strokeStyle = '#8a8a96'; g.lineWidth = 3;
    for (const r of ROADS) {
      g.beginPath(); g.moveTo(0, toMap(r)); g.lineTo(c.width, toMap(r)); g.stroke();
      g.beginPath(); g.moveTo(toMap(r), 0); g.lineTo(toMap(r), c.height); g.stroke();
    }
    // Ocean to the north and south, beach line to the south.
    g.fillStyle = '#1f6f8e';
    g.fillRect(0, 0, c.width, toMap(-WORLD.half) - 4);
    g.fillRect(0, toMap(WORLD.half) + 4, c.width, c.height);
    g.fillStyle = '#e8c98a';
    g.fillRect(0, toMap(WORLD.half) - 2, c.width, 6);
    this.mapBase = c;
    this.toMap = toMap;
  }

  drawMinimap(playerPos, playerAngle, marker, cops, heliPos, traffic) {
    const g = this.map;
    const c = this.el('minimap');
    g.drawImage(this.mapBase, 0, 0);
    const toMap = this.toMap;
    // Traffic dots.
    g.fillStyle = '#d8d8e0';
    for (const t of traffic) {
      g.fillRect(toMap(t.pos.x) - 1.5, toMap(t.pos.z) - 1.5, 3, 3);
    }
    // Mission marker: pulsing yellow diamond.
    if (marker) {
      const pulse = 5 + Math.sin(performance.now() / 240) * 2;
      g.fillStyle = '#ffd24a';
      g.save();
      g.translate(toMap(marker.x), toMap(marker.z));
      g.rotate(Math.PI / 4);
      g.fillRect(-pulse / 2, -pulse / 2, pulse, pulse);
      g.restore();
    }
    // Police blips: blue, flashing.
    if (Math.floor(performance.now() / 300) % 2 === 0) {
      g.fillStyle = '#3a7dff';
      for (const cop of cops) {
        g.beginPath(); g.arc(toMap(cop.pos.x), toMap(cop.pos.z), 3.5, 0, Math.PI * 2); g.fill();
      }
    }
    if (heliPos) {
      g.fillStyle = '#ff6a4a';
      g.font = 'bold 12px Arial';
      g.fillText('H', toMap(heliPos.x) - 4, toMap(heliPos.z) + 4);
    }
    // Player arrow.
    g.save();
    g.translate(toMap(playerPos.x), toMap(playerPos.z));
    g.rotate(playerAngle);
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath(); g.fill();
    g.strokeStyle = '#111'; g.stroke();
    g.restore();
  }

  log(text) {
    this.logLines.push(text);
    if (this.logLines.length > 5) this.logLines.shift();
    this.el('eventlog').innerHTML = this.logLines.map((l) => `<div>${l}</div>`).join('');
  }

  banner(title, sub, ms = 3600) {
    const b = this.el('banner');
    b.innerHTML = `<div class="banner-title">${title}</div><div class="banner-sub">${sub}</div>`;
    b.style.opacity = '1';
    this.bannerTimer = ms;
  }

  hideBanner() { this.el('banner').style.opacity = '0'; }

  update(dt, state) {
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt * 1000;
      if (this.bannerTimer <= 0) this.hideBanner();
    }
    this.el('stars').textContent = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
    this.el('stars').style.color = state.wanted >= 3 ? '#ff4444' : '#ffd24a';
    this.el('healthfill').style.width = `${Math.max(0, state.health)}%`;
    this.el('armourfill').style.width = `${Math.max(0, state.armour)}%`;
    this.el('cash').textContent = `$${Math.floor(state.cash).toLocaleString('en-US')}`;
    this.el('speed').textContent = state.inCar ? `${Math.round(Math.abs(state.speed) * 3.6)} km/h` : '';
    this.el('weapon').textContent = state.inCar
      ? `${state.carName}  ♥ ${Math.round(state.carHealth)}%`
      : `${state.weapon}${state.ammo !== null ? `  •  ${state.ammo}` : '  •  ∞'}`;
    this.el('objective').textContent = state.objective;
    this.el('radio').textContent = `♪ ${state.radio}`;
    this.el('clock').textContent = '18:40';
    this.el('jobs').textContent = `JOBS ${state.jobsDone}/12   •   $${Math.floor(state.totalEarned).toLocaleString('en-US')} earned`;
  }

  /** A floating damage number at a world position, projected to screen space. */
  spawnDamage(worldPos, text, camera, color = '#ffd24a') {
    const v = worldPos.clone().project(camera);
    if (v.z > 1) return;
    const layer = this.el('damage-layer');
    const div = document.createElement('div');
    div.className = 'damage-number';
    div.textContent = text;
    div.style.color = color;
    div.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
    div.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;
    layer.appendChild(div);
    this.damagePool.push({ div, life: 0.9 });
    if (this.damagePool.length > 24) {
      const old = this.damagePool.shift();
      old.div.remove();
    }
  }

  updateDamage(dt) {
    for (let i = this.damagePool.length - 1; i >= 0; i -= 1) {
      const d = this.damagePool[i];
      d.life -= dt;
      const top = parseFloat(d.div.style.top) - dt * 46;
      d.div.style.top = `${top}px`;
      d.div.style.opacity = String(Math.max(0, d.life / 0.9));
      if (d.life <= 0) { d.div.remove(); this.damagePool.splice(i, 1); }
    }
  }

  showScreen(name) {
    for (const s of ['title', 'pause', 'over']) {
      this.el(`screen-${s}`).style.display = s === name ? 'flex' : 'none';
    }
    this.el('hud').style.display = name === null ? 'block' : 'none';
  }

  setTitleSave(hasSave, cash, jobs) {
    this.el('continue-btn').style.display = hasSave ? 'block' : 'none';
    this.el('save-info').textContent = hasSave
      ? `Continue — $${Math.floor(cash).toLocaleString('en-US')} • ${jobs}/12 jobs done`
      : 'No save yet — start a new getaway.';
  }
}
