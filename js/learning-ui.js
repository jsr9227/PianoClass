// Interfaz del sistema de aprendizaje: «Hoy», «Mi ruta», «Armonía», «Progreso», ejecución de sesiones,
// entrenamiento auditivo y feedback. Toda la lógica pedagógica vive en js/learning/engine.js.
(function (root) {
  const PC = root.PC;
  const E = PC.engine;
  const CUR = PC.curriculum;
  const T = PC.theory;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)} %`);
  const DAY = E.DAY;

  // ── Datos (localStorage, con migración de los datos antiguos sin modificarlos) ──
  const KEY = 'pianoclass.learning.v1';
  const read = (k, def) => {
    try {
      return JSON.parse(localStorage.getItem(k)) || def;
    } catch (e) {
      return def;
    }
  };
  let store = E.migrate(read(KEY, null), read('pianoclass.progress.v1', {}));
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch (e) {
      /* sin almacenamiento: el progreso dura lo que la página */
    }
  };
  save();

  const skillName = (id) => (CUR.SKILL[id] ? CUR.SKILL[id].name : id);
  const statusBadge = (st) => `<span class="badge st-${st}">${E.STATUS[st].label}</span>`;
  const pathId = () => (store.profile && store.profile.pathId) || 'cero';
  const minutes = () => (store.profile && store.profile.minutes) || 30;
  const fmtDate = (t) => new Date(t).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

  // ── Pestañas ──
  let tab = 'hoy';
  function showTab(t) {
    tab = t;
    $$('#tabs [data-tab]').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === t);
      b.setAttribute('aria-selected', b.dataset.tab === t);
    });
    $$('.tab-panel').forEach((p) => (p.hidden = p.dataset.panel !== t));
    if (t === 'hoy') renderHoy();
    if (t === 'ruta') renderRuta();
    if (t === 'progreso') renderProgreso();
    if (t === 'armonia') renderArmonia();
    if (t === 'canciones') PC.app.renderLibrary();
  }
  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) showTab(b.dataset.tab);
  });
  function backToLibrary() {
    PC.app.showView('library');
    showTab(tab);
  }

  // ── Hoy ──
  let plan = null;
  function renderHoy() {
    const el = $('#panel-hoy');
    if (!store.profile) {
      el.innerHTML = `
        <section class="intro">
          <h1>¿Qué quieres aprender?</h1>
          <p>Elige un objetivo. Puedes cambiarlo cuando quieras sin perder lo que ya has aprendido.</p>
          <div class="path-cards">${CUR.PATHS.map((p) => `<button class="path-card" data-pick-path="${p.id}"><span class="path-icon">${p.icon}</span><b>${esc(p.name)}</b><span>${esc(p.desc)}</span></button>`).join('')}</div>
          <h3>¿Cuánto tiempo al día?</h3>
          <div class="segmented" id="pick-minutes">${[15, 30, 60].map((m) => `<button data-min="${m}" class="${m === 30 ? 'active' : ''}">${m} min</button>`).join('')}</div>
        </section>`;
      return;
    }
    const now = Date.now();
    if (!plan || plan.minutes !== minutes() || plan.pathId !== pathId()) plan = E.planSession(store, { minutes: minutes(), pathId: pathId(), now, seed: now % 100000 });
    const recs = E.recommendations(store, pathId(), now);
    const cur = E.currentModule(store, pathId(), now);
    const last = store.sessions[store.sessions.length - 1];
    const total = plan.blocks.reduce((a, b) => a + b.items.reduce((x, i) => x + i.rounds, 0), 0);
    el.innerHTML = `
      <section class="today-head">
        <div>
          <div class="eyebrow">${esc(CUR.PATH[pathId()].icon + ' ' + CUR.PATH[pathId()].name)}${cur ? ` · Módulo: ${esc(cur.module.title)}` : ''}</div>
          <h1>Mi sesión de hoy</h1>
          <p>${cur ? esc(cur.module.goal) : ''}</p>
        </div>
        <div class="today-actions">
          <div class="segmented" id="session-minutes">${[15, 30, 60].map((m) => `<button data-min="${m}" class="${m === minutes() ? 'active' : ''}">${m} min</button>`).join('')}</div>
          <button class="btn primary big" id="start-session">Empezar sesión ▶</button>
          <small>${total} ejercicios · ${plan.minutes} min</small>
        </div>
      </section>
      ${plan.notes.length ? `<div class="note-box">${plan.notes.map((n) => `<p>ℹ️ ${esc(n)}</p>`).join('')}</div>` : ''}
      <ol class="session-blocks">${plan.blocks
        .map(
          (b) => `<li class="block">
          <div class="block-head"><span class="block-icon">${b.icon}</span><b>${esc(b.label)}</b><span class="block-min">${b.minutes} min</span></div>
          <ul>${b.items
            .map((it) => `<li><span class="item-name">${esc(skillName(it.skillId))}${it.rounds > 1 ? ` <small>×${it.rounds}</small>` : ''}</span>${statusBadge(it.status)}<span class="item-why">${esc(it.reason)}</span></li>`)
            .join('')}</ul></li>`
        )
        .join('')}</ol>
      <div class="two-col">
        <section class="panel-card"><h2>Qué practicar a continuación</h2>${recs.length ? `<ul class="recs">${recs.map((r) => `<li><button class="link" data-practice="${r.skillId}">${esc(r.text)}</button><small>${esc(r.why)}</small></li>`).join('')}</ul>` : '<p class="muted">Empieza tu primera sesión y aquí verás recomendaciones.</p>'}</section>
        <section class="panel-card"><h2>Última sesión</h2>${last ? sessionSummaryHtml(last) : '<p class="muted">Todavía no has hecho ninguna sesión.</p>'}</section>
      </div>`;
  }
  function sessionSummaryHtml(s) {
    const passed = s.items.filter((i) => i.pass).length;
    return `<p><b>${fmtDate(s.date)}</b> · ${Math.round(s.practicedMinutes || 0)} min · ${s.items.length} ejercicios · ${passed} superados</p>
      <ul class="mini-list">${s.items.slice(-6).map((i) => `<li>${i.pass ? '✓' : '·'} ${esc(skillName(i.skillId))}</li>`).join('')}</ul>`;
  }

  document.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-pick-path]');
    if (pick) {
      const m = Number(($('#pick-minutes .active') || {}).dataset ? $('#pick-minutes .active').dataset.min : 30);
      store.profile = { pathId: pick.dataset.pickPath, minutes: m || 30, createdAt: Date.now() };
      save();
      plan = null;
      renderHoy();
      return;
    }
    const min = e.target.closest('#pick-minutes [data-min], #session-minutes [data-min]');
    if (min) {
      min.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === min));
      if (store.profile && min.closest('#session-minutes')) {
        store.profile.minutes = Number(min.dataset.min);
        save();
        plan = null;
        renderHoy();
      }
      return;
    }
    if (e.target.closest('#start-session')) startSession(plan);
    const pr = e.target.closest('[data-practice]');
    if (pr) startSession({ minutes: 4, single: true, blocks: [{ block: 'single', label: 'Práctica', items: [{ skillId: pr.dataset.practice, rounds: 1, minutes: 4, reason: 'Elegido por ti.', seed: Date.now() % 100000, status: E.status(store.skills[pr.dataset.practice], Date.now()) }] }] });
    const sw = e.target.closest('[data-switch-path]');
    if (sw) {
      store.profile = { ...(store.profile || { minutes: 30 }), pathId: sw.dataset.switchPath };
      save();
      plan = null;
      renderRuta();
      PC.app.toast(`Itinerario: ${CUR.PATH[sw.dataset.switchPath].name}. Tu progreso se conserva.`);
    }
  });

  // ── Mi ruta ──
  function renderRuta() {
    const el = $('#panel-ruta');
    const now = Date.now();
    const mods = E.moduleInfo(store, pathId(), now);
    el.innerHTML = `
      <section class="panel-card">
        <h2>Itinerario</h2>
        <div class="path-switch">${CUR.PATHS.map((p) => `<button class="chip${p.id === pathId() ? ' active' : ''}" data-switch-path="${p.id}">${p.icon} ${esc(p.name)}</button>`).join('')}</div>
        <p class="muted">${esc(CUR.PATH[pathId()].desc)} Programa inicial orientativo de 12 semanas: el ritmo real depende de tu progreso. Las habilidades se comparten entre itinerarios, así que cambiar no borra nada.</p>
      </section>
      <ol class="route">${mods
        .map((m, i) => {
          const state = m.done ? 'done' : m.unlocked ? 'open' : 'locked';
          return `<li class="module ${state}">
            <div class="module-dot">${m.done ? '✓' : i + 1}</div>
            <div class="module-body">
              <div class="module-head"><b>${esc(m.module.title)}</b><span class="muted">Semanas ${m.module.weeks.join('–')} (orientativo)</span></div>
              <p>${esc(m.module.goal)}</p>
              <div class="progress"><span style="width:${Math.round(m.progress * 100)}%"></span></div>
              <ul class="skill-list">${m.skills
                .map((s) => `<li>${statusBadge(s.status)} <span>${esc(skillName(s.id))}</span>${m.unlocked ? `<button class="btn small" data-practice="${s.id}">Practicar</button>` : ''}<small class="muted">${esc(CUR.SKILL[s.id].why)}</small></li>`)
                .join('')}</ul>
              <p class="criteria">${m.unlocked ? esc(m.module.criteria) : '🔒 Se abre cuando superes al menos una vez cada habilidad del módulo anterior.'}</p>
            </div></li>`;
        })
        .join('')}</ol>`;
  }

  // ── Progreso ──
  function renderProgreso() {
    const el = $('#panel-progreso');
    const now = Date.now();
    const ev = E.evaluationMetrics(store);
    const cal = E.reviewCalendar(store, now, 14);
    const started = Object.keys(store.skills).filter((id) => CUR.SKILL[id] && store.skills[id].attempts);
    const domains = Object.entries(CUR.DOMAINS)
      .map(([d, info]) => {
        const skills = CUR.SKILLS.filter((s) => s.domain === d && started.includes(s.id));
        if (!skills.length) return '';
        return `<section class="panel-card"><h3>${esc(info.name)}</h3><table class="mastery"><tbody>${skills
          .map((s) => {
            const st = store.skills[s.id];
            const lastH = st.history[st.history.length - 1] || { dims: {} };
            const dims = Object.entries(DIM_LABELS).filter(([k]) => lastH.dims && lastH.dims[k] != null && lastH.dims[k] <= 1);
            const trend = st.history.slice(-6).map((h) => (h.pass ? '●' : '○')).join('');
            const stage = s.kind === 'play' ? E.describeRung(E.ladder(s)[Math.min(st.rung, E.ladder(s).length - 1)]) : s.kind === 'ear' ? `nivel ${st.earLevel}` : st.improvAid === 1 ? 'con ayudas' : 'sin ayudas';
            return `<tr><td><b>${esc(s.name)}</b><br><small class="muted">Etapa: ${esc(stage)}</small></td>
              <td>${statusBadge(E.status(st, now))}</td>
              <td class="dims">${dims.map(([k, label]) => `<span class="dim" title="${label}"><i style="width:${Math.round(lastH.dims[k] * 100)}%"></i><em>${label} ${pct(lastH.dims[k])}</em></span>`).join('')}</td>
              <td><span class="trend" title="Últimos intentos (● superado)">${trend}</span><br><small class="muted">${st.attempts} intentos</small></td>
              <td><small>${st.srs ? `Repaso: ${st.srs.due <= now ? '<b>hoy</b>' : fmtDate(st.srs.due)}` : st.consolidated ? '' : 'Sin consolidar'}</small></td></tr>`;
          })
          .join('')}</tbody></table></section>`;
      })
      .join('');
    el.innerHTML = `
      <div class="two-col">
        <section class="panel-card"><h2>Calendario de repasos</h2>
          <div class="calendar">${cal.map((d, i) => `<div class="cal-day${d.skills.length ? ' has' : ''}" title="${esc(d.skills.map(skillName).join(', '))}"><small>${i === 0 ? 'Hoy' : new Date(d.day).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}</small><b>${d.skills.length || ''}</b></div>`).join('')}</div>
          <p class="muted">Los intervalos entre repasos crecen cuando aciertas y se acortan si fallas. Son configurables: no hay unos intervalos «óptimos» demostrados.</p>
        </section>
        <section class="panel-card"><h2>Historial de práctica</h2>${store.sessions.length ? `<ul class="history">${store.sessions.slice(-8).reverse().map((s) => `<li>${sessionSummaryHtml(s)}</li>`).join('')}</ul>` : '<p class="muted">Aún no hay sesiones.</p>'}</section>
      </div>
      ${domains || '<section class="panel-card"><p class="muted">Cuando practiques, aquí verás el dominio de cada habilidad por separado: notas, ritmo, fluidez, sincronía…</p></section>'}
      <section class="panel-card"><h2>Indicadores para evaluar el método</h2>
        <p class="muted">Sirven para comprobar con tus propios datos si el sistema te ayuda. No son promesas de eficacia.</p>
        <ul class="metrics-list">
          <li><b>Retención</b> (repasos superados tras el intervalo): ${ev.retention ? `${pct(ev.retention.rate)} de ${ev.retention.n}` : 'sin datos aún'}</li>
          <li><b>Transferencia</b> (precisión en material nuevo: lectura a primera vista, transposición): ${ev.transfer ? `${pct(ev.transfer.mean)} en ${ev.transfer.n} intentos` : 'sin datos aún'}</li>
          <li><b>Primer intento</b> (precisión la primera vez que ves un ejercicio): ${ev.firstAttemptAccuracy ? `${pct(ev.firstAttemptAccuracy.mean)} en ${ev.firstAttemptAccuracy.n}` : 'sin datos aún'}</li>
          <li><b>Progresión</b>: ${ev.consolidated} habilidades consolidadas${ev.daysToConsolidate ? `, ${ev.daysToConsolidate.mean.toFixed(1)} días de media para consolidar` : ''} · ${ev.attempts} intentos registrados</li>
        </ul>
      </section>`;
  }
  const DIM_LABELS = { accuracy: 'Notas', rhythm: 'Ritmo', tempo: 'Tempo', fluency: 'Fluidez', sync: 'Sincronía', chords: 'Acordes', duration: 'Duración', ear: 'Aciertos', inScale: 'En escala', chordTones: 'Notas del acorde' };

  // ── Armonía: progresiones, acompañamiento e improvisación (práctica libre) ──
  const harmony = { progId: 'I-V-vi-IV', tonic: 0, pattern: 'balada', bpm: 76 };
  function harmonySong() {
    const p = T.PROGRESSIONS.find((x) => x.id === harmony.progId);
    const tonic = p.mode === 'phrygian' && harmony.tonic === 0 ? 4 : p.mode === 'minor' && harmony.tonic === 0 ? 9 : harmony.tonic;
    return { song: { ...T.progressionSong({ romans: p.romans, key: { tonic, mode: p.mode }, pattern: harmony.pattern, bpm: harmony.bpm, repeats: 2 }) }, key: { tonic, mode: p.mode }, p };
  }
  function renderArmonia() {
    const el = $('#panel-armonia');
    const { key, p } = harmonySong();
    const chords = p.romans.map((r) => T.parseRoman(r, key));
    const tonics = Array.from({ length: 12 }, (_, i) => i);
    el.innerHTML = `
      <section class="panel-card harmony">
        <h2>Armonía y acompañamiento</h2>
        <div class="harmony-controls">
          <label>Progresión <select id="h-prog">${T.PROGRESSIONS.map((x) => `<option value="${x.id}"${x.id === harmony.progId ? ' selected' : ''}>${esc(x.label)} · ${x.style}</option>`).join('')}</select></label>
          <label>Tonalidad <select id="h-key">${tonics.map((t) => `<option value="${t}"${t === key.tonic ? ' selected' : ''}>${esc(T.keyName({ tonic: t, mode: p.mode }))}</option>`).join('')}</select></label>
          <label>Patrón <select id="h-pattern">${Object.entries(T.PATTERNS).map(([k, v]) => `<option value="${k}"${k === harmony.pattern ? ' selected' : ''}>${esc(v.label)}</option>`).join('')}</select></label>
          <label>Tempo <input type="number" id="h-bpm" min="40" max="160" step="4" value="${harmony.bpm}"> ♩/min</label>
        </div>
        <div class="chord-row">${chords.map((c) => `<div class="chord-chip"><b>${esc(c.symbol)}</b><small>${c.roman}</small></div>`).join('')}</div>
        <p>${esc(p.about)}</p>
        ${p.style === 'Flamenco' ? `<p class="note-box">💃 <b>Frigio y flamenco.</b> El modo frigio es como una escala menor con el 2.º grado rebajado (Mi–<b>Fa</b>–Sol–La–Si–Do–Re). En el flamenco se toca sobre el acorde de Mi <b>mayor</b> (con Sol♯), y la tensión Mi–Fa da su color característico. Para improvisar, usa la escala de Mi con Fa y Sol♯ («frigio dominante»).</p>` : ''}
        <div class="harmony-actions">
          <button class="btn" id="h-listen">▶ Escuchar</button>
          <button class="btn primary" id="h-play">🎹 Tocarla</button>
          <button class="btn" id="h-improv">🎶 Improvisar encima</button>
        </div>
        <p class="muted">Práctica libre: no cuenta para tu progreso. Las progresiones de tu itinerario se practican en «Hoy» y «Mi ruta».</p>
      </section>`;
  }
  document.addEventListener('change', (e) => {
    if (!e.target.closest('#panel-armonia')) return;
    if (e.target.id === 'h-prog') {
      harmony.progId = e.target.value;
      harmony.tonic = 0;
    }
    if (e.target.id === 'h-key') harmony.tonic = Number(e.target.value);
    if (e.target.id === 'h-pattern') harmony.pattern = e.target.value;
    if (e.target.id === 'h-bpm') harmony.bpm = Math.max(40, Math.min(160, Number(e.target.value) || 76));
    renderArmonia();
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#panel-armonia')) return;
    const { song, key, p } = harmonySong();
    const free = { onExit: backToLibrary };
    if (e.target.id === 'h-listen') {
      free.onFinish = () => PC.app.toast('Fin de la progresión');
      PC.app.openSong(song, { exercise: free, mode: 'listen', banner: { title: 'Escuchar', stage: p.label, why: p.about } });
      setTimeout(() => PC.app.player.play(), 300);
    }
    if (e.target.id === 'h-play') {
      free.onFinish = (stats) => showFeedback({ free: true, ex: { title: `${p.label} en ${T.keyName(key)}`, kind: 'play' }, metrics: PC.metrics.compute(stats.record) });
      PC.app.openSong(song, { exercise: free, mode: 'wait', banner: { title: 'Tocar la progresión', stage: `${p.label} · ${T.keyName(key)}`, why: 'Pulsa ▶ o la primera nota para empezar.' } });
    }
    if (e.target.id === 'h-improv') {
      const scale = p.mode === 'phrygian' || p.style === 'Flamenco' ? 'phrygian-dominant' : p.mode === 'minor' ? 'pentatonic-minor' : 'pentatonic-major';
      const sKey = p.style === 'Flamenco' && p.mode === 'minor' ? { tonic: T.mod12(key.tonic + 7), mode: 'phrygian' } : key;
      runImprov({ title: 'Improvisación libre', song, key: sKey, scale, aid: 1, free: true });
    }
  });

  // ── Ejecución de sesiones ──
  let run = null;
  function startSession(p) {
    if (!p || !p.blocks.length) return;
    const queue = [];
    p.blocks.forEach((b) => b.items.forEach((it) => {
      for (let r = 0; r < (it.rounds || 1); r++) queue.push({ ...it, round: r, block: b.label });
    }));
    run = { plan: p, queue, idx: 0, results: [], startedAt: Date.now() };
    runCurrent();
  }
  function banner(item, ex) {
    return {
      step: `${run.idx + 1}/${run.queue.length} · ${item.block}`,
      title: ex.title,
      stage: ex.stage ? `Etapa: ${ex.stage}` : '',
      why: `Por qué: ${ex.why}`,
      reason: item.reason,
    };
  }
  function runCurrent() {
    if (!run) return;
    if (run.idx >= run.queue.length) return endSession();
    const item = run.queue[run.idx];
    const ex = E.makeExercise(store, item.skillId, { seed: item.seed + item.round * 31, memory: item.memory, focus: item.round === 0 ? item.focus : null });
    run.current = { item, ex };
    if (ex.kind === 'play') runPlay(item, ex);
    else if (ex.kind === 'ear') runEar(item, ex);
    else runImprov({ title: ex.title, song: ex.song, key: ex.key, scale: ex.scale, aid: ex.aid, item, ex });
  }
  function runPlay(item, ex) {
    const ctx = {
      onFinish: (stats) => {
        const metrics = PC.metrics.compute(stats.record);
        const src = dominantSource(stats.record.sources);
        const res = E.recordAttempt(store, ex.skillId, { kind: 'play', metrics, source: src });
        if (res.pass && ex.segment && !ex.focus) E.advanceSegment(store, ex.skillId);
        afterAttempt(item, ex, res, metrics);
      },
      onExit: () => endSession(true),
    };
    PC.app.openSong(ex.song, { exercise: ctx, mode: ex.mode, tempo: ex.tempo, segment: ex.segment, aid: ex.aid, banner: banner(item, ex) });
    if (ex.memory) PC.app.toast('De memoria: la partitura está oculta. ¡Tú puedes!');
  }
  const dominantSource = (s = {}) => Object.entries(s).sort((a, b) => b[1] - a[1]).map(([k]) => k)[0] || null;

  function afterAttempt(item, ex, res, metrics) {
    run.results.push({ skillId: ex.skillId, pass: res.pass, dims: res.dims, t: Date.now() });
    save();
    plan = null;
    showFeedback({ ex, res, metrics, item });
  }

  function endSession(aborted) {
    if (run && run.results.length) {
      store.sessions.push({ date: run.startedAt, plannedMinutes: run.plan.minutes, practicedMinutes: (Date.now() - run.startedAt) / 60000, items: run.results, aborted: !!aborted });
      if (store.sessions.length > 200) store.sessions.shift();
      save();
      if (!aborted) PC.app.toast(`Sesión completada: ${run.results.filter((r) => r.pass).length} de ${run.results.length} ejercicios superados`);
    }
    run = null;
    plan = null;
    PC.app.expectedOverride = null;
    PC.app.onUserNote = null;
    if ($('#feedback').open) $('#feedback').close();
    PC.app.setAid(1);
    if (PC.app.isExercise()) PC.app.player.pause();
    $('#ear-view').classList.contains('active') && stopEar();
    PC.app.showView('library');
    showTab('hoy');
  }
  $('#ex-skip').addEventListener('click', () => {
    if (!run) return backToLibrary();
    PC.app.player.pause();
    run.idx++;
    runCurrent();
  });

  // ── Feedback contextual ──
  function showFeedback({ ex, res, metrics, free }) {
    const d = metrics ? PC.metrics.diagnose(metrics) : { issues: [], strengths: [] };
    const pass = res ? res.pass : null;
    $('#fb-title').textContent = free ? 'Resultado (práctica libre)' : pass ? '✓ Superado' : 'Todavía no: sigue practicando';
    $('#fb-title').className = free ? '' : pass ? 'ok' : 'warn';
    $('#fb-sub').textContent = ex.title + (ex.stage ? ` · ${ex.stage}` : '');
    const dims = res ? res.dims : metrics ? metrics.dims : {};
    const dimHtml = [];
    if (metrics) {
      if (metrics.accuracy != null) dimHtml.push(['Notas', `${metrics.notes.hits}/${metrics.notes.total}`, metrics.dims.accuracy]);
      if (metrics.timing) dimHtml.push(['Ritmo', `±${Math.round(metrics.timing.meanAbsMs)} ms`, metrics.dims.rhythm]);
      if (metrics.tempo) dimHtml.push(['Tempo', `${Math.round(metrics.tempo.cv * 100)} % de variación`, metrics.dims.tempo]);
      if (metrics.hesitation) dimHtml.push(['Fluidez', `${(metrics.hesitation.meanMs / 1000).toFixed(1)} s de espera media`, metrics.dims.fluency]);
      if (metrics.handSyncMs != null) dimHtml.push(['Sincronía manos', `${Math.round(metrics.handSyncMs)} ms`, metrics.dims.sync]);
      if (metrics.chordSpreadMs != null) dimHtml.push(['Acordes juntos', `${Math.round(metrics.chordSpreadMs)} ms`, metrics.dims.chords]);
      if (metrics.duration) dimHtml.push(['Duración', `${Math.round(metrics.duration.meanError * 100)} % de error`, metrics.dims.duration]);
    } else {
      if (dims.ear != null) dimHtml.push(['Aciertos', pct(dims.ear), dims.ear]);
      if (dims.inScale != null) dimHtml.push(['Notas en la escala', pct(dims.inScale), dims.inScale]);
      if (dims.chordTones != null) dimHtml.push(['Notas del acorde (tiempos fuertes)', pct(dims.chordTones), dims.chordTones]);
      if (dims.notes != null) dimHtml.push(['Notas tocadas', String(dims.notes), Math.min(1, dims.notes / 16)]);
    }
    $('#fb-dims').innerHTML = dimHtml.map(([l, v, x]) => `<div class="fb-dim"><small>${l}</small><b>${v}</b><span class="bar"><i style="width:${Math.round((x || 0) * 100)}%"></i></span></div>`).join('');
    const good = d.strengths.slice();
    if (res && res.pass) res.reasons.forEach((r) => good.push(r));
    $('#fb-good').innerHTML = good.length ? good.map((g) => `<li>${esc(g)}</li>`).join('') : '<li class="muted">—</li>';
    const improve = d.issues.map((i) => `<li><b>${esc(i.text)}</b><br><small>👉 ${esc(i.tip)}</small></li>`);
    if (res && !res.pass) res.reasons.forEach((r) => improve.push(`<li>${esc(r)}</li>`));
    $('#fb-improve').innerHTML = improve.length ? improve.join('') : '<li class="muted">Nada destacable. ¡Bien!</li>';
    $('#fb-decision').innerHTML = res ? res.decisions.map((x) => `<p>➜ ${esc(x)}</p>`).join('') + (res.statusAfter !== res.statusBefore ? `<p>Estado: ${statusBadge(res.statusBefore)} → ${statusBadge(res.statusAfter)}</p>` : '') : '';
    $('#fb-reliability').textContent = metrics ? `Medición: ${metrics.reliability.label}.${metrics.reliability.level === 'estimada' ? ' Con micrófono, las notas y tiempos son una estimación; el ritmo y la duración no se evalúan.' : ''}` : '';
    const weak = metrics && metrics.weakMeasures && metrics.weakMeasures.length && ex.song && !free;
    $('#fb-focus').hidden = !weak;
    $('#fb-focus').dataset.measure = weak ? metrics.weakMeasures[0] : '';
    $('#fb-next').hidden = !!free;
    $('#fb-exit').textContent = free ? 'Cerrar' : 'Terminar aquí';
    $('#feedback').showModal();
  }
  $('#fb-next').addEventListener('click', () => {
    $('#feedback').close();
    if (!run) return backToLibrary();
    run.idx++;
    runCurrent();
  });
  $('#fb-retry').addEventListener('click', () => {
    $('#feedback').close();
    if (run) runCurrent();
    else {
      PC.app.player.restart();
    }
  });
  $('#fb-focus').addEventListener('click', () => {
    $('#feedback').close();
    if (!run) return;
    const cur = run.queue[run.idx];
    // Inserta un ejercicio enfocado en el compás débil justo a continuación
    run.queue.splice(run.idx + 1, 0, { ...cur, round: 0, focus: { measure: Number($('#fb-focus').dataset.measure) }, reason: 'Práctica deliberada: bucle lento sobre el punto débil.' });
    run.idx++;
    runCurrent();
  });
  $('#fb-exit').addEventListener('click', () => {
    $('#feedback').close();
    if (run) endSession(true);
    else backToLibrary();
  });

  // ── Improvisación ──
  function runImprov({ title, song, key, scale, aid, item, ex, free }) {
    const played = [];
    const scaleMap = new Map(T.scaleMidis(key, scale, 48, 84).map((m) => [m, 'R']));
    const ctx = {
      onFinish: () => {
        PC.app.onUserNote = null;
        PC.app.expectedOverride = null;
        const evx = T.evaluateImprov(played, { key, scale, chords: song.chords });
        if (free) {
          showFeedback({ free: true, ex: { title, kind: 'improv' }, res: { pass: null, dims: { inScale: evx.inScale, chordTones: evx.chordTones, notes: evx.count }, reasons: [], decisions: [] } });
          return;
        }
        const res = E.recordAttempt(store, ex.skillId, { kind: 'improv', improv: evx });
        afterAttempt(item, ex, res, null);
      },
      onExit: () => {
        PC.app.onUserNote = null;
        PC.app.expectedOverride = null;
        if (free) backToLibrary();
        else endSession(true);
      },
    };
    PC.app.openSong(song, {
      exercise: ctx, mode: 'listen', aid: 1,
      banner: item ? banner(item, ex) : { title, stage: `Escala ${T.SCALE_NAMES[scale]} de ${T.pcName(key.tonic, key)}`, why: 'Toca libremente mientras suena el acompañamiento.' },
    });
    PC.app.expectedOverride = aid === 1 ? scaleMap : new Map();
    PC.app.onUserNote = (midi, beat) => played.push({ midi, beat });
    PC.app.toast(aid === 1 ? 'Improvisa con las teclas iluminadas mientras suena el acompañamiento' : 'Improvisa: ahora sin teclas iluminadas');
    setTimeout(() => PC.app.player.play(), 800);
  }

  // ── Entrenamiento auditivo ──
  const earKb = new PC.Keyboard($('#ear-keyboard'));
  earKb.setRange(48, 83);
  let ear = null;
  function playGroups(groups, gap = 0.75) {
    PC.audio.ensure();
    groups.forEach((g, i) => setTimeout(() => g.forEach((m) => PC.audio.noteOn(m, 0.75, gap * 0.95)), i * gap * 1000));
  }
  function runEar(item, ex) {
    ear = { item, ex, i: 0, correct: 0, answered: false, played: [] };
    PC.app.showView('ear-view');
    $('#ear-title').textContent = ex.title;
    $('#ear-sub').textContent = `Entrenamiento auditivo · ${ex.stage}`;
    $('#ear-step').textContent = `${run.idx + 1}/${run.queue.length} · ${item.block}`;
    $('#ear-goal').textContent = ex.goal;
    $('#ear-why').textContent = `Por qué: ${ex.why} ${item.reason ? '· ' + item.reason : ''}`;
    showQuestion();
  }
  function showQuestion() {
    const q = ear.ex.questions[ear.i];
    ear.answered = false;
    ear.played = [];
    $('#ear-progress').innerHTML = ear.ex.questions.map((_, i) => `<span class="${i < ear.i ? 'done' : i === ear.i ? 'cur' : ''}"></span>`).join('');
    $('#ear-prompt').textContent = q.prompt;
    $('#ear-feedback').textContent = '';
    $('#ear-next').hidden = true;
    $('#ear-echo').hidden = !q.melody;
    $('#ear-played').textContent = '';
    $('#ear-options').innerHTML = q.options ? q.options.map((o) => `<button class="btn ear-opt" data-opt="${esc(o)}">${esc(o)}</button>`).join('') : '';
    setTimeout(() => playGroups(q.play, q.melody ? 0.6 : 0.8), 300);
  }
  function answer(ok, q) {
    ear.answered = true;
    if (ok) ear.correct++;
    $('#ear-feedback').textContent = (ok ? '✓ ¡Correcto! ' : '✗ ') + q.explain;
    $('#ear-feedback').className = 'ear-feedback ' + (ok ? 'ok' : 'wrong');
    $('#ear-next').hidden = false;
    $('#ear-next').textContent = ear.i + 1 < ear.ex.questions.length ? 'Siguiente →' : 'Ver resultado';
  }
  $('#ear-options').addEventListener('click', (e) => {
    const b = e.target.closest('[data-opt]');
    if (!b || ear.answered) return;
    const q = ear.ex.questions[ear.i];
    const ok = b.dataset.opt === q.answer;
    $$('#ear-options [data-opt]').forEach((x) => x.classList.toggle('correct', x.dataset.opt === q.answer));
    if (!ok) b.classList.add('wrong');
    answer(ok, q);
  });
  $('#ear-play').addEventListener('click', () => ear && playGroups(ear.ex.questions[ear.i].play, ear.ex.questions[ear.i].melody ? 0.6 : 0.8));
  $('#ear-clear').addEventListener('click', () => {
    if (!ear) return;
    ear.played = [];
    $('#ear-played').textContent = '';
  });
  $('#ear-next').addEventListener('click', () => {
    if (!ear) return;
    ear.i++;
    if (ear.i < ear.ex.questions.length) return showQuestion();
    const { item, ex, correct } = ear;
    const res = E.recordAttempt(store, ex.skillId, { kind: 'ear', correct, total: ex.questions.length });
    stopEar();
    afterAttempt(item, ex, res, null);
  });
  $('#ear-back').addEventListener('click', () => {
    stopEar();
    endSession(true);
  });
  function stopEar() {
    ear = null;
  }
  // Notas tocadas en la pantalla de oído (teclado en pantalla, MIDI, ordenador o micrófono)
  PC.input.on('on', (midi) => {
    if (!$('#ear-view').classList.contains('active')) return;
    earKb.press(midi);
    if (!ear || ear.answered) return;
    const q = ear.ex.questions[ear.i];
    if (!q.melody) return;
    ear.played.push(midi);
    $('#ear-played').textContent = ear.played.map((m) => PC.music.solfege(m)).join(' ');
    if (ear.played.length >= q.melody.length) answer(PC.exercises.checkEcho(q.melody, ear.played), q);
  });
  PC.input.on('off', (midi) => earKb.release(midi));

  // ── Inicio ──
  PC.learning = { get store() { return store; }, save, showTab, startSession, endSession, get run() { return run; }, reset() { store = E.createStore(); save(); plan = null; showTab('hoy'); } };
  showTab(location.hash.length > 1 ? 'canciones' : 'hoy');
})(window);
