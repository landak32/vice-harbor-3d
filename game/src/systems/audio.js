// All sound is synthesised: a two-oscillator engine pitched by speed, noise-burst gunshots,
// a two-tone siren that follows the nearest cruiser, footsteps, city ambience and a small
// looping radio track. The context starts on the first user gesture.
export class Audio {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.radioOn = true;
    this.radioStep = 0;
    this.nextNote = 0;
    this.sirenLevel = 0;
    this.footT = 0;
    this.hornT = 0;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(ctx.destination);
    // shared noise buffer
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;

    // engine
    this.engGain = ctx.createGain(); this.engGain.gain.value = 0;
    this.engFilter = ctx.createBiquadFilter(); this.engFilter.type = 'lowpass'; this.engFilter.frequency.value = 420;
    this.engGain.connect(this.master);
    this.engFilter.connect(this.engGain);
    this.osc1 = ctx.createOscillator(); this.osc1.type = 'sawtooth'; this.osc1.frequency.value = 55;
    this.osc2 = ctx.createOscillator(); this.osc2.type = 'square'; this.osc2.frequency.value = 27;
    this.osc1.connect(this.engFilter); this.osc2.connect(this.engFilter);
    this.osc1.start(); this.osc2.start();

    // siren
    this.sirenGain = ctx.createGain(); this.sirenGain.gain.value = 0;
    this.siren = ctx.createOscillator(); this.siren.type = 'triangle'; this.siren.frequency.value = 720;
    this.siren.connect(this.sirenGain); this.sirenGain.connect(this.master); this.siren.start();

    // ambience: filtered noise bed
    const amb = ctx.createBufferSource(); amb.buffer = buf; amb.loop = true;
    const af = ctx.createBiquadFilter(); af.type = 'lowpass'; af.frequency.value = 380;
    this.ambGain = ctx.createGain(); this.ambGain.gain.value = 0.045;
    amb.connect(af); af.connect(this.ambGain); this.ambGain.connect(this.master);
    amb.start();

    // radio bus
    this.radioGain = ctx.createGain(); this.radioGain.gain.value = 0.0;
    this.radioGain.connect(this.master);
    this.radioFilter = ctx.createBiquadFilter(); this.radioFilter.type = 'lowpass'; this.radioFilter.frequency.value = 2400;
    this.radioFilter.connect(this.radioGain);
    this.ready = true;
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  tone(freq, dur, type = 'sine', gain = 0.2, slide = 0, when = 0) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noiseBurst(dur = 0.12, gain = 0.5, freq = 900, q = 0.8, when = 0) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime + when;
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random() * 1.2, dur + 0.02);
  }

  gunshot(kind = 'pistol') {
    if (!this.ready) return;
    const g = kind === 'shotgun' ? 0.75 : kind === 'smg' ? 0.28 : 0.45;
    this.noiseBurst(0.16, g, 620, 0.7);
    this.tone(kind === 'shotgun' ? 70 : 110, 0.16, 'square', 0.22, -50);
  }
  click() { this.tone(880, 0.05, 'square', 0.06); }
  footstep(run) { this.noiseBurst(0.05, run ? 0.12 : 0.07, 240, 1.4); }
  horn() { this.tone(330, 0.5, 'square', 0.13); this.tone(415, 0.5, 'square', 0.1); }
  pickup() { this.tone(660, 0.08, 'square', 0.1); this.tone(990, 0.12, 'square', 0.1, 0, 0.08); }
  hurt() { this.noiseBurst(0.2, 0.3, 180, 0.6); }

  setEngine(level, speed, maxSpeed) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const rpm = Math.min(1, Math.abs(speed) / Math.max(1, maxSpeed));
    this.engGain.gain.setTargetAtTime(level * 0.13, t, 0.12);
    this.osc1.frequency.setTargetAtTime(48 + rpm * 120, t, 0.08);
    this.osc2.frequency.setTargetAtTime(24 + rpm * 62, t, 0.08);
    this.engFilter.frequency.setTargetAtTime(320 + rpm * 900, t, 0.1);
  }

  setSiren(level) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.sirenGain.gain.setTargetAtTime(level * 0.075, t, 0.2);
    if (level > 0.01) this.siren.frequency.setTargetAtTime(660 + Math.sin(t * 4.2) * 240, t, 0.05);
  }

  // A slow four-chord loop: bass, pad and a small arpeggio, all synthesised.
  updateRadio(dt, inCar) {
    if (!this.ready) return;
    this.radioGain.gain.setTargetAtTime(inCar && this.radioOn ? 0.16 : 0, this.ctx.currentTime, 0.4);
    if (!inCar) return;
    const t = this.ctx.currentTime;
    if (this.nextNote < t) this.nextNote = t + 0.05;
    while (this.nextNote < t + 0.4) {
      const step = this.radioStep++;
      const chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [164.8, 207.7, 246.9]];
      const ch = chords[Math.floor(step / 8) % 4];
      const when = this.nextNote - t;
      const beat = step % 8;
      if (beat === 0 || beat === 4) this.radioNote(ch[0] / 2, 0.5, 'triangle', 0.16, when);
      if (beat === 0) this.radioNote(ch[0], 1.2, 'sine', 0.07, when);
      if (beat % 2 === 1) this.radioNote(ch[2] * 2, 0.14, 'square', 0.03, when);
      if (beat % 4 === 2) this.radioNote(ch[1] * 2, 0.2, 'sine', 0.035, when);
      this.nextNote += 0.28;
    }
  }

  radioNote(freq, dur, type, gain, when) {
    const ctx = this.ctx, t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.radioFilter);
    o.start(t); o.stop(t + dur + 0.02);
  }

  update(dt, s) {
    if (!this.ready) return;
    this.setEngine(s.inCar ? 0.55 + Math.abs(s.speed) * 0.02 : 0, s.speed, s.maxSpeed ?? 40);
    this.setSiren(s.siren ?? 0);
    this.updateRadio(dt, s.inCar);
    if (s.moving && !s.inCar) {
      this.footT -= dt;
      if (this.footT <= 0) { this.footstep(s.running); this.footT = s.running ? 0.3 : 0.46; }
    }
  }
}
