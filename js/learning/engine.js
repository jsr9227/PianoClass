// Motor pedagógico: dominio por habilidad, reglas explicables de progresión, repetición espaciada
// configurable, planificación de sesiones intercaladas, recomendaciones y migración de datos.
// No depende del DOM: toda la lógica se prueba en Node (tests/engine.test.js).
(function (root) {
  const PC = (root.PC = root.PC || {});
  const CUR = PC.curriculum;
  const DAY = 86400000;

  // Parámetros configurables. Son valores de partida razonables (decisiones de diseño), no óptimos
  // demostrados: la investigación respalda espaciar los repasos, pero no unos intervalos concretos.
  const config = {
    pass: { accuracy: 0.9, rhythm: 0.6, tempo: 0.55, fluency: 0.6, sync: 0.5, chords: 0.5, ear: 0.8, improvNotes: 8, improvInScale: 0.8, improvChordTones: 0.5 },
    consolidate: { distinctDays: 2, lastPasses: 2 },
    reinforceAfterFails: 2,
    srs: { firstIntervalDays: 1, lapseIntervalDays: 1, startEase: 2.2, minEase: 1.3, maxIntervalDays: 60, easeUp: 0.1, easeDown: 0.2 },
    // Minutos por bloque en una sesión de 30 min, por itinerario (punto de partida, se adapta)
    blocks: {
      moderno: { tecnica: 5, acordes: 10, oido: 5, canciones: 5, memoria: 5 },
      cero: { tecnica: 7, acordes: 6, oido: 5, canciones: 7, memoria: 5 },
      clasico: { tecnica: 9, acordes: 4, oido: 4, canciones: 9, memoria: 4 },
      improvisacion: { tecnica: 4, acordes: 7, oido: 9, canciones: 3, memoria: 7 },
    },
    itemMinutes: { play: 3, song: 4, ear: 3, improv: 4 },
    maxRounds: 4, // repeticiones máximas de un mismo ejercicio en una sesión
    maxShift: 0.3, // proporción máxima de la sesión que se puede mover hacia bloques con dificultades
  };

  const baseDur = (id) => {
    const sk = CUR.SKILL[id];
    return sk.kind === 'ear' ? config.itemMinutes.ear : sk.kind === 'improv' ? config.itemMinutes.improv : sk.domain === 'repertorio' ? config.itemMinutes.song : config.itemMinutes.play;
  };

  const BLOCKS = {
    tecnica: { label: 'Técnica y coordinación', icon: '✋' },
    acordes: { label: 'Acordes y progresiones', icon: '🎹' },
    oido: { label: 'Entrenamiento auditivo', icon: '👂' },
    canciones: { label: 'Aplicación en canciones', icon: '🎵' },
    memoria: { label: 'Memoria e improvisación', icon: '🧠' },
  };
  const STATUS = {
    'no-iniciada': { label: 'No iniciada', order: 0 },
    aprendizaje: { label: 'En aprendizaje', order: 1 },
    refuerzo: { label: 'Necesita refuerzo', order: 2 },
    consolidada: { label: 'Consolidada', order: 3 },
    repaso: { label: 'Pendiente de repaso', order: 4 },
  };
  const AIDS = {
    1: 'Partitura y teclas iluminadas',
    2: 'Partitura sin indicación de teclas',
    3: 'Guía parcial (solo acordes y la primera nota de cada compás)',
    4: 'De memoria',
  };

  const dayKey = (t) => new Date(t).toISOString().slice(0, 10);
  const pct = (x) => `${Math.round(x * 100)} %`;

  // ── Escalera de etapas para las habilidades de tocar ──
  // Cada peldaño = { mode, tempo, aid }. Superar → subir un peldaño; 2 fallos seguidos → bajar uno.
  function ladder(skill) {
    const rungs = [];
    const minAid = skill.minAid || 1;
    const start = skill.startTempo || 0.8;
    const target = skill.targetTempo || 1;
    const maxAid = skill.domain === 'repertorio' || skill.domain === 'acordes' ? 4 : Math.max(skill.targetAid || 2, minAid);
    const tempos = start < target ? [start, target] : [target];
    if (skill.mode !== 'realtime') tempos.forEach((t) => rungs.push({ mode: 'wait', tempo: t, aid: minAid }));
    tempos.forEach((t) => rungs.push({ mode: 'realtime', tempo: t, aid: minAid }));
    for (let a = minAid + 1; a <= maxAid; a++) rungs.push({ mode: 'realtime', tempo: target, aid: a });
    return rungs;
  }
  // Peldaño mínimo para considerar consolidada una habilidad (tempo objetivo, tiempo real, ayudas objetivo)
  function consolidationRung(skill) {
    const r = ladder(skill);
    const want = Math.max(skill.targetAid || 2, skill.minAid || 1);
    const i = r.findIndex((x) => x.mode === 'realtime' && x.tempo >= (skill.targetTempo || 1) && x.aid >= Math.min(want, r[r.length - 1].aid));
    return i < 0 ? r.length - 1 : i;
  }
  function describeRung(r) {
    return `${r.mode === 'wait' ? 'modo Esperar' : 'tiempo real'} al ${pct(r.tempo)} · ${AIDS[r.aid].toLowerCase()}`;
  }

  function newSkillState() {
    return {
      attempts: 0, passes: 0, consecPasses: 0, consecFails: 0, rung: 0, earLevel: 1, improvAid: 1,
      history: [], passDays: [], consolidated: false, consolidatedAt: null, reinforce: false,
      srs: null, firstT: null, lastT: null, lastIssues: [], weakMeasures: [], segmentIdx: 0,
    };
  }

  function getState(store, id) {
    if (!store.skills[id]) store.skills[id] = newSkillState();
    return store.skills[id];
  }

  function status(st, now) {
    if (!st || !st.attempts) return 'no-iniciada';
    if (st.reinforce) return 'refuerzo';
    if (st.consolidated && st.srs && st.srs.due <= now) return 'repaso';
    if (st.consolidated) return 'consolidada';
    if (st.consecFails >= config.reinforceAfterFails) return 'refuerzo';
    return 'aprendizaje';
  }

  // ── Evaluación de un intento: ¿superado? con motivos legibles ──
  function evaluate(skill, result) {
    const P = config.pass;
    const reasons = [];
    let pass = true;
    const dims = {};
    if (skill.kind === 'ear') {
      dims.ear = result.total ? result.correct / result.total : 0;
      pass = dims.ear >= P.ear;
      reasons.push(`${result.correct} de ${result.total} respuestas correctas (se pide ${pct(P.ear)}).`);
    } else if (skill.kind === 'improv') {
      const ev = result.improv;
      dims.inScale = ev.inScale;
      if (ev.chordTones != null) dims.chordTones = ev.chordTones;
      dims.notes = ev.count;
      if (ev.count < P.improvNotes) {
        pass = false;
        reasons.push(`Has tocado ${ev.count} notas: prueba a tocar al menos ${P.improvNotes}.`);
      }
      if (ev.count && ev.inScale < P.improvInScale) {
        pass = false;
        reasons.push(`El ${pct(ev.inScale)} de las notas estaba en la escala (se pide ${pct(P.improvInScale)}).`);
      }
      if (skill.improv.chordTones && ev.chordTones != null && ev.chordTones < P.improvChordTones) {
        pass = false;
        reasons.push(`En los tiempos fuertes usaste notas del acorde un ${pct(ev.chordTones)} de las veces (se pide ${pct(P.improvChordTones)}).`);
      }
      if (pass) reasons.push('Has creado una melodía dentro de la escala.');
    } else {
      const m = result.metrics;
      Object.assign(dims, m.dims);
      const check = (dim, label) => {
        if (m.dims[dim] == null) return;
        if (m.dims[dim] < P[dim]) {
          pass = false;
          reasons.push(`${label}: ${pct(m.dims[dim])} (se pide ${pct(P[dim])}).`);
        }
      };
      check('accuracy', 'Notas correctas');
      check('rhythm', 'Precisión rítmica');
      check('tempo', 'Estabilidad del tempo');
      check('fluency', 'Fluidez');
      check('sync', 'Sincronía de las manos');
      check('chords', 'Simultaneidad de los acordes');
      if (pass) reasons.push('Cumples todos los criterios medidos en este intento.');
    }
    return { pass, dims, reasons };
  }

  // ── Registrar un intento y decidir el siguiente paso (reglas explicables) ──
  function recordAttempt(store, skillId, result, now = Date.now()) {
    const skill = CUR.SKILL[skillId];
    const st = getState(store, skillId);
    const before = status(st, now);
    const ev = evaluate(skill, result);
    const isReview = before === 'repaso';
    const first = st.attempts === 0;
    st.attempts++;
    st.firstT = st.firstT || now;
    st.lastT = now;
    const decisions = [];
    const rungs = skill.kind === 'play' ? ladder(skill) : null;
    const rungBefore = st.rung;
    const improvAidBefore = st.improvAid;

    if (ev.pass) {
      st.passes++;
      st.consecPasses++;
      st.consecFails = 0;
    } else {
      st.consecFails++;
      st.consecPasses = 0;
    }

    // Progresión de dificultad
    if (skill.kind === 'play') {
      if (ev.pass && st.rung < rungs.length - 1) {
        st.rung++;
        decisions.push(`Siguiente paso: ${describeRung(rungs[st.rung])}.`);
      } else if (ev.pass) decisions.push('Ya estás en la etapa más exigente de este ejercicio.');
      else if (st.consecFails >= 2 && st.rung > 0) {
        st.rung--;
        decisions.push(`Dos intentos sin superar: volvemos a ${describeRung(rungs[st.rung])}.`);
      } else if (!ev.pass) decisions.push('Repite el ejercicio en las mismas condiciones.');
    } else if (skill.kind === 'ear') {
      const maxLevel = ['notas', 'intervalos', 'calidad', 'eco'].includes(skill.ear.type) ? 2 : 1;
      if (ev.pass && st.consecPasses >= 2 && st.earLevel < maxLevel) {
        st.earLevel++;
        decisions.push('Dos aciertos seguidos: pasamos a un nivel con más opciones.');
      } else if (!ev.pass && st.consecFails >= 2 && st.earLevel > 1) {
        st.earLevel--;
        decisions.push('Volvemos al nivel anterior para afianzar.');
      } else decisions.push(ev.pass ? 'Sigue así: repetirás esta habilidad más adelante, espaciada.' : 'Vuelve a intentarlo: escucha cada ejemplo dos veces antes de responder.');
    } else if (skill.kind === 'improv') {
      if (ev.pass && st.improvAid === 1) {
        st.improvAid = 2;
        decisions.push('Próxima vez: sin las notas de la escala iluminadas.');
      } else if (!ev.pass && st.consecFails >= 2 && st.improvAid > 1) {
        st.improvAid = 1;
        decisions.push('Volvemos a mostrar las notas de la escala.');
      } else decisions.push(ev.pass ? 'Prueba ahora frases más largas o con más ritmo.' : 'Toca más notas y quédate dentro de la escala iluminada.');
    }

    // Consolidación: superado en el nivel objetivo, en días distintos y con los últimos intentos superados
    // ¿Se hizo el intento en el nivel exigido para consolidar? (tocar: peldaño objetivo; improvisar: sin ayudas)
    const atTarget = skill.kind === 'play' ? rungBefore >= consolidationRung(skill) : skill.kind === 'improv' ? improvAidBefore >= 2 : true;
    if (ev.pass && atTarget) {
      const d = dayKey(now);
      if (!st.passDays.includes(d)) st.passDays.push(d);
    }
    const C = config.consolidate;
    const S = config.srs;
    if (!st.consolidated && ev.pass && atTarget && st.passDays.length >= C.distinctDays && st.consecPasses >= C.lastPasses) {
      st.consolidated = true;
      st.consolidatedAt = now;
      st.srs = { reps: 1, ease: S.startEase, interval: S.firstIntervalDays, due: now + S.firstIntervalDays * DAY, lapses: 0 };
      decisions.push(`¡Habilidad consolidada! Primer repaso dentro de ${S.firstIntervalDays} día${S.firstIntervalDays > 1 ? 's' : ''}.`);
    } else if (!st.consolidated && ev.pass && atTarget && st.passDays.length < C.distinctDays) {
      decisions.push('Para consolidarla, supérala también otro día: espaciar la práctica ayuda a retenerla.');
    }

    // Repetición espaciada
    if (st.consolidated && isReview) {
      if (ev.pass) {
        const quality = Object.values(ev.dims).filter((x) => typeof x === 'number' && x <= 1);
        const avg = quality.length ? quality.reduce((a, b) => a + b, 0) / quality.length : 1;
        if (avg >= 0.95) st.srs.ease += S.easeUp;
        st.srs.reps++;
        st.srs.interval = Math.min(S.maxIntervalDays, Math.max(st.srs.interval + 1, Math.round(st.srs.interval * st.srs.ease)));
        st.srs.due = now + st.srs.interval * DAY;
        st.reinforce = false;
        decisions.push(`Repaso superado: el siguiente será dentro de ${st.srs.interval} días.`);
      } else {
        st.srs.lapses++;
        st.srs.ease = Math.max(S.minEase, st.srs.ease - S.easeDown);
        st.srs.interval = S.lapseIntervalDays;
        st.srs.due = now + S.lapseIntervalDays * DAY;
        st.reinforce = true;
        decisions.push('Repaso no superado: la marcamos para reforzar y la repasarás pronto.');
      }
    } else if (st.reinforce && st.consecPasses >= 2) {
      st.reinforce = false;
      decisions.push('Dos intentos superados seguidos: deja de necesitar refuerzo.');
    } else if (st.consolidated && !ev.pass && st.consecFails >= config.reinforceAfterFails) {
      st.reinforce = true;
    }

    // Diagnóstico guardado para la práctica deliberada
    if (result.metrics) {
      const diag = PC.metrics.diagnose(result.metrics);
      st.lastIssues = diag.issues.map((i) => i.id);
      st.weakMeasures = result.metrics.weakMeasures || [];
      result.diagnosis = diag;
    }
    st.history.push({ t: now, pass: ev.pass, dims: ev.dims, rung: rungBefore, review: isReview });
    if (st.history.length > 30) st.history.shift();
    store.log.push({ t: now, skillId, pass: ev.pass, dims: ev.dims, review: isReview, first, fresh: !!skill.fresh, source: result.source || null });
    if (store.log.length > 2000) store.log.shift();

    return { pass: ev.pass, reasons: ev.reasons, decisions, dims: ev.dims, statusBefore: before, statusAfter: status(st, now), diagnosis: result.diagnosis || null };
  }

  // ── Construir el ejercicio concreto de una habilidad según su estado ──
  function makeExercise(store, skillId, { seed = Date.now(), now = Date.now(), focus = null, memory = false } = {}) {
    const skill = CUR.SKILL[skillId];
    const st = getState(store, skillId);
    const ex = { skillId, kind: skill.kind, title: skill.name, goal: skill.desc, why: skill.why, seed };
    if (skill.kind === 'play') {
      const rungs = ladder(skill);
      const r = rungs[Math.min(st.rung, rungs.length - 1)];
      ex.song = skill.song({ seed, state: st });
      ex.mode = r.mode;
      ex.tempo = r.tempo;
      ex.aid = r.aid;
      ex.stage = describeRung(r);
      // Recuperación activa: si ya está consolidada, en el bloque de memoria se toca con la mínima ayuda
      if (memory) {
        ex.aid = rungs[rungs.length - 1].aid;
        ex.mode = 'realtime';
        ex.tempo = skill.targetTempo || 1;
        ex.stage = describeRung({ mode: 'realtime', tempo: ex.tempo, aid: ex.aid });
        ex.memory = true;
      }
      // Canciones largas: se practican por fragmentos de 8 compases hasta superarlos todos
      const c = PC.music.compileSong(ex.song);
      if (skill.domain === 'repertorio' && c.measures.length > 12 && !memory) {
        const segs = [];
        for (let i = 0; i < c.measures.length; i += 8) segs.push([i, Math.min(c.measures.length - 1, i + 7)]);
        const idx = st.segmentIdx % (segs.length + 1);
        if (idx < segs.length) {
          ex.segment = segs[idx];
          ex.stage += ` · compases ${segs[idx][0] + 1}–${segs[idx][1] + 1}`;
        }
      }
      // Práctica deliberada: bucle lento sobre los compases débiles
      if (focus) {
        const m = focus.measure;
        ex.segment = [Math.max(0, m - 1), Math.min(c.measures.length - 1, m + 1)];
        ex.mode = 'wait';
        ex.tempo = Math.max(0.5, (ex.tempo || 1) - 0.2);
        ex.aid = Math.max(skill.minAid || 1, 1);
        ex.focus = focus;
        ex.title = `${skill.name}: compases ${ex.segment[0] + 1}–${ex.segment[1] + 1}`;
        ex.stage = `práctica enfocada · modo Esperar al ${pct(ex.tempo)}`;
      }
    } else if (skill.kind === 'ear') {
      ex.level = st.earLevel;
      ex.questions = PC.exercises.earQuestions(skill.ear.type, seed, 6, st.earLevel);
      ex.stage = `nivel ${st.earLevel} · 6 preguntas`;
    } else if (skill.kind === 'improv') {
      const I = skill.improv;
      const key = { tonic: I.tonic, mode: I.mode };
      ex.song = PC.exercises.progression({ progId: I.progId, tonic: I.tonic, pattern: I.progId === 'frigio' ? 'rumba' : 'balada', repeats: 2, bpm: 80 });
      ex.key = key;
      ex.scale = I.scale;
      ex.aid = st.improvAid;
      ex.mode = 'listen';
      ex.stage = st.improvAid === 1 ? 'con las notas de la escala iluminadas' : 'sin ayudas';
    }
    return ex;
  }

  // Al terminar una canción por fragmentos, avanzar al siguiente fragmento
  function advanceSegment(store, skillId) {
    getState(store, skillId).segmentIdx++;
  }

  // ── Itinerarios: estado de módulos ──
  function moduleInfo(store, pathId, now = Date.now()) {
    const path = CUR.PATH[pathId];
    let unlocked = true;
    return path.modules.map((m) => {
      const sts = m.skills.map((id) => ({ id, status: status(store.skills[id], now), state: store.skills[id] }));
      const consolidated = sts.filter((s) => ['consolidada', 'repaso'].includes(s.status)).length;
      const passedOnce = sts.filter((s) => s.state && s.state.passes > 0).length;
      const info = {
        module: m, skills: sts, unlocked,
        done: consolidated === sts.length,
        progress: (consolidated + passedOnce * 0.5) / (sts.length * 1.5),
      };
      unlocked = unlocked && passedOnce === sts.length;
      return info;
    });
  }

  function currentModule(store, pathId, now) {
    const mods = moduleInfo(store, pathId, now);
    // El módulo actual es el más avanzado de los desbloqueados; los anteriores se siguen practicando hasta consolidarse
    return mods.filter((m) => m.unlocked && !m.done).pop() || mods.filter((m) => m.unlocked).pop();
  }

  // Habilidades candidatas: las de módulos desbloqueados del itinerario + repasos de cualquier habilidad empezada
  function candidates(store, pathId, now) {
    const mods = moduleInfo(store, pathId, now);
    const cur = currentModule(store, pathId, now);
    const out = new Map();
    mods.filter((m) => m.unlocked).forEach((m) => m.skills.forEach((s) => out.set(s.id, { id: s.id, status: s.status, inCurrent: m === cur })));
    Object.keys(store.skills).forEach((id) => {
      const s = status(store.skills[id], now);
      if (CUR.SKILL[id] && (s === 'repaso' || s === 'refuerzo') && !out.has(id)) out.set(id, { id, status: s, inCurrent: false, otherPath: true });
    });
    return [...out.values()];
  }

  function priority(c, store, now) {
    const st = store.skills[c.id];
    switch (c.status) {
      case 'repaso': return 100 + Math.min(30, (now - st.srs.due) / DAY);
      case 'refuerzo': return 90;
      // Cuanto más tiempo sin practicarla, algo más de prioridad
      case 'aprendizaje': return 60 + (c.inCurrent ? 10 : 0) + Math.min(20, (now - (st.lastT || now)) / DAY);
      case 'no-iniciada': return c.inCurrent ? 50 : 20;
      default: return 10;
    }
  }
  const REASON = {
    repaso: 'Repaso programado: recuperarla de memoria ayuda a retenerla.',
    refuerzo: 'Necesita refuerzo: en los últimos intentos no se superó.',
    aprendizaje: 'En aprendizaje: seguimos subiendo de etapa.',
    'no-iniciada': 'Nueva en tu itinerario.',
    consolidada: 'Mantenimiento: ya la dominas, la practicamos con menos ayudas.',
  };

  // ── Planificar la sesión de hoy ──
  function planSession(store, { minutes = 30, pathId, now = Date.now(), seed = 1 } = {}) {
    pathId = pathId || (store.profile && store.profile.pathId) || 'cero';
    const base = config.blocks[pathId] || config.blocks.moderno;
    const scale = minutes / 30;
    const notes = [];
    let alloc = Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v * scale]));

    const cands = candidates(store, pathId, now);
    const blockOf = (id) => CUR.DOMAINS[CUR.SKILL[id].domain].block;
    const byBlock = {};
    for (const b of Object.keys(BLOCKS)) byBlock[b] = [];
    cands.forEach((c) => byBlock[blockOf(c.id)].push(c));
    // Bloque de memoria: improvisación + habilidades ya consolidadas (o avanzadas) tocadas de memoria
    cands.filter((c) => ['consolidada', 'repaso'].includes(c.status) && CUR.SKILL[c.id].kind === 'play' && ['repertorio', 'acordes'].includes(CUR.SKILL[c.id].domain))
      .forEach((c) => byBlock.memoria.push({ ...c, memory: true }));

    // Variedad: si lo desbloqueado cubre menos de 3 tipos de práctica, se adelanta una habilidad
    // del siguiente módulo por cada tipo que falte (práctica intercalada desde el principio)
    const covered = () => Object.keys(byBlock).filter((b) => byBlock[b].length).length;
    if (covered() < 3) {
      const mods = moduleInfo(store, pathId, now).filter((m) => !m.unlocked);
      for (const m of mods) {
        for (const sk of m.skills) {
          const b = blockOf(sk.id);
          if (covered() >= 3) break;
          if (b !== 'memoria' && !byBlock[b].length && sk.status === 'no-iniciada') byBlock[b].push({ id: sk.id, status: 'no-iniciada', inCurrent: false, preview: true });
        }
      }
    }

    // Adaptación: más tiempo para los bloques con repasos pendientes o habilidades que necesitan refuerzo
    const weak = Object.fromEntries(Object.keys(alloc).map((b) => [b, byBlock[b].filter((c) => !c.memory && (c.status === 'repaso' || c.status === 'refuerzo')).length]));
    const weakTotal = Object.values(weak).reduce((a, b) => a + b, 0);
    if (weakTotal) {
      const pool = Object.keys(alloc).filter((b) => !weak[b]);
      const movable = Math.min(minutes * config.maxShift, pool.reduce((s, b) => s + Math.max(0, alloc[b] - 2), 0), weakTotal * 2);
      if (movable >= 1) {
        const poolTotal = pool.reduce((s, b) => s + Math.max(0, alloc[b] - 2), 0);
        pool.forEach((b) => (alloc[b] -= (movable * Math.max(0, alloc[b] - 2)) / poolTotal));
        Object.keys(weak).forEach((b) => weak[b] && (alloc[b] += (movable * weak[b]) / weakTotal));
        notes.push(`He dado más tiempo a ${Object.keys(weak).filter((b) => weak[b]).map((b) => BLOCKS[b].label.toLowerCase()).join(' y ')} porque hay repasos pendientes o habilidades que reforzar.`);
      }
    }
    // Bloques vacíos ceden su tiempo a los demás
    const empty = Object.keys(alloc).filter((b) => !byBlock[b].length);
    if (empty.length) {
      const freed = empty.reduce((s, b) => s + alloc[b], 0);
      empty.forEach((b) => delete alloc[b]);
      const rest = Object.keys(alloc);
      rest.forEach((b) => (alloc[b] += freed / rest.length));
      if (empty.includes('memoria')) notes.push('Aún no hay piezas consolidadas para tocar de memoria: ese tiempo se reparte entre los demás bloques.');
    }
    // Capacidad de cada bloque: como mucho «maxRounds» rondas de cada habilidad disponible.
    // Si un bloque tiene poca variedad, el tiempo sobrante pasa a los bloques que tienen más.
    const capacity = (b) => byBlock[b].slice(0, 6).reduce((acc, c) => acc + baseDur(c.id) * config.maxRounds, 0);
    for (let iter = 0; iter < 6; iter++) {
      let excess = 0;
      Object.keys(alloc).forEach((b) => {
        const cap = capacity(b);
        if (alloc[b] > cap) {
          excess += alloc[b] - cap;
          alloc[b] = cap;
        }
      });
      if (excess < 0.01) break;
      const spare = Object.keys(alloc).filter((b) => capacity(b) - alloc[b] > 0.01);
      const room = spare.reduce((acc, b) => acc + capacity(b) - alloc[b], 0);
      if (!spare.length) {
        // No hay variedad suficiente para toda la sesión: se reparte igualmente (ejercicios más largos)
        Object.keys(alloc).forEach((b) => (alloc[b] += excess / Object.keys(alloc).length));
        break;
      }
      spare.forEach((b) => (alloc[b] += (excess * (capacity(b) - alloc[b])) / room));
    }

    // Redondeo y mínimo de 2 minutos por bloque
    let blocks = Object.entries(alloc).map(([b, m]) => ({ block: b, minutes: Math.round(m) })).filter((b) => b.minutes >= 2);
    const diff = minutes - blocks.reduce((s, b) => s + b.minutes, 0);
    if (blocks.length) blocks.sort((a, b) => b.minutes - a.minutes)[0].minutes += diff;
    const order = Object.keys(BLOCKS);
    blocks.sort((a, b) => order.indexOf(a.block) - order.indexOf(b.block));

    // Rellenar cada bloque: se reparten sus minutos entre habilidades distintas; si sobra tiempo,
    // los ejercicios se repiten en rondas alternas dentro del bloque (A B C A B C, no A A B B C C).
    const reasonFor = (c, focusMeasure) =>
      c.memory
        ? 'Recuperación activa: tócala con la mínima ayuda visual.'
        : focusMeasure != null
          ? `Práctica deliberada: en tu último intento te costó el compás ${focusMeasure + 1}.`
          : c.preview
            ? 'Adelanto del siguiente módulo, para variar la práctica.'
            : (REASON[c.status] || '') + (c.otherPath ? ' (de otro itinerario)' : '');
    const usedSkills = new Set();
    let k = 0;
    blocks = blocks.map((b) => {
      const list = byBlock[b.block].map((c) => ({ ...c, p: priority(c, store, now) + (c.memory ? 5 : 0) })).sort((x, y) => y.p - x.p);
      // Preferir habilidades que no hayan salido ya en otro bloque
      const fresh = list.filter((c) => !usedSkills.has(c.id));
      const pool = (fresh.length ? fresh : list).slice(0, Math.max(1, Math.floor(b.minutes / 2.5)));
      let chosen = [];
      let total = 0;
      for (const c of pool) {
        if (total + 2 > b.minutes && chosen.length) break;
        chosen.push(c);
        total += baseDur(c.id);
      }
      // Rondas: cuántas veces cabe cada ejercicio en el tiempo del bloque
      const per = chosen.map((c) => baseDur(c.id));
      const sumBase = per.reduce((a, x) => a + x, 0);
      const rounds = Math.min(config.maxRounds, Math.max(1, Math.round(b.minutes / sumBase)));
      const items = [];
      for (let r = 0; r < rounds; r++) {
        chosen.forEach((c) => {
          const st = store.skills[c.id];
          const sk = CUR.SKILL[c.id];
          const focusMeasure = r === 0 && c.status === 'refuerzo' && st && st.weakMeasures && st.weakMeasures.length && sk.kind === 'play' && !c.memory ? st.weakMeasures[0] : null;
          const prev = items[items.length - 1];
          if (prev && prev.skillId === c.id) {
            prev.rounds++;
            return;
          }
          items.push({
            skillId: c.id, block: b.block, memory: !!c.memory, status: c.status, rounds: 1,
            focus: focusMeasure != null ? { measure: focusMeasure } : null,
            reason: r > 0 ? 'Segunda ronda, tras practicar otra cosa: así se recupera mejor.' : reasonFor(c, focusMeasure),
            seed: seed + k++ * 7919,
          });
        });
      }
      chosen.forEach((c) => usedSkills.add(c.id));
      // Reparto exacto de los minutos del bloque entre sus ejercicios
      // (método del resto mayor: suma exacta y sin valores negativos)
      const weights = items.map((it) => baseDur(it.skillId) * it.rounds);
      const wsum = weights.reduce((a, x) => a + x, 0);
      const raw = weights.map((w) => (b.minutes * w) / wsum);
      items.forEach((it, i) => (it.minutes = Math.floor(raw[i])));
      let rest = b.minutes - items.reduce((a, it) => a + it.minutes, 0);
      raw.map((r, i) => [r - Math.floor(r), i]).sort((x, y) => y[0] - x[0]).forEach(([, i]) => {
        if (rest > 0) {
          items[i].minutes++;
          rest--;
        }
      });
      return { ...b, label: BLOCKS[b.block].label, icon: BLOCKS[b.block].icon, items };
    }).filter((b) => b.items.length);
    // Entre bloques tampoco se repite seguida la misma habilidad (p. ej. memoria tras canciones)
    for (let i = 1; i < blocks.length; i++) {
      const prevLast = blocks[i - 1].items[blocks[i - 1].items.length - 1].skillId;
      const its = blocks[i].items;
      if (its[0].skillId === prevLast && its.length > 1) its.push(its.shift());
    }

    // Ajuste final por redondeos: la suma de minutos debe ser exactamente la pedida
    const sum = blocks.reduce((a, b) => a + b.minutes, 0);
    if (blocks.length && sum !== minutes) {
      const big = blocks.reduce((a, b) => (b.minutes > a.minutes ? b : a));
      big.minutes += minutes - sum;
      big.items[big.items.length - 1].minutes += minutes - sum;
    }

    return { minutes, pathId, createdAt: now, blocks, notes };
  }

  // ── Recomendaciones, calendario de repasos e indicadores ──
  function recommendations(store, pathId, now = Date.now()) {
    const out = [];
    const all = Object.entries(store.skills).filter(([id]) => CUR.SKILL[id]);
    all.filter(([, st]) => status(st, now) === 'refuerzo').slice(0, 2).forEach(([id, st]) => out.push({ skillId: id, text: `Refuerza «${CUR.SKILL[id].name}»`, why: st.lastIssues.length ? `Último problema detectado: ${st.lastIssues.join(', ')}.` : 'No se superó en los últimos intentos.' }));
    all.filter(([, st]) => status(st, now) === 'repaso').slice(0, 2).forEach(([id]) => out.push({ skillId: id, text: `Repasa «${CUR.SKILL[id].name}»`, why: 'Toca repasarla para no olvidarla.' }));
    const cur = currentModule(store, pathId, now);
    if (cur) {
      const next = cur.skills.find((s) => s.status === 'no-iniciada' || s.status === 'aprendizaje');
      if (next) out.push({ skillId: next.id, text: `Sigue con «${CUR.SKILL[next.id].name}»`, why: `Es parte de tu módulo actual: ${cur.module.title}.` });
    }
    return out.slice(0, 4);
  }

  function reviewCalendar(store, now = Date.now(), days = 14) {
    const cal = Array.from({ length: days }, (_, i) => ({ day: dayKey(now + i * DAY), skills: [] }));
    Object.entries(store.skills).forEach(([id, st]) => {
      if (!st.srs || !CUR.SKILL[id]) return;
      // Los repasos atrasados se muestran hoy
      const i = st.srs.due <= now ? 0 : Math.floor((st.srs.due - now) / DAY);
      if (i < days) cal[i].skills.push(id);
    });
    return cal;
  }

  // Indicadores para evaluar después si el método funciona (no son afirmaciones de eficacia)
  function evaluationMetrics(store) {
    const log = store.log;
    const reviews = log.filter((l) => l.review);
    const firsts = log.filter((l) => l.first && l.dims && l.dims.accuracy != null);
    const fresh = log.filter((l) => l.fresh && l.dims && l.dims.accuracy != null);
    const cons = Object.values(store.skills).filter((s) => s.consolidatedAt && s.firstT);
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    return {
      retention: reviews.length ? { rate: reviews.filter((l) => l.pass).length / reviews.length, n: reviews.length } : null,
      firstAttemptAccuracy: firsts.length ? { mean: avg(firsts.map((l) => l.dims.accuracy)), n: firsts.length } : null,
      transfer: fresh.length ? { mean: avg(fresh.map((l) => l.dims.accuracy)), n: fresh.length } : null,
      daysToConsolidate: cons.length ? { mean: avg(cons.map((s) => (s.consolidatedAt - s.firstT) / DAY)), n: cons.length } : null,
      consolidated: Object.values(store.skills).filter((s) => s.consolidated).length,
      attempts: log.length,
    };
  }

  // ── Persistencia y migración segura ──
  const VERSION = 1;
  function createStore() {
    return { version: VERSION, profile: null, skills: {}, sessions: [], log: [], migrations: [] };
  }
  // Importa (sin modificarlos) los datos antiguos: estrellas de las lecciones del curso y de las canciones
  const LEGACY_MAP = { 'curso-1': 't-do-central', 'curso-2': 't-5dedos-rh', 'curso-3': 't-5dedos-lh', 'curso-4': 't-escala-do', 'curso-5': 'a-triadas-mayores', 'curso-6': 't-coord-paralelo' };
  function migrate(data, legacyProgress = {}, now = Date.now()) {
    let store = data && typeof data === 'object' ? data : createStore();
    if (!store.version) store = Object.assign(createStore(), store, { version: VERSION });
    store.skills = store.skills || {};
    store.sessions = store.sessions || [];
    store.log = store.log || [];
    store.migrations = store.migrations || [];
    if (!store.migrations.includes('legacy-progress-v1')) {
      Object.entries(legacyProgress || {}).forEach(([songId, p]) => {
        const skillId = LEGACY_MAP[songId] || (CUR.SKILL[`rep-${songId}`] ? `rep-${songId}` : null);
        if (!skillId || !p || store.skills[skillId]) return;
        const st = newSkillState();
        const passed = (p.stars || 0) >= 2;
        st.attempts = Math.max(1, p.plays || 1);
        st.passes = passed ? 1 : 0;
        st.consecPasses = passed ? 1 : 0;
        st.firstT = st.lastT = p.last || now;
        st.history.push({ t: p.last || now, pass: passed, dims: { accuracy: (p.best || 0) / 100 }, imported: true });
        store.skills[skillId] = st;
      });
      store.migrations.push('legacy-progress-v1');
    }
    return store;
  }

  PC.engine = {
    config, BLOCKS, STATUS, AIDS, DAY,
    ladder, consolidationRung, describeRung, newSkillState, getState, status, evaluate, recordAttempt,
    makeExercise, advanceSegment, moduleInfo, currentModule, planSession, recommendations, reviewCalendar,
    evaluationMetrics, createStore, migrate, VERSION,
  };
})(typeof window !== 'undefined' ? window : globalThis);
