// Sound and music, 100% synthesised with WebAudio — no audio files.
// The engine hum follows speed, the sirens wail with the wanted level,
// and the radio plays an original synthwave loop (bass + arp + hats)
// on three stations, all invented here.
import { RADIOS } from './config.js';

export function newSound() {
  return {
    ctx: null, master: null, musicGain: null,
    engineOsc: null, engineGain: null,
    sirenOsc: null, sirenGain: null,
    station: 0, musicTimer: null, step: 0,
    muted: false, started: false,
  };
}

export function bootSound(sound) {
  if (sound.started) return true;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    sound.ctx = new Ctx();
    sound.master = sound.ctx.createGain();
    sound.master.gain.value = 0.5;
    sound.master.connect(sound.ctx.destination);
    sound.musicGain = sound.ctx.createGain();
    sound.musicGain.gain.value = 0.22;
    sound.musicGain.connect(sound.master);
    // Engine: sawtooth through a lowpass, pitch follows speed.
    sound.engineOsc = sound.ctx.createOscillator();
    sound.engineOsc.type = 'sawtooth';
    sound.engineOsc.frequency.value = 50;
    const lp = sound.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    sound.engineGain = sound.ctx.createGain();
    sound.engineGain.gain.value = 0;
    sound.engineOsc.connect(lp);
    lp.connect(sound.engineGain);
    sound.engineGain.connect(sound.master);
    sound.engineOsc.start();
    // Siren: two-tone triangle, alternating 720 / 980 Hz.
    sound.sirenOsc = sound.ctx.createOscillator();
    sound.sirenOsc.type = 'triangle';
    sound.sirenOsc.frequency.value = 800;
    sound.sirenGain = sound.ctx.createGain();
    sound.sirenGain.gain.value = 0;
    sound.sirenOsc.connect(sound.sirenGain);
    sound.sirenGain.connect(sound.master);
    sound.sirenOsc.start();
    sound.started = true;
    runRadioLoop(sound);
    return true;
  } catch (e) {
    return false;
  }
}

function note(sound, freq, t, dur, type, gain, dest) {
  // Guard: a non-finite frequency throws in Chrome. Never let one through
  // (r3 caught this: the arp table once indexed past the scale and made NaN,
  // which only fired with a live AudioContext — the silent runs hid it).
  if (!sound.ctx || !Number.isFinite(freq)) return;
  const o = sound.ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = sound.ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(dest || sound.musicGain);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const BASS_STEPS = [0, 0, 7, 0, 5, 3, 2, 7]; // scale steps over the root
const ARP_STEPS = [0, 2, 4, 7, 9, 7, 4, 2];
// Ten scale degrees so every ARP_STEPS step (up to 9) has a ratio —
// indexing past the end of the scale once made NaN and threw.
const RATIOS = [1, 1.122, 1.26, 1.335, 1.498, 1.682, 1.782, 2, 2.244, 2.52];

function runRadioLoop(sound) {
  const station = RADIOS[sound.station];
  const beat = 60 / station.bpm / 2; // eighth notes
  sound.step = 0;
  const tick = () => {
    if (!sound.ctx || sound.ctx.state === 'suspended') return;
    const t = sound.ctx.currentTime + 0.05;
    const i = sound.step % 16;
    const root = station.root;
    if (i % 2 === 0) note(sound, root * RATIOS[BASS_STEPS[(i / 2) % 8] % 7] / 2, t, beat * 1.8, 'triangle', 0.5);
    if (i % 2 === 1) note(sound, root * 2 * RATIOS[ARP_STEPS[i % 8]], t, beat * 0.9, 'square', 0.08);
    if (i % 4 === 2) note(sound, 6000, t, 0.03, 'square', 0.03); // hat tick
    sound.step++;
  };
  sound.musicTimer = setInterval(tick, beat * 1000);
}

export function switchStation(sound, i) {
  sound.station = ((i % RADIOS.length) + RADIOS.length) % RADIOS.length;
  if (sound.musicTimer) {
    clearInterval(sound.musicTimer);
    runRadioLoop(sound);
  }
  return RADIOS[sound.station].name;
}

/** Name of the station currently playing. */
export function currentStation(sound) {
  return RADIOS[sound.station].name;
}

export function toggleMute(sound) {
  sound.muted = !sound.muted;
  if (sound.master) sound.master.gain.value = sound.muted ? 0 : 0.5;
  return sound.muted;
}

export function engineHum(sound, speed01, inCar) {
  if (!sound.started) return;
  const t = sound.ctx.currentTime;
  sound.engineGain.gain.setTargetAtTime(inCar ? 0.05 + speed01 * 0.06 : 0, t, 0.1);
  sound.engineOsc.frequency.setTargetAtTime(48 + speed01 * 130, t, 0.1);
}

export function sirenWail(sound, stars) {
  if (!sound.started) return;
  const t = sound.ctx.currentTime;
  sound.sirenGain.gain.setTargetAtTime(stars > 0 ? 0.05 : 0, t, 0.2);
  if (stars > 0) {
    sound.sirenOsc.frequency.setTargetAtTime((t % 1.2) < 0.6 ? 720 : 980, t, 0.05);
  }
}

/** One-shot effects: gunshot, pickup, crash, mission sting, busted. */
export function sfx(sound, kind) {
  if (!sound.started || sound.muted) return;
  const t = sound.ctx.currentTime;
  if (kind === 'shot') {
    const dur = 0.12;
    const buf = sound.ctx.createBuffer(1, sound.ctx.sampleRate * dur, sound.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = sound.ctx.createBufferSource();
    src.buffer = buf;
    const g = sound.ctx.createGain();
    g.gain.value = 0.5;
    src.connect(g);
    g.connect(sound.master);
    src.start(t);
    note(sound, 160, t, 0.08, 'square', 0.25, sound.master);
  } else if (kind === 'pickup') {
    note(sound, 880, t, 0.12, 'sine', 0.3, sound.master);
    note(sound, 1318, t + 0.09, 0.18, 'sine', 0.3, sound.master);
  } else if (kind === 'crash') {
    note(sound, 70, t, 0.3, 'sawtooth', 0.4, sound.master);
  } else if (kind === 'sting') {
    note(sound, 523, t, 0.4, 'triangle', 0.3, sound.master);
    note(sound, 659, t + 0.1, 0.4, 'triangle', 0.3, sound.master);
    note(sound, 784, t + 0.2, 0.6, 'triangle', 0.35, sound.master);
  } else if (kind === 'busted') {
    note(sound, 392, t, 0.5, 'sawtooth', 0.3, sound.master);
    note(sound, 311, t + 0.4, 0.8, 'sawtooth', 0.3, sound.master);
  } else if (kind === 'siren-blip') {
    note(sound, 980, t, 0.15, 'triangle', 0.25, sound.master);
    note(sound, 720, t + 0.15, 0.15, 'triangle', 0.25, sound.master);
  }
}
