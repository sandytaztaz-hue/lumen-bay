// LUMEN BAY — the HUD. All panels are DOM (crisp text at any size) over
// the WebGL canvas: mission panel, wanted stars, cash + weapons + bars,
// the LCPD response list, the circular minimap, toasts, the dispatch
// dialogue, the speedometer, and the full-city-map overlay for shot 3.
// Shot pins (config SHOT_PINS) fill every field at once for screenshots.

import { DISTRICTS, STREETS, POLICE_UNITS, WEAPONS, RADIO } from './config.js';

function el(tag, cls, parent, text) {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (text !== undefined) d.textContent = text;
  if (parent) parent.appendChild(d);
  return d;
}

function bar(parent, label, colour) {
  const wrap = el('div', 'hud-bar', parent);
  el('div', 'hud-bar-label', wrap, label);
  const track = el('div', 'hud-bar-track', wrap);
  const fill = el('div', 'hud-bar-fill', track);
  fill.style.background = colour;
  return fill;
}

export class HUD {
  constructor() {
    this.root = document.getElementById('hud');
    this.build();
    this.logLines = [];
    this.toastCount = 0;
    this.mapVisible = false;
  }

  build() {
    // Top-left: mission panel.
    this.missionPanel = el('div', 'panel mission-panel', this.root);
    this.missionTitle = el('div', 'mission-title', this.missionPanel);
    this.missionObj = el('div', 'mission-obj', this.missionPanel);
    this.missionStage = el('div', 'mission-stage', this.missionPanel);
    this.missionNext = el('div', 'mission-next', this.missionPanel);
    this.missionBanner = el('div', 'mission-banner', this.missionPanel);
    el('div', 'mission-controls', this.missionPanel,
      '[WASD] drive · [SPACE] handbrake · [E] exit · [M] map');

    // Top-centre: wanted.
    this.wantedBox = el('div', 'wanted-box', this.root);
    this.wantedLabel = el('div', 'wanted-label', this.wantedBox, 'WANTED');
    this.stars = el('div', 'stars', this.wantedBox);
    this.inSight = el('div', 'insight-pill', this.wantedBox, 'IN SIGHT — search zone follows you');

    // Top-right: cash + weapons + bars.
    this.cashPanel = el('div', 'panel cash-panel', this.root);
    this.cashValue = el('div', 'cash-value', this.cashPanel, '$1,200');
    this.weaponName = el('div', 'weapon-name', this.cashPanel, 'Pistol ∞');
    this.slots = el('div', 'weapon-slots', this.cashPanel);
    this.slotEls = [];
    for (const w of WEAPONS) {
      const s = el('div', 'weapon-slot', this.slots);
      s.dataset.id = w.id;
      this.slotEls.push(s);
    }
    this.healthFill = bar(this.cashPanel, 'HEALTH', '#2ecc71');
    this.armourFill = bar(this.cashPanel, 'ARMOUR', '#5a6a7a');
    this.nosFill = bar(this.cashPanel, 'NOS', '#4aa8ff');
    this.clock = el('div', 'clock', this.cashPanel, '18:40');

    // Left middle: LCPD response list.
    this.policePanel = el('div', 'panel police-panel', this.root);
    el('div', 'panel-head', this.policePanel, 'LCPD RESPONSE');
    this.policeRows = el('div', 'police-rows', this.policePanel);
    this.policeMore = el('div', 'police-more', this.policePanel);
    this.respectWrap = el('div', 'respect-wrap', this.root);
    el('div', 'respect-label', this.respectWrap, 'RESPECT · HUSTLER 0/550');
    const respectTrack = el('div', 'respect-track', this.respectWrap);
    this.respectFill = el('div', 'respect-fill', respectTrack);
    this.streetLabel = el('div', 'street-label', this.root, 'DUNES — Torre Boulevard');

    // Bottom-left: minimap + turf.
    this.mapWrap = el('div', 'minimap-wrap', this.root);
    this.minimap = document.createElement('canvas');
    this.minimap.width = 200;
    this.minimap.height = 200;
    this.minimap.className = 'minimap';
    this.mapWrap.appendChild(this.minimap);
    this.turfLabel = el('div', 'turf-label', this.root, 'TURF 1/12');

    // Bottom-centre: dialogue.
    this.dialogueEl = el('div', 'dialogue', this.root);
    this.avatar = el('div', 'avatar', this.dialogueEl, 'M');
    this.dialogueBody = el('div', 'dialogue-body', this.dialogueEl);
    this.dialogueName = el('div', 'dialogue-name', this.dialogueBody, 'MARA');
    this.dialogueLine = el('div', 'dialogue-line', this.dialogueBody, '');

    // Right middle: toasts.
    this.toasts = el('div', 'toasts', this.root);
    // Right lower: event log.
    this.logBox = el('div', 'log-box', this.root);

    // Bottom-right: speedometer.
    this.speedPanel = el('div', 'panel speed-panel', this.root);
    this.speedValue = el('div', 'speed-value', this.speedPanel, '0');
    el('div', 'speed-unit', this.speedPanel, 'km/h');
    this.gearLabel = el('div', 'gear-label', this.speedPanel, 'ON FOOT');
    this.carLabel = el('div', 'car-label', this.speedPanel, 'ON FOOT');
    this.condFill = bar(this.speedPanel, 'CONDITION', '#2ecc71');
    el('div', 'radio-line', this.speedPanel, RADIO.station);

    // Centre: big banner (MISSION PASSED / WASTED / BUSTED).
    this.bannerEl = el('div', 'big-banner', this.root);
    this.bannerTitle = el('div', 'big-banner-title', this.bannerEl);
    this.bannerSub = el('div', 'big-banner-sub', this.bannerEl);
    this.bannerEl.style.display = 'none';

    // Full-city-map overlay (shot 3). A canvas centred on the screen;
    // the HUD panels stay visible around it.
    this.mapOverlay = el('div', 'map-overlay', this.root);
    this.mapCanvas = document.createElement('canvas');
    this.mapCanvas.width = 1280;
    this.mapCanvas.height = 720;
    this.mapCanvas.className = 'map-canvas';
    this.mapOverlay.appendChild(this.mapCanvas);
    this.mapTitle = el('div', 'map-title', this.mapOverlay, 'PUERTO LUMEN — CITY MAP');
    this.mapOverlay.style.display = 'none';

    // Title screen + pause overlay live in index.html; HUD hooks here.
    this.titleEl = document.getElementById('title-screen');
    this.pauseEl = document.getElementById('pause-screen');
  }

  setMission(mission, stage = 0) {
    this.missionTitle.textContent = 'JOB ' + mission.id + ': ' + mission.name;
    const stages = mission.stages || [mission.brief];
    const lines = stages.map((s, i) => (i < stage ? '✓ ' : i === stage ? '○ ' : '○ ') + s);
    this.missionObj.innerHTML = lines.map((l) => '<div>' + l + '</div>').join('');
    this.missionStage.textContent = 'STAGE ' + (stage + 1) + '/' + stages.length +
      ' · +$' + mission.reward.toLocaleString() + ' · STORY ' + mission.id + '/15 · REP ' + (this.rep || 0);
    this.missionNext.textContent = 'NEXT: ' + (stages[Math.min(stage + 1, stages.length - 1)] || mission.brief);
    this.missionBanner.style.display = 'none';
  }

  setObjective(text) {
    this.missionObj.innerHTML = '<div>○ ' + text + '</div>';
  }

  setCash(n) {
    this.cashValue.textContent = '$' + Math.round(n).toLocaleString();
  }

  setRep(rep) {
    this.rep = rep;
    const rank = rep < 100 ? 'HUSTLER' : rep < 300 ? 'HUSTLER' : 'KINGPIN';
    this.respectWrap.querySelector('.respect-label').textContent =
      'RESPECT · ' + rank + ' ' + rep + '/550';
    this.respectFill.style.width = Math.min(100, (rep / 550) * 100) + '%';
  }

  setWanted(n, redStars = false) {
    this.wantedLabel.textContent = n > 0 ? 'WANTED' : 'NOT WANTED';
    this.wantedLabel.style.color = redStars || n >= 4 ? '#ff5252' : (n > 0 ? '#ff5252' : '#7ec8ff');
    let html = '';
    for (let i = 0; i < 5; i += 1) {
      const filled = i < n;
      const colour = redStars ? (filled ? '#e23b3b' : '#5a2a2a') : (filled ? '#ffc21a' : '#4a4238');
      html += '<span style="color:' + colour + '">' + (filled ? '★' : '☆') + '</span>';
    }
    this.stars.innerHTML = html;
    this.inSight.style.display = n > 0 ? 'block' : 'none';
  }

  setWeapon(id) {
    const w = WEAPONS.find((x) => x.id === id) || WEAPONS[1];
    this.weaponName.textContent = w.name + (w.ammo === Infinity ? ' ∞' : ' ' + w.ammo + '/' + (w.maxAmmo || 120));
    for (const s of this.slotEls) {
      const def = WEAPONS.find((x) => x.id === s.dataset.id);
      s.textContent = (def.id === 'fists' ? '1 ' : def.id === 'pistol' ? '2 ' : '3 ') +
        def.name + (def.ammo === Infinity ? ' ∞' : ' ' + def.ammo + '/' + (def.maxAmmo || 120));
      s.classList.toggle('active', def.id === id);
    }
  }

  setBars(health, healthMax, armour, armourMax, nos, nosMax) {
    this.healthFill.style.width = Math.max(0, (health / healthMax) * 100) + '%';
    this.armourFill.style.width = Math.max(0, (armour / armourMax) * 100) + '%';
    this.nosFill.style.width = Math.max(0, (nos / nosMax) * 100) + '%';
  }

  setClock(str) { this.clock.textContent = str; }

  setStreet(name) { this.streetLabel.textContent = name; }

  setTurf(n) { this.turfLabel.textContent = 'TURF ' + n + '/12'; }

  setSpeed(kmh, gear, carName, onFoot) {
    this.speedValue.textContent = String(Math.round(kmh));
    this.gearLabel.textContent = onFoot ? 'ON FOOT' : 'GEAR ' + gear;
    this.carLabel.textContent = onFoot ? 'ON FOOT' : carName;
  }

  setCondition(pct) {
    this.condFill.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }

  setPolice(units, total) {
    let html = '';
    for (const u of units) {
      const pillClass = u.status === 'SPOTLIGHT' ? 'pill-spot' : u.status === 'FLANKING' ? 'pill-flank' : 'pill-chase';
      html += '<div class="police-row"><span class="police-name">' + u.name + '</span>' +
        '<span class="police-dist">' + u.dist + 'm</span>' +
        '<span class="pill ' + pillClass + '">' + u.status + '</span></div>';
    }
    this.policeRows.innerHTML = html;
    if (total > units.length) {
      this.policeMore.innerHTML = '<div class="police-row"><span class="police-name">+' + (total - units.length) +
        ' MORE UNITS</span><span></span><span class="pill pill-route">EN ROUTE</span></div>';
    } else if (units.length === 0) {
      this.policeMore.innerHTML = '<div class="police-row"><span class="police-name">NO UNITS</span>' +
        '<span></span><span class="pill pill-clear">CLEAR</span></div>';
    } else {
      this.policeMore.innerHTML = '';
    }
  }

  toast(title, body, kind = 'info', sticky = false) {
    const t = el('div', 'toast toast-' + kind, this.toasts);
    el('div', 'toast-title', t, title);
    el('div', 'toast-body', t, body);
    this.toastCount += 1;
    while (this.toasts.children.length > 3) this.toasts.removeChild(this.toasts.firstChild);
    if (!sticky) setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 9000);
  }

  log(line) {
    this.logLines.push(line);
    if (this.logLines.length > 3) this.logLines.shift();
    this.logBox.innerHTML = this.logLines.map((l) => '<div class="log-line">' + l + '</div>').join('');
  }

  dialogue(name, line, colour = '#ff7a1a') {
    this.dialogueName.textContent = name;
    this.dialogueName.style.color = colour;
    this.dialogueLine.textContent = line;
    this.avatar.textContent = name.charAt(0);
    this.avatar.style.background = colour;
  }

  banner(title, sub, sticky = false) {
    this.bannerTitle.textContent = title;
    this.bannerSub.textContent = sub || '';
    this.bannerEl.style.display = 'block';
    if (!sticky) setTimeout(() => { this.bannerEl.style.display = 'none'; }, 4200);
  }

  showTitle(show) {
    if (this.titleEl) this.titleEl.style.display = show ? 'flex' : 'none';
  }

  showPause(show) {
    if (this.pauseEl) this.pauseEl.style.display = show ? 'flex' : 'none';
  }

  // Fill every field from a SHOT_PINS entry (screenshots only).
  applyPin(pin) {
    this.missionTitle.textContent = pin.title;
    this.missionObj.innerHTML = '<div>○ ' + pin.objective + '</div>';
    this.missionStage.textContent = pin.stage;
    this.missionNext.textContent = pin.next;
    if (pin.banner) {
      this.missionBanner.style.display = 'block';
      this.missionBanner.textContent = pin.banner;
    } else {
      this.missionBanner.style.display = 'none';
    }
    this.setCash(pin.cash);
    this.setClock(pin.clock);
    this.setWanted(pin.wanted, !!pin.starsRed);
    this.setWeapon(pin.weapon);
    this.setStreet(pin.street);
    this.setTurf(pin.turf);
    this.setRep(290);
    this.setSpeed(pin.speed, pin.gear, 'VELOZ COMET RS', pin.gear === 0);
    this.setCondition(100);
    this.setBars(100, 100, 0, 100, 100, 100);
  }

  // ---- minimap (circular, bottom-left) ----
  drawMinimap(game) {
    const ctx = this.minimap.getContext('2d');
    const W = 200, R = 95, cx = 100, cy = 100;
    ctx.clearRect(0, 0, W, W);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#0e2a33';
    ctx.fillRect(0, 0, W, W);
    // sea (south) + sand strip
    ctx.fillStyle = '#1e6f8e';
    ctx.fillRect(0, 162, W, 38);
    ctx.fillStyle = '#d9b380';
    ctx.fillRect(0, 152, W, 10);
    // streets
    const sx = (x) => 8 + ((x + 60) / 380) * 184;
    const sz = (z) => 8 + ((z - 110) / 190) * 184;
    ctx.strokeStyle = 'rgba(225,230,240,0.9)';
    ctx.lineWidth = 3;
    for (const s of STREETS) {
      ctx.beginPath();
      ctx.moveTo(sx(s.x1), sz(s.z1));
      ctx.lineTo(sx(s.x2), sz(s.z2));
      ctx.stroke();
    }
    // district labels (tiny)
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    for (const d of DISTRICTS) {
      ctx.fillText(d.name, sx(d.x), sz(d.z));
    }
    // turf $ marks
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 9px sans-serif';
    for (const t of game.turf.spots) {
      if (t.owner === 'mara') ctx.fillText('$', sx(t.x), sz(t.z));
    }
    // mission marker (gold diamond)
    const m = game.missions.current;
    if (m) {
      ctx.fillStyle = '#ffd21a';
      ctx.beginPath();
      ctx.moveTo(sx(m.target.x), sz(m.target.z) - 7);
      ctx.lineTo(sx(m.target.x) + 6, sz(m.target.z));
      ctx.lineTo(sx(m.target.x), sz(m.target.z) + 7);
      ctx.lineTo(sx(m.target.x) - 6, sz(m.target.z));
      ctx.fill();
    }
    // police blips (blue) + heli (white H)
    ctx.fillStyle = '#4aa8ff';
    for (const c of game.police.cruisers) {
      ctx.beginPath();
      ctx.arc(sx(c.mesh.position.x), sz(c.mesh.position.z), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (game.heli.visible) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('H', sx(game.heli.mesh.position.x), sz(game.heli.mesh.position.z));
    }
    // player arrow (gold, rotated by heading)
    const p = game.player;
    ctx.save();
    ctx.translate(sx(p.x), sz(p.z));
    ctx.rotate(-p.heading);
    ctx.fillStyle = '#ffd21a';
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
    // ring + north tick
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, R - 1, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ---- full city map (shot 3) ----
  showMap(game) {
    this.mapVisible = true;
    this.mapOverlay.style.display = 'block';
    const ctx = this.mapCanvas.getContext('2d');
    const W = 1280, H = 720;
    ctx.clearRect(0, 0, W, H);
    const x0 = 385, y0 = 28, x1 = 1015, y1 = 612;
    // map panel
    ctx.fillStyle = '#2a1a24';
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = '#1e6f8e';
    ctx.fillRect(x0, y0, 26, y1 - y0); // sea strip, west edge
    ctx.fillStyle = '#d9b380';
    ctx.fillRect(x0 + 26, y0, 8, y1 - y0);
    ctx.fillStyle = '#2a5a3a';
    ctx.fillRect(x0 + 200, y0 + 300, 130, 110); // park block
    const sx = (x) => x0 + 40 + ((x + 60) / 380) * (x1 - x0 - 80);
    const sz = (z) => y0 + 20 + ((z - 110) / 190) * (y1 - y0 - 40);
    // street grid
    ctx.strokeStyle = 'rgba(235,235,245,0.85)';
    ctx.lineWidth = 2.5;
    for (const s of STREETS) {
      ctx.beginPath();
      ctx.moveTo(sx(s.x1), sz(s.z1));
      ctx.lineTo(sx(s.x2), sz(s.z2));
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(235,235,245,0.25)';
    ctx.lineWidth = 1;
    for (let gx = -40; gx <= 320; gx += 20) {
      ctx.beginPath(); ctx.moveTo(sx(gx), y0); ctx.lineTo(sx(gx), y1); ctx.stroke();
    }
    for (let gz = 120; gz <= 300; gz += 20) {
      ctx.beginPath(); ctx.moveTo(x0, sz(gz)); ctx.lineTo(x1, sz(gz)); ctx.stroke();
    }
    // street names
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    const streetNames = [
      ['MARINA RD', 150, 128], ['OCEAN BLVD', 40, 170], ['PALM AVE', 120, 170],
      ['MERCADO ST', 175, 170], ['CASINO AVE', 225, 170], ['TORRE BLVD', 275, 170],
      ['FESTIVAL AVE', 150, 185], ['MIRAMAR STRIP', 150, 250], ['PLAYA DR', 150, 215],
    ];
    for (const [name, x, z] of streetNames) {
      ctx.save();
      ctx.translate(sx(x), sz(z));
      if (name === 'OCEAN BLVD' || name === 'PALM AVE' || name === 'MERCADO ST' ||
          name === 'CASINO AVE' || name === 'TORRE BLVD') ctx.rotate(-Math.PI / 2);
      ctx.fillText(name, 0, 0);
      ctx.restore();
    }
    // district labels
    ctx.font = 'bold 17px sans-serif';
    ctx.fillStyle = '#ffffff';
    for (const d of DISTRICTS) ctx.fillText(d.name, sx(d.x), sz(d.z));
    // escape route: gold dashed line TORRE -> PLAYA DORADA boat
    ctx.strokeStyle = '#ffd21a';
    ctx.lineWidth = 5;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(sx(180), sz(150));
    ctx.lineTo(sx(180), sz(128));
    ctx.lineTo(sx(30), sz(128));
    ctx.lineTo(sx(30), sz(262));
    ctx.stroke();
    ctx.setLineDash([]);
    // search zone: red dashed circle around TORRE
    ctx.strokeStyle = '#ff4040';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(sx(180), sz(150), 78, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // markers: $ robbery targets, blue mission dots, H heli, Mara triangle
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 18px sans-serif';
    for (const [x, z] of [[55, 168], [245, 228], [85, 275], [235, 275]]) {
      ctx.fillText('$', sx(x), sz(z));
    }
    ctx.fillStyle = '#4aa8ff';
    for (const [x, z] of [[150, 165], [120, 215], [215, 165]]) {
      ctx.beginPath(); ctx.arc(sx(x), sz(z), 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('H', sx(195), sz(150));
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(sx(180), sz(150) - 12);
    ctx.lineTo(sx(180) + 10, sz(150) + 8);
    ctx.lineTo(sx(180) - 10, sz(150) + 8);
    ctx.closePath();
    ctx.fill();
    // boat marker at Playa Dorada
    ctx.fillStyle = '#ffd21a';
    ctx.save();
    ctx.translate(sx(30), sz(262));
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
    ctx.fillStyle = '#ffd21a';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BOAT — PLAYA DORADA', sx(30), sz(262) - 22);
    // compass
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x1 - 42, y0 + 42, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ff4040';
    ctx.beginPath();
    ctx.moveTo(x1 - 42, y0 + 26);
    ctx.lineTo(x1 - 36, y0 + 48);
    ctx.lineTo(x1 - 48, y0 + 48);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', x1 - 42, y0 + 16);
    // legend: two columns, bottom-left inside the panel, below the
    // PLAYA DORADA row and clear of the title pill.
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px sans-serif';
    const legend = [
      ['#ffd21a', '—  ESCAPE ROUTE — VAULT → BOAT', '#ffffff', 'H  AIR-1 HELICOPTER'],
      ['#ffffff', '▲  MARA — YOU', '#ffd76a', '$  ROBBERY TARGETS / PROPERTIES'],
      ['#4aa8ff', '●  MISSION TARGET — BOAT', '#2ecc71', '●  CREW TURF'],
      ['#4aa8ff', '●  LCPD UNITS ON THE STREET', '#ff4040', '■  TIBURONES TURF'],
    ];
    let ly = 532;
    for (const [c1, t1, c2, t2] of legend) {
      ctx.fillStyle = c1;
      ctx.fillText(t1, x0 + 16, ly);
      ctx.fillStyle = c2;
      ctx.fillText(t2, x0 + 330, ly);
      ly += 13;
    }
  }

  hideMap() {
    this.mapVisible = false;
    this.mapOverlay.style.display = 'none';
  }
}
