/*
 * Palette e scene visive. Ogni scena ha:
 *   enter(s)        chiamata quando la scena diventa attiva o la finestra cambia
 *   draw(g, f, s)   disegna un frame; f = feature audio, s = stato (w, h, min, dt, time, pal)
 */
(function (global) {
  'use strict';

  const VV = global.VV;
  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  // Alpha di dissolvenza indipendente dal frame rate (riferimento 60 fps).
  const fade = (a, k) => 1 - Math.pow(1 - a, k);

  VV.PALETTES = [
    { id: 'aurora', name: 'Aurora', bg: '#04060d', stops: ['#00f5d4', '#00bbf9', '#9b5de5', '#f15bb5', '#fee440'] },
    { id: 'vapor', name: 'Vaporwave', bg: '#0a0414', stops: ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff', '#fffb96'] },
    { id: 'sunset', name: 'Sunset', bg: '#0d0507', stops: ['#ff4d6d', '#ff9f43', '#feca57', '#ff6b6b', '#c9184a'] },
    { id: 'ocean', name: 'Ocean', bg: '#020611', stops: ['#0077b6', '#00b4d8', '#90e0ef', '#caf0f8', '#48cae4'] },
    { id: 'ember', name: 'Ember', bg: '#080202', stops: ['#9d0208', '#dc2f02', '#f48c06', '#ffba08', '#e85d04'] },
    { id: 'mono', name: 'Mono', bg: '#050505', stops: ['#ffffff', '#9a9a9a', '#e0e0e0', '#6f6f6f'] },
  ];

  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // pal(t, a) → colore ciclico della palette nella posizione t (0..1, si ripete).
  VV.makePalette = function (p) {
    const stops = p.stops.map(hexToRgb);
    const n = stops.length;
    const bg = hexToRgb(p.bg).join(',');
    const pal = (t, a = 1) => {
      t -= Math.floor(t);
      const x = t * n;
      const i = Math.floor(x) % n;
      const A = stops[i];
      const B = stops[(i + 1) % n];
      let u = x - Math.floor(x);
      u = u * u * (3 - 2 * u);
      return `rgba(${(A[0] + (B[0] - A[0]) * u) | 0},${(A[1] + (B[1] - A[1]) * u) | 0},${(A[2] + (B[2] - A[2]) * u) | 0},${a})`;
    };
    pal.bg = (a = 1) => `rgba(${bg},${a})`;
    pal.bgHex = p.bg;
    return pal;
  };

  /* ---------------------------------------------------------------- Nebula
   * Migliaia di particelle trascinate da un campo di flusso. L'energia
   * accelera il flusso, i beat le spingono fuori dal centro, gli alti
   * ispessiscono le scie, la brillantezza sposta i colori. */
  const Nebula = {
    id: 'nebula',
    label: 'Nebula',
    BUCKETS: 10,
    enter(s) {
      const n = Math.round(clamp((s.w * s.h) / 900, 500, 2000));
      this.ps = [];
      for (let i = 0; i < n; i++) this.ps.push(this.spawn(s, false, {}));
      this.ph = Math.random() * 10;
    },
    spawn(s, burst, p) {
      if (burst) {
        const a = Math.random() * TAU;
        const r = Math.random() * s.min * 0.08;
        p.x = s.w / 2 + Math.cos(a) * r;
        p.y = s.h / 2 + Math.sin(a) * r;
      } else {
        p.x = Math.random() * s.w;
        p.y = Math.random() * s.h;
      }
      p.vx = 0;
      p.vy = 0;
      p.life = 1 + Math.random() * 6;
      p.c = Math.random();
      return p;
    },
    draw(g, f, s) {
      const { w, h, dt, pal } = s;
      const k = dt * 60;
      const sc = s.min / 900;
      const cx = w / 2;
      const cy = h / 2;
      const shift = s.time * 0.02 + f.centroid * 0.35;

      g.globalCompositeOperation = 'source-over';
      g.fillStyle = pal.bg(fade(0.05 + 0.07 * (1 - f.energy), k));
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'lighter';

      const R = s.min * (0.12 + f.bass * 0.32 + f.beat * 0.08);
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R);
      gr.addColorStop(0, pal(shift + 0.5, 0.04 + 0.1 * f.bass));
      gr.addColorStop(1, pal(shift + 0.5, 0));
      g.fillStyle = gr;
      g.fillRect(cx - R, cy - R, R * 2, R * 2);

      this.ph += dt * (0.12 + f.mid * 0.6);
      const ph = this.ph;
      const swirl = Math.PI * (0.5 + f.lowMid * 0.6);
      const force = 0.22 * (0.35 + f.energy * 1.8);
      const imp = f.onset ? 2 + f.onsetStrength * 7 : 0;
      const damp = Math.pow(0.93, k);
      const B = this.BUCKETS;
      const paths = [];
      for (let b = 0; b < B; b++) paths.push(new Path2D());
      const burst = f.beat > 0.6;

      for (const p of this.ps) {
        const nx = (p.x - cx) / s.min;
        const ny = (p.y - cy) / s.min;
        const a = (Math.sin(nx * 3.1 + ph) + Math.cos(ny * 2.7 - ph * 0.8) + Math.sin((nx + ny) * 1.7 + ph * 0.5 + p.c)) * swirl;
        p.vx += Math.cos(a) * force * k;
        p.vy += Math.sin(a) * force * k;
        if (imp) {
          const dx = p.x - cx;
          const dy = p.y - cy;
          const d = Math.hypot(dx, dy) + 1;
          p.vx += (dx / d) * imp;
          p.vy += (dy / d) * imp;
        }
        p.vx *= damp;
        p.vy *= damp;
        const ox = p.x;
        const oy = p.y;
        p.x += p.vx * k * sc;
        p.y += p.vy * k * sc;
        p.life -= dt;
        if (p.life <= 0 || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) {
          this.spawn(s, burst && Math.random() < 0.5, p);
          continue;
        }
        const path = paths[(p.c * B) | 0];
        path.moveTo(ox, oy);
        path.lineTo(p.x, p.y);
      }

      g.lineCap = 'round';
      g.lineWidth = (0.7 + f.high * 2.4) * Math.max(1, sc);
      const alpha = 0.3 + 0.55 * f.energy;
      for (let b = 0; b < B; b++) {
        g.strokeStyle = pal(shift + (b / B) * 0.6, alpha);
        g.stroke(paths[b]);
      }
    },
  };

  /* ---------------------------------------------------------------- Bloom
   * Mandala simmetrico costruito dallo spettro, con anelli d'onda sui beat. */
  const Bloom = {
    id: 'bloom',
    label: 'Bloom',
    enter() {
      this.rot = 0;
      this.rings = [];
    },
    draw(g, f, s) {
      const { w, h, dt, pal } = s;
      const k = dt * 60;
      const cx = w / 2;
      const cy = h / 2;
      const shift = s.time * 0.015 + f.centroid * 0.4;

      g.globalCompositeOperation = 'source-over';
      g.fillStyle = pal.bg(fade(0.16, k));
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'lighter';

      const R = s.min * 0.16 * (1 + f.bass * 0.5 + f.beat * 0.15);
      this.rot += dt * (0.06 + f.mid * 0.55);

      if (f.onset) this.rings.push({ r: R, a: 0.5 + 0.5 * f.onsetStrength, c: shift + Math.random() * 0.4 });
      for (let i = this.rings.length - 1; i >= 0; i--) {
        const ring = this.rings[i];
        ring.r += dt * s.min * (0.45 + f.energy * 0.9);
        ring.a -= dt * 0.8;
        if (ring.a <= 0) {
          this.rings.splice(i, 1);
          continue;
        }
        g.strokeStyle = pal(ring.c, ring.a * 0.7);
        g.lineWidth = 1 + ring.a * 4;
        g.beginPath();
        g.arc(cx, cy, ring.r, 0, TAU);
        g.stroke();
      }

      const spec = f.spec;
      const M = spec.length;
      const SYM = 8;
      const N = 40;
      const P = SYM * 2 * N;
      for (let L = 0; L < 3; L++) {
        const base = R * (0.7 + L * 0.6);
        const amp = s.min * (0.17 - L * 0.035) * (0.6 + f.energy * 0.9);
        const off = this.rot * (L % 2 ? -1 : 1) * (1 + L * 0.35);
        g.beginPath();
        for (let i = 0; i < P; i++) {
          const seg = (i / N) | 0;
          const u = (i % N) / N;
          const idx = seg % 2 ? 1 - u : u;
          const v = spec[Math.min(M - 1, (idx * M * 0.85) | 0)];
          const r = base + Math.pow(v, 1.5) * amp;
          const ang = (i / P) * TAU + off;
          const x = cx + Math.cos(ang) * r;
          const y = cy + Math.sin(ang) * r;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.closePath();
        g.fillStyle = pal(shift + L * 0.18, 0.03 + 0.05 * f.energy);
        g.fill();
        g.strokeStyle = pal(shift + L * 0.18, 0.5 + 0.4 * f.beat);
        g.lineWidth = 1 + (2 - L) * 0.5;
        g.stroke();
      }

      // Scintille sugli alti
      const sparks = (f.high * 26) | 0;
      for (let i = 0; i < sparks; i++) {
        const a = Math.random() * TAU;
        const r = R * (1.6 + Math.random() * 1.8);
        g.fillStyle = pal(shift + 0.6 + Math.random() * 0.2, 0.4 + Math.random() * 0.5);
        g.beginPath();
        g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.6 + Math.random() * 1.8, 0, TAU);
        g.fill();
      }

      const cr = R * 0.75;
      const core = g.createRadialGradient(cx, cy, 0, cx, cy, cr);
      core.addColorStop(0, `rgba(255,255,255,${0.12 + 0.35 * f.high})`);
      core.addColorStop(0.4, pal(shift + 0.3, 0.15 + 0.25 * f.bass));
      core.addColorStop(1, pal(shift + 0.3, 0));
      g.fillStyle = core;
      g.fillRect(cx - cr, cy - cr, cr * 2, cr * 2);
    },
  };

  /* ---------------------------------------------------------------- Ridges
   * Linee di spettro impilate nel tempo, in stile "Unknown Pleasures". */
  const Ridges = {
    id: 'ridges',
    label: 'Ridges',
    LINES: 56,
    enter() {
      this.hist = [];
      this.acc = 0;
    },
    draw(g, f, s) {
      const { w, h, dt, pal } = s;
      this.acc += dt;
      if (this.acc >= 1 / 30 || !this.hist.length) {
        this.acc = Math.min(Math.max(0, this.acc - 1 / 30), 1 / 30);
        this.hist.unshift(Float32Array.from(f.spec));
        if (this.hist.length > this.LINES) this.hist.pop();
      }
      const shift = s.time * 0.01 + f.centroid * 0.3;

      g.globalCompositeOperation = 'source-over';
      g.fillStyle = pal.bg(1);
      g.fillRect(0, 0, w, h);
      if (f.beat > 0.02) {
        g.fillStyle = pal(shift, 0.06 * f.beat);
        g.fillRect(0, 0, w, h);
      }

      const top = h * 0.2;
      const bottom = h * 0.86;
      const span = bottom - top;
      const PTS = 120;
      for (let i = this.hist.length - 1; i >= 0; i--) {
        const row = this.hist[i];
        const M = row.length;
        const depth = i / (this.LINES - 1);
        const y = bottom - depth * span;
        const persp = 1 - depth * 0.35;
        const width = Math.min(w * 0.88, s.min * 1.35) * persp;
        const x0 = (w - width) / 2;
        const amp = s.min * 0.3 * persp;

        g.beginPath();
        g.moveTo(x0, y);
        for (let j = 0; j <= PTS; j++) {
          const u = j / PTS;
          const d = Math.abs(u - 0.5) * 2; // 0 al centro (bassi), 1 ai bordi (alti)
          const v = row[Math.min(M - 1, (d * (M - 1) * 0.9) | 0)];
          const env = 0.15 + 0.85 * Math.exp(-Math.pow((u - 0.5) / 0.22, 2));
          g.lineTo(x0 + u * width, y - Math.pow(v, 1.4) * amp * env);
        }
        g.lineTo(x0 + width, y);
        g.closePath();
        g.fillStyle = pal.bg(1);
        g.fill();
        const a = (1 - depth) * 0.85 + 0.12;
        g.strokeStyle = pal(shift + depth * 0.5, a);
        g.lineWidth = i === 0 ? 2.2 : 1.2;
        if (i === 0) {
          g.shadowBlur = 10 + f.beat * 24;
          g.shadowColor = pal(shift, 0.9);
        }
        g.stroke();
        g.shadowBlur = 0;
      }
    },
  };

  /* ---------------------------------------------------------------- Aura
   * Nuvole di colore liquide (una per banda) e un oscilloscopio fantasma. */
  const Aura = {
    id: 'aura',
    label: 'Aura',
    KEYS: ['bass', 'lowMid', 'mid', 'high', 'energy'],
    enter() {
      this.ph = Math.random() * 100;
    },
    draw(g, f, s) {
      const { w, h, dt, pal } = s;
      const k = dt * 60;
      const cx = w / 2;
      const cy = h / 2;
      const shift = s.time * 0.012 + f.centroid * 0.35;

      g.globalCompositeOperation = 'source-over';
      g.fillStyle = pal.bg(fade(0.1, k));
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'lighter';

      this.ph += dt * (0.08 + f.energy * 0.45);
      const ph = this.ph;
      this.KEYS.forEach((key, i) => {
        const val = f[key];
        const a = ph * (0.7 + i * 0.23) + i * 1.3;
        const x = cx + Math.cos(a) * w * 0.3 * Math.sin(ph * 0.31 + i);
        const y = cy + Math.sin(a * 1.3) * h * 0.26;
        const r = s.min * (0.2 + val * 0.4 + (i === 0 ? f.beat * 0.15 : 0));
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        const c = shift + (i / 5) * 0.8;
        gr.addColorStop(0, pal(c, 0.04 + val * 0.15));
        gr.addColorStop(0.5, pal(c, 0.015 + val * 0.05));
        gr.addColorStop(1, pal(c, 0));
        g.fillStyle = gr;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      });

      // Oscilloscopio
      const wave = f.wave;
      const len = Math.min(wave.length, 1024);
      const W = w * 0.8;
      const x0 = (w - W) / 2;
      const amp = s.min * 0.32;
      g.beginPath();
      for (let j = 0; j <= 256; j++) {
        const u = j / 256;
        const env = Math.sin(u * Math.PI);
        const y = cy + wave[((u * (len - 1)) | 0)] * amp * env;
        if (j === 0) g.moveTo(x0, y);
        else g.lineTo(x0 + u * W, y);
      }
      g.strokeStyle = `rgba(255,255,255,${0.2 + 0.45 * f.energy})`;
      g.lineWidth = 1.2 + f.beat * 1.5;
      g.stroke();
    },
  };

  VV.SCENES = [Nebula, Bloom, Ridges, Aura];
})(window);
