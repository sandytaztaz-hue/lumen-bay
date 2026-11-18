// LUMEN BAY — WebAudio synth only, no audio files.
// Engine hum, sirens, gunshots, mission stingers and a three-station synthwave
// radio. SAFETY RULE: every oscillator frequency passes through safeFreq()
// (finite, 20–20000 Hz), and every arpeggio table is longer than any arp step
// the sequencer can reach, so a bad note can never throw.
import { RADIO_STATIONS } from './config.js';

// Clamp any frequency to something an oscillator can actually play.
export function safeFreq(freq, fallback) {
  const f = Number(freq);
  if (!Number.isFinite(f) || f < 20 || f > 20000) return fallback || 440;
  return f;
}

// Scale tables: 24 ratios each, so arp steps 0..23 always land on a real note.
// (A short table once crashed a build when the sequencer stepped past its end.)
export const ARP_SCALES = {
  drive: [1, 1.122, 1.26, 1.335, 1.498, 1.682, 1.888, 2, 2.244, 2.52, 2.67, 2.996, 3.364, 3.776, 4, 4.488, 5.04, 5.34, 5.992, 6.728, 7.552, 8, 8.976, 10.08],
  night: [1, 1.189, 1.335, 1.587, 1.782, 2, 2.378, 2.67, 3.174, 3.564, 4, 4.756, 5.34, 6.348, 7.128, 8, 9.512, 10.68, 12.696, 14.256, 16, 19.024, 21.36, 25.392],
  chill: [1, 1.122, 1.335, 1.498, 1.682, 2, 2.244, 2.67, 2.996, 3.364, 4, 4.488, 5.34, 5.992, 6.728, 8, 8.976, 10.68, 11.984, 13.456, 16, 17.952, 21.36, 23.968],
};

// Arpeggio step patterns, all indices kept inside 0..23.
export const ARP_PATTERNS = {
  drive: [0, 2, 4, 7, 9, 7, 4, 2, 0, 4, 7, 11, 9, 7, 4, 2],
  night: [0, 3, 5, 7, 10, 7, 5, 3, 0, 5, 7, 12, 10, 7, 5, 3],
  chill: [0, 4, 2, 7, 4, 2, 0, 2, 4, 7, 9, 7, 4, 2, 0, 4],
};

export function createAudio() {
  const audio = {
    ctx: null, master: null, engineOsc: null, engineGain: null,
    sirenOsc: null, sirenGain: null, radioOn: true, station: 0,
    radioTimer: 0, arpStep: 0, started: false,
  };

  audio.ensure = function ensure() {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
      return audio.ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    audio.ctx = ctx;
    audio.master = ctx.createGain();
    audio.master.gain.value = 0.5;
    audio.master.connect(ctx.destination);
    // Engine hum: two detuned saws through a low-pass, gain follows speed.
    audio.engineOsc = ctx.createOscillator();
    audio.engineOsc.type = 'sawtooth';
    audio.engineOsc.frequency.value = safeFreq(60);
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    audio.engineGain = ctx.createGain();
    audio.engineGain.gain.value = 0;
    audio.engineOsc.connect(engineFilter);
    engineFilter.connect(audio.engineGain);
    audio.engineGain.connect(audio.master);
    audio.engineOsc.start();
    // Siren: a triangle that wails between two guarded frequencies.
    audio.sirenOsc = ctx.createOscillator();
    audio.sirenOsc.type = 'triangle';
    audio.sirenOsc.frequency.value = safeFreq(720);
    audio.sirenGain = ctx.createGain();
    audio.sirenGain.gain.value = 0;
    audio.sirenOsc.connect(audio.sirenGain);
    audio.sirenGain.connect(audio.master);
    audio.sirenOsc.start();
    audio.started = true;
    return ctx;
  };

  audio.setEngine = function setEngine(speedRatio) {
    if (!audio.ctx || !audio.engineOsc) return;
    const ratio = Number.isFinite(speedRatio) ? Math.max(0, Math.min(1, speedRatio)) : 0;
    audio.engineOsc.frequency.value = safeFreq(55 + ratio * 130);
    audio.engineGain.gain.value = 0.02 + ratio * 0.05;
  };

  audio.setSiren = function setSiren(on, time) {
    if (!audio.ctx || !audio.sirenOsc) return;
    const t = Number.isFinite(time) ? time : 0;
    const target = on ? 0.045 : 0;
    audio.sirenGain.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.1);
    audio.sirenOsc.frequency.value = safeFreq(660 + Math.sin(t * 3.2) * 180);
  };

  // One gunshot: filtered noise burst, short and punchy.
  audio.shot = function shot() {
    if (!audio.ctx) return;
    const ctx = audio.ctx;
    const dur = 0.14;
    const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = safeFreq(900);
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    source.start();
  };

  // Mission stinger: a little rising major arpeggio, all notes guarded.
  audio.stinger = function stinger(win) {
    if (!audio.ctx) return;
    const ctx = audio.ctx;
    const base = win ? 523.25 : 220;
    const notes = win ? [1, 1.26, 1.498, 2] : [1, 0.89, 0.75];
    notes.forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = safeFreq(base * ratio);
      const gain = ctx.createGain();
      gain.gain.value = 0.001;
      const start = ctx.currentTime + i * 0.11;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.connect(gain);
      gain.connect(audio.master);
      osc.start(start);
      osc.stop(start + 0.55);
    });
  };

  audio.nextStation = function nextStation() {
    audio.station = (audio.station + 1) % RADIO_STATIONS.length;
    audio.arpStep = 0;
    return RADIO_STATIONS[audio.station].name;
  };

  // Radio sequencer: one synthwave note per tick, always inside the scale table.
  audio.radioTick = function radioTick(dt) {
    if (!audio.ctx || !audio.radioOn) return;
    audio.radioTimer -= dt;
    if (audio.radioTimer > 0) return;
    const station = RADIO_STATIONS[audio.station];
    audio.radioTimer = 60 / station.bpm / 2;
    const scale = ARP_SCALES[station.mood];
    const pattern = ARP_PATTERNS[station.mood];
    const stepIndex = pattern[audio.arpStep % pattern.length];
    const ratio = scale[stepIndex % scale.length];
    const freq = safeFreq(station.root * ratio);
    const ctx = audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = station.mood === 'chill' ? 'sine' : 'square';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = 0.001;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(now);
    osc.stop(now + 0.3);
    // A soft bass note on every fourth step, also guarded.
    if (audio.arpStep % 4 === 0) {
      const bass = ctx.createOscillator();
      bass.type = 'sine';
      bass.frequency.value = safeFreq(station.root / 2);
      const bgain = ctx.createGain();
      bgain.gain.value = 0.12;
      bass.connect(bgain);
      bgain.connect(audio.master);
      bass.start(now);
      bass.stop(now + 0.4);
    }
    audio.arpStep += 1;
  };

  return audio;
}
