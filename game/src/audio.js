// Synthesised audio for LUMEN BAY. No audio files: every sound is built with
// the Web Audio API — engine hum, sirens, gunshots, UI stingers, and three
// original synthwave radio loops. Two hard rules live in this file:
//
// 1. Every frequency ever handed to an oscillator passes through safeFreq(),
//    which rejects NaN/Infinity/zero/negative values and clamps into the
//    audible band. A bad note can never throw and kill the audio graph.
// 2. Every arpeggio table is a full scale: the arp step indexes scale[i %
//    scale.length] and the scale is long enough that no step can run off the
//    end, even when the pattern is transposed up an octave.
//
// The radio runs on a look-ahead scheduler (a short timer that schedules
// notes a bar ahead), so the loop stays in time even when the frame rate
// dips. Audio starts only after a user gesture (click/key), as browsers
// require; before that the context stays suspended and silent.

import { RADIO } from './config.js';

// Clamp a frequency into the safe audible band. Anything non-finite, zero or
// negative becomes a harmless 220 Hz.
export function safeFreq(f) {
  if (!Number.isFinite(f) || f <= 0) return 220;
  return Math.max(30, Math.min(4000, f));
}

// Minor and major scales as semitone ratios from the root. Twelve entries
// each — a full octave — so any arp step modulo the length is safe.
const MINOR_SCALE = [1, 1.0595, 1.1892, 1.2599, 1.3348, 1.4983, 1.5874, 1.6818, 1.7818, 1.8877, 2, 2.119];
const MAJOR_SCALE = [1, 1.1225, 1.2599, 1.3348, 1.4983, 1.6818, 1.8877, 2, 2.2449, 2.5198, 2.6697, 2.9966];

// Sixteen-step arp patterns. Every step is an index into the scale, wrapped
// with modulo at lookup time, so the pattern can never read past the table.
const ARP_PATTERNS = [
  [0, 2, 4, 7, 9, 7, 4, 2, 0, 3, 5, 7, 10, 7, 5, 3],
  [0, 4, 7, 11, 7, 4, 0, 7, 2, 5, 9, 7, 5, 2, 9, 11],
  [0, 3, 7, 10, 7, 3, 0, 5, 2, 7, 9, 10, 9, 7, 5, 2],
];

export function createAudio() {
  let ctx = null;
  let master = null;
  let radioGain = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let station = 0;
  let radioTimer = null;
  let nextNoteTime = 0;
  let step = 0;
  let started = false;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    radioGain = ctx.createGain();
    radioGain.gain.value = 0.16;
    radioGain.connect(master);
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineGain.connect(master);
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineOsc.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineOsc.start();
    sirenGain = ctx.createGain();
    sirenGain.gain.value = 0;
    sirenGain.connect(master);
    sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'triangle';
    sirenOsc.frequency.value = 700;
    sirenOsc.connect(sirenGain);
    sirenOsc.start();
    return ctx;
  }

  // Start (or resume) the audio graph from a user gesture. Safe to call often.
  function start() {
    const c = ensure();
    if (!c) return false;
    if (c.state === 'suspended') void c.resume();
    if (!started) {
      started = true;
      startRadio();
    }
    return true;
  }

  function note(freq, when, dur, type, gainValue, dest) {
    if (!ctx) return;
    const f = safeFreq(freq);
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f, when);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gainValue, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(dest || master);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  // One bar of the current station, scheduled ahead. Bass on beats, arp on
  // eighth notes, a soft pad underneath. All frequencies go through safeFreq.
  function scheduleBar() {
    if (!ctx) return;
    const st = RADIO[station];
    const scale = st.minor ? MINOR_SCALE : MAJOR_SCALE;
    const pattern = ARP_PATTERNS[station % ARP_PATTERNS.length];
    const beat = 60 / st.bpm;
    const barLen = beat * 4;
    const t0 = Math.max(nextNoteTime, ctx.currentTime + 0.05);
    // Bass: root on beats 1 and 3, fifth on 2 and 4.
    for (let b = 0; b < 4; b += 1) {
      const f = safeFreq(st.root * (b % 2 === 0 ? 1 : 1.4983));
      note(f, t0 + b * beat, beat * 0.9, 'triangle', 0.5, radioGain);
    }
    // Arp: 16 eighth-note steps across the bar.
    for (let i = 0; i < 16; i += 1) {
      const idx = pattern[i % pattern.length];
      const ratio = scale[idx % scale.length];
      const octave = idx >= scale.length ? 2 : 1;
      const f = safeFreq(st.root * 2 * ratio * octave);
      note(f, t0 + i * (barLen / 16), barLen / 16 * 0.9, 'square', 0.11, radioGain);
    }
    // Pad: root + third, whole bar, very soft.
    note(safeFreq(st.root * 2), t0, barLen, 'sine', 0.07, radioGain);
    note(safeFreq(st.root * 2 * scale[2]), t0, barLen, 'sine', 0.05, radioGain);
    nextNoteTime = t0 + barLen;
    step = (step + 16) % 64;
  }

  function startRadio() {
    if (!ctx || radioTimer) return;
    nextNoteTime = ctx.currentTime + 0.1;
    scheduleBar();
    radioTimer = window.setInterval(() => {
      if (!ctx) return;
      while (nextNoteTime < ctx.currentTime + 0.4) scheduleBar();
    }, 120);
  }

  function setStation(i) {
    station = ((i % RADIO.length) + RADIO.length) % RADIO.length;
    if (ctx) nextNoteTime = ctx.currentTime + 0.05;
    return RADIO[station].name;
  }

  // Engine hum follows the car's speed: pitch and volume rise with speed.
  function setEngine(speedNorm, inCar) {
    if (!ctx || !engineOsc) return;
    const target = inCar ? 0.05 + speedNorm * 0.11 : 0;
    engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
    engineOsc.frequency.setTargetAtTime(safeFreq(48 + speedNorm * 130), ctx.currentTime, 0.08);
  }

  // Two-tone siren that fades in with wanted level and out when heat dies.
  function setSiren(wanted) {
    if (!ctx || !sirenOsc) return;
    const target = wanted > 0 ? 0.05 + wanted * 0.012 : 0;
    sirenGain.gain.setTargetAtTime(target, ctx.currentTime, 0.3);
    const t = ctx.currentTime;
    const hi = safeFreq(880), lo = safeFreq(660);
    sirenOsc.frequency.cancelScheduledValues(t);
    sirenOsc.frequency.setValueAtTime(hi, t);
    sirenOsc.frequency.linearRampToValueAtTime(lo, t + 0.45);
    sirenOsc.frequency.linearRampToValueAtTime(hi, t + 0.9);
  }

  function gunshot() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const dur = 0.14;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2400;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    src.connect(filter); filter.connect(g); g.connect(master);
    src.start(t);
  }

  function stinger(kind) {
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    if (kind === 'mission') {
      note(safeFreq(523.25), t, 0.18, 'triangle', 0.35);
      note(safeFreq(659.25), t + 0.12, 0.18, 'triangle', 0.35);
      note(safeFreq(783.99), t + 0.24, 0.34, 'triangle', 0.4);
    } else if (kind === 'fail') {
      note(safeFreq(311.13), t, 0.25, 'triangle', 0.3);
      note(safeFreq(233.08), t + 0.2, 0.4, 'triangle', 0.3);
    } else if (kind === 'cash') {
      note(safeFreq(1046.5), t, 0.12, 'sine', 0.3);
      note(safeFreq(1318.5), t + 0.09, 0.2, 'sine', 0.3);
    } else if (kind === 'pickup') {
      note(safeFreq(880), t, 0.1, 'sine', 0.25);
    }
  }

  function crash() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const dur = 0.2;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.7;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 900;
    src.connect(filter); filter.connect(master);
    src.start(t);
  }

  // Short radio blip when the station changes, so the player hears the switch.
  function stationBlip() {
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    note(safeFreq(660), t, 0.08, 'square', 0.12, radioGain);
    note(safeFreq(990), t + 0.08, 0.12, 'square', 0.12, radioGain);
  }

  return {
    start, setStation, setEngine, setSiren, gunshot, stinger, crash, stationBlip,
    stationName() { return RADIO[station].name; },
    running() { return !!ctx && ctx.state === 'running'; },
    state() { return ctx ? ctx.state : 'none'; },
  };
}
