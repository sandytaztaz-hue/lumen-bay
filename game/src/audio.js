// LUMEN BAY — WebAudio synth. No audio files: engine hum, sirens,
// gunshots, radio music and mission stingers are all synthesized.
// The context is created lazily on the first user gesture; in headless
// runs (screenshots, probe) it stays inert and every call is a safe no-op.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.radioTimer = null;
    this.radioStep = 0;
    this.muted = false;
  }

  // Call from a user gesture (PLAY button, key press). Safe to call anytime.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      return true;
    } catch {
      this.ctx = null;
      return false;
    }
  }

  _osc(type, freq) {
    const o = this.ctx.createOscillator();
    o.type = type; o.frequency.value = freq;
    return o;
  }

  // Engine hum: two detuned saws through a lowpass; pitch follows speed.
  startEngine() {
    if (!this.ensure() || this.engineOsc) return;
    try {
      this.engineOsc = this._osc('sawtooth', 60);
      const o2 = this._osc('sawtooth', 90);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 420;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.05;
      this.engineOsc.connect(lp); o2.connect(lp);
      lp.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.start(); o2.start();
      this._engineOsc2 = o2;
    } catch { /* inert */ }
  }

  setEngineSpeed(ratio) {
    if (!this.engineOsc) return;
    try {
      const f = 55 + ratio * 160;
      this.engineOsc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.08);
      if (this._engineOsc2) this._engineOsc2.frequency.setTargetAtTime(f * 1.5, this.ctx.currentTime, 0.08);
      this.engineGain.gain.setTargetAtTime(0.04 + ratio * 0.06, this.ctx.currentTime, 0.1);
    } catch { /* inert */ }
  }

  // Two-tone police siren.
  startSiren() {
    if (!this.ensure() || this.sirenOsc) return;
    try {
      this.sirenOsc = this._osc('sine', 720);
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0.03;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      this._sirenHigh = false;
      this._sirenTimer = setInterval(() => {
        if (!this.sirenOsc) return;
        this._sirenHigh = !this._sirenHigh;
        this.sirenOsc.frequency.setTargetAtTime(this._sirenHigh ? 950 : 720, this.ctx.currentTime, 0.05);
      }, 420);
    } catch { /* inert */ }
  }

  stopSiren() {
    try {
      if (this._sirenTimer) { clearInterval(this._sirenTimer); this._sirenTimer = null; }
      if (this.sirenOsc) { this.sirenOsc.stop(); this.sirenOsc = null; }
    } catch { /* inert */ }
  }

  // Gunshot: a short filtered noise burst.
  gunshot() {
    if (!this.ensure()) return;
    try {
      const dur = 0.12;
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1800;
      const g = this.ctx.createGain(); g.gain.value = 0.35;
      src.connect(lp); lp.connect(g); g.connect(this.master);
      src.start();
    } catch { /* inert */ }
  }

  // Mission stinger: two bright notes.
  stinger() {
    if (!this.ensure()) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 783.99].forEach((f, i) => {
        const o = this._osc('triangle', f);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, now + i * 0.14);
        g.gain.exponentialRampToValueAtTime(0.22, now + i * 0.14 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.14 + 0.5);
        o.connect(g); g.connect(this.master);
        o.start(now + i * 0.14); o.stop(now + i * 0.14 + 0.55);
      });
    } catch { /* inert */ }
  }

  // Radio Sol 101.9: a tiny original synthwave loop (bass + hats, no files).
  startRadio() {
    if (!this.ensure() || this.radioTimer) return;
    const bass = [55, 55, 65.4, 49, 55, 55, 73.4, 65.4]; // A1 A1 C2 G1 ...
    this.radioStep = 0;
    this.radioTimer = setInterval(() => {
      if (!this.ctx || this.muted) return;
      try {
        const f = bass[this.radioStep % bass.length];
        this.radioStep++;
        const o = this._osc('square', f);
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 300;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.05, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.22);
        o.connect(lp); lp.connect(g); g.connect(this.master);
        o.start(); o.stop(this.ctx.currentTime + 0.24);
      } catch { /* inert */ }
    }, 240);
  }

  stopRadio() {
    if (this.radioTimer) { clearInterval(this.radioTimer); this.radioTimer = null; }
  }

  // Mute everything (master gain to zero, keeps the context alive).
  setMuted(m) {
    this.muted = !!m;
    try {
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    } catch { /* inert */ }
  }
}
