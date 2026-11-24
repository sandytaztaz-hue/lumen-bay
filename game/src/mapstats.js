// LUMEN BAY — mapstats.js
// Full-screen stats/map screen (shot 3). Draws the entire 1280x720
// frame from scratch on every call: top bar, left progress panel,
// centre city map, right rank/career/save panel, bottom hint line.
// Written fresh from the shot-3 redesign spec. No round minimap here.
export function drawMapStats(ctx, v) {
  var W = 1280, H = 720;

  // ---------- palette: Lumen Bay sunset / dusk ----------
  var BG = '#140e20';        // deep dusk plum-indigo, near-black
  var TOPBAR = '#221832';    // slightly lighter plum band
  var PANEL = '#1e152e';     // side-panel fill
  var PANEL_LINE = 'rgba(245,185,66,0.28)';
  var GOLD = '#f5b942';      // gold-amber title / key numbers
  var GOLD_LINE = '#ffd23e'; // gold dashed route
  var GREEN = '#3ddc5a';     // money
  var INK = '#f5f0e6';       // main text
  var DIM = '#9a93a8';       // secondary text
  var OUTLINE = 'rgba(12,6,20,0.92)'; // dark outline behind every label
  var SEA = '#0e4d5c';      // deep teal sea
  var BEACH = '#e8d5a8';    // pale sand beach
  var ROAD = 'rgba(255,238,214,0.9)'; // warm-white major roads
  var GRID = 'rgba(255,255,255,0.07)'; // faint minor grid lines

  // ---------- layout ----------
  var MAP = { x: 300, y: 70, w: 680, h: 580 }; // map frame
  var GX = 344, GY = 78, CW = 157, CH = 168;  // district grid (4 x 3)
  var LEFT = { x: 20, y: 72, w: 260, h: 588 };
  var RIGHT = { x: 1000, y: 72, w: 260, h: 588 };

  // Districts, west to east, top row to bottom row (from the spec).
  // Warm sunset fills only — amber, coral, rose, teal, gold, burnt
  // orange. No green, no pink.
  var DISTRICTS = [
    { name: 'MARINA',        col: 0, row: 0, fill: '#d9a441' },
    { name: 'MERCADO VIEJO', col: 1, row: 0, fill: '#c96f4a' },
    { name: 'TORRE',         col: 2, row: 0, fill: '#e0b13c' },
    { name: 'FAROL ROJO',    col: 3, row: 0, fill: '#c65a4e' },
    { name: 'TALLER',        col: 0, row: 1, fill: '#cf6b2a' },
    { name: 'OLD TOWN',      col: 1, row: 1, fill: '#d9b380' },
    { name: 'CASINO ROW',    col: 2, row: 1, fill: '#2e8b8b' },
    { name: 'FESTIVAL SQ',   col: 3, row: 1, fill: '#e0704f' },
    { name: 'PLAYA DORADA',  col: 0, row: 2, fill: '#e8c877' },
    { name: 'NORTH DOCKS',   col: 1, row: 2, fill: '#a86f3c' },
    { name: 'DUNES',         col: 2, row: 2, fill: '#d98a6a' },
    { name: 'HILLSIDE',      col: 3, row: 2, fill: '#c98f2e' },
  ];
  // Label height per district: neighbouring names sit at different
  // heights so long names never run together. Farol Rojo sits lower
  // so the compass in the map's top-right corner stays clear of it.
  var LABEL_Y = [
    [104, 124, 104, 132],
    [272, 292, 272, 292],
    [440, 460, 440, 460],
  ];

  function cellCx(d) { return GX + (d.col + 0.5) * CW; }
  function cellCy(d) { return GY + (d.row + 0.5) * CH; }

  function money(n) {
    return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // Rounded-rect path (no reliance on ctx.roundRect existing).
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function circle(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.closePath();
  }

  // Text helper: every label gets a dark outline so it reads on any
  // background. All labels are drawn in the final phase, after every
  // marker, line and block, so nothing ever covers a letter.
  function label(s, x, y, font, color, align, outlineW) {
    ctx.font = font;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.lineWidth = outlineW || 3;
    ctx.strokeStyle = OUTLINE;
    ctx.strokeText(s, x, y);
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }

  function divider(x0, x1, y) {
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
  }

  function heading(s, x, y) {
    label(s, x, y, 'bold 11px Arial, Helvetica, sans-serif', GOLD, 'left', 3);
  }

  // ================================================================
  // PHASE 1 — opaque background, top bar, panel frames
  // ================================================================
  ctx.save();
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Top bar (0..60): slightly lighter plum band, gold hairline below.
  ctx.fillStyle = TOPBAR;
  ctx.fillRect(0, 0, W, 60);
  ctx.fillStyle = 'rgba(245,185,66,0.45)';
  ctx.fillRect(0, 60, W, 2);

  // Tabs: MAP active with a warm accent background, the rest plain.
  var TABS = ['MAP', 'STORY', 'STATS', 'CREW', 'SETTINGS', 'CONTROLS', 'SAVE'];
  var tabW = 88, tabH = 34, tabY = 13;
  var tabX0 = (W - TABS.length * tabW) / 2;
  for (var ti = 0; ti < TABS.length; ti++) {
    var tx = tabX0 + ti * tabW;
    if (ti === 0) {
      ctx.fillStyle = '#b3541e';
      rr(tx + 2, tabY, tabW - 4, tabH, 6);
      ctx.fill();
    }
  }

  // Side panels.
  ctx.fillStyle = PANEL;
  rr(LEFT.x, LEFT.y, LEFT.w, LEFT.h, 10);
  ctx.fill();
  ctx.strokeStyle = PANEL_LINE;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = PANEL;
  rr(RIGHT.x, RIGHT.y, RIGHT.w, RIGHT.h, 10);
  ctx.fill();
  ctx.strokeStyle = PANEL_LINE;
  ctx.lineWidth = 1;
  ctx.stroke();

  // ================================================================
  // PHASE 2 — the map: sea, beach, districts, roads, route, markers
  // (no text in this phase)
  // ================================================================
  var mx = MAP.x, my = MAP.y, mw = MAP.w, mh = MAP.h;

  // Sea strip along the west edge (deep teal), beach along the south.
  ctx.fillStyle = SEA;
  ctx.fillRect(mx, my, 44, mh);
  ctx.fillStyle = BEACH;
  ctx.fillRect(mx + 44, my + mh - 68, mw - 44, 68);
  // Foam line where beach meets the grid.
  ctx.fillStyle = 'rgba(255,246,220,0.7)';
  ctx.fillRect(mx + 44, my + mh - 68, mw - 44, 2);
  // Sea foam edge.
  ctx.fillStyle = 'rgba(255,246,220,0.45)';
  ctx.fillRect(mx + 44, my, 2, mh);

  // District fills.
  for (var di = 0; di < DISTRICTS.length; di++) {
    var d = DISTRICTS[di];
    ctx.fillStyle = d.fill;
    ctx.fillRect(GX + d.col * CW, GY + d.row * CH, CW, CH);
    ctx.strokeStyle = 'rgba(20,10,25,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(GX + d.col * CW + 0.5, GY + d.row * CH + 0.5, CW - 1, CH - 1);
  }

  // Faint minor grid lines inside each district.
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  for (var gi = 0; gi < DISTRICTS.length; gi++) {
    var g = DISTRICTS[gi];
    var gx0 = GX + g.col * CW, gy0 = GY + g.row * CH;
    for (var k = 1; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(gx0 + (CW * k) / 4, gy0 + 8);
      ctx.lineTo(gx0 + (CW * k) / 4, gy0 + CH - 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(gx0 + 8, gy0 + (CH * k) / 4);
      ctx.lineTo(gx0 + CW - 8, gy0 + (CH * k) / 4);
      ctx.stroke();
    }
  }

  // Major roads: warm-white bands on the grid boundaries.
  ctx.fillStyle = ROAD;
  var roadXs = [GX + CW, GX + 2 * CW, GX + 3 * CW]; // 501, 658, 815
  var roadYs = [GY + CH, GY + 2 * CH];              // 246, 414
  for (var ri = 0; ri < roadXs.length; ri++) {
    ctx.fillRect(roadXs[ri] - 3, GY, 7, 3 * CH);
  }
  for (var rj = 0; rj < roadYs.length; rj++) {
    ctx.fillRect(GX, roadYs[rj] - 3, 4 * CW, 7);
  }

  // Sea waves (west strip) and cove waves (bottom-right water).
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  for (var wi = 0; wi < 5; wi++) {
    var wy = my + 110 + wi * 104;
    ctx.beginPath();
    ctx.moveTo(mx + 8, wy);
    ctx.quadraticCurveTo(mx + 18, wy - 7, mx + 28, wy);
    ctx.quadraticCurveTo(mx + 36, wy + 7, mx + 40, wy);
    ctx.stroke();
  }

  // Small teal cove on the beach, bottom-right: open water for the
  // LUMEN BAY annotation.
  ctx.fillStyle = '#0f5a66';
  rr(900, my + mh - 60, 72, 52, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(910, my + mh - 38);
  ctx.quadraticCurveTo(922, my + mh - 44, mx + mw - 22, my + mh - 38);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(914, my + mh - 24);
  ctx.quadraticCurveTo(926, my + mh - 30, mx + mw - 26, my + mh - 24);
  ctx.stroke();

  // ---- escape route: gold dashed line, vault (TORRE) to boat (PLAYA)
  // Runs on the roads so it never crosses a district label.
  var ROUTE = [
    [736, 190], // Torre Lumen vault
    [736, 246],
    [501, 246],
    [501, 500],
    [428, 500], // boat at Playa Dorada
  ];
  ctx.strokeStyle = GOLD_LINE;
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.moveTo(ROUTE[0][0], ROUTE[0][1]);
  for (var pi = 1; pi < ROUTE.length; pi++) ctx.lineTo(ROUTE[pi][0], ROUTE[pi][1]);
  ctx.stroke();
  ctx.setLineDash([]);

  // ---- markers (shapes only; their glyphs are labels, drawn last) --
  // Vault: gold ring at the route start in TORRE.
  ctx.fillStyle = GOLD_LINE;
  circle(736, 190, 11);
  ctx.fill();
  ctx.strokeStyle = '#7a5200';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Robbery targets: gold dollar discs.
  var dollars = [[460, 188], [856, 356], [770, 522]];
  for (var dli = 0; dli < dollars.length; dli++) {
    ctx.fillStyle = GOLD_LINE;
    circle(dollars[dli][0], dollars[dli][1], 10);
    ctx.fill();
    ctx.strokeStyle = '#7a5200';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Mission targets: blue dots with a white ring.
  var missions = [[920, 188], [760, 352], [610, 522]];
  for (var mi = 0; mi < missions.length; mi++) {
    ctx.fillStyle = '#2f6fd0';
    circle(missions[mi][0], missions[mi][1], 7);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // LCPD units: red dots.
  var cops = [[482, 322], [442, 372], [500, 366], [915, 522]];
  for (var ci = 0; ci < cops.length; ci++) {
    ctx.fillStyle = '#e23b2e';
    circle(cops[ci][0], cops[ci][1], 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Police cordon: red dashed circle over TALLER.
  ctx.strokeStyle = '#e23b2e';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([8, 6]);
  circle(460, 342, 52);
  ctx.stroke();
  ctx.setLineDash([]);

  // Crew turf: small green block in CASINO ROW.
  ctx.fillStyle = '#2fae4e';
  ctx.fillRect(692, 296, 24, 16);
  ctx.strokeStyle = '#145c26';
  ctx.lineWidth = 2;
  ctx.strokeRect(692, 296, 24, 16);

  // Tiburones turf: small red block in HILLSIDE.
  ctx.fillStyle = '#c22a1e';
  ctx.fillRect(880, 500, 24, 16);
  ctx.strokeStyle = '#6d130c';
  ctx.lineWidth = 2;
  ctx.strokeRect(880, 500, 24, 16);

  // Hideout: dark square with a gold border in OLD TOWN.
  ctx.fillStyle = '#1a1226';
  ctx.fillRect(601, 359, 18, 18);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(601, 359, 18, 18);

  // Player triangle on the route (white, pointing west, the way Mara
  // is driving). Sits on the horizontal leg at y 246.
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1a1226';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(606, 246);
  ctx.lineTo(630, 236);
  ctx.lineTo(630, 256);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Boat at the end of the route, Playa Dorada.
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1a1226';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); // hull
  ctx.moveTo(414, 500);
  ctx.lineTo(442, 500);
  ctx.lineTo(436, 510);
  ctx.lineTo(420, 510);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath(); // mast + sail
  ctx.moveTo(428, 500);
  ctx.lineTo(428, 484);
  ctx.stroke();
  ctx.fillStyle = GOLD_LINE;
  ctx.beginPath();
  ctx.moveTo(428, 485);
  ctx.lineTo(428, 498);
  ctx.lineTo(440, 498);
  ctx.closePath();
  ctx.fill();

  // Compass: dark disc with a gold ring, top-right of the map.
  ctx.fillStyle = '#1a1226';
  circle(952, 98, 14);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Map frame.
  ctx.strokeStyle = 'rgba(245,185,66,0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(mx + 1, my + 1, mw - 2, mh - 2);

  // Bottom banner pill: PUERTO LUMEN — CITY MAP.
  ctx.fillStyle = 'rgba(20,12,28,0.88)';
  rr(560, 606, 220, 30, 15);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,185,66,0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Legend box, bottom-left interior of the map.
  ctx.fillStyle = 'rgba(20,12,28,0.88)';
  rr(310, 524, 235, 102, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,185,66,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Legend swatches (shapes only; captions are labels, drawn last).
  var legRows = [564, 582, 600, 618];
  // col 1 (x 322): escape route, Mara, mission target, LCPD units
  ctx.strokeStyle = GOLD_LINE;
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(322, legRows[0] - 3);
  ctx.lineTo(338, legRows[0] - 3);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(324, legRows[1] - 8);
  ctx.lineTo(336, legRows[1] - 8);
  ctx.lineTo(330, legRows[1] + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2f6fd0';
  circle(330, legRows[2] - 3, 5);
  ctx.fill();
  ctx.fillStyle = '#e23b2e';
  circle(330, legRows[3] - 3, 5);
  ctx.fill();
  // col 2 (x 436): robbery targets, crew turf, Tiburones turf
  ctx.fillStyle = GOLD_LINE;
  circle(444, legRows[0] - 3, 6);
  ctx.fill();
  ctx.fillStyle = '#2fae4e';
  ctx.fillRect(438, legRows[1] - 9, 12, 9);
  ctx.fill();
  ctx.fillStyle = '#c22a1e';
  ctx.fillRect(438, legRows[2] - 9, 12, 9);
  ctx.fill();

  // ================================================================
  // LEFT PANEL — shapes (ring, bars, checkboxes)
  // ================================================================
  var pct = Math.round((v.jobN / v.jobTotal) * 100);
  // Completion ring, full.
  var ringX = 150, ringY = 144, ringR = 52;
  ctx.strokeStyle = '#3a2b52';
  ctx.lineWidth = 10;
  circle(ringX, ringY, ringR);
  ctx.stroke();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(ringX, ringY, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (pct / 100));
  ctx.stroke();

  // Progress items: checkbox + thin bar each.
  var prog = [
    { label: 'Street races won', done: 1, total: 1 },
    { label: 'Turf taken', done: v.turf, total: v.turfTotal },
    { label: 'Crew recruited', done: v.crew.length, total: 4 },
    { label: 'Vaults cracked', done: 1, total: 1 },
  ];
  var progY = [290, 330, 370, 410];
  for (var pri = 0; pri < prog.length; pri++) {
    var p = prog[pri];
    var py = progY[pri];
    // Checkbox square.
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.strokeRect(36, py - 12, 13, 13);
    if (p.done >= p.total) {
      ctx.fillStyle = GOLD;
      ctx.fillRect(38, py - 10, 9, 9);
    }
    // Thin progress bar under the label.
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(36, py + 8, 228, 5);
    ctx.fillStyle = GOLD;
    ctx.fillRect(36, py + 8, 228 * Math.min(1, p.done / p.total), 5);
  }

  // ================================================================
  // RIGHT PANEL — shapes (respect bar, save-slot boxes, buttons)
  // ================================================================
  // Respect bar.
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(1016, 192, 228, 7);
  ctx.fillStyle = '#ff8c1a';
  ctx.fillRect(1016, 192, 228 * Math.min(1, v.respect / v.respectMax), 7);

  // Save slots.
  var slot1 = { x: 1016, y: 452, w: 228, h: 62 };
  var slot2 = { x: 1016, y: 524, w: 228, h: 44 };
  var slot3 = { x: 1016, y: 578, w: 228, h: 44 };
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  rr(slot1.x, slot1.y, slot1.w, slot1.h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,185,66,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  rr(slot2.x, slot2.y, slot2.w, slot2.h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  rr(slot3.x, slot3.y, slot3.w, slot3.h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.stroke();
  // SAVE buttons: filled gold on slot 1, outlined on 2 and 3.
  ctx.fillStyle = GOLD;
  rr(1182, 462, 50, 24, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,185,66,0.7)';
  ctx.lineWidth = 1.5;
  rr(1182, 534, 50, 24, 6);
  ctx.stroke();
  rr(1182, 588, 50, 24, 6);
  ctx.stroke();

  // ================================================================
  // PHASE 3 — ALL labels, last, with dark outlines.
  // Nothing drawn after this can cover a letter.
  // ================================================================
  // --- top bar ---
  label('LUMEN BAY', 24, 41, 'bold 30px Arial, Helvetica, sans-serif', GOLD, 'left', 4);
  for (var tj = 0; tj < TABS.length; tj++) {
    var tcx = tabX0 + tj * tabW + tabW / 2;
    label(TABS[tj], tcx, 36, 'bold 13px Arial, Helvetica, sans-serif',
      tj === 0 ? '#ffffff' : '#cbbfd6', 'center', 3);
  }
  label(money(v.cash), 1256, 41, 'bold 28px Arial, Helvetica, sans-serif', GREEN, 'right', 4);

  // --- left panel ---
  label(pct + '%', ringX, 152, 'bold 26px Arial, Helvetica, sans-serif', INK, 'center', 4);
  label(v.jobN + '/' + v.jobTotal + ' STORY JOBS', ringX, 222,
    'bold 13px Arial, Helvetica, sans-serif', GOLD, 'center', 3);
  divider(36, 264, 240);
  heading('PROGRESS', 36, 266);
  for (var pli = 0; pli < prog.length; pli++) {
    var pp = prog[pli];
    label(pp.label, 58, progY[pli], '13px Arial, Helvetica, sans-serif', INK, 'left', 3);
    label(pp.done + '/' + pp.total, 264, progY[pli],
      'bold 13px Arial, Helvetica, sans-serif', GOLD, 'right', 3);
  }
  divider(36, 264, 440);
  heading('CREW', 36, 466);
  var crewY = [490, 513, 536, 559];
  for (var cri = 0; cri < v.crew.length; cri++) {
    var cm = v.crew[cri];
    label(cm.name, 36, crewY[cri], 'bold 13px Arial, Helvetica, sans-serif', INK, 'left', 3);
    label('— ' + cm.role, 36 + ctx.measureText(cm.name).width + 34, crewY[cri],
      '13px Arial, Helvetica, sans-serif', DIM, 'left', 3);
  }
  divider(36, 264, 576);
  heading('CURRENT JOB', 36, 600);
  label('JOB ' + v.jobN + ' · ' + v.jobTitle, 36, 624,
    'bold 12px Arial, Helvetica, sans-serif', INK, 'left', 3);
  label('STAGE ' + v.jobStage + ' · +' + money(v.jobReward) + ' · +' + v.jobRep + ' REP',
    36, 646, '12px Arial, Helvetica, sans-serif', DIM, 'left', 3);

  // --- map: annotations, district names, marker glyphs, legend ---
  label('LEONIDA', 356, 88, 'bold 11px Arial, Helvetica, sans-serif', '#c9b8a0', 'left', 3);
  label('LUMEN BAY', 964, 624, 'bold italic 13px Arial, Helvetica, sans-serif',
    '#f2e3c6', 'right', 3);
  for (var dli2 = 0; dli2 < DISTRICTS.length; dli2++) {
    var dd = DISTRICTS[dli2];
    label(dd.name, cellCx(dd), LABEL_Y[dd.row][dd.col],
      'bold 12px Arial, Helvetica, sans-serif', '#ffffff', 'center', 3);
  }
  // Compass letter.
  label('N', 952, 103, 'bold 13px Arial, Helvetica, sans-serif', GOLD, 'center', 3);
  // Banner pill.
  label('PUERTO LUMEN — CITY MAP', 670, 625,
    'bold 13px Arial, Helvetica, sans-serif', GOLD, 'center', 3);
  // Marker glyphs.
  label('$', 736, 194, 'bold 13px Arial, Helvetica, sans-serif', '#1a1200', 'center', 0);
  for (var dgi = 0; dgi < dollars.length; dgi++) {
    label('$', dollars[dgi][0], dollars[dgi][1] + 4,
      'bold 12px Arial, Helvetica, sans-serif', '#1a1200', 'center', 0);
  }
  label('H', 610, 374, 'bold 12px Arial, Helvetica, sans-serif', GOLD, 'center', 3);
  label('HIDEOUT', 610, 396, 'bold 10px Arial, Helvetica, sans-serif', INK, 'center', 3);
  label('MARA', 620, 224, 'bold 10px Arial, Helvetica, sans-serif', INK, 'center', 3);
  label('BOAT', 408, 504, 'bold 10px Arial, Helvetica, sans-serif', GOLD, 'right', 3);
  // Legend captions.
  label('LEGEND', 322, 544, 'bold 11px Arial, Helvetica, sans-serif', GOLD, 'left', 3);
  var legCap = [
    ['escape route', 344, legRows[0]],
    ['Mara / you', 344, legRows[1]],
    ['mission target', 344, legRows[2]],
    ['LCPD units', 344, legRows[3]],
    ['robbery targets', 458, legRows[0]],
    ['crew turf', 458, legRows[1]],
    ['Tiburones turf', 458, legRows[2]],
  ];
  for (var lgi = 0; lgi < legCap.length; lgi++) {
    label(legCap[lgi][0], legCap[lgi][1], legCap[lgi][2],
      '10px Arial, Helvetica, sans-serif', INK, 'left', 3);
  }
  label('$', 444, legRows[0] + 1, 'bold 9px Arial, Helvetica, sans-serif', '#1a1200', 'center', 0);

  // --- right panel ---
  heading('RANK', 1016, 100);
  label(v.rank, 1016, 132, 'bold 30px Arial, Helvetica, sans-serif', GOLD, 'left', 4);
  label('RESPECT ' + v.respect + ' / ' + v.respectMax, 1016, 160,
    '13px Arial, Helvetica, sans-serif', INK, 'left', 3);
  label('NEXT: ' + v.nextRank + ' AT ' + v.nextRankAt, 1016, 182,
    '12px Arial, Helvetica, sans-serif', DIM, 'left', 3);
  divider(1016, 1244, 214);
  heading('CAREER', 1016, 240);
  var career = [
    ['Taken out', String(v.kills)],
    ['Highest wanted', '★'.repeat(v.wanted)],
    ['Turf', v.turf + ' / ' + v.turfTotal],
    ['Day', String(v.day)],
    ['Clock', v.clock],
    ['Standing', v.standingDistrict + ' ' + v.standingPct + '%'],
  ];
  var careerY = [266, 290, 314, 338, 362, 386];
  for (var cai = 0; cai < career.length; cai++) {
    label(career[cai][0], 1016, careerY[cai], '13px Arial, Helvetica, sans-serif', INK, 'left', 3);
    label(career[cai][1], 1244, careerY[cai],
      'bold 13px Arial, Helvetica, sans-serif', cai === 1 ? '#ff5a4e' : INK, 'right', 3);
  }
  divider(1016, 1244, 408);
  heading('SAVE SLOTS', 1016, 434);
  label('SLOT 1', 1028, 470, 'bold 11px Arial, Helvetica, sans-serif', GOLD, 'left', 3);
  label(v.standingDistrict + ' — City Map', 1028, 490,
    'bold 13px Arial, Helvetica, sans-serif', INK, 'left', 3);
  label(v.jobN + '/' + v.jobTotal + ' missions · Day ' + v.day + ' · ' + v.clock,
    1028, 507, '11px Arial, Helvetica, sans-serif', DIM, 'left', 3);
  label('SAVE', 1207, 479, 'bold 11px Arial, Helvetica, sans-serif', '#1a1200', 'center', 0);
  label('SLOT 2 — EMPTY', 1028, 546, '12px Arial, Helvetica, sans-serif', DIM, 'left', 3);
  label('SAVE', 1207, 551, 'bold 11px Arial, Helvetica, sans-serif', GOLD, 'center', 3);
  label('SLOT 3 — EMPTY', 1028, 600, '12px Arial, Helvetica, sans-serif', DIM, 'left', 3);
  label('SAVE', 1207, 605, 'bold 11px Arial, Helvetica, sans-serif', GOLD, 'center', 3);

  // --- bottom hint line ---
  label('ESC  resume      ·      Q / E  switch tab      ·      Click the map to set a waypoint',
    640, 700, '13px Arial, Helvetica, sans-serif', DIM, 'center', 3);

  ctx.restore();
}
