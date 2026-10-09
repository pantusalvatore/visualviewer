/*
 * Decoder AIFF / AIFF-C in puro JavaScript.
 * Chrome e Firefox non decodificano gli AIFF con decodeAudioData, quindi li
 * leggiamo a mano e costruiamo un AudioBuffer.
 *
 * Supporta: PCM 8/16/24/32 bit big-endian (AIFF, AIFC 'NONE'/'twos'/'in24'/'in32'),
 * little-endian ('sowt'), float 32/64 ('fl32'/'fl64'), G.711 ('ulaw'/'alaw').
 */
(function (global) {
  'use strict';

  const VV = (global.VV = global.VV || {});

  function readStr(bytes, o, n) {
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(bytes[o + i]);
    return s;
  }

  // Numero IEEE 754 a 80 bit (extended) usato per il sample rate.
  function readExtended(dv, o) {
    const expon = dv.getUint16(o);
    const hi = dv.getUint32(o + 2);
    const lo = dv.getUint32(o + 6);
    const sign = expon & 0x8000 ? -1 : 1;
    const e = expon & 0x7fff;
    if (e === 0 && hi === 0 && lo === 0) return 0;
    if (e === 0x7fff) return sign * Infinity;
    return sign * (hi * Math.pow(2, e - 16383 - 31) + lo * Math.pow(2, e - 16383 - 63));
  }

  function isAiff(buf) {
    if (buf.byteLength < 12) return false;
    const b = new Uint8Array(buf, 0, 12);
    const form = readStr(b, 8, 4);
    return readStr(b, 0, 4) === 'FORM' && (form === 'AIFF' || form === 'AIFC');
  }

  function ulaw(u) {
    u = ~u & 0xff;
    const sign = u & 0x80;
    const exponent = (u >> 4) & 0x07;
    const mantissa = u & 0x0f;
    let s = (((mantissa << 3) + 0x84) << exponent) - 0x84;
    return (sign ? -s : s) / 32768;
  }

  function alaw(a) {
    a ^= 0x55;
    const sign = a & 0x80;
    const exponent = (a >> 4) & 0x07;
    const mantissa = a & 0x0f;
    let s = exponent === 0 ? (mantissa << 4) + 8 : ((mantissa << 4) + 0x108) << (exponent - 1);
    return (sign ? s : -s) / 32768;
  }

  function parseAiff(buf) {
    if (!isAiff(buf)) throw new Error('non è un file AIFF');
    const bytes = new Uint8Array(buf);
    const dv = new DataView(buf);
    const isAifc = readStr(bytes, 8, 4) === 'AIFC';
    let comm = null;
    let ssnd = null;

    let p = 12;
    while (p + 8 <= buf.byteLength) {
      const id = readStr(bytes, p, 4);
      const size = dv.getUint32(p + 4);
      const body = p + 8;
      if (id === 'COMM') {
        comm = {
          channels: dv.getInt16(body),
          frames: dv.getUint32(body + 2),
          bits: dv.getInt16(body + 6),
          rate: readExtended(dv, body + 8),
          comp: 'NONE',
        };
        if (isAifc && size >= 22) comm.comp = readStr(bytes, body + 18, 4);
      } else if (id === 'SSND') {
        const offset = dv.getUint32(body);
        const start = body + 8 + offset;
        // Alcuni encoder scrivono size = 0 o valori oltre la fine del file.
        let len = size - 8 - offset;
        if (size === 0 || start + len > buf.byteLength) len = buf.byteLength - start;
        ssnd = { start, len: Math.max(0, len) };
      }
      if (size === 0 && id === 'SSND') break;
      p = body + size + (size & 1);
    }

    if (!comm) throw new Error('chunk COMM mancante');
    if (!ssnd) throw new Error('chunk SSND mancante');
    if (comm.channels < 1) throw new Error('numero di canali non valido');
    if (!(comm.rate > 0)) throw new Error('sample rate non valido');

    const comp = comm.comp;
    const ch = comm.channels;
    let kind;
    let bps;
    let le = false;
    switch (comp) {
      case 'NONE':
      case 'twos':
        kind = 'int';
        bps = Math.ceil(comm.bits / 8);
        break;
      case 'in24':
        kind = 'int';
        bps = 3;
        break;
      case 'in32':
        kind = 'int';
        bps = 4;
        break;
      case 'sowt':
        kind = 'int';
        le = true;
        bps = Math.ceil(comm.bits / 8);
        break;
      case 'raw ':
        kind = 'uint8';
        bps = 1;
        break;
      case 'fl32':
      case 'FL32':
        kind = 'f32';
        bps = 4;
        break;
      case 'fl64':
      case 'FL64':
        kind = 'f64';
        bps = 8;
        break;
      case 'ulaw':
      case 'ULAW':
        kind = 'ulaw';
        bps = 1;
        break;
      case 'alaw':
      case 'ALAW':
        kind = 'alaw';
        bps = 1;
        break;
      default:
        throw new Error('compressione AIFF-C "' + comp + '" non supportata');
    }
    if (kind === 'int' && (bps < 1 || bps > 4)) throw new Error(comm.bits + ' bit non supportati');

    const frameBytes = bps * ch;
    const frames = Math.min(comm.frames, Math.floor(ssnd.len / frameBytes));
    const channels = [];
    for (let c = 0; c < ch; c++) channels.push(new Float32Array(frames));

    let o = ssnd.start;
    if (kind === 'int') {
      const scale = 1 / Math.pow(2, bps * 8 - 1);
      for (let i = 0; i < frames; i++) {
        for (let c = 0; c < ch; c++) {
          let v = 0;
          if (le) {
            for (let b = bps - 1; b >= 0; b--) v = v * 256 + bytes[o + b];
          } else {
            for (let b = 0; b < bps; b++) v = v * 256 + bytes[o + b];
          }
          // complemento a due
          if (v >= Math.pow(2, bps * 8 - 1)) v -= Math.pow(2, bps * 8);
          channels[c][i] = v * scale;
          o += bps;
        }
      }
    } else {
      for (let i = 0; i < frames; i++) {
        for (let c = 0; c < ch; c++) {
          let v;
          if (kind === 'f32') v = dv.getFloat32(o);
          else if (kind === 'f64') v = dv.getFloat64(o);
          else if (kind === 'ulaw') v = ulaw(bytes[o]);
          else if (kind === 'alaw') v = alaw(bytes[o]);
          else v = (bytes[o] - 128) / 128;
          channels[c][i] = v;
          o += bps;
        }
      }
    }

    return { sampleRate: comm.rate, length: frames, channels };
  }

  // Decodifica qualsiasi file audio in un AudioBuffer.
  async function decodeAudio(ctx, arrayBuffer) {
    let aiffError = null;
    if (isAiff(arrayBuffer)) {
      try {
        const r = parseAiff(arrayBuffer);
        if (r.length === 0) throw new Error('il file non contiene campioni audio');
        const out = ctx.createBuffer(r.channels.length, r.length, r.sampleRate);
        r.channels.forEach((d, i) => out.getChannelData(i).set(d));
        return out;
      } catch (e) {
        aiffError = e;
      }
    }
    try {
      return await new Promise((resolve, reject) => {
        const p = ctx.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
        if (p && typeof p.then === 'function') p.then(resolve, reject);
      });
    } catch (e) {
      throw aiffError || new Error('formato non supportato da questo browser');
    }
  }

  VV.isAiff = isAiff;
  VV.parseAiff = parseAiff;
  VV.decodeAudio = decodeAudio;
})(typeof window !== 'undefined' ? window : globalThis);
