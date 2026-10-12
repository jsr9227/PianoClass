// Pruebas del motor pedagógico: reglas de progresión, dominio, repetición espaciada, sesiones y migración.
// Uso: node tests/engine.test.js
require('../js/music.js');
require('../js/songs.js');
require('../js/songs-extra.js');
require('../js/learning/theory.js');
require('../js/learning/metrics.js');
require('../js/learning/exercises.js');
require('../js/learning/curriculum.js');
require('../js/learning/engine.js');
const { PC } = globalThis;
const E = PC.engine;
const CUR = PC.curriculum;
const assert = require('assert');
const DAY = E.DAY;
const T0 = Date.UTC(2026, 9, 1, 10);
let n = 0;
const ok = (msg) => {
  n++;
  console.log('ok   ' + msg);
};

// Métricas sintéticas con la misma forma que PC.metrics.compute
function metrics({ accuracy = 1, rhythm = null, fluency = null, weak = [] } = {}) {
  return {
    reliability: { level: 'exacta', label: 'exacta (piano MIDI)' },
    notes: { total: 20, hits: Math.round(20 * accuracy), wrong: 0, missed: 20 - Math.round(20 * accuracy) },
    accuracy,
    timing: rhythm != null ? { meanAbsMs: (1 - rhythm) * 250, biasMs: 0, sdMs: 10 } : null,
    tempo: null, handSyncMs: null, chordSpreadMs: null, duration: null,
    hesitation: fluency != null ? { meanMs: (1 - fluency) * 3000, chordChangeMs: null, worst: weak.map((m) => ({ measure: m, pauseMs: 2500 })) } : null,
    weakMeasures: weak,
    dims: { accuracy, rhythm, tempo: null, fluency, sync: null, chords: null, duration: null },
  };
}
const good = () => ({ kind: 'play', metrics: metrics({ accuracy: 0.98, rhythm: 0.85, fluency: 0.9 }) });
const bad = (weak = [2]) => ({ kind: 'play', metrics: metrics({ accuracy: 0.7, fluency: 0.3, weak }) });

// 1) Escalera de etapas
{
  const sk = CUR.SKILL['a-prog-pop'];
  const L = E.ladder(sk);
  assert.deepStrictEqual(L[0], { mode: 'wait', tempo: 0.8, aid: 1 });
  assert.strictEqual(L[L.length - 1].aid, 4, 'las progresiones llegan a tocarse de memoria');
  assert(L.every((r, i) => i === 0 || r.aid >= L[i - 1].aid), 'las ayudas solo se retiran');
  const rh = E.ladder(CUR.SKILL['r-corcheas']);
  assert(rh.every((r) => r.mode === 'realtime'), 'los ejercicios de ritmo siempre en tiempo real');
  const rd = E.ladder(CUR.SKILL['l-clave-sol']);
  assert(rd.every((r) => r.aid >= 2), 'la lectura nunca ilumina las teclas');
  ok('escalera de etapas: modo Esperar → tempo objetivo → tiempo real → menos ayudas');
}

// 2) Superar sube un peldaño; dos fallos seguidos bajan uno, con explicación
{
  const store = E.createStore();
  const r1 = E.recordAttempt(store, 't-5dedos-rh', good(), T0);
  assert.strictEqual(store.skills['t-5dedos-rh'].rung, 1);
  assert(/Siguiente paso: modo Esperar al 100 %/.test(r1.decisions[0]), r1.decisions[0]);
  const r2 = E.recordAttempt(store, 't-5dedos-rh', bad(), T0 + 1000);
  assert.strictEqual(store.skills['t-5dedos-rh'].rung, 1, 'un fallo: repetir');
  assert(/Repite/.test(r2.decisions[0]));
  const r3 = E.recordAttempt(store, 't-5dedos-rh', bad(), T0 + 2000);
  assert.strictEqual(store.skills['t-5dedos-rh'].rung, 0, 'dos fallos: bajar');
  assert(/volvemos a modo Esperar al 80 %/.test(r3.decisions[0]), r3.decisions[0]);
  assert.strictEqual(E.status(store.skills['t-5dedos-rh'], T0), 'refuerzo');
  assert(r3.reasons.some((x) => /Notas correctas: 70 %/.test(x)), 'explica el criterio no cumplido');
  ok('reglas explicables: subir, repetir y bajar de etapa');
}

// 3) El dominio no es un porcentaje global: notas perfectas pero ritmo impreciso no supera
{
  const store = E.createStore();
  const r = E.recordAttempt(store, 'r-corcheas', { kind: 'play', metrics: metrics({ accuracy: 1, rhythm: 0.3 }) }, T0);
  assert.strictEqual(r.pass, false);
  assert(r.reasons.some((x) => /Precisión rítmica: 30 %/.test(x)));
  assert(r.diagnosis.issues.some((i) => i.id === 'ritmo'));
  ok('criterios por dimensión: 100 % de notas con ritmo impreciso no supera');
}

// 4) Consolidación espaciada y repetición espaciada
{
  const store = E.createStore();
  const id = 'r-negras-blancas'; // escalera: tiempo real 100 % ayuda 1 → ayuda 2 (objetivo)
  const target = E.consolidationRung(CUR.SKILL[id]);
  let t = T0;
  for (let i = 0; i < 6; i++) E.recordAttempt(store, id, good(), (t += 60000));
  const st = store.skills[id];
  assert(st.rung >= target);
  assert.strictEqual(st.consolidated, false, 'el mismo día no basta para consolidar');
  assert.strictEqual(E.status(st, t), 'aprendizaje');
  const r = E.recordAttempt(store, id, good(), (t += DAY));
  assert.strictEqual(st.consolidated, true, 'superada en dos días distintos');
  assert(r.decisions.some((d) => /consolidada/.test(d)));
  assert.strictEqual(E.status(st, t), 'consolidada');
  assert.strictEqual(E.status(st, t + DAY + 1), 'repaso', 'llega la fecha de repaso');
  // Repaso superado: el intervalo crece
  t += DAY + 1;
  E.recordAttempt(store, id, good(), t);
  const i1 = st.srs.interval;
  assert(i1 >= 2, 'intervalo creciente');
  t += i1 * DAY + 1;
  E.recordAttempt(store, id, good(), t);
  assert(st.srs.interval > i1, 'sigue creciendo');
  // Repaso fallido: refuerzo e intervalo corto
  t += st.srs.interval * DAY + 1;
  const rf = E.recordAttempt(store, id, bad([]), t);
  assert.strictEqual(E.status(st, t), 'refuerzo');
  assert.strictEqual(st.srs.interval, E.config.srs.lapseIntervalDays);
  assert(rf.decisions.some((d) => /reforzar/.test(d)));
  E.recordAttempt(store, id, good(), (t += 1000));
  E.recordAttempt(store, id, good(), (t += 1000));
  assert.notStrictEqual(E.status(st, t), 'refuerzo', 'dos aciertos quitan el refuerzo');
  ok(`consolidación en días distintos y repasos espaciados (intervalos ${i1} → … días; fallo → ${E.config.srs.lapseIntervalDays} día)`);
}

// 5) Oído e improvisación
{
  const store = E.createStore();
  const r = E.recordAttempt(store, 'o-mayor-menor', { kind: 'ear', correct: 5, total: 6 }, T0);
  assert(r.pass);
  E.recordAttempt(store, 'o-mayor-menor', { kind: 'ear', correct: 6, total: 6 }, T0 + 1000);
  assert.strictEqual(store.skills['o-mayor-menor'].earLevel, 2, 'sube de nivel tras dos aciertos');
  assert.strictEqual(E.recordAttempt(store, 'o-intervalos', { kind: 'ear', correct: 3, total: 6 }, T0).pass, false);
  const im = E.recordAttempt(store, 'i-pentatonica', { kind: 'improv', improv: { count: 20, inScale: 0.95, chordTones: 0.7, range: 12 } }, T0);
  assert(im.pass);
  assert.strictEqual(store.skills['i-pentatonica'].improvAid, 2, 'sin ayudas la próxima vez');
  const im2 = E.recordAttempt(store, 'i-notas-acorde', { kind: 'improv', improv: { count: 20, inScale: 0.95, chordTones: 0.2, range: 12 } }, T0);
  assert(!im2.pass && im2.reasons.some((x) => /notas del acorde/.test(x)));
  ok('evaluación de oído (con niveles) e improvisación (escala y notas del acorde)');
}

// 6) Todos los ejercicios se generan y son tocables
{
  const store = E.createStore();
  let count = 0;
  for (const sk of CUR.SKILLS) {
    for (const memory of [false, true]) {
      const ex = E.makeExercise(store, sk.id, { seed: 42, memory });
      if (sk.kind === 'ear') assert.strictEqual(ex.questions.length, 6);
      else {
        assert(ex.song, sk.id + ' sin partitura');
        const c = PC.music.compileSong(ex.song);
        assert.deepStrictEqual(c.errors, [], sk.id);
        if (ex.segment) assert(ex.segment[1] < c.measures.length);
      }
      count++;
    }
  }
  const ex = E.makeExercise(store, 'rep-para-elisa', { seed: 1 });
  assert(ex.segment, 'las piezas largas se practican por fragmentos');
  const fx = E.makeExercise(store, 'rep-himno-alegria', { focus: { measure: 5 } });
  assert.deepStrictEqual(fx.segment, [4, 6]);
  assert.strictEqual(fx.mode, 'wait');
  ok(`${count} ejercicios generados y válidos (incluidos fragmentos y práctica enfocada)`);
}

// 7) Sesiones: duración, reparto, intercalado y adaptación
{
  const store = E.createStore();
  for (const minutes of [15, 30, 60]) {
    for (const pathId of Object.keys(CUR.PATH)) {
      const s = E.planSession(store, { minutes, pathId, now: T0 });
      const total = s.blocks.reduce((a, b) => a + b.minutes, 0);
      assert.strictEqual(total, minutes, `${pathId} ${minutes}: ${total}`);
      const flat = s.blocks.flatMap((b) => b.items.map((i) => i.skillId));
      for (let i = 1; i < flat.length; i++) assert.notStrictEqual(flat[i], flat[i - 1], 'sin la misma habilidad dos veces seguidas');
      assert(new Set(s.blocks.map((b) => b.block)).size >= 3, `${pathId} ${minutes}: varios tipos de práctica`);
      s.blocks.forEach((b) => b.items.forEach((it) => assert(it.minutes / it.rounds <= 6 && it.rounds <= E.config.maxRounds, `${pathId} ${minutes}: ejercicio demasiado largo (${it.minutes} min, ${it.rounds} rondas)`)));
      s.blocks.forEach((b) => b.items.forEach((it) => assert(it.reason && it.reason.length > 5)));
    }
  }
  // Moderno, 30 min, con piezas para tocar de memoria → reparto base 5/10/5/5/5
  const s2 = E.createStore();
  ['a-triadas-mayores', 'a-triadas-menores'].forEach((id) => {
    const st = E.getState(s2, id);
    Object.assign(st, { attempts: 5, passes: 5, consolidated: true, srs: { due: T0 + 5 * DAY, interval: 5, ease: 2.2, reps: 2, lapses: 0 } });
  });
  const base = E.planSession(s2, { minutes: 30, pathId: 'moderno', now: T0 });
  assert.deepStrictEqual(Object.fromEntries(base.blocks.map((b) => [b.block, b.minutes])), { tecnica: 5, acordes: 10, oido: 5, canciones: 5, memoria: 5 });
  assert(base.blocks.find((b) => b.block === 'memoria').items.some((i) => i.memory));
  // Con un repaso pendiente y una habilidad en refuerzo en «acordes», ese bloque gana tiempo y los repasos van primero
  s2.skills['a-triadas-mayores'].srs.due = T0 - DAY;
  Object.assign(E.getState(s2, 'a-prog-pop'), { attempts: 3, consecFails: 2, weakMeasures: [3] });
  const adapted = E.planSession(s2, { minutes: 30, pathId: 'moderno', now: T0 });
  const ac = adapted.blocks.find((b) => b.block === 'acordes');
  assert(ac.minutes > 10, 'más tiempo para acordes: ' + ac.minutes);
  assert.strictEqual(ac.items[0].status, 'repaso');
  const focus = ac.items.find((i) => i.skillId === 'a-prog-pop');
  assert(focus && focus.focus && focus.focus.measure === 3 && /compás 4/.test(focus.reason), 'práctica deliberada en el compás débil');
  assert(adapted.notes.some((x) => /más tiempo/.test(x)));
  ok('sesiones de 15/30/60 min en los 4 itinerarios: duración exacta, intercaladas y adaptadas');
}

// 8) Cambiar de itinerario no pierde progreso; los repasos de otro itinerario siguen apareciendo
{
  const store = E.createStore();
  const st = E.getState(store, 'r-compas-12');
  Object.assign(st, { attempts: 6, passes: 6, consolidated: true, srs: { due: T0 - 1, interval: 3, ease: 2.2, reps: 2, lapses: 0 } });
  store.profile = { pathId: 'moderno' };
  store.profile.pathId = 'cero';
  assert.strictEqual(store.skills['r-compas-12'].consolidated, true);
  const s = E.planSession(store, { minutes: 30, pathId: 'cero', now: T0 });
  const item = s.blocks.flatMap((b) => b.items).find((i) => i.skillId === 'r-compas-12');
  assert(item && /otro itinerario/.test(item.reason), 'repaso de una habilidad del itinerario anterior');
  ok('cambio de itinerario sin perder progreso');
}

// 9) Módulos: el siguiente se abre al superar una vez cada habilidad del actual
{
  const store = E.createStore();
  let mods = E.moduleInfo(store, 'cero', T0);
  assert(mods[0].unlocked && !mods[1].unlocked);
  mods[0].module.skills.forEach((id) => Object.assign(E.getState(store, id), { attempts: 1, passes: 1 }));
  mods = E.moduleInfo(store, 'cero', T0);
  assert(mods[1].unlocked && !mods[2].unlocked && !mods[0].done);
  assert.strictEqual(E.currentModule(store, 'cero', T0).module.id, 'cero-2');
  ok('desbloqueo de módulos por criterios de superación');
}

// 10) Migración segura de los datos antiguos
{
  const legacy = { 'curso-2': { best: 96, stars: 3, plays: 2, last: T0 }, estrellita: { best: 60, stars: 1, plays: 1, last: T0 }, 'user-x': { best: 90, stars: 3 } };
  const copy = JSON.parse(JSON.stringify(legacy));
  const store = E.migrate(null, legacy, T0);
  assert.deepStrictEqual(legacy, copy, 'no modifica los datos antiguos');
  assert.strictEqual(store.skills['t-5dedos-rh'].passes, 1);
  assert.strictEqual(store.skills['rep-estrellita'].passes, 0);
  assert(!store.skills['rep-user-x']);
  store.skills['t-5dedos-rh'].passes = 7;
  const again = E.migrate(store, legacy, T0);
  assert.strictEqual(again.skills['t-5dedos-rh'].passes, 7, 'la migración no se repite');
  ok('migración idempotente sin tocar los datos antiguos');
}

// 11) Indicadores de evaluación del método y calendario
{
  const store = E.createStore();
  E.recordAttempt(store, 'l-clave-sol', good(), T0);
  E.recordAttempt(store, 'l-clave-sol', bad(), T0 + 1000);
  const m = E.evaluationMetrics(store);
  assert.strictEqual(m.attempts, 2);
  assert.strictEqual(m.transfer.n, 2, 'la lectura a primera vista cuenta como transferencia');
  assert.strictEqual(m.retention, null, 'sin repasos todavía no hay dato de retención');
  const st = E.getState(store, 'o-notas');
  st.srs = { due: T0 + 3.5 * DAY };
  const cal = E.reviewCalendar(store, T0, 7);
  assert.deepStrictEqual(cal[3].skills, ['o-notas']);
  ok('indicadores (retención, transferencia…) y calendario de repasos');
}

console.log(`\nTodas las pruebas del motor pasaron (${n} grupos)`);
