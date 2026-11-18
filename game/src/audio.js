// Sound and music, 100% synthesised with WebAudio — no audio files.
// The engine hum follows speed, the sirens wail with the wanted level,
// and the radio plays an original synthwave loop (bass + arp + hats)
// on three stations, all invented here.
import { STATIONS } from './config.js';

export function freshAudio() {
  return {
    ctx: null, master: null, musicGain: null,
    engineOsc: null, engineGain: null,
    sirenOsc: null, sirenGain: null,
    station: 0, musicTimer: null, step: 0,
    muted: false, started: false,
  };
}

export function startAudio(audio) {
  if (audio.started) return true;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audio.ctx = new Ctx();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.5;
    audio.master.connect(audio.ctx.destination);
    audio.musicGain = audio.ctx.createGain();
    audio.musicGain.gain.value = 0.22;
    audio.musicGain.connect(audio.master);
    // Engine: sawtooth through a lowpass, pitch follows speed.
    audio.engineOsc = audio.ctx.createOscillator();
    audio.engineOsc.type = 'sawtooth';
    audio.engineOsc.frequency.value = 50;
    const lp = audio.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    audio.engineGain = audio.ctx.createGain();
    audio.engineGain.gain.value = 0;
    audio.engineOsc.connect(lp);
    lp.connect(audio.engineGain);
    audio.engineGain.connect(audio.master);
    audio.engineOsc.start();
    // Siren: two-tone triangle, alternating 720 / 980 Hz.
    audio.sirenOsc = audio.ctx.createOscillator();
    audio.sirenOsc.type = 'triangle';
    audio.sirenOsc.frequency.value = 800;
    audio.sirenGain = audio.ctx.createGain();
    audio.sirenGain.gain.value = 0;
    audio.sirenOsc.connect(audio.sirenGain);
    audio.sirenGain.connect(audio.master);
    audio.sirenOsc.start();
    audio.started = true;
    startStationLoop(audio);
    return true;
  } catch (e) {
    return false;
  }
}

function playTone(audio, freq, t, dur, type, gain, dest) {
  if (!audio.ctx || !Number.isFinite(freq)) return;
  const o = audio.ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = audio.ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(dest || audio.musicGain);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const BASS_LINE = [0, 0, 7, 0, 5, 3, 2, 7]; // scale steps over the root
const ARP_LINE = [0, 2, 4, 7, 9, 7, 4, 2];
// Ten scale degrees so every ARP_LINE step (up to 9) has a ratio.
const SCALE = [1, 1.122, 1.26, 1.335, 1.498, 1.682, 1.782, 2, 2.244, 2.52];

function startStationLoop(audio) {
  const station = STATIONS[audio.station];
  const beat = 60 / station.bpm / 2; // eighth notes
  audio.step = 0;
  const tick = () => {
    if (!audio.ctx || audio.ctx.state === 'suspended') return;
    const t = audio.ctx.currentTime + 0.05;
    const i = audio.step % 16;
    const root = station.root;
    if (i % 2 === 0) playTone(audio, root * SCALE[BASS_LINE[(i / 2) % 8] % 7] / 2, t, beat * 1.8, 'triangle', 0.5);
    if (i % 2 === 1) playTone(audio, root * 2 * SCALE[ARP_LINE[i % 8]], t, beat * 0.9, 'square', 0.08);
    if (i % 4 === 2) playTone(audio, 6000, t, 0.03, 'square', 0.03); // hat tick
    audio.step++;
  };
  audio.musicTimer = setInterval(tick, beat * 1000);
}

export function tuneStation(audio, i) {
  audio.station = ((i % STATIONS.length) + STATIONS.length) % STATIONS.length;
  if (audio.musicTimer) {
    clearInterval(audio.musicTimer);
    startStationLoop(audio);
  }
  return STATIONS[audio.station].name;
}

/** Name of the station currently playing. */
export function stationName(audio) {
  return STATIONS[audio.station].name;
}

export function flipMute(audio) {
  audio.muted = !audio.muted;
  if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.5;
  return audio.muted;
}

export function engineSound(audio, speed01, inCar) {
  if (!audio.started) return;
  const t = audio.ctx.currentTime;
  audio.engineGain.gain.setTargetAtTime(inCar ? 0.05 + speed01 * 0.06 : 0, t, 0.1);
  audio.engineOsc.frequency.setTargetAtTime(48 + speed01 * 130, t, 0.1);
}

export function sirenSound(audio, stars) {
  if (!audio.started) return;
  const t = audio.ctx.currentTime;
  audio.sirenGain.gain.setTargetAtTime(stars > 0 ? 0.05 : 0, t, 0.2);
  if (stars > 0) {
    audio.sirenOsc.frequency.setTargetAtTime((t % 1.2) < 0.6 ? 720 : 980, t, 0.05);
  }
}

/** One-shot effects: gunshot, pickup, crash, mission sting, busted. */
export function playSfx(audio, kind) {
  if (!audio.started || audio.muted) return;
  const t = audio.ctx.currentTime;
  if (kind === 'shot') {
    const dur = 0.12;
    const buf = audio.ctx.createBuffer(1, audio.ctx.sampleRate * dur, audio.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = audio.ctx.createBufferSource();
    src.buffer = buf;
    const g = audio.ctx.createGain();
    g.gain.value = 0.5;
    src.connect(g);
    g.connect(audio.master);
    src.start(t);
    playTone(audio, 160, t, 0.08, 'square', 0.25, audio.master);
  } else if (kind === 'pickup') {
    playTone(audio, 880, t, 0.12, 'sine', 0.3, audio.master);
    playTone(audio, 1318, t + 0.09, 0.18, 'sine', 0.3, audio.master);
  } else if (kind === 'crash') {
    playTone(audio, 70, t, 0.3, 'sawtooth', 0.4, audio.master);
  } else if (kind === 'sting') {
    playTone(audio, 523, t, 0.4, 'triangle', 0.3, audio.master);
    playTone(audio, 659, t + 0.1, 0.4, 'triangle', 0.3, audio.master);
    playTone(audio, 784, t + 0.2, 0.6, 'triangle', 0.35, audio.master);
  } else if (kind === 'busted') {
    playTone(audio, 392, t, 0.5, 'sawtooth', 0.3, audio.master);
    playTone(audio, 311, t + 0.4, 0.8, 'sawtooth', 0.3, audio.master);
  } else if (kind === 'siren-blip') {
    playTone(audio, 980, t, 0.15, 'triangle', 0.25, audio.master);
    playTone(audio, 720, t + 0.15, 0.15, 'triangle', 0.25, audio.master);
  }
}
