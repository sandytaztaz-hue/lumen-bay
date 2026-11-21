// LUMEN BAY — synthesized audio. No audio files: engine hum, sirens,
// gunshots and the radio loop are all WebAudio oscillators and filtered
// noise, composed live. Everything is guarded so the game runs silently
// (and without errors) when audio is unavailable, e.g. headless.

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenTimer = null;
    this.radioTimer = null;
    this.muted = false;
    this.radioNotes = [220, 261.6, 329.6, 392, 329.6, 261.6, 196, 246.9];
    this.radioStep = 0;
  }

  ensure() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  unlock() {
    if (this.ensure() && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  _tone(freq, dur, type = 'sine', vol = 0.2, when = 0) {
    if (!this.ensure() || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch { /* silent */ }
  }

  _noise(dur, vol = 0.3, freq = 1200) {
    if (!this.ensure() || this.muted) return;
    try {
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.value = vol;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start();
    } catch { /* silent */ }
  }

  gunshot() {
    this._noise(0.14, 0.5, 2400);
    this._tone(160, 0.08, 'square', 0.12);
  }

  stinger() {
    this._tone(523, 0.18, 'triangle', 0.22);
    this._tone(659, 0.18, 'triangle', 0.22, 0.12);
    this._tone(784, 0.35, 'triangle', 0.25, 0.24);
  }

  cash() {
    this._tone(880, 0.1, 'sine', 0.18);
    this._tone(1318, 0.22, 'sine', 0.18, 0.08);
  }

  engineStart() {
    if (!this.ensure() || this.muted) return;
    try {
      if (this.engineOsc) return;
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
    } catch { /* silent */ }
  }

  engine(speedNorm) {
    if (!this.engineOsc || !this.engineGain || this.muted) return;
    try {
      this.engineOsc.frequency.setTargetAtTime(55 + speedNorm * 140, this.ctx.currentTime, 0.1);
      this.engineGain.gain.setTargetAtTime(0.02 + speedNorm * 0.06, this.ctx.currentTime, 0.1);
    } catch { /* silent */ }
  }

  engineStop() {
    if (!this.engineOsc) return;
    try {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      const osc = this.engineOsc;
      setTimeout(() => { try { osc.stop(); } catch { /* noop */ } }, 400);
    } catch { /* silent */ }
    this.engineOsc = null;
    this.engineGain = null;
  }

  siren(on) {
    if (on && !this.sirenTimer) {
      let high = false;
      this.sirenTimer = setInterval(() => {
        if (this.muted) return;
        this._tone(high ? 960 : 720, 0.42, 'sine', 0.05);
        high = !high;
      }, 430);
    } else if (!on && this.sirenTimer) {
      clearInterval(this.sirenTimer);
      this.sirenTimer = null;
    }
  }

  radio(on) {
    if (on && !this.radioTimer) {
      this.radioTimer = setInterval(() => {
        if (this.muted || !this.ctx) return;
        const note = this.radioNotes[this.radioStep % this.radioNotes.length];
        this.radioStep += 1;
        this._tone(note, 0.32, 'triangle', 0.06);
        this._tone(note / 2, 0.32, 'sine', 0.05);
      }, 340);
    } else if (!on && this.radioTimer) {
      clearInterval(this.radioTimer);
      this.radioTimer = null;
    }
  }
}
