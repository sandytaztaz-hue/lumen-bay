// LUMEN BAY — audio.js
import { mulberry32 } from './random.js';

// All sound is synthesized with WebAudio; there are no audio files.
// The context is created lazily on the first user gesture; in headless
// runs it stays inert and every call is a safe no-op.
// Noise uses a seeded generator, never Math.random: the game has no
// unseeded randomness anywhere.
const noiseNext = mulberry32(20261123);

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engineNodes = null;
    this.sirenNodes = null;
    this.radioNodes = null;
    this.radioTimer = null;
    this.radioStep = 0;
    this.sirenHigh = false;
    this.sirenTimer = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch (err) {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  // Engine hum: two detuned sawtooths through a lowpass, pitch follows speed.
  engine(speed01) {
    if (!this.ctx || this.muted) return;
    try {
      if (!this.engineNodes) {
        const oscA = this.ctx.createOscillator();
        oscA.type = 'sawtooth';
        const oscB = this.ctx.createOscillator();
        oscB.type = 'sawtooth';
        oscB.detune.value = 8;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 700;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.05;
        oscA.connect(filter);
        oscB.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        oscA.start();
        oscB.start();
        this.engineNodes = { oscA, oscB, gain };
      }
      const freq = 55 + speed01 * 130;
      this.engineNodes.oscA.frequency.value = freq;
      this.engineNodes.oscB.frequency.value = freq * 1.01;
      this.engineNodes.gain.gain.value = 0.03 + speed01 * 0.05;
    } catch (err) {
      // Audio is decoration; never let it break the game.
    }
  }

  // Police siren: a sine alternating 720 / 950 Hz every 420 ms.
  siren(on) {
    if (!this.ctx) return;
    try {
      if (on && !this.sirenNodes) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 720;
        const gain = this.ctx.createGain();
        gain.gain.value = this.muted ? 0 : 0.05;
        osc.connect(gain);
        gain.connect(this.master);
        osc.start();
        this.sirenNodes = { osc, gain };
        this.sirenHigh = false;
        this.sirenTimer = window.setInterval(() => {
          if (!this.sirenNodes) return;
          this.sirenHigh = !this.sirenHigh;
          this.sirenNodes.osc.frequency.value = this.sirenHigh ? 950 : 720;
        }, 420);
      } else if (!on && this.sirenNodes) {
        window.clearInterval(this.sirenTimer);
        this.sirenTimer = null;
        try { this.sirenNodes.osc.stop(); } catch (err) {}
        this.sirenNodes = null;
      }
    } catch (err) {
      // Ignore audio failures.
    }
  }

  // Gunshot: a short filtered noise burst, 0.12 seconds.
  shot() {
    if (!this.ctx || this.muted) return;
    try {
      const dur = 0.12;
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (noiseNext() * 2 - 1) * (1 - i / data.length);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1800;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.4;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start();
    } catch (err) {
      // Ignore audio failures.
    }
  }

  // Mission stinger: two bright triangle notes, 523.25 then 783.99 Hz.
  stinger() {
    if (!this.ctx || this.muted) return;
    try {
      const notes = [523.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const gain = this.ctx.createGain();
        const t0 = this.ctx.currentTime + i * 0.16;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t0);
        osc.stop(t0 + 0.4);
      });
    } catch (err) {
      // Ignore audio failures.
    }
  }

  // Radio Sol 101.9: a tiny original synthwave loop — a square-wave bass
  // line stepping A1 A1 C2 G1 A1 A1 D2 C2 every 240 ms through a lowpass.
  radio(on) {
    if (!this.ctx) return;
    try {
      if (on && !this.radioNodes) {
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        const gain = this.ctx.createGain();
        gain.gain.value = this.muted ? 0 : 0.06;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        osc.start();
        const notes = [55, 55, 65.41, 49, 55, 55, 73.42, 65.41];
        this.radioStep = 0;
        this.radioTimer = window.setInterval(() => {
          if (!this.radioNodes) return;
          this.radioNodes.osc.frequency.value = notes[this.radioStep % notes.length];
          this.radioStep++;
        }, 240);
        this.radioNodes = { osc, gain };
      } else if (!on && this.radioNodes) {
        window.clearInterval(this.radioTimer);
        this.radioTimer = null;
        try { this.radioNodes.osc.stop(); } catch (err) {}
        this.radioNodes = null;
      }
    } catch (err) {
      // Ignore audio failures.
    }
  }
}
