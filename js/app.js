(function () {
  'use strict';

  const VV = window.VV;
  const $ = (s) => document.querySelector(s);
  const body = document.body;

  const canvas = $('#stage');
  const g = canvas.getContext('2d', { alpha: false });
  const player = new VV.Player();
  let features = new VV.Features(null);

  const scenes = VV.SCENES;
  const S = { w: 0, h: 0, min: 0, dt: 0, time: 0, pal: VV.makePalette(VV.PALETTES[0]) };
  let sceneIdx = 0;
  let palIdx = 0;
  let sens = 0.55;
  let auto = false;
  let autoClock = 0;
  let trackName = '';
  let seeking = false;

  /* ------------------------------------------------------------ canvas */
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    S.w = window.innerWidth;
    S.h = window.innerHeight;
    S.min = Math.min(S.w, S.h);
    canvas.width = Math.round(S.w * dpr);
    canvas.height = Math.round(S.h * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    clearStage();
    scenes[sceneIdx].enter(S);
  }

  function clearStage() {
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = S.pal.bg(1);
    g.fillRect(0, 0, S.w, S.h);
  }

  /* ------------------------------------------------------------ scene & palette */
  const sceneBtns = scenes.map((sc, i) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = sc.label;
    b.title = `${sc.label} (${i + 1})`;
    b.addEventListener('click', () => setScene(i, true));
    $('#scenes').appendChild(b);
    return b;
  });

  function setScene(i, manual) {
    sceneIdx = (i + scenes.length) % scenes.length;
    scenes[sceneIdx].enter(S);
    sceneBtns.forEach((b, j) => b.classList.toggle('on', j === sceneIdx));
    autoClock = 0;
    if (manual && auto) setAuto(false);
    if (manual) toast(scenes[sceneIdx].label);
  }

  const palSel = $('#palette');
  VV.PALETTES.forEach((p, i) => palSel.add(new Option(p.name, i)));
  palSel.addEventListener('change', () => setPalette(+palSel.value));

  function setPalette(i) {
    palIdx = (i + VV.PALETTES.length) % VV.PALETTES.length;
    const p = VV.PALETTES[palIdx];
    S.pal = VV.makePalette(p);
    palSel.value = palIdx;
    document.documentElement.style.setProperty('--bg', p.bg);
    document.documentElement.style.setProperty('--accent', p.stops[2]);
    document.documentElement.style.setProperty('--accent-2', p.stops[0]);
  }

  function setAuto(on) {
    auto = on;
    autoClock = 0;
    $('#autoBtn').classList.toggle('on', on);
  }
  $('#autoBtn').addEventListener('click', () => {
    setAuto(!auto);
    toast(auto ? 'Auto: la scena cambia a tempo di musica' : 'Auto disattivato');
  });

  $('#sens').addEventListener('input', (e) => {
    sens = e.target.value / 100;
    paintRange(e.target);
  });

  /* ------------------------------------------------------------ caricamento */
  async function loadFile(file) {
    if (!file) return;
    // Crea/sblocca l'AudioContext subito, finché siamo dentro il gesto dell'utente.
    player.ensureCtx().resume();
    if (rec) rec.stop();
    $('#loading').hidden = false;
    try {
      await player.load(file);
    } catch (e) {
      toast('Impossibile leggere "' + file.name + '": ' + e.message, true);
      return;
    } finally {
      $('#loading').hidden = true;
    }
    features = new VV.Features(player.analyser);
    trackName = file.name.replace(/\.[^.]+$/, '');
    document.title = trackName + ' · Visual Viewer';
    $('#trackName').textContent = trackName;
    $('#dur').textContent = fmt(player.duration);
    body.classList.remove('landing');
    $('#controls').hidden = false;
    player.play();
    syncPlay();
    poke();
    setTimeout(() => {
      if (player.ctx.state !== 'running') toast('Premi ▶ per avviare la riproduzione');
    }, 300);
  }

  $('#file').addEventListener('change', (e) => loadFile(e.target.files[0]));
  $('#file2').addEventListener('change', (e) => {
    loadFile(e.target.files[0]);
    e.target.value = '';
  });

  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragDepth++;
    body.classList.add('dragging');
  });
  window.addEventListener('dragleave', () => {
    if (--dragDepth <= 0) {
      dragDepth = 0;
      body.classList.remove('dragging');
    }
  });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    body.classList.remove('dragging');
    const f = e.dataTransfer && e.dataTransfer.files[0];
    if (f) loadFile(f);
  });

  /* ------------------------------------------------------------ trasporto */
  const playBtn = $('#playBtn');
  function syncPlay() {
    playBtn.classList.toggle('playing', player.playing);
    playBtn.setAttribute('aria-label', player.playing ? 'Pausa' : 'Play');
  }
  function togglePlay() {
    if (!player.buffer) return;
    player.toggle();
    syncPlay();
    poke();
  }
  playBtn.addEventListener('click', togglePlay);
  canvas.addEventListener('click', togglePlay);
  player.onended = () => {
    syncPlay();
    if (rec) rec.stop();
    poke();
  };

  const seek = $('#seek');
  seek.addEventListener('input', () => {
    seeking = true;
    $('#cur').textContent = fmt((seek.value / 1000) * player.duration);
    paintRange(seek);
  });
  seek.addEventListener('change', () => {
    player.seek((seek.value / 1000) * player.duration);
    seeking = false;
  });

  function paintRange(el) {
    el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min)) * 100 + '%');
  }
  paintRange($('#sens'));

  function fmt(t) {
    t = Math.max(0, t | 0);
    return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  }

  /* ------------------------------------------------------------ HUD */
  const METERS = [
    ['bass', 'Bassi'],
    ['lowMid', 'Medio-bassi'],
    ['mid', 'Medi'],
    ['high', 'Alti'],
    ['energy', 'Energia'],
    ['centroid', 'Brillantezza'],
  ];
  const meterEls = METERS.map(([, label]) => {
    const row = document.createElement('div');
    row.className = 'meter';
    row.innerHTML = `<span>${label}</span><div class="bar"><i></i></div>`;
    $('#meters').appendChild(row);
    return row.querySelector('i');
  });
  const hud = $('#hud');
  const hudBtn = $('#hudBtn');
  function toggleHud() {
    hud.hidden = !hud.hidden;
    hudBtn.classList.toggle('on', !hud.hidden);
  }
  hudBtn.addEventListener('click', toggleHud);

  let hudClock = 0;
  function updateHud(f, dt) {
    if (hud.hidden) return;
    METERS.forEach(([k], i) => (meterEls[i].style.transform = `scaleX(${f[k].toFixed(3)})`));
    $('#beatDot').style.opacity = (0.15 + f.beat * 0.85).toFixed(2);
    hudClock += dt;
    if (hudClock > 0.4) {
      hudClock = 0;
      $('#bpm').textContent = f.bpm ? f.bpm : '—';
      $('#centroidHz').textContent = f.centroidHz > 0 ? Math.round(f.centroidHz) + ' Hz' : '—';
    }
  }

  /* ------------------------------------------------------------ registrazione video */
  // Formati video in ordine di preferenza. MP4 (H.264 + AAC) è il più compatibile
  // con telefoni, social ed editor; WebM resta come alternativa.
  const REC_FORMATS = [
    {
      id: 'mp4',
      label: 'MP4',
      types: [
        'video/mp4;codecs=avc1.640028,mp4a.40.2',
        'video/mp4;codecs=avc1.4d0028,mp4a.40.2',
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4;codecs=avc1',
      ],
      // Solo H.264: un semplice 'video/mp4' in Chromium senza codec proprietari
      // produce VP9 dentro MP4, che molti telefoni e social non aprono.
      hint: 'Per MP4 usa Chrome, Edge o Safari aggiornati',
    },
    { id: 'webm', label: 'WebM', types: ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'] },
  ];
  const canRecord = !!(window.MediaRecorder && canvas.captureStream);
  const recSel = $('#recFormat');
  REC_FORMATS.forEach((fmt) => {
    fmt.mime = canRecord ? fmt.types.find((t) => MediaRecorder.isTypeSupported(t)) || '' : '';
    const opt = new Option(fmt.mime ? fmt.label : `${fmt.label} (non supportato)`, fmt.id);
    opt.disabled = !fmt.mime;
    if (!fmt.mime && fmt.hint) opt.title = fmt.hint;
    recSel.add(opt);
  });
  let savedFormat = null;
  try {
    savedFormat = localStorage.getItem('vv.recFormat');
  } catch (e) {
    /* storage non disponibile */
  }
  const firstOk = REC_FORMATS.find((f) => f.mime);
  const savedOk = REC_FORMATS.find((f) => f.id === savedFormat && f.mime);
  recSel.value = (savedOk || firstOk || REC_FORMATS[0]).id;
  recSel.disabled = !firstOk;
  recSel.addEventListener('change', () => {
    try {
      localStorage.setItem('vv.recFormat', recSel.value);
    } catch (e) {
      /* storage non disponibile */
    }
  });

  let rec = null;
  function toggleRec() {
    if (rec) {
      rec.stop();
      return;
    }
    if (!player.buffer) return;
    const fmt = REC_FORMATS.find((f) => f.id === recSel.value && f.mime) || firstOk;
    if (!fmt) {
      toast('Registrazione non supportata da questo browser', true);
      return;
    }
    const mime = fmt.mime;
    const stream = new MediaStream([
      ...canvas.captureStream(60).getVideoTracks(),
      ...player.streamDestination().stream.getAudioTracks(),
    ]);
    const r = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12e6, audioBitsPerSecond: 256e3 });
    const chunks = [];
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = () => {
      stream.getTracks().forEach((t) => t.kind === 'video' && t.stop());
      rec = null;
      $('#recBtn').classList.remove('on');
      recSel.disabled = false;
      if (!chunks.length) return;
      const type = r.mimeType || mime;
      const blob = new Blob(chunks, { type });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${trackName || 'visual'}-${scenes[sceneIdx].id}.${type.includes('mp4') ? 'mp4' : 'webm'}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      toast('Video salvato');
    };
    r.start(500);
    rec = r;
    $('#recBtn').classList.add('on');
    if (!player.playing) {
      player.play();
      syncPlay();
    }
    recSel.disabled = true;
    toast(`Registrazione ${fmt.label}… premi di nuovo per fermare`);
  }
  $('#recBtn').addEventListener('click', toggleRec);

  /* ------------------------------------------------------------ fullscreen */
  function toggleFs() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  }
  $('#fsBtn').addEventListener('click', toggleFs);

  /* ------------------------------------------------------------ tastiera */
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === ' ') {
      e.preventDefault();
      togglePlay();
    } else if (k >= '1' && k <= String(scenes.length)) setScene(+k - 1, true);
    else if (k === 'arrowright') player.buffer && player.seek(player.time + 5);
    else if (k === 'arrowleft') player.buffer && player.seek(player.time - 5);
    else if (k === 'p') {
      setPalette(palIdx + 1);
      toast('Palette: ' + VV.PALETTES[palIdx].name);
    } else if (k === 'a') $('#autoBtn').click();
    else if (k === 'h') toggleHud();
    else if (k === 'f') toggleFs();
    else if (k === 'r') toggleRec();
    else if (k === 'o') $('#file2').click();
    else return;
    poke();
  });

  /* ------------------------------------------------------------ UI che si nasconde */
  let idleTimer = 0;
  function poke() {
    body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (player.playing && !$('#controls').matches(':hover')) body.classList.add('idle');
    }, 2600);
  }
  ['pointermove', 'pointerdown', 'touchstart'].forEach((ev) => window.addEventListener(ev, poke, { passive: true }));

  let toastTimer = 0;
  function toast(msg, isError) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('error', !!isError);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), isError ? 5000 : 1800);
  }

  /* ------------------------------------------------------------ loop */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    S.dt = dt;
    S.time += dt;

    const t = player.ctx && player.buffer ? player.ctx.currentTime : S.time;
    const f = features.update(dt, t, sens);

    // Modalità auto: dopo ~20 s cambia scena sul primo beat forte.
    if (auto && player.playing) {
      autoClock += dt;
      if (autoClock > 20 && f.onset && f.onsetStrength > 0.5) setScene(sceneIdx + 1, false);
    }

    scenes[sceneIdx].draw(g, f, S);
    updateHud(f, dt);

    if (player.buffer && !seeking) {
      seek.value = player.duration ? Math.round((player.time / player.duration) * 1000) : 0;
      paintRange(seek);
      $('#cur').textContent = fmt(player.time);
    }
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------ app installabile */
  // Su iPhone il Web Audio segue il tasto silenzioso: così suona anche in modalità silenziosa.
  if (navigator.audioSession) navigator.audioSession.type = 'playback';

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  // File aperti con "Apri con…" quando l'app è installata (Chrome/Edge desktop).
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async (params) => {
      if (params.files && params.files.length) loadFile(await params.files[0].getFile());
    });
  }

  const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone;
  const installBtn = $('#installBtn');
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    installBtn.hidden = false;
  });
  installBtn.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installBtn.hidden = true;
  });
  window.addEventListener('appinstalled', () => {
    installBtn.hidden = true;
    toast('App installata');
  });
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIos && !standalone && location.protocol.startsWith('http')) $('#iosHint').hidden = false;

  // Dove lo schermo intero non esiste (iPhone) il pulsante non serve.
  if (!document.fullscreenEnabled) $('#fsBtn').hidden = true;

  window.addEventListener('resize', resize);
  setPalette(0);
  setScene(0, false);
  // Su schermi stretti il pannello di analisi coprirebbe il visual: parte chiuso.
  if (window.innerWidth < 640) hud.hidden = true;
  hudBtn.classList.toggle('on', !hud.hidden);
  resize();
  requestAnimationFrame(frame);
})();
