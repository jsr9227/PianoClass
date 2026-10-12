// Interfaz: biblioteca de partituras, pantalla de práctica y progreso guardado.
(function (root) {
  const PC = root.PC;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  // ── Progreso (localStorage) ──
  const STORE_KEY = 'pianoclass.progress.v1';
  const PREFS_KEY = 'pianoclass.prefs.v1';
  const load = (k, def) => {
    try {
      return JSON.parse(localStorage.getItem(k)) || def;
    } catch (e) {
      return def;
    }
  };
  const save = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {
      /* almacenamiento no disponible */
    }
  };
  let progress = load(STORE_KEY, {});
  const prefs = Object.assign({ labels: true, falling: true, sound: true, accompany: true, metronome: false, tipClosed: {} }, load(PREFS_KEY, {}));
  const savePrefs = () => save(PREFS_KEY, prefs);

  const starsFor = (acc) => (acc >= 95 ? 3 : acc >= 80 ? 2 : acc >= 50 ? 1 : 0);
  const starsHtml = (n, max = 3) => Array.from({ length: max }, (_, i) => `<span class="star${i < n ? ' on' : ''}">★</span>`).join('');
  const LEVELS = ['', 'Principiante', 'Fácil', 'Intermedio', 'Avanzado'];

  // ── Biblioteca ──
  const FILTERS = [
    { id: 'all', label: 'Todo', test: () => true },
    { id: 'course', label: 'Curso', test: (s) => s.course },
    { id: 'Popular', label: 'Popular', test: (s) => s.category === 'Popular' },
    { id: 'Clásica', label: 'Clásica', test: (s) => s.category === 'Clásica' },
    { id: 'lvl1', label: 'Principiante', test: (s) => s.level === 1 },
    { id: 'lvl3', label: 'Intermedio', test: (s) => s.level >= 3 },
  ];
  let filter = 'all';

  function renderLibrary() {
    $('#filters').innerHTML = FILTERS.map((f) => `<button class="chip${f.id === filter ? ' active' : ''}" data-filter="${f.id}">${f.label}</button>`).join('');
    const q = $('#search').value.trim().toLowerCase();
    const f = FILTERS.find((x) => x.id === filter);
    const list = PC.songs.filter((s) => f.test(s) && (!q || (s.title + ' ' + s.composer).toLowerCase().includes(q)));
    $('#song-grid').innerHTML =
      list
        .map((s) => {
          const p = progress[s.id];
          const hands = [s.lh && 'Izq.', s.rh && 'Der.'].filter(Boolean).join(' + ');
          return `<button class="card${s.course ? ' course' : ''}" data-song="${s.id}">
            <div class="card-art" data-cat="${s.course ? 'Curso' : s.category}">${s.course ? s.lesson : s.category === 'Clásica' ? '𝄞' : '♫'}</div>
            <div class="card-body">
              <div class="card-title">${s.title}</div>
              <div class="card-sub">${s.composer}</div>
              <div class="card-meta">
                <span class="level l${s.level}" title="Nivel">${'●'.repeat(s.level)}${'○'.repeat(4 - s.level)} ${LEVELS[s.level]}</span>
                <span class="hands-tag">${hands}</span>
              </div>
            </div>
            <div class="card-stars">${starsHtml(p ? p.stars : 0)}${p ? `<small>${p.best}%</small>` : ''}</div>
          </button>`;
        })
        .join('') || '<p class="empty">No hay partituras que coincidan.</p>';

    const done = PC.songs.filter((s) => progress[s.id] && progress[s.id].stars > 0).length;
    const stars = Object.values(progress).reduce((a, p) => a + (p.stars || 0), 0);
    $('#stats-line').textContent = `${PC.songs.length} partituras · ${done} completadas · ${stars} de ${PC.songs.length * 3} estrellas`;

    const next = PC.songs.find((s) => s.course && !(progress[s.id] && progress[s.id].stars > 0)) || PC.songs.find((s) => !(progress[s.id] && progress[s.id].stars > 0));
    $('#continue-card').innerHTML = next
      ? `<div class="hero-label">${next.course ? 'Siguiente lección' : 'Siguiente reto'}</div>
         <div class="hero-title">${next.title}</div>
         <div class="hero-sub">${next.composer}</div>
         <button class="btn primary" data-song="${next.id}">Empezar ▶</button>`
      : `<div class="hero-label">¡Enhorabuena!</div><div class="hero-title">Has completado todas las partituras</div><div class="hero-sub">Intenta conseguir 3 estrellas en todas.</div>`;
  }

  $('#filters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    filter = b.dataset.filter;
    renderLibrary();
  });
  $('#search').addEventListener('input', renderLibrary);
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-song]');
    if (b && $('#library').classList.contains('active')) openSong(b.dataset.song);
  });

  function showView(id) {
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === id));
  }

  // ── Práctica ──
  const sheet = new PC.Sheet($('#sheet'));
  const keyboard = new PC.Keyboard($('#keyboard'));
  const waterfall = new PC.Waterfall($('#waterfall'), keyboard);
  let current = null;
  let compiled = null;

  const player = new PC.Player({
    onNoteState: (n, st) => sheet.setNoteState(n.id, st),
    onWrong: () => {
      const c = $('.sheet-cursor');
      if (!c) return;
      c.classList.remove('shake');
      void c.offsetWidth;
      c.classList.add('shake');
    },
    onLoop: (stats) => stats.accuracy != null && toast(`Vuelta completada · precisión ${stats.accuracy}%`),
    onFinish: (stats) => finish(stats),
    onState: () => updateControls(),
  });

  function openSong(id) {
    current = PC.songs.find((s) => s.id === id);
    if (!current) return;
    compiled = PC.music.compileSong(current);
    if (compiled.errors.length) console.warn('Errores en la partitura', compiled.errors);
    $('#song-title').textContent = current.title;
    $('#song-composer').textContent = current.composer;
    $('#tip-text').textContent = current.tip || '';
    $('#tip').hidden = !current.tip || prefs.tipClosed[current.id];
    showView('practice');

    // Rango del teclado: las notas de la pieza con margen y al menos dos octavas
    const midis = compiled.notes.map((n) => n.midi);
    let lo = Math.min(...midis) - 2;
    let hi = Math.max(...midis) + 2;
    lo = lo - (((lo % 12) + 12) % 12); // bajar hasta un Do
    hi = hi + (11 - (hi % 12)); // subir hasta un Si
    while (hi - lo < 35) {
      if (lo > 36) lo -= 12;
      if (hi - lo < 35) hi += 12;
    }
    keyboard.setRange(Math.max(21, lo), Math.min(108, hi));
    keyboard.setLabels(prefs.labels);

    sheet.render(compiled);
    sheet.onSeek = (beat) => {
      const wasPlaying = player.playing;
      player.seek(beat);
      if (wasPlaying && player.settings.mode !== 'wait') player.pause();
    };
    $('#sheet').classList.toggle('show-names', prefs.labels);

    // Opciones de manos disponibles
    const hasR = !!current.rh;
    const hasL = !!current.lh;
    $$('#hands button').forEach((b) => (b.disabled = (b.dataset.value === 'L' && !hasL) || (b.dataset.value === 'R' && !hasR) || (b.dataset.value === 'both' && !(hasL && hasR))));
    const hands = { R: hasR, L: hasL };

    const opts = $$('#loop-from option, #loop-to option');
    opts.forEach((o) => o.remove());
    compiled.measures.forEach((m, i) => {
      $('#loop-from').add(new Option(i + 1, i));
      $('#loop-to').add(new Option(i + 1, i));
    });

    player.settings.loop = null;
    player.settings.tempo = 1;
    $('#tempo').value = 100;
    player.load(compiled);
    player.set({ hands, metronome: prefs.metronome, accompany: prefs.accompany });
    player.restart();
    sheet.setLoop(null);
    requestAnimationFrame(() => waterfall.resize());
    updateControls();
  }

  function updateControls() {
    if (!compiled) return;
    const s = player.settings;
    $('#play').textContent = player.playing ? '❚❚' : '▶';
    $('#play').setAttribute('aria-label', player.playing ? 'Pausa' : 'Reproducir');
    $$('#mode button').forEach((b) => b.classList.toggle('active', b.dataset.value === s.mode));
    const handVal = s.hands.R && s.hands.L ? 'both' : s.hands.R ? 'R' : 'L';
    $$('#hands button').forEach((b) => b.classList.toggle('active', b.dataset.value === handVal));
    $('#tempo-value').textContent = Math.round(s.tempo * 100) + '%';
    $('#bpm').textContent = `♩ = ${Math.round(compiled.bpm * s.tempo)}`;
    $('#loop-toggle').classList.toggle('on', !!s.loop);
    $('#loop-range').hidden = !s.loop;
    if (s.loop) {
      $('#loop-from').value = s.loop[0];
      $('#loop-to').value = s.loop[1];
    }
    $('#metronome').classList.toggle('on', s.metronome);
    $('#accompany').classList.toggle('on', s.accompany);
    $('#accompany').disabled = !(current.rh && current.lh);
    $('#labels').classList.toggle('on', prefs.labels);
    $('#falling').classList.toggle('on', prefs.falling);
    $('#sound').classList.toggle('on', prefs.sound);
    $('#sound').textContent = prefs.sound ? '🔊' : '🔇';
    $('#falling-wrap').classList.toggle('collapsed', !prefs.falling);
  }

  // Controles
  $('#back').addEventListener('click', () => {
    player.pause();
    showView('library');
    renderLibrary();
  });
  $('#play').addEventListener('click', () => player.toggle());
  $('#restart').addEventListener('click', () => player.restart());
  $('#mode').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    player.pause();
    player.set({ mode: b.dataset.value });
  });
  $('#hands').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const v = b.dataset.value;
    player.set({ hands: { R: v !== 'L', L: v !== 'R' } });
  });
  $('#tempo').addEventListener('input', (e) => player.set({ tempo: Number(e.target.value) / 100 }));
  $('#loop-toggle').addEventListener('click', () => {
    if (player.settings.loop) {
      player.set({ loop: null });
      sheet.setLoop(null);
      return;
    }
    const m = compiled.measureAt(player.pos);
    const loop = [m, Math.min(m + 1, compiled.measures.length - 1)];
    player.set({ loop });
    applyLoopRect();
  });
  const onLoopSelect = () => {
    let a = Number($('#loop-from').value);
    let b = Number($('#loop-to').value);
    if (b < a) [a, b] = [b, a];
    player.set({ loop: [a, b] });
    applyLoopRect();
  };
  $('#loop-from').addEventListener('change', onLoopSelect);
  $('#loop-to').addEventListener('change', onLoopSelect);
  function applyLoopRect() {
    const l = player.settings.loop;
    if (!l) return sheet.setLoop(null);
    sheet.setLoop(compiled.measures[l[0]].start, compiled.measures[l[1]].start + compiled.measures[l[1]].len);
  }
  $('#metronome').addEventListener('click', () => {
    prefs.metronome = !player.settings.metronome;
    savePrefs();
    player.set({ metronome: prefs.metronome });
  });
  $('#accompany').addEventListener('click', () => {
    prefs.accompany = !player.settings.accompany;
    savePrefs();
    player.set({ accompany: prefs.accompany });
  });
  $('#labels').addEventListener('click', () => {
    prefs.labels = !prefs.labels;
    savePrefs();
    keyboard.setLabels(prefs.labels);
    $('#sheet').classList.toggle('show-names', prefs.labels);
    updateControls();
  });
  $('#falling').addEventListener('click', () => {
    prefs.falling = !prefs.falling;
    savePrefs();
    updateControls();
    requestAnimationFrame(() => waterfall.resize());
  });
  $('#sound').addEventListener('click', () => {
    prefs.sound = !prefs.sound;
    PC.audio.enabled = prefs.sound;
    savePrefs();
    updateControls();
  });
  $('#mic').addEventListener('click', () => PC.input.toggleMic());
  $('#tip-close').addEventListener('click', () => {
    $('#tip').hidden = true;
    prefs.tipClosed[current.id] = true;
    savePrefs();
  });

  // Atajos de teclado
  root.addEventListener('keydown', (e) => {
    if (!$('#practice').classList.contains('active') || $('dialog[open]')) return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName) && e.code !== 'Space') return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      player.toggle();
    } else if (e.code === 'Home') {
      player.restart();
    } else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
      const m = compiled.measureAt(player.pos) + (e.code === 'ArrowRight' ? 1 : -1);
      if (m >= 0 && m < compiled.measures.length) player.seek(compiled.measures[m].start);
    } else if (e.code === 'Escape') {
      $('#back').click();
    }
  });

  // ── Entrada de notas ──
  PC.input.on('on', (midi, vel, source) => {
    if (source !== 'mic') PC.audio.noteOn(midi, vel);
    if (!$('#practice').classList.contains('active')) return;
    // En modo Esperar, tocar la nota resaltada arranca la canción
    if (!player.playing && player.settings.mode === 'wait' && player.remaining.has(midi)) player.play();
    const result = player.noteOn(midi);
    keyboard.press(midi, result === 'ok' ? 'ok' : result === 'wrong' ? 'wrong' : null);
  });
  PC.input.on('off', (midi, source) => {
    if (source !== 'mic') PC.audio.noteOff(midi);
    player.noteOff(midi);
    keyboard.release(midi);
  });
  PC.input.on('status', (st) => {
    let txt = '';
    let cls = '';
    if (st.midi === 'connected') {
      txt = '🎹 ' + st.midiNames[0];
      cls = 'ok';
    } else if (st.mic === 'on') {
      txt = '🎤 Micrófono activo';
      cls = 'ok';
    } else if (st.midi === 'none') txt = '🎹 Sin teclado MIDI';
    if (st.mic === 'denied') txt = '🎤 Permiso de micrófono denegado';
    $$('[data-device-status]').forEach((el) => {
      el.textContent = txt;
      el.className = 'device-status ' + cls;
    });
    $('#mic').classList.toggle('on', st.mic === 'on');
  });

  // ── Bucle de animación ──
  let last = performance.now();
  const css = getComputedStyle(document.documentElement);
  const colors = () => ({
    R: css.getPropertyValue('--right').trim(),
    L: css.getPropertyValue('--left').trim(),
    hit: css.getPropertyValue('--ok').trim(),
    miss: css.getPropertyValue('--bad').trim(),
    grid: css.getPropertyValue('--grid').trim(),
  });
  let palette = colors();
  root.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => (palette = colors()));

  function frame(now) {
    const dt = (now - last) / 1000;
    last = now;
    if (compiled && $('#practice').classList.contains('active')) {
      player.tick(dt);
      sheet.setPosition(player.pos);
      if (prefs.falling) waterfall.draw(compiled, player.pos, player.settings.hands, player.statuses, palette);
      keyboard.setExpected(player.expectedKeys());
      $('#wait-hint').hidden = !(player.waiting && player.stats.hits === 0);
      const ci = $('#count-in');
      if (player.countIn > 0) {
        ci.hidden = false;
        ci.textContent = Math.min(player.countIn, Math.max(1, player.countInClicks));
      } else ci.hidden = true;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  root.addEventListener('resize', () => waterfall.resize());

  // ── Resultados ──
  function finish(stats) {
    if (stats.mode === 'listen') return;
    const stars = starsFor(stats.accuracy);
    const prev = progress[current.id] || { best: 0, stars: 0, plays: 0 };
    const fullSong = player.settings.hands.R === !!current.rh && player.settings.hands.L === !!current.lh;
    // Solo cuenta para el progreso si se toca con todas las manos de la pieza
    if (fullSong) {
      progress[current.id] = { best: Math.max(prev.best, stats.accuracy), stars: Math.max(prev.stars, stars), plays: prev.plays + 1, last: Date.now() };
      save(STORE_KEY, progress);
    }
    $('#results-title').textContent = stars === 3 ? '¡Perfecto!' : stars === 2 ? '¡Muy bien!' : stars === 1 ? '¡Bien hecho!' : 'Sigue practicando';
    $('#results-stars').innerHTML = starsHtml(stars);
    $('#r-accuracy').textContent = stats.accuracy + '%';
    $('#r-hits').textContent = `${stats.hits}/${stats.total}`;
    $('#r-wrong').textContent = stats.wrong + stats.misses;
    $('#results-msg').textContent = !fullSong
      ? 'Practicando una sola mano. Toca con ambas manos para ganar estrellas.'
      : stars < 3
        ? stats.mode === 'wait'
          ? 'Consejo: intenta no pulsar teclas equivocadas. Cuando te salga, prueba el modo Tiempo real.'
          : 'Consejo: baja el tempo o usa el bucle en los compases difíciles.'
        : stats.mode === 'wait'
          ? '¡Ya la dominas! Prueba ahora el modo Tiempo real.'
          : '¡Increíble! Sube el tempo para un nuevo reto.';
    const idx = PC.songs.indexOf(current);
    const next = PC.songs[idx + 1];
    $('#r-next').hidden = !(current.course && next);
    $('#r-next').textContent = next && next.course ? 'Siguiente lección →' : 'Siguiente →';
    $('#results').showModal();
  }
  $('#r-again').addEventListener('click', () => {
    $('#results').close();
    player.restart();
    player.play();
  });
  $('#r-library').addEventListener('click', () => {
    $('#results').close();
    $('#back').click();
  });
  $('#r-next').addEventListener('click', () => {
    $('#results').close();
    const next = PC.songs[PC.songs.indexOf(current) + 1];
    if (next) openSong(next.id);
  });

  // ── Ayuda y avisos ──
  $$('[data-open-help]').forEach((b) => b.addEventListener('click', () => $('#help').showModal()));
  $$('dialog [data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2200);
  }

  // ── Inicio ──
  PC.audio.enabled = prefs.sound;
  PC.input.initKeyboard();
  PC.input.initMidi();
  renderLibrary();
  PC.app = { player, sheet, keyboard, openSong };
  // Permite abrir una pieza directamente: index.html#para-elisa
  if (location.hash.length > 1) openSong(decodeURIComponent(location.hash.slice(1)));
})(window);
