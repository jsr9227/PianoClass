// Pruebas de las métricas de interpretación: se ejecuta el Player real con un reloj simulado
// y se comprueba que las métricas miden los errores introducidos a propósito. Uso: node tests/metrics.test.js
let clock = 0;
globalThis.window = globalThis;
globalThis.performance = { now: () => clock };
require('../js/music.js');
globalThis.PC.audio = { ensure() {}, allOff() {}, noteOn() {}, click() {} };
require('../js/player.js');
require('../js/learning/metrics.js');
const { PC } = globalThis;
const assert = require('assert');
const near = (a, b, tol, msg) => assert(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

// Partitura de prueba: 4/4 a 60 bpm (1 pulso = 1 s); mano derecha y acordes en la izquierda
const song = PC.music.compileSong({
  id: 't', title: 't', bpm: 60, time: [4, 4],
  rh: 'C4 D4 E4 F4 | G4 F4 E4 D4 | C4/w |',
  lh: 'C3.G3/h C3.G3/h | G2.D3/h G2.D3/h | C3/w |',
});

function makePlayer(mode) {
  const p = new PC.Player({ onNoteState() {}, onFinish(s) { p.finished = s; } });
  p.load(song);
  p.set({ mode, hands: { R: true, L: true }, tempo: 1 });
  p.restart();
  return p;
}
// Avanza el reloj y el Player en pasos de 10 ms hasta el instante t (ms)
function runUntil(p, t) {
  while (clock < t) {
    clock += 10;
    p.tick(0.01);
  }
}

// 1) Tiempo real: todas las notas 80 ms tarde, la mano izquierda 50 ms más tarde que la derecha,
//    y las notas del acorde separadas 30 ms. Se mantienen la duración exacta.
{
  clock = 0;
  const p = makePlayer('realtime');
  p.play();
  runUntil(p, 4000); // compás de entrada (4 pulsos)
  const start = clock;
  const steps = p.steps.map((s) => s);
  const events = [];
  for (const st of steps) {
    const base = start + st.start * 1000 + 80;
    st.notes.forEach((n) => {
      const off = n.hand === 'L' ? 50 + (n.midi === Math.max(...st.notes.filter((x) => x.hand === 'L').map((x) => x.midi)) ? 30 : 0) : 0;
      events.push({ t: base + off, type: 'on', n });
      events.push({ t: base + off + n.dur * 1000 - 20, type: 'off', n });
    });
  }
  events.sort((a, b) => a.t - b.t);
  for (const e of events) {
    runUntil(p, e.t);
    if (e.type === 'on') p.noteOn(e.n.midi, { source: 'midi' });
    else p.noteOff(e.n.midi);
  }
  runUntil(p, start + 13000);
  assert(p.finished, 'la pieza termina');
  const m = PC.metrics.compute(p.finished.record);
  assert.strictEqual(m.notes.hits, song.notes.length);
  assert.strictEqual(m.accuracy, 1);
  // Error medio: derecha 80 ms; izquierda 130 y 160 ms
  near(m.timing.biasMs, (80 * 9 + 130 * 5 + 160 * 4) / 18, 15, 'desfase medio');
  near(m.handSyncMs, 65, 12, 'sincronía entre manos');
  near(m.chordSpreadMs, 30, 12, 'simultaneidad del acorde');
  assert(m.tempo.cv < 0.05, 'tempo estable');
  assert(m.duration.meanError < 0.1, 'duraciones correctas');
  assert.strictEqual(m.reliability.level, 'exacta');
  const d = PC.metrics.diagnose(m);
  const ids = d.issues.map((i) => i.id);
  assert(ids.includes('ritmo'), 'detecta el retraso');
  assert(/retrasarte/.test(d.issues.find((i) => i.id === 'ritmo').text));
  assert(!ids.includes('acordes'), '30 ms entre notas del acorde es aceptable');
  console.log('ok   tiempo real →', JSON.stringify({ ritmo_ms: Math.round(m.timing.meanAbsMs), sesgo: Math.round(m.timing.biasMs), manos_ms: Math.round(m.handSyncMs), acorde_ms: Math.round(m.chordSpreadMs) }));
}

// 2) Modo Esperar: se para 2 s en el compás 2 (cambio de acorde) y comete un error.
{
  clock = 0;
  const p = makePlayer('wait');
  p.play();
  let guard = 0;
  while (p.playing && guard++ < 100000) {
    clock += 10;
    p.tick(0.01);
    if (p.waiting) {
      const st = p.steps[p.stepIdx];
      const sr = p._stepRec(p.stepIdx);
      const waited = clock - p.rec.t0 - sr.arriveT;
      const hesitate = st.notes[0].event.measure === 1 && st.notes.some((n) => n.hand === 'L') ? 2000 : 100;
      if (waited >= hesitate) {
        if (st.notes[0].event.measure === 1 && !p._erred) {
          p._erred = true;
          p.noteOn(30, { source: 'midi' });
        }
        for (const m of [...p.remaining]) p.noteOn(m, { source: 'midi' });
      }
    }
  }
  const m = PC.metrics.compute(p.finished.record);
  assert.strictEqual(m.notes.wrong, 1);
  assert(m.timing === null, 'en modo Esperar no se mide el ritmo');
  assert(m.hesitation.worst[0].measure === 1, 'el punto débil es el compás 2');
  // 2 acordes de 2 s y 3 de 0,1 s → media ≈ 0,86 s; las notas sueltas, 0,1 s
  near(m.hesitation.chordChangeMs, 860, 60, 'pausa media en acordes');
  assert.deepStrictEqual(m.weakMeasures[0], 1);
  const d = PC.metrics.diagnose(m);
  const tr = d.issues.find((i) => i.id === 'transiciones');
  assert(tr && /compás 2/.test(tr.text), 'explica dónde se detiene');
  console.log('ok   modo Esperar →', tr.text);
}

// 3) Con micrófono la fiabilidad es «estimada» y no se dan medidas de tiempo ni duración
{
  const rel = PC.metrics.reliability({ mic: 10 });
  assert.strictEqual(rel.level, 'estimada');
  const m = PC.metrics.compute({ mode: 'realtime', bps: 1, totalNotes: 3, hits: [1, 2, 3].map((i) => ({ step: i, hand: 'R', expectedBeat: i, beat: i + 0.3, t: i * 1000 })), sources: { mic: 3 } });
  assert.strictEqual(m.timing, null);
  assert.strictEqual(m.dims.rhythm, null);
  assert.strictEqual(m.accuracy, 1);
  console.log('ok   micrófono → sin medidas de tiempo (fiabilidad estimada)');
}

console.log('\nTodas las pruebas de métricas pasaron');
