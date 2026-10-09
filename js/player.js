/*
 * Riproduzione basata su AudioBufferSourceNode: funziona allo stesso modo
 * per MP3 (decodificati dal browser) e AIFF (decodificati da aiff.js).
 */
(function (global) {
  'use strict';

  const VV = global.VV;

  class Player {
    constructor() {
      this.ctx = null;
      this.buffer = null;
      this.src = null;
      this.offset = 0;
      this.startAt = 0;
      this.playing = false;
      this.onended = null;
    }

    ensureCtx() {
      if (this.ctx) return this.ctx;
      const AC = global.AudioContext || global.webkitAudioContext;
      const ctx = (this.ctx = new AC());
      const an = (this.analyser = ctx.createAnalyser());
      an.fftSize = 2048;
      an.smoothingTimeConstant = 0.5;
      an.minDecibels = -95;
      an.maxDecibels = -20;
      this.out = ctx.createGain();
      an.connect(this.out);
      this.out.connect(ctx.destination);
      return ctx;
    }

    async load(file) {
      const ctx = this.ensureCtx();
      const ab = await file.arrayBuffer();
      const buf = await VV.decodeAudio(ctx, ab);
      this.stop();
      this.buffer = buf;
      this.offset = 0;
      return buf;
    }

    get duration() {
      return this.buffer ? this.buffer.duration : 0;
    }

    get time() {
      if (!this.buffer) return 0;
      const t = this.playing ? this.ctx.currentTime - this.startAt : this.offset;
      return Math.max(0, Math.min(this.duration, t));
    }

    play() {
      if (!this.buffer || this.playing) return;
      const ctx = this.ctx;
      if (ctx.state === 'suspended') ctx.resume();
      if (this.offset >= this.duration - 0.05) this.offset = 0;
      const src = ctx.createBufferSource();
      src.buffer = this.buffer;
      src.connect(this.analyser);
      src.onended = () => {
        if (this.src !== src) return;
        this.src = null;
        this.playing = false;
        this.offset = 0;
        if (this.onended) this.onended();
      };
      src.start(0, this.offset);
      this.startAt = ctx.currentTime - this.offset;
      this.src = src;
      this.playing = true;
    }

    pause() {
      if (!this.playing) return;
      const t = this.time;
      this.stop();
      this.offset = t;
    }

    stop() {
      const s = this.src;
      this.src = null;
      this.playing = false;
      if (s) {
        try {
          s.stop();
        } catch (e) {
          /* già fermo */
        }
        s.disconnect();
      }
    }

    toggle() {
      if (this.playing) this.pause();
      else this.play();
    }

    seek(t) {
      const was = this.playing;
      this.stop();
      this.offset = Math.max(0, Math.min(this.duration, t));
      if (was) this.play();
    }

    // Uscita audio per la registrazione video.
    streamDestination() {
      if (!this.dest) {
        this.dest = this.ctx.createMediaStreamDestination();
        this.out.connect(this.dest);
      }
      return this.dest;
    }
  }

  VV.Player = Player;
})(window);
