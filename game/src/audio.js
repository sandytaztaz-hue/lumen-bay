// Sound, all synthesized with WebAudio — no audio files. Engine hum, sirens,
// gunshots, mission stingers and a three-station synthwave radio.
// SAFETY RULE: every frequency is guarded with Number.isFinite before it reaches
// an oscillator, and every arpeggio table is indexed with a modulo so no step can
// ever run past the end of its scale.
import { WEAPONS } from './config.js';

const STATIONS = [
  {
    name: 'LUMEN FM 88.5 — Sunset Synth', bpm: 96, root: 110,
    // Minor pentatonic ratios, 16 steps: the arp walks these and wraps by modulo.
    scale: [1, 1.189, 1.335, 1.498, 1.782, 2, 2.378, 2.67, 2.996, 3.564, 4, 4.757, 5.34, 5.99, 7.127, 8],
    bass: [1, 1, 0.891, 1.189],
    pattern: [0, 2, 4, 7, 9, 7, 4, 2, 0, 3, 5, 8, 10, 8, 5, 3],
  },
  {
    name: 'PLAYA 104.2 — Coast Groove', bpm: 112, root: 98,
    scale: [1, 1.122, 1.26, 1.335, 1.498, 1.682, 1.782, 2, 2.245, 2.52, 2.67, 2.996, 3.364, 3.564, 4, 4.49],
    bass: [1, 1.335, 0.891, 1.122],
    pattern: [0, 4, 2, 6, 4, 8, 6, 10, 8, 6, 4, 2, 0, 2, 4, 6],
  },
  {
    name: 'FARO 97.1 — Night Drive', bpm: 84, root: 123.5,
    scale: [1, 1.26, 1.498, 1.782, 2, 2.52, 2.996, 3.564, 4, 5.04, 5.99, 7.127, 8, 10.08, 11.98, 14.25],
    bass: [1, 0.749, 1.189, 1.498],
    pattern: [0, 1, 2, 4, 6, 4, 2, 1, 0, 2, 3, 5, 7, 5, 3, 2],
  },
];

function safeFreq(value) {
  const f = Number(value);
  return Number.isFinite(f) && f > 0 && f < 20000 ? f : 440;
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.station = 0;
    this.radioOn = true;
    this.step = 0;
    this.nextNoteTime = 0;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.noiseBuffer = null;
  }

  /** Must be called from a user gesture (click / key) so the context can run. */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return this.ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    // Shared noise buffer for gunshots and skids.
    const len = this.ctx.sampleRate * 0.5;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    // Engine hum: a low sawtooth whose pitch follows the car.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 50;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass'; engineFilter.frequency.value = 420;
    this.engineOsc.connect(engineFilter);
    engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
    // Siren: a triangle wave that wails between two tones.
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 700;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start();
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    return this.ctx;
  }

  setEngine(speed, inCar) {
    if (!this.ctx) return;
    const target = inCar ? 0.05 + Math.min(0.12, Math.abs(speed) * 0.003) : 0;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    this.engineOsc.frequency.setTargetAtTime(safeFreq(46 + Math.abs(speed) * 2.4), this.ctx.currentTime, 0.08);
  }

  setSiren(wanted, time) {
    if (!this.ctx) return;
    const on = wanted > 0;
    this.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, this.ctx.currentTime, 0.2);
    if (on) {
      const wail = Math.sin(time * 2.4) > 0 ? 920 : 660;
      this.sirenOsc.frequency.setTargetAtTime(safeFreq(wail), this.ctx.currentTime, 0.05);
    }
  }

  gunshot(weapon) {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = weapon === 'smg' ? 2600 : 1800;
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    src.connect(filter); filter.connect(gain); gain.connect(this.master);
    src.start(now, Math.random() * 0.3, 0.2);
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = safeFreq(weapon === 'smg' ? 190 : 140);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.25, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(og); og.connect(this.master);
    osc.start(now); osc.stop(now + 0.12);
  }

  cycleStation() {
    this.station = (this.station + 1) % STATIONS.length;
    this.step = 0;
    return STATIONS[this.station].name;
  }

  stationName() { return STATIONS[this.station].name; }

  /** Schedule the radio's next steps: call every frame; notes are placed ahead. */
  updateRadio() {
    if (!this.ctx || !this.radioOn) return;
    const st = STATIONS[this.station];
    const stepDur = 60 / st.bpm / 2;
    while (this.nextNoteTime < this.ctx.currentTime + 0.25) {
      const t = Math.max(this.nextNoteTime, this.ctx.currentTime);
      const idx = this.step % st.pattern.length;
      const arpStep = st.pattern[idx];
      const ratio = st.scale[arpStep % st.scale.length];
      this.note(safeFreq(st.root * ratio * 2), t, stepDur * 0.9, 'square', 0.05);
      if (this.step % 4 === 0) {
        const bassRatio = st.bass[Math.floor(this.step / 4) % st.bass.length];
        this.note(safeFreq(st.root * bassRatio), t, stepDur * 3.4, 'triangle', 0.11);
      }
      if (this.step % 8 === 4) this.note(safeFreq(st.root * 4), t, stepDur, 'sine', 0.04);
      this.step += 1;
      this.nextNoteTime = t + stepDur;
    }
  }

  note(freq, time, dur, type, vol) {
    const f = safeFreq(freq);
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = f;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain); gain.connect(this.master);
    osc.start(time); osc.stop(time + dur + 0.05);
  }

  stinger(success = true) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = success ? [1, 1.26, 1.498, 2] : [1, 0.891, 0.749];
    notes.forEach((r, i) => this.note(safeFreq(220 * r), now + i * 0.09, 0.35, 'triangle', 0.14));
  }

  pickup() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.note(safeFreq(660), now, 0.12, 'sine', 0.12);
    this.note(safeFreq(990), now + 0.08, 0.18, 'sine', 0.12);
  }
}
