/*
 * Estrazione delle feature audio in tempo reale dall'AnalyserNode:
 *  - bande di frequenza (bass, lowMid, mid, high) con controllo automatico del guadagno
 *  - energia (RMS), brillantezza (spectral centroid)
 *  - onset / beat con spectral flux e soglia adattiva
 *  - stima del BPM dagli intervalli tra gli onset
 *  - spettro logaritmico a 96 bande e forma d'onda per le scene
 */
(function (global) {
  'use strict';

  const VV = global.VV;
  const SPEC_BANDS = 96;
  const BAND_KEYS = ['bass', 'lowMid', 'mid', 'high', 'energy'];

  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  // Inseguimento con attacco/rilascio indipendenti dal frame rate.
  const follow = (cur, target, dt, att, rel) =>
    cur + (target - cur) * (1 - Math.exp(-dt * (target > cur ? att : rel)));

  class Features {
    constructor(analyser) {
      this.an = analyser;
      this.out = {
        bass: 0,
        lowMid: 0,
        mid: 0,
        high: 0,
        energy: 0,
        centroid: 0.4,
        centroidHz: 0,
        beat: 0,
        onset: false,
        onsetStrength: 0,
        beatCount: 0,
        bpm: 0,
        spec: new Float32Array(SPEC_BANDS),
        wave: new Float32Array(analyser ? analyser.fftSize : 1024),
      };
      this.lo = {};
      this.hi = {};
      BAND_KEYS.forEach((k) => {
        this.lo[k] = 0;
        this.hi[k] = 0.1;
      });
      this.fluxHist = new Float32Array(48);
      this.fluxIdx = 0;
      this.lastOnset = -1;
      this.onsets = [];
      this.bpmTimer = 0;
      if (!analyser) return;

      const n = analyser.frequencyBinCount;
      const sr = analyser.context.sampleRate;
      this.n = n;
      this.binHz = sr / analyser.fftSize;
      this.db = new Float32Array(n);
      this.v = new Float32Array(n);
      this.prev = new Float32Array(n);
      const bin = (hz) => clamp(Math.round(hz / this.binHz), 1, n - 1);
      this.bands = {
        bass: [bin(20), bin(140)],
        lowMid: [bin(140), bin(500)],
        mid: [bin(500), bin(2500)],
        high: [bin(2500), bin(11000)],
      };
      this.lowFluxEnd = bin(160);
      this.fluxEnd = bin(10000);
      // Bande logaritmiche 35 Hz – 16 kHz.
      this.specMap = [];
      for (let i = 0; i < SPEC_BANDS; i++) {
        const f0 = 35 * Math.pow(16000 / 35, i / SPEC_BANDS);
        const f1 = 35 * Math.pow(16000 / 35, (i + 1) / SPEC_BANDS);
        const a = clamp(Math.floor(f0 / this.binHz), 1, n - 1);
        const b = clamp(Math.ceil(f1 / this.binHz), a + 1, n);
        this.specMap.push([a, b]);
      }
    }

    update(dt, now, sens) {
      if (!this.an) return this.idle(dt, now);
      const o = this.out;
      const { db, v, prev, n } = this;
      this.an.getFloatFrequencyData(db);
      this.an.getFloatTimeDomainData(o.wave);

      const MIN = -95;
      const RANGE = 75;
      let flux = 0;
      let lowFlux = 0;
      let num = 0;
      let den = 0;
      for (let i = 0; i < n; i++) {
        const d = db[i];
        let x = d <= MIN ? 0 : (d - MIN) / RANGE;
        if (x > 1) x = 1;
        v[i] = x;
        const diff = x - prev[i];
        if (diff > 0 && i < this.fluxEnd) {
          flux += diff;
          if (i < this.lowFluxEnd) lowFlux += diff;
        }
        prev[i] = x;
        if (d > -140) {
          const lin = Math.pow(10, d / 20);
          num += lin * i;
          den += lin;
        }
      }

      // Bande
      const raw = {};
      for (const k in this.bands) {
        const [a, b] = this.bands[k];
        let s = 0;
        for (let i = a; i < b; i++) s += v[i];
        raw[k] = s / Math.max(1, b - a);
      }
      let rms = 0;
      const w = o.wave;
      for (let i = 0; i < w.length; i++) rms += w[i] * w[i];
      raw.energy = clamp(Math.sqrt(rms / w.length) * 3, 0, 1);

      // Guadagno automatico: confronta il valore con un minimo e un massimo
      // che si adattano lentamente al brano, così anche tracce molto
      // compresse o molto dinamiche hanno movimento.
      const gain = 0.6 + sens * 0.9;
      for (const k of BAND_KEYS) {
        const x = raw[k];
        this.hi[k] = Math.max(x, this.hi[k] * Math.exp(-dt * 0.12), 0.05);
        this.lo[k] = x < this.lo[k] ? x : this.lo[k] + (x - this.lo[k]) * (1 - Math.exp(-dt * 0.25));
        const rel = (x - this.lo[k]) / Math.max(0.06, this.hi[k] - this.lo[k]);
        const target = clamp((0.55 * clamp(rel, 0, 1) + 0.45 * x) * gain, 0, 1);
        o[k] = follow(o[k], target, dt, 28, 7);
      }

      // Brillantezza (centroide spettrale) normalizzato in scala log.
      const hz = den > 0 ? (num / den) * this.binHz : 0;
      o.centroidHz = hz;
      const c = hz > 0 ? clamp(Math.log2(hz / 150) / Math.log2(6000 / 150), 0, 1) : o.centroid;
      o.centroid = follow(o.centroid, c, dt, 3, 3);

      // Onset detection: spectral flux pesato sui bassi, soglia = media + k·std.
      const od = (flux + lowFlux * 3) / this.fluxEnd;
      const h = this.fluxHist;
      let mean = 0;
      for (let i = 0; i < h.length; i++) mean += h[i];
      mean /= h.length;
      let vari = 0;
      for (let i = 0; i < h.length; i++) vari += (h[i] - mean) * (h[i] - mean);
      const std = Math.sqrt(vari / h.length);
      h[this.fluxIdx] = od;
      this.fluxIdx = (this.fluxIdx + 1) % h.length;

      const k = 2.3 - sens * 1.4;
      o.onset = false;
      if (od > mean + k * std && od > mean * 1.25 && od > 0.004 && now - this.lastOnset > 0.17) {
        o.onset = true;
        o.onsetStrength = clamp((od - mean) / (std * 5 + 1e-6), 0.2, 1);
        o.beat = Math.max(o.beat, 0.55 + 0.45 * o.onsetStrength);
        o.beatCount++;
        this.lastOnset = now;
        this.onsets.push(now);
      }
      o.beat *= Math.exp(-dt * 5.5);

      this.bpmTimer += dt;
      if (this.bpmTimer > 1) {
        this.bpmTimer = 0;
        this.estimateBpm(now);
      }

      // Spettro logaritmico per le scene.
      const sg = 0.75 + sens * 0.6;
      for (let i = 0; i < SPEC_BANDS; i++) {
        const [a, b] = this.specMap[i];
        let m = 0;
        for (let j = a; j < b; j++) if (v[j] > m) m = v[j];
        const tilt = 1 + (i / SPEC_BANDS) * 0.35;
        const x = clamp(((m * tilt - 0.2) / 0.75) * sg, 0, 1);
        o.spec[i] = follow(o.spec[i], x, dt, 30, 9);
      }
      return o;
    }

    estimateBpm(now) {
      const on = this.onsets;
      while (on.length && now - on[0] > 10) on.shift();
      if (on.length < 6) return;
      const hist = new Float32Array(81); // 80..160 BPM
      for (let i = 0; i < on.length; i++) {
        for (let j = i + 1; j < Math.min(on.length, i + 6); j++) {
          const iv = on[j] - on[i];
          if (iv < 0.2 || iv > 2.4) continue;
          let bpm = 60 / iv;
          while (bpm < 80) bpm *= 2;
          while (bpm > 160) bpm /= 2;
          const b = Math.round(bpm) - 80;
          const wgt = 1 / (j - i);
          hist[b] += wgt;
          if (b > 0) hist[b - 1] += wgt * 0.5;
          if (b < 80) hist[b + 1] += wgt * 0.5;
        }
      }
      let best = 0;
      for (let i = 1; i < hist.length; i++) if (hist[i] > hist[best]) best = i;
      if (hist[best] < 2) return;
      const bpm = best + 80;
      const prev = this.out.bpm;
      this.out.bpm = prev && Math.abs(prev - bpm) <= 2 ? Math.round(prev * 0.7 + bpm * 0.3) : bpm;
    }

    // Valori sintetici morbidi per l'animazione di sfondo prima del caricamento.
    idle(dt, t) {
      const o = this.out;
      o.bass = 0.18 + 0.1 * Math.sin(t * 0.7);
      o.lowMid = 0.16 + 0.1 * Math.sin(t * 0.53 + 1);
      o.mid = 0.14 + 0.08 * Math.sin(t * 0.41 + 2);
      o.high = 0.1 + 0.06 * Math.sin(t * 0.9 + 3);
      o.energy = 0.15 + 0.08 * Math.sin(t * 0.33);
      o.centroid = 0.45 + 0.2 * Math.sin(t * 0.11);
      o.onset = false;
      o.beat *= Math.exp(-dt * 5);
      for (let i = 0; i < SPEC_BANDS; i++) {
        const u = i / SPEC_BANDS;
        o.spec[i] = clamp(0.35 * (1 - u) + 0.12 * Math.sin(u * 14 + t * 1.3) + 0.08 * Math.sin(u * 37 - t * 0.7), 0, 1);
      }
      for (let i = 0; i < o.wave.length; i++) o.wave[i] = 0.04 * Math.sin(i * 0.02 + t * 2) * Math.sin(i * 0.003 + t);
      return o;
    }
  }

  VV.Features = Features;
})(window);
