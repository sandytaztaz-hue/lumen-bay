// LUMEN BAY — audio: WebAudio synthesis only, no audio files. Engine hum,
// two-tone police siren, gunshots, cash + mission stingers, NOS whoosh, and
// three original radio stations (a synth riff sequenced live). Everything
// is guarded so a page with no user gesture yet never throws.
export function safeFreq(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.radioOn = false;
    this.station = 2;
    this.radioTimer = null;
    this.note = 0;
    this.sirenStep = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 60;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'square';
      this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      this.sirenStep = 0;
      setInterval(() => {
        if (!this.ctx || !this.sirenGain) return;
        if (this.sirenGain.gain.value > 0.01) {
          this.sirenStep = 1 - this.sirenStep;
          this.sirenOsc.frequency.value = this.sirenStep ? 950 : 700;
        }
      }, 420);
    } catch {
      // Audio is a bonus: the game plays silent without it.
    }
  }

  setEngine(rpm, driving) {
    if (!this.ctx || !this.engineGain) return;
    const target = driving ? Math.min(0.12, 0.03 + rpm * 0.0004) : 0;
    this.engineGain.gain.value = target;
    this.engineOsc.frequency.value = safeFreq(50 + rpm, 60);
  }

  setSiren(on) {
    if (!this.ctx || !this.sirenGain) return;
    this.sirenGain.gain.value = on ? 0.045 : 0;
  }

  blip(freq, dur, type, vol) {
    if (!this.ctx) return;
    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = safeFreq(freq, 440);
      g.gain.value = vol || 0.15;
      o.connect(g);
      g.connect(this.master);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (dur || 0.15));
      o.stop(this.ctx.currentTime + (dur || 0.15));
    } catch { /* ignore */ }
  }

  gunshot() {
    if (!this.ctx) return;
    try {
      const len = this.ctx.sampleRate * 0.09;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = 0.25;
      src.connect(g);
      g.connect(this.master);
      src.start();
    } catch { /* ignore */ }
  }

  cashSting() {
    this.blip(880, 0.12, 'sine', 0.18);
    setTimeout(() => this.blip(1318, 0.18, 'sine', 0.18), 90);
  }

  missionSting(win) {
    const seq = win ? [523, 659, 784, 1046] : [392, 330, 262];
    seq.forEach((f, i) => setTimeout(() => this.blip(f, 0.16, 'triangle', 0.2), i * 110));
  }

  setMasterVolume(v) {
    if (this.master) this.master.gain.value = v;
  }

  alertSting(kind) {
    if (kind === 'danger') {
      this.blip(220, 0.2, 'square', 0.12);
      setTimeout(() => this.blip(220, 0.2, 'square', 0.12), 180);
    } else {
      this.blip(660, 0.12, 'sine', 0.15);
    }
  }

  nosWhoosh() {
    if (!this.ctx) return;
    try {
      const len = this.ctx.sampleRate * 0.5;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = 0.2;
      src.connect(g);
      g.connect(this.master);
      src.start();
    } catch { /* ignore */ }
  }

  startRadio() {
    if (!this.ctx || this.radioOn) return;
    this.radioOn = true;
    this.note = 0;
    this.radioTimer = setInterval(() => {
      if (!this.radioOn || !this.ctx) return;
      const roots = [220, 164.8, 196];
      const steps = [
        [0, 3, 5, 7, 10, 12, 15, 17],
        [0, 2, 3, 5, 7, 8, 10, 12],
        [0, 2, 4, 7, 9, 12, 14, 16],
      ];
      const root = roots[this.station];
      const step = steps[this.station][this.note % 8];
      const f = root * Math.pow(2, step / 12);
      this.blip(f, 0.22, 'triangle', 0.06);
      if (this.note % 2 === 0) this.blip(f / 2, 0.3, 'sine', 0.05);
      this.note += 1;
    }, 240);
  }

  stopRadio() {
    this.radioOn = false;
    if (this.radioTimer) {
      clearInterval(this.radioTimer);
      this.radioTimer = null;
    }
  }

  nextStation() {
    this.station = (this.station + 1) % 3;
    return [
      'RADIO LUMEN 88.1 — Daylight FM',
      'RADIO TIBURON 94.5 — Shark Rock',
      'RADIO SOL 101.9 — Sol Hits',
    ][this.station];
  }
}
