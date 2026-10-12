// Métricas de interpretación a partir de los eventos registrados por el Player (nota, momento, duración…),
// y diagnóstico de dificultades. Funciones puras: no dependen del DOM.
(function (root) {
  const PC = (root.PC = root.PC || {});

  // Umbrales para el diagnóstico. Son decisiones de diseño (hipótesis), no valores validados:
  // se pueden ajustar sin tocar el resto del código.
  const config = {
    accuracy: 0.9, // proporción mínima de notas correctas
    timingMs: 90, // error medio absoluto de ataque (tiempo real)
    biasMs: 35, // tendencia sistemática a adelantarse / retrasarse
    tempoCv: 0.18, // variación relativa de los intervalos entre ataques
    handSyncMs: 70, // diferencia entre manos en notas simultáneas
    chordSpreadMs: 70, // diferencia entre la primera y la última nota de un acorde
    hesitationMs: 1200, // tiempo medio parado esperando la nota (modo Esperar)
    durationError: 0.4, // error relativo medio en la duración de las notas
  };

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  const sd = (a) => {
    if (a.length < 2) return null;
    const m = mean(a);
    return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1));
  };

  // Fiabilidad según el origen de las notas
  function reliability(sources = {}) {
    if (sources.mic) return { level: 'estimada', label: 'estimación por micrófono', timing: false, duration: false };
    if (sources.pointer && !sources.midi && !sources.keyboard) return { level: 'aproximada', label: 'aproximada (pantalla táctil)', timing: true, duration: true };
    if (sources.midi) return { level: 'exacta', label: 'exacta (piano MIDI)', timing: true, duration: true };
    if (sources.keyboard) return { level: 'exacta', label: 'teclado del ordenador', timing: true, duration: true };
    return { level: 'sin datos', label: 'sin datos', timing: false, duration: false };
  }

  /**
   * rec: {
   *   mode: 'wait' | 'realtime', bps, totalNotes,
   *   hits: [{ noteId, midi, hand, step, measure, expectedBeat, beat, t }],
   *   wrong: [{ midi, t, measure }], misses: [{ noteId, measure }],
   *   releases: [{ noteId, heldMs, expectedMs }],
   *   steps: [{ step, start, measure, size, arriveT, doneT }],
   *   sources: { midi, keyboard, pointer, mic }
   * }
   */
  function compute(rec) {
    const rel = reliability(rec.sources);
    const hits = rec.hits || [];
    const wrong = rec.wrong || [];
    const misses = rec.misses || [];
    const total = Math.max(rec.totalNotes || 0, hits.length + misses.length);
    const out = {
      mode: rec.mode,
      reliability: rel,
      notes: { total, hits: hits.length, wrong: wrong.length, missed: misses.length },
      accuracy: total ? hits.length / (total + wrong.length) : null,
      timing: null, tempo: null, handSyncMs: null, chordSpreadMs: null, hesitation: null, duration: null,
      weakMeasures: [],
    };

    // Agrupar los ataques por paso (notas que empiezan a la vez)
    const bySteps = new Map();
    hits.forEach((h) => {
      if (!bySteps.has(h.step)) bySteps.set(h.step, []);
      bySteps.get(h.step).push(h);
    });
    const stepInfo = new Map((rec.steps || []).map((s) => [s.step, s]));

    // Precisión rítmica (solo tiene sentido en tiempo real: en modo Esperar la música se adapta al alumno)
    if (rec.mode === 'realtime' && rel.timing && hits.length >= 3 && rec.bps) {
      const errs = hits.map((h) => ((h.beat - h.expectedBeat) / rec.bps) * 1000);
      const abs = errs.map(Math.abs);
      // Deriva: pendiente del error frente al tiempo (ms por cada 10 s)
      const ts = hits.map((h) => h.t / 1000);
      const mt = mean(ts);
      const me = mean(errs);
      const num = ts.reduce((s, t, i) => s + (t - mt) * (errs[i] - me), 0);
      const den = ts.reduce((s, t) => s + (t - mt) * (t - mt), 0);
      out.timing = { meanAbsMs: mean(abs), biasMs: me, sdMs: sd(errs), driftMsPer10s: den > 0 ? (num / den) * 10 : 0 };

      // Estabilidad del tempo: intervalos reales entre pasos consecutivos frente a los esperados
      const firstT = [...bySteps.entries()].map(([step, hs]) => ({ step, t: Math.min(...hs.map((h) => h.t)), beat: hs[0].expectedBeat })).sort((a, b) => a.step - b.step);
      const ratios = [];
      for (let i = 1; i < firstT.length; i++) {
        if (firstT[i].step !== firstT[i - 1].step + 1) continue;
        const expMs = ((firstT[i].beat - firstT[i - 1].beat) / rec.bps) * 1000;
        if (expMs >= 150) ratios.push((firstT[i].t - firstT[i - 1].t) / expMs);
      }
      if (ratios.length >= 3) out.tempo = { cv: sd(ratios) / mean(ratios), meanRatio: mean(ratios) };
    }

    // Simultaneidad: acordes y manos (en ambos modos; con micrófono la medida no es fiable)
    if (rel.timing) {
      const spreads = [];
      const sync = [];
      for (const [step, hs] of bySteps) {
        const info = stepInfo.get(step);
        if (!info || hs.length < info.size || hs.length < 2) continue;
        const R = hs.filter((h) => h.hand === 'R');
        const L = hs.filter((h) => h.hand === 'L');
        const spread = (list) => Math.max(...list.map((h) => h.t)) - Math.min(...list.map((h) => h.t));
        if (R.length >= 2) spreads.push(spread(R));
        if (L.length >= 2) spreads.push(spread(L));
        if (R.length && L.length) sync.push(Math.abs(mean(R.map((h) => h.t)) - mean(L.map((h) => h.t))));
      }
      if (spreads.length) out.chordSpreadMs = mean(spreads);
      if (sync.length) out.handSyncMs = mean(sync);
    }

    // Fluidez en modo Esperar: cuánto tiempo se queda parada la música esperando cada paso
    if (rec.mode === 'wait') {
      const pauses = (rec.steps || []).filter((s) => s.arriveT != null && s.doneT != null).map((s) => ({ ...s, pause: Math.max(0, s.doneT - s.arriveT) }));
      if (pauses.length) {
        const chordPauses = pauses.filter((p) => p.size >= 2).map((p) => p.pause);
        out.hesitation = {
          meanMs: mean(pauses.map((p) => p.pause)),
          chordChangeMs: chordPauses.length ? mean(chordPauses) : null,
          // Peor pausa de cada compás, de mayor a menor
          worst: [...pauses.reduce((acc, p) => acc.set(p.measure, Math.max(acc.get(p.measure) || 0, p.pause)), new Map())]
            .map(([measure, pauseMs]) => ({ measure, pauseMs }))
            .filter((w) => w.pauseMs > 300)
            .sort((a, b) => b.pauseMs - a.pauseMs)
            .slice(0, 3),
        };
      } else out.hesitation = { meanMs: 0, chordChangeMs: null, worst: [] };
    }

    // Duración de las notas (al soltar la tecla). Solo en tiempo real: en modo Esperar la música se detiene
    // en cada nota, así que la duración escrita no tiene un equivalente en tiempo.
    if (rel.duration && rec.mode === 'realtime') {
      const rs = (rec.releases || []).filter((r) => r.expectedMs >= 200);
      if (rs.length >= 3) {
        const ratios = rs.map((r) => r.heldMs / r.expectedMs);
        out.duration = { meanError: mean(ratios.map((x) => Math.min(2, Math.abs(1 - x)))), meanRatio: mean(ratios) };
      }
    }

    // Compases con más problemas (para la práctica deliberada en bucle)
    const score = new Map();
    const add = (m, v) => m != null && score.set(m, (score.get(m) || 0) + v);
    wrong.forEach((w) => add(w.measure, 1));
    misses.forEach((m) => add(m.measure, 1));
    if (out.hesitation) out.hesitation.worst.forEach((w) => add(w.measure, w.pauseMs / 1000));
    out.weakMeasures = [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([m]) => m);

    // Dimensiones normalizadas (0–1). null = no medida en este intento.
    out.dims = {
      accuracy: out.accuracy,
      rhythm: out.timing ? clamp01(1 - out.timing.meanAbsMs / 250) : null,
      tempo: out.tempo ? clamp01(1 - out.tempo.cv / 0.4) : null,
      fluency: out.hesitation ? clamp01(1 - out.hesitation.meanMs / 3000) : null,
      sync: out.handSyncMs != null ? clamp01(1 - out.handSyncMs / 200) : null,
      chords: out.chordSpreadMs != null ? clamp01(1 - out.chordSpreadMs / 200) : null,
      duration: out.duration ? clamp01(1 - out.duration.meanError) : null,
    };
    return out;
  }

  // Diagnóstico explicable: qué falla, con el dato que lo justifica y qué practicar.
  function diagnose(m, cfg = config) {
    const issues = [];
    const strengths = [];
    const approx = m.reliability.level === 'estimada' ? ' (estimación por micrófono: puede no ser exacta)' : '';
    const ms = (x) => `${Math.round(x)} ms`;
    const bar = (i) => `compás ${i + 1}`;

    if (m.accuracy != null) {
      if (m.accuracy < cfg.accuracy) {
        issues.push({
          id: 'notas', dim: 'accuracy', practice: 'slow',
          text: `Notas: ${m.notes.wrong} equivocadas y ${m.notes.missed} sin tocar de ${m.notes.total}${approx}.`,
          tip: m.weakMeasures.length ? `Repite despacio el ${m.weakMeasures.map(bar).join(' y el ')}.` : 'Repite más despacio, en modo Esperar.',
        });
      } else strengths.push('Notas correctas');
    }
    if (m.timing) {
      const t = m.timing;
      if (t.meanAbsMs > cfg.timingMs) {
        const bias = t.biasMs < -cfg.biasMs ? ' Tiendes a adelantarte.' : t.biasMs > cfg.biasMs ? ' Tiendes a retrasarte.' : '';
        issues.push({ id: 'ritmo', dim: 'rhythm', practice: 'metronome', text: `Ritmo: tus ataques se separan de media ${ms(t.meanAbsMs)} del pulso.${bias}`, tip: 'Practica con el metrónomo a un tempo más lento.' });
      } else strengths.push('Ritmo preciso');
    }
    if (m.tempo) {
      if (m.tempo.cv > cfg.tempoCv) {
        const dir = m.tempo.meanRatio < 0.95 ? ' Vas acelerando.' : m.tempo.meanRatio > 1.05 ? ' Te vas frenando.' : '';
        issues.push({ id: 'tempo', dim: 'tempo', practice: 'metronome', text: `Tempo irregular (variación del ${Math.round(m.tempo.cv * 100)} % entre notas).${dir}`, tip: 'Cuenta en voz alta o activa el metrónomo.' });
      } else strengths.push('Tempo estable');
    }
    if (m.handSyncMs != null) {
      if (m.handSyncMs > cfg.handSyncMs) issues.push({ id: 'sincronia', dim: 'sync', practice: 'hands', text: `Las manos no entran a la vez: ${ms(m.handSyncMs)} de diferencia de media${approx}.`, tip: 'Toca solo los compases con ambas manos, muy despacio, buscando que suenen juntas.' });
      else strengths.push('Manos sincronizadas');
    }
    if (m.chordSpreadMs != null) {
      if (m.chordSpreadMs > cfg.chordSpreadMs) issues.push({ id: 'acordes', dim: 'chords', practice: 'chords', text: `Las notas de los acordes no suenan juntas (${ms(m.chordSpreadMs)} entre la primera y la última)${approx}.`, tip: 'Prepara la forma del acorde antes de bajar la mano y pulsa todas las teclas a la vez.' });
      else strengths.push('Acordes simultáneos');
    }
    if (m.hesitation) {
      const h = m.hesitation;
      const spot = h.worst[0] && h.worst[0].pauseMs > cfg.hesitationMs * 1.5 ? h.worst[0] : null;
      if (h.meanMs > cfg.hesitationMs || spot) {
        const where = h.worst.length ? ` en el ${h.worst.slice(0, 2).map((w) => bar(w.measure)).join(' y el ')}` : '';
        const chord = h.chordChangeMs != null && h.chordChangeMs > cfg.hesitationMs * 0.6 ? ' Los cambios de acorde son lo que más cuesta.' : '';
        const text = h.meanMs > cfg.hesitationMs
          ? `Te detienes de media ${(h.meanMs / 1000).toFixed(1)} s antes de cada nota, sobre todo${where}.${chord}`
          : `En general vas fluido, pero te detienes ${(spot.pauseMs / 1000).toFixed(1)} s${where}.${chord}`;
        issues.push({ id: 'transiciones', dim: 'fluency', practice: 'loop', text, tip: 'Mira una nota por delante y repite en bucle ese cambio, despacio.' });
      } else if (h.meanMs < 400) strengths.push('Fluidez');
    }
    if (m.duration && m.duration.meanError > cfg.durationError) {
      issues.push({ id: 'duracion', dim: 'duration', practice: 'metronome', text: m.duration.meanRatio < 1 ? 'Sueltas las notas antes de tiempo: no llegan a durar lo escrito.' : 'Mantienes las notas más de lo escrito.', tip: 'Fíjate en las figuras (blancas, redondas) y cuenta mientras mantienes.' });
    }
    return { issues, strengths };
  }

  PC.metrics = { config, compute, diagnose, reliability };
})(typeof window !== 'undefined' ? window : globalThis);
