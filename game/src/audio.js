// LUMEN BAY r8 — sound: WebAudio synth only, no audio files. Engine hum,
// sirens, gunshots, radio music (3 original golden-hour stations), mission
// stingers and the cash-register robbery sting. NEW in r8: alertSting(), a
// short two-note chirp for notification toasts (WANTED LEVEL UP, NOS READY).
//
// SAFETY RULE (a real bug class in synth audio): every arpeggio/melody table
// must have enough scale ratios for every arp step it can reach, and every
// oscillator frequency set must guard against non-finite values, so a bad note
// can never throw. `safeFreq` is the single gate every setter goes through.
import { STATIONS } from './config.js';

export function safeFreq(v, fallback) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return fallback || 440;
  return Math.min(20000, Math.max(20, v));
}
export class AudioEngine {
  constructor() {
    this.ctx = null; this.master = null; this.musicGain = null;
    this.engineOsc = null; this.engineGain = null;
    this.station = 0; this.radioOn = false; this.musicTimer = null; this.step = 0;
    this.sirenOsc = null; this.sirenGain = null;
  }
  /** Create/resume the context. Must be called from a user gesture. */
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
      // Engine hum: two detuned saws through a lowpass.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 320;
      this.engineOsc.connect(lp);
      lp.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return true;
  }
  setEngine(rpm, driving) {
    if (!this.ctx || !this.engineOsc) return;
    const f = safeFreq(40 + rpm * 1.6, 55);
    this.engineOsc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.05);
    this.engineGain.gain.setTargetAtTime(driving ? 0.05 : 0.015, this.ctx.currentTime, 0.1);
  }
  /** One-shot blip: guarded frequency, short envelope, no leak. */
  blip(freq, dur, type, vol) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = type || 'square';
    o.frequency.value = safeFreq(freq, 440);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.12));
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + (dur || 0.12) + 0.02);
  }
  gunshot() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * 0.09);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(g); g.connect(this.master);
    src.start(t);
    this.blip(180, 0.08, 'square', 0.2);
  }
  cashSting() {
    if (!this.ctx) return;
    this.blip(1320, 0.1, 'sine', 0.2);
    setTimeout(() => this.blip(1760, 0.16, 'sine', 0.2), 90);
  }
  missionSting(win) {
    if (!this.ctx) return;
    const notes = win ? [523, 659, 784, 1046] : [392, 330, 262];
    notes.forEach((f, i) => setTimeout(() => this.blip(f, 0.18, 'triangle', 0.22), i * 110));
  }
  /** Set the master volume (0..1), guarded. */
  setMasterVolume(v) {
    if (!this.master) return;
    const vol = typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5;
    this.master.gain.value = vol;
  }
  /** Short two-note chirp for HUD notification toasts. */
  alertSting(kind) {
    if (!this.ctx) return;
    const notes = kind === 'danger' ? [880, 660] : [660, 880];
    notes.forEach((f, i) => setTimeout(() => this.blip(f, 0.1, 'square', 0.12), i * 90));
  }
  nosWhoosh() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * 0.5);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (i / len) * 0.7;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = safeFreq(900, 900);
    bp.Q.value = 1.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(t);
  }
}
// ---- radio + sirens ---------------------------------------------------------
/** Start the radio loop for the current station. Arp steps walk a fixed table
// of scale ratios; the table is longer than any step the sequencer can reach,
// and every note goes through safeFreq. */
AudioEngine.prototype.startRadio = function startRadio() {
  if (!this.ctx || this.musicTimer) return;
  this.radioOn = true;
  this.step = 0;
  const st = STATIONS[this.station];
  const ratios = [1, 1.122, 1.26, 1.335, 1.498, 1.682, 1.888, 2];
  this.musicTimer = setInterval(() => {
    if (!this.ctx || !this.radioOn) return;
    const idx = this.step % 8;
    const ratio = ratios[idx] !== undefined ? ratios[idx] : 1;
    const freq = safeFreq(st.root * ratio, 220);
    const octave = this.step % 16 >= 8 ? 2 : 1;
    this.blip(freq * octave, 0.22, 'sawtooth', 0.07);
    if (this.step % 4 === 0) this.blip(safeFreq(st.root / 2, 110), 0.3, 'sine', 0.18);
    if (this.step % 8 === 4) this.blip(safeFreq(st.root * 2, 440), 0.1, 'square', 0.05);
    this.step += 1;
  }, 170);
};
AudioEngine.prototype.stopRadio = function stopRadio() {
  this.radioOn = false;
  if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
};
AudioEngine.prototype.nextStation = function nextStation() {
  this.station = (this.station + 1) % STATIONS.length;
  this.step = 0;
  return STATIONS[this.station].name;
};
AudioEngine.prototype.stationName = function stationName() {
  return STATIONS[this.station].name;
};
/** Two-tone police siren while wanted >= 1; silent otherwise. */
AudioEngine.prototype.setSiren = function setSiren(on) {
  if (!this.ctx) return;
  if (on && !this.sirenOsc) {
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sine';
    this.sirenOsc.frequency.value = 700;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0.04;
    const lfo = this.ctx.createOscillator();
    lfo.type = 'square'; lfo.frequency.value = 0.6;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain); lfoGain.connect(this.sirenOsc.frequency);
    this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
    this.sirenOsc.start(); lfo.start();
    this._sirenLfo = lfo;
  } else if (!on && this.sirenOsc) {
    try { this.sirenOsc.stop(); } catch { /* already stopped */ }
    try { this._sirenLfo.stop(); } catch { /* already stopped */ }
    this.sirenOsc.disconnect();
    this.sirenOsc = null;
    this._sirenLfo = null;
  }
};
AudioEngine.prototype.dispose = function dispose() {
  this.stopRadio();
  this.setSiren(false);
  if (this.ctx) void this.ctx.close();
};
